-- Añadir columna de nombre en español a sub_especialidades
ALTER TABLE public.sub_especialidades 
ADD COLUMN IF NOT EXISTS nombre_en_español TEXT;
