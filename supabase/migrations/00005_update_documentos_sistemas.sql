-- Añadir columnas de metadata a documentos_sistemas
ALTER TABLE public.documentos_sistemas 
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS descripcion TEXT,
ADD COLUMN IF NOT EXISTS icono TEXT DEFAULT 'FileText';

-- Actualizar los documentos existentes para la sección de Bienvenida
UPDATE public.documentos_sistemas 
SET 
  categoria = 'bienvenida',
  descripcion = 'Todo lo que necesitas saber para empezar tu aventura ninja desde cero.',
  icono = 'BookOpen'
WHERE clave = 'guia-inicio';

UPDATE public.documentos_sistemas 
SET 
  categoria = 'bienvenida',
  descripcion = 'Reglas de convivencia, combate y comportamiento dentro del RPG.',
  icono = 'ShieldCheck'
WHERE clave = 'normativa';

-- Insertar un ejemplo para la sección de Sistemas
INSERT INTO public.documentos_sistemas (titulo, clave, url_drive, categoria, descripcion, icono)
VALUES (
  'Sistema de Combate 2.0', 
  'combate-tecnico', 
  'https://docs.google.com/document/d/1X-example-id/edit', 
  'sistemas', 
  'Guía detallada sobre turnos, acciones, estados alterados y cálculo de daño.', 
  'Zap'
) ON CONFLICT (clave) DO NOTHING;

-- Comentario para el registro
COMMENT ON COLUMN public.documentos_sistemas.categoria IS 'Categoría para agrupar documentos (ej: bienvenida, sistemas, mundo)';
COMMENT ON COLUMN public.documentos_sistemas.icono IS 'Nombre del icono de Lucide a renderizar';
