-- Añadir variable de configuración para el límite de Puntos de Aprendizaje (PA)
SELECT setval('configuracion_sistema_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sys_configuracion_sistema));

INSERT INTO sys_configuracion_sistema (clave, titulo, descripcion, valor)
VALUES (
  'pa_limit_usage',
  'Límite de Puntos de Aprendizaje',
  'Límite de puntos de aprendizaje (PA) que un personaje puede acumular',
  '100'::jsonb
)
ON CONFLICT (clave) DO NOTHING;
