-- 1. Añadir columna de subcategoría
ALTER TABLE public.documentos_sistemas 
ADD COLUMN IF NOT EXISTS subcategoria TEXT;

-- 2. Insertar las nuevas categorías necesarias para el Drive
INSERT INTO public.categorias_documentos (nombre, slug, icono)
VALUES 
    ('Aldeas', 'aldeas', 'Map'),
    ('Ramas', 'ramas', 'GitBranch')
ON CONFLICT (slug) DO NOTHING;

-- 3. Comentario informativo
COMMENT ON COLUMN public.documentos_sistemas.subcategoria IS 'Sub-agrupación opcional (ej: Konoha dentro de Aldeas)';
