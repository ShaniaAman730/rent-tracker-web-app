CREATE TABLE IF NOT EXISTS public.landlord (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  middle_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  name_prefix TEXT,
  citizenship TEXT NOT NULL,
  marital_status TEXT NOT NULL,
  postal_address TEXT NOT NULL,
  gov_id_type TEXT NOT NULL,
  gov_id_no TEXT NOT NULL,
  id_issued_date DATE NOT NULL,
  id_expiry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.landlord ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'landlord' AND policyname = 'Authenticated users can view all landlords'
  ) THEN
    CREATE POLICY "Authenticated users can view all landlords" ON public.landlord
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'landlord' AND policyname = 'Authenticated users can insert landlords'
  ) THEN
    CREATE POLICY "Authenticated users can insert landlords" ON public.landlord
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'landlord' AND policyname = 'Authenticated users can update landlords'
  ) THEN
    CREATE POLICY "Authenticated users can update landlords" ON public.landlord
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'landlord' AND policyname = 'Authenticated users can delete landlords'
  ) THEN
    CREATE POLICY "Authenticated users can delete landlords" ON public.landlord
      FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

ALTER TABLE public.contract
  ADD COLUMN IF NOT EXISTS landlord_id UUID REFERENCES public.landlord(id) ON DELETE RESTRICT;

ALTER TABLE public.tenant
  ADD COLUMN IF NOT EXISTS gov_id_type TEXT,
  ADD COLUMN IF NOT EXISTS gov_id_no TEXT,
  ADD COLUMN IF NOT EXISTS id_issued_date DATE,
  ADD COLUMN IF NOT EXISTS id_expiry_date DATE;

CREATE INDEX IF NOT EXISTS idx_contract_landlord_id ON public.contract(landlord_id);
