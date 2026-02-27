-- add recorded_by_user_id to tenant table so ownership can be tracked
ALTER TABLE public.tenant
  ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES public.users(id);
