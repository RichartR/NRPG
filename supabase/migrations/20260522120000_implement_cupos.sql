-- Migration: Implement village and clan cupos/slots system
-- Description: Adds categories for villages, es_especial flag for clans, cupos configurations, and database trigger to auto-scale village cupos.

-- 1. Create info_categorias_aldeas table
CREATE TABLE IF NOT EXISTS public.info_categorias_aldeas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Populate categories
INSERT INTO public.info_categorias_aldeas (id, nombre)
VALUES (1, 'Aldea'), (2, 'Organización')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- 2. Add categoria_id to info_aldeas
ALTER TABLE public.info_aldeas 
ADD COLUMN IF NOT EXISTS categoria_id INT REFERENCES public.info_categorias_aldeas(id) DEFAULT 1;

-- Ensure existing villages are set to 'Aldea' (id = 1)
UPDATE public.info_aldeas
SET categoria_id = 1
WHERE categoria_id IS NULL;

-- 3. Add es_especial to info_ramas_clanes
ALTER TABLE public.info_ramas_clanes 
ADD COLUMN IF NOT EXISTS es_especial BOOLEAN DEFAULT false;

-- 4. Setup parameters in sys_configuracion_sistema
-- cupos_maximos_organizacion
INSERT INTO public.sys_configuracion_sistema (clave, titulo, valor, descripcion)
VALUES (
  'cupos_maximos_organizacion',
  'Cupos máximos por organización',
  '10'::jsonb,
  'Número máximo de personajes activos permitidos por cada organización (estático).'
)
ON CONFLICT (clave) DO NOTHING;

-- Force cupos_maximos_aldea to start at 10 (or keep current if it is valid, but set to 10 as default initial value)
INSERT INTO public.sys_configuracion_sistema (clave, titulo, valor, descripcion)
VALUES (
  'cupos_maximos_aldea',
  'Cupos máximos por aldea',
  '10'::jsonb,
  'Número máximo de personajes activos permitidos por cada aldea oculta (se muestra como Actuales/Máximo en Mundo Ninja).'
)
ON CONFLICT (clave) DO UPDATE SET valor = '10'::jsonb;

-- Drop old trigger/functions to allow change in return type
DROP TRIGGER IF EXISTS tr_balance_village_cupos ON public.reg_characters;
DROP TRIGGER IF EXISTS tr_balance_village_cupos_on_village ON public.info_aldeas;
DROP FUNCTION IF EXISTS public.fn_balance_village_cupos();
DROP FUNCTION IF EXISTS public.fn_balance_village_cupos_on_village_change();
DROP FUNCTION IF EXISTS public.fn_balance_village_cupos_on_character_change();

-- 5. Auto-scaling Logic Function (returns void)
CREATE OR REPLACE FUNCTION public.fn_balance_village_cupos()
RETURNS void AS $$
DECLARE
    v_active_villages_count INT;
    v_total_characters INT;
    v_current_cupo INT;
    v_new_cupo INT;
    v_config_val JSONB;
BEGIN
    -- 1. Obtener el cupo de aldea actual de sys_configuracion_sistema
    SELECT valor INTO v_config_val 
    FROM public.sys_configuracion_sistema 
    WHERE clave = 'cupos_maximos_aldea';
    
    IF v_config_val IS NULL THEN
        v_current_cupo := 10;
    ELSE
        -- Convert JSONB value to integer safely
        v_current_cupo := (v_config_val::text)::int;
    END IF;

    -- Si v_current_cupo es menor a 10 por algún motivo, forzar a 10
    IF v_current_cupo < 10 THEN
        v_current_cupo := 10;
    END IF;

    -- 2. Contar cantidad de aldeas activas marcadas como categoria 1 (Aldea)
    SELECT COUNT(*) INTO v_active_villages_count
    FROM public.info_aldeas
    WHERE activo = true AND (categoria_id = 1 OR categoria_id IS NULL);

    -- Si no hay aldeas activas, salir para evitar división por cero o errores
    IF v_active_villages_count = 0 THEN
        RETURN;
    END IF;

    -- 3. Contar total de personajes activos en aldeas activas marcadas como categoria 1 (Aldea)
    -- Se incluyen personajes activos OR inactivos por inactividad de menos de 6 meses
    SELECT COUNT(*) INTO v_total_characters
    FROM public.reg_characters rc
    JOIN public.info_aldeas ia ON rc.aldea_id = ia.id
    WHERE rc.eliminado_voluntario = false
      AND (rc.activo = true OR (rc.activo = false AND rc.archived_at > NOW() - INTERVAL '6 months'))
      AND ia.activo = true 
      AND (ia.categoria_id = 1 OR ia.categoria_id IS NULL);

    v_new_cupo := v_current_cupo;
    
    -- 4. Aplicar lógica de aumento (cuando total >= (N * cupo) - 5)
    WHILE v_total_characters >= (v_active_villages_count * v_new_cupo) - 5 LOOP
        v_new_cupo := v_new_cupo + 5;
    END LOOP;

    -- 5. Aplicar lógica de reducción (cuando total <= ((cupo - 5) * N) - 10)
    -- Y con un mínimo de 10.
    WHILE v_new_cupo > 10 AND v_total_characters <= ((v_new_cupo - 5) * v_active_villages_count) - 10 LOOP
        v_new_cupo := v_new_cupo - 5;
    END LOOP;

    -- 6. Si el cupo cambió, actualizar sys_configuracion_sistema
    IF v_new_cupo != v_current_cupo THEN
        UPDATE public.sys_configuracion_sistema
        SET valor = to_jsonb(v_new_cupo), updated_at = now()
        WHERE clave = 'cupos_maximos_aldea';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Wrapper for character trigger
CREATE OR REPLACE FUNCTION public.fn_balance_village_cupos_on_character_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.fn_balance_village_cupos();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Wrapper for village trigger
CREATE OR REPLACE FUNCTION public.fn_balance_village_cupos_on_village_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.fn_balance_village_cupos();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Create Triggers
-- On reg_characters
CREATE TRIGGER tr_balance_village_cupos
AFTER INSERT OR UPDATE OF aldea_id, activo, eliminado_voluntario OR DELETE
ON public.reg_characters
FOR EACH ROW
EXECUTE FUNCTION public.fn_balance_village_cupos_on_character_change();

-- On info_aldeas
CREATE TRIGGER tr_balance_village_cupos_on_village
AFTER INSERT OR UPDATE OF activo, categoria_id OR DELETE
ON public.info_aldeas
FOR EACH ROW
EXECUTE FUNCTION public.fn_balance_village_cupos_on_village_change();

-- Execute immediately to perform initial balancing based on current DB state
SELECT public.fn_balance_village_cupos();
