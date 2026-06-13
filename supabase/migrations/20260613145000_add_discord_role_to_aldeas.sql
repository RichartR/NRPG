-- Añadir columna id_rol_discord a la tabla info_aldeas
ALTER TABLE public.info_aldeas ADD COLUMN IF NOT EXISTS id_rol_discord TEXT;

-- Insertar la clave de configuración para el rol de renegado / sin aldea
INSERT INTO public.sys_configuracion_sistema (clave, titulo, valor, descripcion)
VALUES (
  'discord_renegado_role_id',
  'ID del Rol de Discord para Renegados',
  '""',
  'ID del Rol de Discord asignado a los personajes que no pertenecen a ninguna aldea o son renegados'
)
ON CONFLICT (clave) DO NOTHING;
