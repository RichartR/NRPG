-- Tabla de Aldeas
CREATE TABLE IF NOT EXISTS public.aldeas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    url_imagen TEXT,
    icono TEXT DEFAULT 'Map',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Ramas y Clanes
CREATE TABLE IF NOT EXISTS public.ramas_clanes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL CHECK (tipo IN ('rama', 'clan', 'especialidad')),
    descripcion TEXT,
    url_imagen TEXT,
    icono TEXT DEFAULT 'GitBranch',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Elementos
CREATE TABLE IF NOT EXISTS public.elementos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    url_imagen TEXT,
    icono TEXT DEFAULT 'Zap',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.aldeas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramas_clanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elementos ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública
CREATE POLICY "Lectura pública de aldeas" ON public.aldeas FOR SELECT USING (true);
CREATE POLICY "Lectura pública de ramas" ON public.ramas_clanes FOR SELECT USING (true);
CREATE POLICY "Lectura pública de elementos" ON public.elementos FOR SELECT USING (true);

-- Insertar datos iniciales de Aldeas
INSERT INTO public.aldeas (nombre, slug, descripcion, icono) VALUES
('Konohagakure', 'konoha', 'La Aldea Oculta de la Hoja.', 'Leaf'),
('Sunagakure', 'suna', 'La Aldea Oculta de la Arena.', 'Wind'),
('Kirigakure', 'kiri', 'La Aldea Oculta de la Niebla.', 'Waves'),
('Kumogakure', 'kumo', 'La Aldea Oculta de las Nubes.', 'Zap'),
('Iwagakure', 'iwa', 'La Aldea Oculta de la Roca.', 'Mountain')
ON CONFLICT (slug) DO NOTHING;

-- Insertar datos iniciales de Elementos
INSERT INTO public.elementos (nombre, slug, descripcion) VALUES
('Katon', 'katon', 'Elemento Fuego.'),
('Suiton', 'suiton', 'Elemento Agua.'),
('Doton', 'doton', 'Elemento Tierra.'),
('Raiton', 'raiton', 'Elemento Rayo.'),
('Fuuton', 'fuuton', 'Elemento Viento.')
ON CONFLICT (slug) DO NOTHING;
