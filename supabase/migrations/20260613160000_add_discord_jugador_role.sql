-- Insertar la clave de configuración para el rol de jugador en Discord
INSERT INTO public.sys_configuracion_sistema (clave, titulo, valor, descripcion)
VALUES (
  'discord_jugador_role_id',
  'ID del Rol de Discord para Jugadores',
  '""',
  'ID del Rol de Discord asignado a los jugadores que tienen un personaje activo en la web'
)
ON CONFLICT (clave) DO NOTHING;
