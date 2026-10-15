-- SMT Studio business schema bootstrap.
-- Run this once in Supabase SQL Editor before inserting application data.
-- Better Auth owns public."user" and its other auth tables, so this migration
-- deliberately leaves user-related columns unlinked until migration 0002.

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

SET LOCAL search_path = public, extensions, pg_catalog;

CREATE TYPE public.room_type AS ENUM ('REHEARSAL', 'RECORDING');
CREATE TYPE public.room_status AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE');
CREATE TYPE public.room_block_type AS ENUM ('UNAVAILABLE', 'MAINTENANCE');
CREATE TYPE public.addon_pricing_type AS ENUM ('FIXED', 'PER_HOUR', 'PER_UNIT');
CREATE TYPE public.booking_status AS ENUM (
  'PENDING_PAYMENT',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED'
);
CREATE TYPE public.booking_actor_type AS ENUM ('USER', 'ADMIN', 'SYSTEM');
CREATE TYPE public.discount_type AS ENUM ('PERCENTAGE', 'FIXED');
CREATE TYPE public.promo_redemption_status AS ENUM ('RESERVED', 'APPLIED', 'RELEASED');
CREATE TYPE public.payment_status AS ENUM (
  'PENDING',
  'PAID',
  'FAILED',
  'REFUND_PENDING',
  'REFUNDED'
);
CREATE TYPE public.upload_intent_status AS ENUM ('CREATED', 'CONFIRMED', 'EXPIRED');
CREATE TYPE public.conversation_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE public.notification_type AS ENUM ('BOOKING', 'PAYMENT', 'CHAT', 'SYSTEM');
CREATE TYPE public.activity_actor_type AS ENUM ('USER', 'ADMIN', 'SYSTEM');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_system_setting_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_activity_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'activity_logs is append-only'
    USING ERRCODE = '42501';
END;
$$;

CREATE TABLE public.user_profiles (
  user_id text PRIMARY KEY,
  first_name varchar(100) NOT NULL CHECK (char_length(btrim(first_name)) > 0),
  last_name varchar(100) NOT NULL CHECK (char_length(btrim(last_name)) > 0),
  phone varchar(32) NOT NULL CHECK (char_length(btrim(phone)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug citext NOT NULL UNIQUE,
  name varchar(160) NOT NULL CHECK (char_length(btrim(name)) > 0),
  type public.room_type NOT NULL,
  description text NOT NULL DEFAULT '',
  capacity integer NOT NULL CHECK (capacity > 0),
  hourly_rate numeric(12, 2) NOT NULL CHECK (hourly_rate > 0),
  currency char(3) NOT NULL DEFAULT 'THB' CHECK (currency = 'THB'),
  status public.room_status NOT NULL DEFAULT 'AVAILABLE',
  is_published boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.room_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE CHECK (char_length(btrim(storage_path)) > 0),
  alt_text varchar(255) NOT NULL CHECK (char_length(btrim(alt_text)) > 0),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL CHECK (char_length(btrim(name)) > 0),
  description text NOT NULL DEFAULT '',
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.room_equipment (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  note text,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, equipment_id)
);

CREATE TABLE public.room_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  type public.room_block_type NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) > 0),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_blocks_valid_range CHECK (ends_at > starts_at)
);

