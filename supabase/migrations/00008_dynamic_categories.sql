-- 1. Crear tabla de categorías
CREATE TABLE IF NOT EXISTS public.categorias_documentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icono TEXT DEFAULT 'Folder',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insertar categorías iniciales
INSERT INTO public.categorias_documentos (nombre, slug, icono)
VALUES 
    ('Bienvenida', 'bienvenida', 'Hand'),
    ('Sistemas', 'sistemas', 'Zap'),
    ('General', 'general', 'Book')
ON CONFLICT (slug) DO NOTHING;

-- 3. Habilitar RLS
ALTER TABLE public.categorias_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categorias are viewable by everyone" ON public.categorias_documentos FOR SELECT USING (true);

-- 4. Comentario
COMMENT ON TABLE public.categorias_documentos IS 'Tabla maestra para las categorías de documentación';
