-- Max shinobi slots per hidden village (editable in sys_configuracion_sistema)
INSERT INTO public.sys_configuracion_sistema (clave, titulo, valor, descripcion)
VALUES (
  'cupos_maximos_aldea',
  'Cupos máximos por aldea',
  '30'::jsonb,
  'Número máximo de personajes activos permitidos por cada aldea oculta (se muestra como Actuales/Máximo en Mundo Ninja).'
)
ON CONFLICT (clave) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  valor = EXCLUDED.valor,
  descripcion = EXCLUDED.descripcion,
  updated_at = now();