CREATE TABLE public.addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL CHECK (char_length(btrim(name)) > 0),
  description text NOT NULL DEFAULT '',
  pricing_type public.addon_pricing_type NOT NULL,
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price > 0),
  currency char(3) NOT NULL DEFAULT 'THB' CHECK (currency = 'THB'),
  is_active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number varchar(32) NOT NULL UNIQUE,
  user_id text NOT NULL,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  room_name_snapshot varchar(160) NOT NULL CHECK (char_length(btrim(room_name_snapshot)) > 0),
  room_rate_snapshot numeric(12, 2) NOT NULL CHECK (room_rate_snapshot > 0),
  room_subtotal numeric(12, 2) NOT NULL CHECK (room_subtotal >= 0),
  addon_subtotal numeric(12, 2) NOT NULL CHECK (addon_subtotal >= 0),
  subtotal numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric(12, 2) NOT NULL CHECK (total_amount >= 0),
  currency char(3) NOT NULL DEFAULT 'THB' CHECK (currency = 'THB'),
  promo_code_snapshot varchar(64),
  promo_type_snapshot public.discount_type,
  promo_value_snapshot numeric(12, 2),
  payment_due_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text,
  cancellation_reason text,
  idempotency_key varchar(128) NOT NULL,
  idempotency_payload_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_valid_time_range CHECK (ends_at > starts_at),
  CONSTRAINT bookings_valid_duration CHECK (
    duration_minutes >= 60
    AND duration_minutes % 30 = 0
    AND ends_at = starts_at + make_interval(mins => duration_minutes)
  ),
  CONSTRAINT bookings_valid_totals CHECK (
    subtotal = room_subtotal + addon_subtotal
    AND discount_amount <= subtotal
    AND total_amount = subtotal - discount_amount
  ),
  CONSTRAINT bookings_valid_payment_due CHECK (
    (total_amount = 0 AND status <> 'PENDING_PAYMENT')
    OR (total_amount > 0 AND payment_due_at IS NOT NULL)
  ),
  CONSTRAINT bookings_valid_promo_snapshot CHECK (
    (
      promo_code_snapshot IS NULL
      AND promo_type_snapshot IS NULL
      AND promo_value_snapshot IS NULL
    )
    OR (
      promo_code_snapshot IS NOT NULL
      AND promo_type_snapshot IS NOT NULL
      AND promo_value_snapshot IS NOT NULL
      AND promo_value_snapshot > 0
    )
  ),
  CONSTRAINT bookings_valid_confirmation CHECK (
    status NOT IN ('CONFIRMED', 'COMPLETED') OR confirmed_at IS NOT NULL
  ),
  CONSTRAINT bookings_valid_completion CHECK (
    status <> 'COMPLETED' OR completed_at IS NOT NULL
  ),
  CONSTRAINT bookings_valid_cancellation CHECK (
    status <> 'CANCELLED' OR cancelled_at IS NOT NULL
  ),
  CONSTRAINT bookings_valid_idempotency_hash CHECK (
    idempotency_payload_hash ~ '^[0-9a-f]{64}$'
  ),
  UNIQUE (user_id, idempotency_key)
);

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_active_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED'));

CREATE TABLE public.booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  addon_id uuid NOT NULL REFERENCES public.addons(id) ON DELETE RESTRICT,
  name_snapshot varchar(160) NOT NULL CHECK (char_length(btrim(name_snapshot)) > 0),
  pricing_type_snapshot public.addon_pricing_type NOT NULL,
  unit_price_snapshot numeric(12, 2) NOT NULL CHECK (unit_price_snapshot > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total numeric(12, 2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, addon_id)
);

CREATE TABLE public.booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  from_status public.booking_status,
  to_status public.booking_status NOT NULL,
  actor_type public.booking_actor_type NOT NULL,
  actor_user_id text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_history_actor_valid CHECK (
    (actor_type = 'SYSTEM' AND actor_user_id IS NULL)
    OR (actor_type IN ('USER', 'ADMIN') AND actor_user_id IS NOT NULL)
  )
);

CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code citext NOT NULL UNIQUE CHECK (char_length(btrim(code::text)) > 0),
  description text NOT NULL DEFAULT '',
  discount_type public.discount_type NOT NULL,
  discount_value numeric(12, 2) NOT NULL CHECK (discount_value > 0),
  max_discount_amount numeric(12, 2) CHECK (max_discount_amount > 0),
  min_booking_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (min_booking_amount >= 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  total_usage_limit integer CHECK (total_usage_limit > 0),
  per_user_limit integer CHECK (per_user_limit > 0),
  applies_to_all_rooms boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT promo_codes_valid_percentage CHECK (
    discount_type <> 'PERCENTAGE' OR discount_value <= 100
  ),
  CONSTRAINT promo_codes_valid_range CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE public.promo_code_rooms (
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  PRIMARY KEY (promo_code_id, room_id)
);

CREATE TABLE public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE RESTRICT,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  user_id text NOT NULL,
  status public.promo_redemption_status NOT NULL DEFAULT 'RESERVED',
  discount_amount numeric(12, 2) NOT NULL CHECK (discount_amount >= 0),
  reserved_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  released_at timestamptz,
  CONSTRAINT promo_redemptions_valid_lifecycle CHECK (
    (status = 'RESERVED' AND applied_at IS NULL AND released_at IS NULL)
    OR (status = 'APPLIED' AND applied_at IS NOT NULL AND released_at IS NULL)
    OR (status = 'RELEASED' AND applied_at IS NULL AND released_at IS NOT NULL)
  )
);

