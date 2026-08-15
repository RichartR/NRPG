-- Add obtenible column to info_glosario table
ALTER TABLE public.info_glosario ADD COLUMN IF NOT EXISTS obtenible BOOLEAN DEFAULT true NOT NULL;
