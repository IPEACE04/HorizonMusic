BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.expire_overdue_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  expired_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.bookings booking
    SET
      status = 'EXPIRED',
      updated_at = now()
    WHERE booking.status = 'PENDING_PAYMENT'
      AND booking.payment_due_at <= now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.payments payment
        WHERE payment.booking_id = booking.id
          AND payment.status = 'PENDING'
      )
    RETURNING booking.id, booking.user_id
  ), released_promotions AS (
    UPDATE public.promo_redemptions redemption
    SET
      status = 'RELEASED',
      released_at = now()
    FROM expired
    WHERE redemption.booking_id = expired.id
      AND redemption.status = 'RESERVED'
    RETURNING redemption.booking_id
  ), status_history AS (
    INSERT INTO public.booking_status_history (
      booking_id,
      from_status,
      to_status,
      actor_type,
      actor_user_id,
      reason
    )
    SELECT
      id,
      'PENDING_PAYMENT',
      'EXPIRED',
      'SYSTEM',
      NULL,
      'หมดเวลาชำระเงิน'
    FROM expired
    RETURNING booking_id
  ), customer_notifications AS (
    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT
      user_id,
      'PAYMENT',
      'รายการจองหมดเวลาชำระเงิน',
      'การจองถูกยกเลิกอัตโนมัติ และช่วงเวลาห้องกลับมาเปิดให้จองแล้ว',
      jsonb_build_object('bookingId', id)
    FROM expired
    RETURNING id
  ), audit_logs AS (
    INSERT INTO public.activity_logs (
      actor_type,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    SELECT
      'SYSTEM',
      NULL,
      'BOOKING_PAYMENT_EXPIRED',
      'BOOKING',
      id::text,
      jsonb_build_object('reason', 'PAYMENT_DEADLINE_PASSED')
    FROM expired
    RETURNING id
  )
  SELECT count(*)::integer
  INTO expired_count
  FROM expired;

  RETURN expired_count;
END;
$$;

REVOKE ALL ON FUNCTION private.expire_overdue_bookings() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.expire_overdue_bookings() FROM anon;
REVOKE ALL ON FUNCTION private.expire_overdue_bookings() FROM authenticated;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'expire-overdue-bookings';

SELECT cron.schedule(
  'expire-overdue-bookings',
  '*/5 * * * *',
  $$SELECT private.expire_overdue_bookings();$$
);

COMMIT;
