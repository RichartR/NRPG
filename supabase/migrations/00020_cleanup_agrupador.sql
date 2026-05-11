-- Eliminar la columna agrupador que ha sido sustituida por sub_especialidad_id
ALTER TABLE public.documentos_combate 
DROP COLUMN IF EXISTS agrupador;

-- También la eliminamos de documentos_sistemas si la llegamos a crear allí
ALTER TABLE public.documentos_sistemas 
DROP COLUMN IF EXISTS agrupador;
