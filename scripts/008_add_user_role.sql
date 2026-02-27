-- Add role column to users table and set default
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'contributor';

-- Ensure first existing user becomes manager
-- Choose the earliest created user as initial manager
UPDATE public.users
SET role = 'manager'
WHERE id = (
  SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1
);
