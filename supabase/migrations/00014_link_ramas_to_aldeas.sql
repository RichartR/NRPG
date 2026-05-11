-- 1. Añadir la columna de relación a la tabla ramas_clanes
ALTER TABLE public.ramas_clanes 
ADD COLUMN IF NOT EXISTS aldea_id UUID REFERENCES public.aldeas(id) ON DELETE SET NULL;

-- 2. Ejemplo de cómo se vería una inserción con relación (opcional)
-- Esto es solo para que veas la sintaxis, no insertará nada a menos que las IDs coincidan.
/*
UPDATE public.ramas_clanes 
SET aldea_id = (SELECT id FROM public.aldeas WHERE slug = 'konoha')
WHERE slug = 'clan-uchiha';
*/

-- 3. También voy a añadir columnas de nombres detallados a ramas_clanes para que sea igual de potente que la de aldeas
ALTER TABLE public.ramas_clanes
ADD COLUMN IF NOT EXISTS nombre_en_español TEXT,
ADD COLUMN IF NOT EXISTS url_icono TEXT;