CREATE TABLE public.payment_upload_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  user_id text NOT NULL,
  storage_path text NOT NULL UNIQUE CHECK (char_length(btrim(storage_path)) > 0),
  expected_mime_type varchar(100) NOT NULL CHECK (
    expected_mime_type IN ('image/jpeg', 'image/png', 'application/pdf')
  ),
  max_bytes integer NOT NULL DEFAULT 10485760 CHECK (
    max_bytes > 0 AND max_bytes <= 10485760
  ),
  status public.upload_intent_status NOT NULL DEFAULT 'CREATED',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  CONSTRAINT upload_intents_valid_confirmation CHECK (
    status <> 'CONFIRMED' OR confirmed_at IS NOT NULL
  )
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  upload_intent_id uuid NOT NULL UNIQUE REFERENCES public.payment_upload_intents(id) ON DELETE RESTRICT,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL DEFAULT 'THB' CHECK (currency = 'THB'),
  status public.payment_status NOT NULL DEFAULT 'PENDING',
  slip_storage_path text NOT NULL UNIQUE CHECK (char_length(btrim(slip_storage_path)) > 0),
  slip_sha256 char(64) NOT NULL UNIQUE CHECK (slip_sha256 ~ '^[0-9a-f]{64}$'),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  transfer_occurred_at timestamptz,
  refund_amount numeric(12, 2),
  refund_reference varchar(255),
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_attempt_unique UNIQUE (booking_id, attempt_number),
  CONSTRAINT payments_valid_review CHECK (
    status = 'PENDING'
    OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  CONSTRAINT payments_valid_failure CHECK (
    status <> 'FAILED' OR char_length(btrim(review_note)) > 0
  ),
  CONSTRAINT payments_valid_transfer CHECK (
    status NOT IN ('PAID', 'REFUND_PENDING', 'REFUNDED')
    OR transfer_occurred_at IS NOT NULL
  ),
  CONSTRAINT payments_valid_refund CHECK (
    (
      status NOT IN ('REFUND_PENDING', 'REFUNDED')
      AND refund_amount IS NULL
      AND refund_reference IS NULL
      AND refunded_at IS NULL
    )
    OR (
      status = 'REFUND_PENDING'
      AND refund_amount > 0
      AND refund_amount <= amount
      AND refunded_at IS NULL
    )
    OR (
      status = 'REFUNDED'
      AND refund_amount > 0
      AND refund_amount <= amount
      AND char_length(btrim(refund_reference)) > 0
      AND refunded_at IS NOT NULL
    )
  )
);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL UNIQUE,
  status public.conversation_status NOT NULL DEFAULT 'OPEN',
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
  sender_user_id text NOT NULL,
  body varchar(2000) NOT NULL CHECK (
    char_length(btrim(body)) BETWEEN 1 AND 2000
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_read_states (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  last_read_message_id uuid REFERENCES public.messages(id) ON DELETE RESTRICT,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type public.notification_type NOT NULL,
  title varchar(200) NOT NULL CHECK (char_length(btrim(title)) > 0),
  body text NOT NULL CHECK (char_length(btrim(body)) > 0),
  data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data) = 'object'),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type public.activity_actor_type NOT NULL,
  actor_user_id text,
  action varchar(120) NOT NULL CHECK (char_length(btrim(action)) > 0),
  entity_type varchar(80) NOT NULL CHECK (char_length(btrim(entity_type)) > 0),
  entity_id text NOT NULL CHECK (char_length(btrim(entity_id)) > 0),
  before_data jsonb CHECK (before_data IS NULL OR jsonb_typeof(before_data) = 'object'),
  after_data jsonb CHECK (after_data IS NULL OR jsonb_typeof(after_data) = 'object'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  request_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_logs_actor_valid CHECK (
    (actor_type = 'SYSTEM' AND actor_user_id IS NULL)
    OR (actor_type IN ('USER', 'ADMIN') AND actor_user_id IS NOT NULL)
  )
);

