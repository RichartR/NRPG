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
    v_current_cupo INT;
    v_new_cupo INT;
    v_config_val JSONB;
    v_min_required INT;
    v_min_ninjas_in_any_village INT;
    v_active_villages_count INT;
BEGIN
    -- 1. Obtener el cupo de aldea actual de sys_configuracion_sistema (por defecto 10, mínimo 10)
    SELECT valor INTO v_config_val 
    FROM public.sys_configuracion_sistema 
    WHERE clave = 'cupos_maximos_aldea';
    
    IF v_config_val IS NULL THEN
        v_current_cupo := 10;
    ELSE
        v_current_cupo := (v_config_val::text)::int;
    END IF;

    IF v_current_cupo < 10 THEN
        v_current_cupo := 10;
    END IF;

    -- 2. Verificar cuántas aldeas activas de categoría 1 (Aldea) existen
    SELECT COUNT(*) INTO v_active_villages_count
    FROM public.info_aldeas
    WHERE activo = true AND (categoria_id = 1 OR categoria_id IS NULL);

    IF v_active_villages_count = 0 THEN
        RETURN;
    END IF;

    -- 3. Calcular la aldea activa que MENOS personajes activos tiene
    SELECT COALESCE(MIN(cnt), 0) INTO v_min_ninjas_in_any_village
    FROM (
        SELECT ia.id, COUNT(rc.id) AS cnt
        FROM public.info_aldeas ia
        LEFT JOIN public.reg_characters rc 
            ON rc.aldea_id = ia.id 
           AND rc.eliminado_voluntario = false
           AND (rc.activo = true OR (rc.activo = false AND rc.archived_at > NOW() - INTERVAL '6 months'))
        WHERE ia.activo = true AND (ia.categoria_id = 1 OR ia.categoria_id IS NULL)
        GROUP BY ia.id
    ) village_counts;

    v_new_cupo := v_current_cupo;

    -- 4. Bucle para SUBIR cupos en bloques de 5
    -- Condición: La aldea con MENOS ninjas debe tener al menos el 75% (redondeado a la baja) del cupo actual
    LOOP
        v_min_required := FLOOR(v_new_cupo * 0.75);
        IF v_min_ninjas_in_any_village >= v_min_required THEN
            v_new_cupo := v_new_cupo + 5;
        ELSE
            EXIT;
        END IF;
    END LOOP;

    -- 5. Bucle para BAJAR cupos en bloques de 5 si bajó la población (mínimo 10)
    -- Si la aldea con menos ninjas cae por debajo del 75% (redondeado a la baja) del escalón anterior
    LOOP
        IF v_new_cupo <= 10 THEN
            EXIT;
        END IF;
        v_min_required := FLOOR((v_new_cupo - 5) * 0.75);
        IF v_min_ninjas_in_any_village < v_min_required THEN
            v_new_cupo := v_new_cupo - 5;
        ELSE
            EXIT;
        END IF;
    END LOOP;

    -- 6. Actualizar sys_configuracion_sistema si hubo cambios
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
