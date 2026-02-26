ALTER TABLE public.contract
  ADD COLUMN IF NOT EXISTS gov_id_type TEXT,
  ADD COLUMN IF NOT EXISTS gov_id_no TEXT,
  ADD COLUMN IF NOT EXISTS id_issued_date DATE,
  ADD COLUMN IF NOT EXISTS id_expiry_date DATE;

-- Backfill contract gov-id fields from tenant record where available
UPDATE public.contract c
SET
  gov_id_type = COALESCE(c.gov_id_type, t.gov_id_type),
  gov_id_no = COALESCE(c.gov_id_no, t.gov_id_no),
  id_issued_date = COALESCE(c.id_issued_date, t.id_issued_date),
  id_expiry_date = COALESCE(c.id_expiry_date, t.id_expiry_date)
FROM public.tenant t
WHERE c.tenant_id = t.id;
