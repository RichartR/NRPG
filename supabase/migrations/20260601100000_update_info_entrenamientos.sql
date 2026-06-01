-- Migration: Add flexible fields to info_entrenamientos
-- Description: Adds rango, requisitos, and cost columns to info_entrenamientos table, and seeds initial values for iryo-nin.

-- 1. Alter table to add fields
ALTER TABLE public.info_entrenamientos 
ADD COLUMN IF NOT EXISTS rango TEXT DEFAULT 'B',
ADD COLUMN IF NOT EXISTS requisitos JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS coste_exp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS coste_ryous INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS coste_puntos_combate INTEGER DEFAULT 0;

-- 2. Insert trainings for Iryo-nin (id_ramaclan = 5)
-- One in rango C and one in rango B
INSERT INTO public.info_entrenamientos (id_ramaclan, id_subespecialidad, nombre_esp, nombre_jp, activo, rango, requisitos, coste_exp, coste_ryous, coste_puntos_combate)
VALUES 
(5, null, 'Entrenamiento Médico Básico', 'Iryō Shugyō (C)', true, 'C', '{"rango": "C"}'::jsonb, 500, 1000, 5),
(5, null, 'Entrenamiento Médico Avanzado', 'Shinōnin (B)', true, 'B', '{"rango": "B"}'::jsonb, 1000, 2000, 10)
ON CONFLICT DO NOTHING;
