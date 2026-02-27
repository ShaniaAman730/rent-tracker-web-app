-- Add recorded_by_user_id column to rental_property for ownership tracking
ALTER TABLE public.rental_property
  ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES public.users(id);
