-- Tabla para gestionar documentos embebidos del sistema
CREATE TABLE public.documentos_sistemas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clave TEXT UNIQUE NOT NULL, -- Ej: 'guia-inicio', 'normativa-general'
    titulo TEXT NOT NULL,
    url_drive TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.documentos_sistemas ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública
CREATE POLICY "Documentos son visibles por todos"
ON public.documentos_sistemas FOR SELECT
USING (true);

-- Insertar placeholders para las secciones actuales
INSERT INTO public.documentos_sistemas (clave, titulo, url_drive)
VALUES 
('guia-inicio', 'Guía de Inicio', 'https://docs.google.com/document/d/1vAex25_WpXmFhL7_5YvN_WjU_7_0_0_0/edit'),
('normativa', 'Normativa General', 'https://docs.google.com/document/d/1vAex25_WpXmFhL7_5YvN_WjU_7_0_0_1/edit');
