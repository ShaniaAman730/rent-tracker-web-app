ALTER TABLE public.utility_payment
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.unit(id) ON DELETE CASCADE;

UPDATE public.utility_payment up
SET unit_id = COALESCE(u.unit_id, pair.first_unit_id)
FROM public.utility u
LEFT JOIN public.unit_pairing pair ON pair.id = u.pairing_id
WHERE up.utility_id = u.id
  AND up.unit_id IS NULL;

INSERT INTO public.utility_payment (
  utility_id,
  unit_id,
  paid,
  recorded_by_user_id,
  recorded_date,
  comments,
  created_at,
  updated_at
)
SELECT
  up.utility_id,
  pair.second_unit_id,
  up.paid,
  up.recorded_by_user_id,
  up.recorded_date,
  up.comments,
  up.created_at,
  up.updated_at
FROM public.utility_payment up
JOIN public.utility u ON u.id = up.utility_id
JOIN public.unit_pairing pair ON pair.id = u.pairing_id
WHERE pair.second_unit_id IS NOT NULL
  AND up.unit_id = pair.first_unit_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.utility_payment existing
    WHERE existing.utility_id = up.utility_id
      AND existing.unit_id = pair.second_unit_id
  );

ALTER TABLE public.utility_payment
  DROP CONSTRAINT IF EXISTS utility_payment_utility_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_utility_payment_utility_unit_unique
  ON public.utility_payment(utility_id, unit_id);

CREATE INDEX IF NOT EXISTS idx_utility_payment_unit_id ON public.utility_payment(unit_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.utility_payment WHERE unit_id IS NULL) THEN
    ALTER TABLE public.utility_payment ALTER COLUMN unit_id SET NOT NULL;
  END IF;
END $$;