CREATE TABLE public.system_settings (
  key varchar(100) PRIMARY KEY,
  value jsonb NOT NULL CHECK (jsonb_typeof(value) = 'object'),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX equipment_active_name_unique
  ON public.equipment (lower(name))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX addons_active_name_unique
  ON public.addons (lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX rooms_public_list_idx
  ON public.rooms (status, name, id)
  WHERE deleted_at IS NULL AND is_published = true;

CREATE INDEX rooms_deleted_at_idx ON public.rooms (deleted_at);
CREATE INDEX room_images_room_sort_idx ON public.room_images (room_id, sort_order, id);
CREATE INDEX equipment_deleted_at_idx ON public.equipment (deleted_at);

CREATE INDEX room_blocks_room_time_idx
  ON public.room_blocks (room_id, starts_at, ends_at);

CREATE INDEX room_blocks_time_gist_idx
  ON public.room_blocks
  USING gist (room_id, tstzrange(starts_at, ends_at, '[)'));

CREATE INDEX addons_active_idx
  ON public.addons (is_active, name, id)
  WHERE deleted_at IS NULL;

CREATE INDEX bookings_user_history_idx
  ON public.bookings (user_id, created_at DESC, id DESC);

CREATE INDEX bookings_room_calendar_idx
  ON public.bookings (room_id, starts_at, ends_at);

CREATE INDEX bookings_expiry_idx
  ON public.bookings (payment_due_at, id)
  WHERE status = 'PENDING_PAYMENT';

CREATE INDEX bookings_operations_idx
  ON public.bookings (status, starts_at, id);

CREATE INDEX booking_addons_booking_idx ON public.booking_addons (booking_id);
CREATE INDEX booking_history_timeline_idx
  ON public.booking_status_history (booking_id, created_at, id);

CREATE INDEX promo_codes_eligibility_idx
  ON public.promo_codes (is_active, starts_at, ends_at)
  WHERE deleted_at IS NULL;

CREATE INDEX promo_redemptions_total_usage_idx
  ON public.promo_redemptions (promo_code_id, status);

CREATE INDEX promo_redemptions_user_usage_idx
  ON public.promo_redemptions (promo_code_id, user_id, status);

CREATE INDEX payment_upload_intents_cleanup_idx
  ON public.payment_upload_intents (status, expires_at);

CREATE INDEX payment_upload_intents_booking_idx
  ON public.payment_upload_intents (booking_id, created_at DESC);

CREATE UNIQUE INDEX payments_one_settled_lifecycle_per_booking_idx
  ON public.payments (booking_id)
  WHERE status IN ('PAID', 'REFUND_PENDING', 'REFUNDED');

CREATE INDEX payments_review_queue_idx
  ON public.payments (status, submitted_at, id);

CREATE INDEX payments_booking_history_idx
  ON public.payments (booking_id, created_at DESC, id DESC);

CREATE INDEX conversations_admin_queue_idx
  ON public.conversations (status, last_message_at DESC NULLS LAST, id);

CREATE INDEX messages_conversation_cursor_idx
  ON public.messages (conversation_id, created_at DESC, id DESC);

CREATE INDEX notifications_user_cursor_idx
  ON public.notifications (user_id, created_at DESC, id DESC);

CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC, id DESC)
  WHERE read_at IS NULL;

CREATE INDEX activity_logs_actor_idx
  ON public.activity_logs (actor_user_id, created_at DESC, id DESC);

CREATE INDEX activity_logs_entity_idx
  ON public.activity_logs (entity_type, entity_id, created_at DESC, id DESC);

CREATE INDEX activity_logs_action_idx
  ON public.activity_logs (action, created_at DESC, id DESC);

CREATE INDEX activity_logs_created_at_idx
  ON public.activity_logs (created_at DESC, id DESC);

CREATE TRIGGER user_profiles_set_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER rooms_set_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER equipment_set_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER room_equipment_set_updated_at
BEFORE UPDATE ON public.room_equipment
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER addons_set_updated_at
BEFORE UPDATE ON public.addons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER bookings_set_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER promo_codes_set_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER conversations_set_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER system_settings_set_version
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.set_system_setting_version();

CREATE TRIGGER activity_logs_prevent_update
BEFORE UPDATE ON public.activity_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_activity_log_mutation();

CREATE TRIGGER activity_logs_prevent_delete
BEFORE DELETE ON public.activity_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_activity_log_mutation();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_upload_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_read_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.system_settings (key, value, version, updated_by)
VALUES
  (
    'booking.policy',
    '{
      "timezone": "Asia/Bangkok",
      "currency": "THB",
      "open24Hours": true,
      "minimumMinutes": 60,
      "incrementMinutes": 30,
      "cancellationCutoffHours": 12,
      "paymentDueMinutes": 30
    }'::jsonb,
    1,
    NULL
  ),
  (
    'payment.upload',
    '{
      "allowedMimeTypes": ["image/jpeg", "image/png", "application/pdf"],
      "maxBytes": 10485760,
      "signedDownloadSeconds": 300
    }'::jsonb,
    1,
    NULL
  );

-- Verification result sets shown by Supabase SQL Editor.
SELECT count(*) AS business_table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_profiles', 'rooms', 'room_images', 'equipment', 'room_equipment',
    'room_blocks', 'addons', 'bookings', 'booking_addons',
    'booking_status_history', 'promo_codes', 'promo_code_rooms',
    'promo_redemptions', 'payment_upload_intents', 'payments',
    'conversations', 'messages', 'conversation_read_states',
    'notifications', 'activity_logs', 'system_settings'
  );

SELECT count(*) AS rls_enabled_table_count
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relrowsecurity = true
  AND c.relname IN (
    'user_profiles', 'rooms', 'room_images', 'equipment', 'room_equipment',
    'room_blocks', 'addons', 'bookings', 'booking_addons',
    'booking_status_history', 'promo_codes', 'promo_code_rooms',
    'promo_redemptions', 'payment_upload_intents', 'payments',
    'conversations', 'messages', 'conversation_read_states',
    'notifications', 'activity_logs', 'system_settings'
  );

COMMIT;
