-- Add neighborhood, street, and stream_url columns to cameras table
ALTER TABLE public.cameras 
ADD COLUMN IF NOT EXISTS neighborhood text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS city text DEFAULT 'Santa Catarina',
ADD COLUMN IF NOT EXISTS stream_url text;

-- Create index for faster neighborhood queries
CREATE INDEX IF NOT EXISTS idx_cameras_neighborhood ON public.cameras(neighborhood);
CREATE INDEX IF NOT EXISTS idx_cameras_city ON public.cameras(city);