ALTER TABLE public.utility
ADD COLUMN IF NOT EXISTS pairing_id UUID REFERENCES public.unit_pairing(id) ON DELETE CASCADE;

ALTER TABLE public.utility
ALTER COLUMN unit_id DROP NOT NULL;

UPDATE public.utility u
SET pairing_id = up.id
FROM public.unit_pairing up
WHERE u.pairing_id IS NULL
  AND (u.unit_id = up.first_unit_id OR u.unit_id = up.second_unit_id);

CREATE INDEX IF NOT EXISTS idx_utility_pairing_id ON public.utility(pairing_id);
