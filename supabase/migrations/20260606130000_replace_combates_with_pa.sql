-- Add coste_puntos_aprendizaje to info_glosario and migrate from requirements.combates
ALTER TABLE public.info_glosario 
ADD COLUMN IF NOT EXISTS coste_puntos_aprendizaje INTEGER NOT NULL DEFAULT 0;

-- Migrate requirements.combates values to the new column
UPDATE public.info_glosario
SET coste_puntos_aprendizaje = COALESCE((requisitos->>'combates')::integer, 0);

-- Remove 'combates' from requisitos jsonb
UPDATE public.info_glosario
SET requisitos = requisitos - 'combates';
