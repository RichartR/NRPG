-- Migration: Add equipment system fields and subcategory
-- 1. Add columns to info_glosario
ALTER TABLE public.info_glosario ADD COLUMN IF NOT EXISTS zona_equipable VARCHAR(50) DEFAULT NULL;
ALTER TABLE public.info_glosario ADD COLUMN IF NOT EXISTS ocupa_espacio BOOLEAN DEFAULT TRUE NOT NULL;

-- 2. Add column to reg_personajes_inventario
ALTER TABLE public.reg_personajes_inventario ADD COLUMN IF NOT EXISTS equipado BOOLEAN DEFAULT FALSE NOT NULL;

-- 3. Insert "Equipo" subcategory under "Objetos" (categoria_id = 2) if it doesn't exist
INSERT INTO public.info_glosario_subcategorias (categoria_id, nombre, slug, activo)
VALUES (2, 'Equipo', 'equipo', true)
ON CONFLICT (categoria_id, slug) DO NOTHING;
