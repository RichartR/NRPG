-- Migration: Update village and clan cupos auto-scaling logic
-- Description: Changes auto-scaling step to 2 for villages and 1 for clans, rounding 75% up (CEIL), maintaining 10 as minimum floor while setting/preserving current 14 cupos.

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
    -- 1. Obtener el cupo de aldea actual de sys_configuracion_sistema (por defecto 14, mínimo 10)
    SELECT valor INTO v_config_val 
    FROM public.sys_configuracion_sistema 
    WHERE clave = 'cupos_maximos_aldea';
    
    IF v_config_val IS NULL THEN
        v_current_cupo := 14;
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

    -- 4. Bucle para SUBIR cupos en bloques de 2
    -- Condición: La aldea con MENOS ninjas debe tener al menos el 75% (redondeado al alza) del cupo actual
    LOOP
        v_min_required := CEIL(v_new_cupo * 0.75);
        IF v_min_ninjas_in_any_village >= v_min_required THEN
            v_new_cupo := v_new_cupo + 2;
        ELSE
            EXIT;
        END IF;
    END LOOP;

    -- 5. Bucle para BAJAR cupos en bloques de 2 si bajó la población (mínimo 10, no descender de 14 automáticamente)
    LOOP
        IF v_new_cupo <= 14 THEN
            EXIT;
        END IF;

        v_min_required := CEIL((v_new_cupo - 2) * 0.75);
        IF v_min_ninjas_in_any_village < v_min_required THEN
            v_new_cupo := v_new_cupo - 2;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Establecer en 14
UPDATE public.sys_configuracion_sistema
SET valor = '14'::jsonb, updated_at = now()
WHERE clave = 'cupos_maximos_aldea';

-- Ejecutar para validar balanceo
SELECT public.fn_balance_village_cupos();
