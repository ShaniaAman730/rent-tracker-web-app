ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone_number TEXT;

ALTER TABLE public.unit
ADD COLUMN IF NOT EXISTS paired_unit_id UUID REFERENCES public.unit(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.unit_pairing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_unit_id UUID NOT NULL REFERENCES public.unit(id) ON DELETE CASCADE,
  second_unit_id UUID NOT NULL REFERENCES public.unit(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (first_unit_id <> second_unit_id),
  UNIQUE(first_unit_id),
  UNIQUE(second_unit_id)
);

ALTER TABLE public.unit_pairing ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'unit_pairing'
      AND policyname = 'Authenticated users can view all unit pairings'
  ) THEN
    CREATE POLICY "Authenticated users can view all unit pairings" ON public.unit_pairing
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'unit_pairing'
      AND policyname = 'Authenticated users can insert unit pairings'
  ) THEN
    CREATE POLICY "Authenticated users can insert unit pairings" ON public.unit_pairing
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'unit_pairing'
      AND policyname = 'Authenticated users can update unit pairings'
  ) THEN
    CREATE POLICY "Authenticated users can update unit pairings" ON public.unit_pairing
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'unit_pairing'
      AND policyname = 'Authenticated users can delete unit pairings'
  ) THEN
    CREATE POLICY "Authenticated users can delete unit pairings" ON public.unit_pairing
      FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_unit_paired_unit_id ON public.unit(paired_unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_pairing_first_unit_id ON public.unit_pairing(first_unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_pairing_second_unit_id ON public.unit_pairing(second_unit_id);
