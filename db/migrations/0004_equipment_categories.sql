DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type
    JOIN pg_namespace schema ON schema.oid = type.typnamespace
    WHERE type.typname = 'equipment_category'
      AND schema.nspname = 'public'
  ) THEN
    CREATE TYPE public.equipment_category AS ENUM (
      'AMP', 'GUITAR', 'BASS', 'MIC', 'MIXER', 'KEYBOARD', 'DRUM', 'OTHER'
    );
  END IF;
END
$$;

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS category public.equipment_category;

UPDATE public.equipment
SET category = 'OTHER'
WHERE category IS NULL;

ALTER TABLE public.equipment
  ALTER COLUMN category SET DEFAULT 'OTHER',
  ALTER COLUMN category SET NOT NULL;
