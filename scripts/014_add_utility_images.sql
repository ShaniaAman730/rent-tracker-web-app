-- Add columns for utility reading and billing images (Google Drive links)
ALTER TABLE public.utility
  ADD COLUMN IF NOT EXISTS reading_image_url TEXT,
  ADD COLUMN IF NOT EXISTS billing_image_url TEXT;
