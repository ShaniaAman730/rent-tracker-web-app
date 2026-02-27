-- track which user created/updated utility entries
ALTER TABLE public.utility
  ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES public.users(id);
