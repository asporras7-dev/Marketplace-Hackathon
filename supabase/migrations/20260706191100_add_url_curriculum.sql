-- Add url_curriculum column to estudiantes
ALTER TABLE public.estudiantes ADD COLUMN IF NOT EXISTS url_curriculum text NULL;
