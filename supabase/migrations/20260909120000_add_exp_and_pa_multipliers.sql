-- Migration: 20260909120000_add_exp_and_pa_multipliers.sql
-- Description: Añade variables de sistema para multiplicadores independientes de EXP y PA

SELECT setval('configuracion_sistema_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sys_configuracion_sistema));

INSERT INTO sys_configuracion_sistema (clave, titulo, descripcion, valor)
VALUES (
  'multiplicador_exp',
  'Multiplicador de Experiencia',
  'Multiplicador aplicable a jugadores cuya EXP acumulada sea menor o igual al porcentaje establecido respecto al límite de EXP.',
  '[{"multiplicador": 1.5, "porcentaje": 50}]'::jsonb
)
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

INSERT INTO sys_configuracion_sistema (clave, titulo, descripcion, valor)
VALUES (
  'multiplicador_pa',
  'Multiplicador de Puntos de Aprendizaje (PA)',
  'Multiplicador aplicable a jugadores cuyo PA acumulado sea menor o igual al porcentaje establecido respecto al límite de PA.',
  '[{"multiplicador": 1.5, "porcentaje": 50}]'::jsonb
)
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
