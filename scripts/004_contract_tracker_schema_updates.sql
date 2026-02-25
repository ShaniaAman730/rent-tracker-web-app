-- Drop legacy tenant contract columns
ALTER TABLE public.tenant
  DROP COLUMN IF EXISTS contract_name,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS begin_contract,
  DROP COLUMN IF EXISTS end_contract;

-- Drop legacy unit columns no longer required
ALTER TABLE public.unit
  DROP COLUMN IF EXISTS contract_address,
  DROP COLUMN IF EXISTS cash_bond_amount;

-- Add tracker comments fields
ALTER TABLE public.rent_payment
  ADD COLUMN IF NOT EXISTS comments TEXT;

ALTER TABLE public.utility_payment
  ADD COLUMN IF NOT EXISTS comments TEXT;

-- Normalize contract recorder columns from earlier schema versions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contract'
      AND column_name = 'signed_recorded_by_user_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contract'
      AND column_name = 'recorded_by_user_id'
  ) THEN
    ALTER TABLE public.contract
      RENAME COLUMN signed_recorded_by_user_id TO recorded_by_user_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contract'
      AND column_name = 'signed_recorded_date'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contract'
      AND column_name = 'recorded_date'
  ) THEN
    ALTER TABLE public.contract
      RENAME COLUMN signed_recorded_date TO recorded_date;
  END IF;
END $$;

ALTER TABLE public.contract
  DROP COLUMN IF EXISTS signed_recorded_by,
  DROP COLUMN IF EXISTS notarized,
  DROP COLUMN IF EXISTS notarized_recorded_by,
  DROP COLUMN IF EXISTS notarized_recorded_by_user_id,
  DROP COLUMN IF EXISTS notarized_recorded_date;

-- Add contract fields used by monitoring/export flow
ALTER TABLE public.contract
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS middle_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS citizenship TEXT DEFAULT 'Filipino',
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS tenant_address TEXT,
  ADD COLUMN IF NOT EXISTS unit_specification TEXT,
  ADD COLUMN IF NOT EXISTS property_specification TEXT,
  ADD COLUMN IF NOT EXISTS rent DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS cash_bond DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS begin_contract DATE,
  ADD COLUMN IF NOT EXISTS end_contract DATE,
  ADD COLUMN IF NOT EXISTS comments TEXT,
  ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS recorded_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill tenant_id where possible from unit mapping
UPDATE public.contract c
SET tenant_id = t.id
FROM public.tenant t
WHERE c.tenant_id IS NULL
  AND c.unit_id = t.unit_id;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE tenant_id IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE first_name IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN first_name SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE middle_name IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN middle_name SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE last_name IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN last_name SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE citizenship IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN citizenship SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE marital_status IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN marital_status SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE tenant_address IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN tenant_address SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE unit_specification IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN unit_specification SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE property_specification IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN property_specification SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE rent IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN rent SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE cash_bond IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN cash_bond SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE begin_contract IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN begin_contract SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract WHERE end_contract IS NULL) THEN
    ALTER TABLE public.contract ALTER COLUMN end_contract SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contract_tenant_id ON public.contract(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_year ON public.contract(year);
