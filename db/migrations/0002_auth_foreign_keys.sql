-- Better Auth foreign-key links.
-- Run this migration only after Better Auth has created public."user".

BEGIN;

SET LOCAL search_path = public, extensions, pg_catalog;

-- Better Auth uses a text primary key by default. Fail before any DDL if the
-- auth table is missing or was configured with an incompatible identifier.
DO $$
DECLARE
  udt_name text;
BEGIN
  IF to_regclass('public."user"') IS NULL THEN
    RAISE EXCEPTION
      'Better Auth table public."user" does not exist. Run the Better Auth migration first.';
  END IF;

  SELECT columns.udt_name
  INTO udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user'
    AND column_name = 'id';

  IF udt_name IS NULL OR udt_name <> 'text' THEN
    RAISE EXCEPTION
      'public."user".id must be text; found %', coalesce(udt_name, '<missing>');
  END IF;
END;
$$;

-- Catch legacy/orphaned rows before adding constraints. This keeps the error
-- actionable if 0001 was used before Better Auth was installed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_profiles t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.user_id)
    UNION ALL
    SELECT 1 FROM public.rooms t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.created_by)
       OR NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.updated_by)
    UNION ALL
    SELECT 1 FROM public.equipment t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.created_by)
       OR NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.updated_by)
    UNION ALL
    SELECT 1 FROM public.room_equipment t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.updated_by)
    UNION ALL
    SELECT 1 FROM public.room_blocks t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.created_by)
    UNION ALL
    SELECT 1 FROM public.addons t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.created_by)
       OR NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.updated_by)
    UNION ALL
    SELECT 1 FROM public.bookings t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.user_id)
       OR (
         t.cancelled_by IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.cancelled_by)
       )
    UNION ALL
    SELECT 1 FROM public.booking_status_history t
    WHERE t.actor_user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.actor_user_id)
    UNION ALL
    SELECT 1 FROM public.promo_codes t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.created_by)
       OR NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.updated_by)
    UNION ALL
    SELECT 1 FROM public.promo_redemptions t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.user_id)
    UNION ALL
    SELECT 1 FROM public.payment_upload_intents t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.user_id)
    UNION ALL
    SELECT 1 FROM public.payments t
    WHERE t.reviewed_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.reviewed_by)
    UNION ALL
    SELECT 1 FROM public.conversations t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.customer_id)
    UNION ALL
    SELECT 1 FROM public.messages t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.sender_user_id)
    UNION ALL
    SELECT 1 FROM public.conversation_read_states t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.user_id)
    UNION ALL
    SELECT 1 FROM public.notifications t
    WHERE NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.user_id)
    UNION ALL
    SELECT 1 FROM public.activity_logs t
    WHERE t.actor_user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.actor_user_id)
    UNION ALL
    SELECT 1 FROM public.system_settings t
    WHERE t.updated_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = t.updated_by)
  ) THEN
    RAISE EXCEPTION
      'Cannot add Better Auth foreign keys: one or more business rows reference a missing user.';
  END IF;
END;
$$;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_user_fk
  FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_created_by_user_fk
  FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE RESTRICT,
  ADD CONSTRAINT rooms_updated_by_user_fk
  FOREIGN KEY (updated_by) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.equipment
  ADD CONSTRAINT equipment_created_by_user_fk
  FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE RESTRICT,
  ADD CONSTRAINT equipment_updated_by_user_fk
  FOREIGN KEY (updated_by) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.room_equipment
  ADD CONSTRAINT room_equipment_updated_by_user_fk
  FOREIGN KEY (updated_by) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.room_blocks
  ADD CONSTRAINT room_blocks_created_by_user_fk
  FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.addons
  ADD CONSTRAINT addons_created_by_user_fk
  FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE RESTRICT,
  ADD CONSTRAINT addons_updated_by_user_fk
  FOREIGN KEY (updated_by) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_user_fk
  FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE RESTRICT,
  ADD CONSTRAINT bookings_cancelled_by_user_fk
  FOREIGN KEY (cancelled_by) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.booking_status_history
  ADD CONSTRAINT booking_status_history_actor_user_fk
  FOREIGN KEY (actor_user_id) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.promo_codes
  ADD CONSTRAINT promo_codes_created_by_user_fk
  FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE RESTRICT,
  ADD CONSTRAINT promo_codes_updated_by_user_fk
  FOREIGN KEY (updated_by) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.promo_redemptions
  ADD CONSTRAINT promo_redemptions_user_fk
  FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.payment_upload_intents
  ADD CONSTRAINT payment_upload_intents_user_fk
  FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_reviewed_by_user_fk
  FOREIGN KEY (reviewed_by) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_customer_user_fk
  FOREIGN KEY (customer_id) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_user_fk
  FOREIGN KEY (sender_user_id) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.conversation_read_states
  ADD CONSTRAINT conversation_read_states_user_fk
  FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_fk
  FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_actor_user_fk
  FOREIGN KEY (actor_user_id) REFERENCES public."user"(id) ON DELETE RESTRICT;

ALTER TABLE public.system_settings
  ADD CONSTRAINT system_settings_updated_by_user_fk
  FOREIGN KEY (updated_by) REFERENCES public."user"(id) ON DELETE RESTRICT;

-- Verification result set: expected user_foreign_key_count = 23.
SELECT count(*) AS user_foreign_key_count
FROM pg_catalog.pg_constraint constraint_record
JOIN pg_catalog.pg_class source_table
  ON source_table.oid = constraint_record.conrelid
JOIN pg_catalog.pg_namespace source_schema
  ON source_schema.oid = source_table.relnamespace
WHERE constraint_record.contype = 'f'
  AND source_schema.nspname = 'public'
  AND constraint_record.confrelid = 'public."user"'::regclass
  AND source_table.relname IN (
    'user_profiles', 'rooms', 'equipment', 'room_equipment', 'room_blocks',
    'addons', 'bookings', 'booking_status_history', 'promo_codes',
    'promo_redemptions', 'payment_upload_intents', 'payments',
    'conversations', 'messages', 'conversation_read_states', 'notifications',
    'activity_logs', 'system_settings'
  );

COMMIT;
