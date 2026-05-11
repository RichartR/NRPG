-- 1. Añadir columna de imagen a documentos
ALTER TABLE public.documentos_sistemas 
ADD COLUMN IF NOT EXISTS url_imagen TEXT;

-- 2. Asegurar que la tabla profiles tiene columna de rol
-- Si no existe, la añadimos con valor por defecto 'user'
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
  END IF;
END $$;

-- 3. Comentario informativo
COMMENT ON COLUMN public.documentos_sistemas.url_imagen IS 'URL de la imagen de portada (soporta Imgur con no-referrer)';
COMMENT ON COLUMN public.profiles.role IS 'Rol del usuario: user o admin';

-- 4. Ejemplo: Marcar tu usuario como admin (Opcional, deberás hacerlo con tu ID real)
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'TU-UUID-AQUI';
