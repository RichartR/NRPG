-- Migration: Alter info_acompanantes to include nombre_esp, nombre_jap, and slug
-- Description: Adds nombre_esp, nombre_jap, and slug to public.info_acompanantes, maps current nombre values to new fields, and removes old nombre column.

ALTER TABLE public.info_acompanantes ADD COLUMN nombre_esp TEXT;
ALTER TABLE public.info_acompanantes ADD COLUMN nombre_jap TEXT;
ALTER TABLE public.info_acompanantes ADD COLUMN slug TEXT;

-- Update mapping
UPDATE public.info_acompanantes SET nombre_jap = nombre, nombre_esp = nombre, slug = LOWER(REGEXP_REPLACE(nombre, '[^a-zA-Z0-9]+', '-', 'g'));

-- Apply Constraints
ALTER TABLE public.info_acompanantes ALTER COLUMN nombre_jap SET NOT NULL;
ALTER TABLE public.info_acompanantes ALTER COLUMN nombre_esp SET NOT NULL;
ALTER TABLE public.info_acompanantes ALTER COLUMN slug SET NOT NULL;

-- Remove old column
ALTER TABLE public.info_acompanantes DROP COLUMN nombre;
