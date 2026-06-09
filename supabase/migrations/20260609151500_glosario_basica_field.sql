-- Migration: Remove es_inicial and add basica columns on public.info_glosario
-- Created: 2026-06-09

-- Remove the unused column es_inicial
ALTER TABLE public.info_glosario DROP COLUMN IF EXISTS es_inicial;

-- Add the new column basica as a boolean, defaulting to true
ALTER TABLE public.info_glosario ADD COLUMN IF NOT EXISTS basica boolean NOT NULL DEFAULT true;

-- Add index on basica column for performance
CREATE INDEX IF NOT EXISTS idx_glosario_basica ON public.info_glosario (basica);
