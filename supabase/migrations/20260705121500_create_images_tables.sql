-- Create table for room images (markers)
CREATE TABLE IF NOT EXISTS public.mapa_salas_imagenes (
  marcador_id UUID PRIMARY KEY REFERENCES public.mapa_marcadores(id) ON DELETE CASCADE,
  imagen_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for room images
ALTER TABLE public.mapa_salas_imagenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on mapa_salas_imagenes" ON public.mapa_salas_imagenes FOR SELECT USING (true);
CREATE POLICY "Allow admin write access on mapa_salas_imagenes" ON public.mapa_salas_imagenes FOR ALL USING (true) WITH CHECK (true);

-- Create table for connection images referencing connection ID
CREATE TABLE IF NOT EXISTS public.mapa_conexiones_imagenes (
  conexion_id UUID PRIMARY KEY REFERENCES public.mapa_conexiones(id) ON DELETE CASCADE,
  imagen_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for connection images
ALTER TABLE public.mapa_conexiones_imagenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on mapa_conexiones_imagenes" ON public.mapa_conexiones_imagenes FOR SELECT USING (true);
CREATE POLICY "Allow admin write access on mapa_conexiones_imagenes" ON public.mapa_conexiones_imagenes FOR ALL USING (true) WITH CHECK (true);
