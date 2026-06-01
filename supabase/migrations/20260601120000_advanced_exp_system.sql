-- =========================================================
-- Sistema de Recompensas Avanzado: Misiones y Combates
-- =========================================================

-- 1. Alterar tabla info_misiones para campos de fallida y configurables
ALTER TABLE public.info_misiones
  ADD COLUMN IF NOT EXISTS exp_fallida INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ryous_fallida INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS se_puede_fallar BOOLEAN NOT NULL DEFAULT false;

-- 2. Actualizar configuración de experiencia de combates (sys_configuracion_sistema)
UPDATE public.sys_configuracion_sistema
SET valor = '{
  "victoria": {
    "mas_2": 12,
    "mas_1": 10,
    "igual": 8,
    "menos_1": 4,
    "menos_2": 2
  },
  "derrota": {
    "mas_2": 6,
    "mas_1": 5,
    "igual": 4,
    "menos_1": 2,
    "menos_2": 1
  }
}'::jsonb
WHERE clave = 'experiencia_combates';

-- 3. Adaptar y sincronizar todas las misiones maestras existentes según la nueva tabla de EXP
-- Rango D: completada = 2, ryous = 100, se_puede_fallar = false
UPDATE public.info_misiones
SET exp = 2, ryous = 100, exp_fallida = 0, ryous_fallida = 0, se_puede_fallar = false
WHERE rango = 'D';

-- Rango C: completada = 4, ryous = 500, se_puede_fallar = false
UPDATE public.info_misiones
SET exp = 4, ryous = 500, exp_fallida = 0, ryous_fallida = 0, se_puede_fallar = false
WHERE rango = 'C';

-- Rango B: completada = 8, ryous = 2000, exp_fallida = 4, ryous_fallida = 1000, se_puede_fallar = true
UPDATE public.info_misiones
SET exp = 8, ryous = 2000, exp_fallida = 4, ryous_fallida = 1000, se_puede_fallar = true
WHERE rango = 'B';

-- Rango A: completada = 16, ryous = 10000, exp_fallida = 8, ryous_fallida = 5000, se_puede_fallar = true
UPDATE public.info_misiones
SET exp = 16, ryous = 10000, exp_fallida = 8, ryous_fallida = 5000, se_puede_fallar = true
WHERE rango = 'A';

-- Rango S: completada = 20, ryous = 50000, exp_fallida = 10, ryous_fallida = 25000, se_puede_fallar = true
UPDATE public.info_misiones
SET exp = 20, ryous = 50000, exp_fallida = 10, ryous_fallida = 25000, se_puede_fallar = true
WHERE rango = 'S';
