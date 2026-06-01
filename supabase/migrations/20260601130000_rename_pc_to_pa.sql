-- 1. Rename column in reg_characters
ALTER TABLE public.reg_characters 
RENAME COLUMN puntos_combate TO puntos_aprendizaje;

-- 2. Rename column in info_entrenamientos
ALTER TABLE public.info_entrenamientos 
RENAME COLUMN coste_puntos_combate TO coste_puntos_aprendizaje;

-- 3. Add columns to info_misiones
ALTER TABLE public.info_misiones 
ADD COLUMN IF NOT EXISTS pa_recompensa INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pa_recompensa_fallida INTEGER DEFAULT 0;

-- 4. Initialize reward values in info_misiones
UPDATE public.info_misiones SET pa_recompensa = 1, pa_recompensa_fallida = 0 WHERE rango = 'D';
UPDATE public.info_misiones SET pa_recompensa = 3, pa_recompensa_fallida = 2 WHERE rango = 'C';
UPDATE public.info_misiones SET pa_recompensa = 5, pa_recompensa_fallida = 3 WHERE rango = 'B';
UPDATE public.info_misiones SET pa_recompensa = 10, pa_recompensa_fallida = 5 WHERE rango = 'A';
UPDATE public.info_misiones SET pa_recompensa = 15, pa_recompensa_fallida = 8 WHERE rango = 'S';

-- 5. Insert new key for points config in sys_configuracion_sistema
INSERT INTO public.sys_configuracion_sistema (clave, titulo, valor, descripcion)
VALUES (
  'puntos_aprendizaje_combates',
  'Puntos de Aprendizaje (PA) de Combates',
  '{
    "victoria": {
      "mas_2": 4,
      "mas_1": 3,
      "igual": 2,
      "menos_1": 1,
      "menos_2": 0
    },
    "derrota": {
      "mas_2": 2,
      "mas_1": 2,
      "igual": 1,
      "menos_1": 1,
      "menos_2": 0
    }
  }'::jsonb,
  'Configuración de puntos de aprendizaje (PA) otorgados en combates PvP según el resultado (victoria/derrota) y la diferencia de rangos.'
)
ON CONFLICT (clave) DO UPDATE 
SET valor = EXCLUDED.valor, 
    titulo = EXCLUDED.titulo, 
    descripcion = EXCLUDED.descripcion;
