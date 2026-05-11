-- Crear la tabla de documentos de combate
CREATE TABLE IF NOT EXISTS public.documentos_combate (
    id BIGSERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    clave TEXT UNIQUE NOT NULL, -- slug del documento específico
    descripcion TEXT,
    url_drive TEXT NOT NULL,
    
    -- Relación con la rama o clan al que pertenece
    rama_id BIGINT REFERENCES public.ramas_clanes(id) ON DELETE CASCADE,
    
    -- El agrupador (Katon, Bujutsu, etc.)
    agrupador TEXT,
    
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.documentos_combate ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública
CREATE POLICY "Lectura pública de documentos_combate" 
ON public.documentos_combate FOR SELECT USING (true);
