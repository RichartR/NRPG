-- Migración: Añadir columnas para la elección especial de los Uchiha (Shihai o Segundo Elemento)
-- Ruta: supabase/migrations/20260911220000_add_uchiha_shihai_or_element.sql

ALTER TABLE public.reg_personajes_uchiha
ADD COLUMN IF NOT EXISTS eleccion_especial TEXT CHECK (eleccion_especial IN ('shihai', 'elemento')),
ADD COLUMN IF NOT EXISTS segundo_elemento_id BIGINT REFERENCES public.info_elementos(id);

-- Asegurar Katon como elemento fijo del Clan Uchiha en info_rama_elementos
INSERT INTO public.info_rama_elementos (rama_id, elemento_id, tipo, activo)
SELECT 35, 6, 'fijo', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.info_rama_elementos WHERE rama_id = 35 AND elemento_id = 6 AND tipo = 'fijo'
);
