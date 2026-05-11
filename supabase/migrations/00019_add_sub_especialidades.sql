-- 1. Crear tabla de sub-especialidades (3er nivel)
CREATE TABLE IF NOT EXISTS public.sub_especialidades (
    id BIGSERIAL PRIMARY KEY,
    rama_id BIGINT REFERENCES public.ramas_clanes(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL,
    descripcion TEXT,
    url_icono TEXT,
    activo BOOLEAN DEFAULT true,
    UNIQUE(rama_id, slug)
);

-- 2. Modificar documentos_combate para que apunte a la sub-especialidad opcionalmente
ALTER TABLE public.documentos_combate 
ADD COLUMN IF NOT EXISTS sub_especialidad_id BIGINT REFERENCES public.sub_especialidades(id) ON DELETE SET NULL;

-- 3. Habilitar RLS
ALTER TABLE public.sub_especialidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de sub_especialidades" ON public.sub_especialidades FOR SELECT USING (true);
