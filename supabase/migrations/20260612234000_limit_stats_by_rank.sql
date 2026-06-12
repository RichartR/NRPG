-- Migration: limit stats by rank requirements when buying stats
CREATE OR REPLACE FUNCTION public.comprar_puntos_stat(p_personaje_id integer, p_cantidad integer, p_coste_exp_total integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_character_user_id uuid;
    v_is_admin boolean;
    v_char_nombre text;
    v_char_xp integer;
    v_current_stat integer;
    v_costes_json jsonb;
    v_total_calculated_exp integer := 0;
    v_cost_for_level integer;
    v_registro_id bigint;
    i integer;
    
    -- Variables para recalculación de rango
    v_rango_anterior character varying;
    v_nuevo_rango character varying;
    v_rango_order jsonb;
    v_old_rank_idx integer;
    v_new_rank_idx integer;
    v_verb text;
    v_rango_registro_id bigint;

    -- Variables para validar límites
    v_rules jsonb;
    v_max_stats integer;
BEGIN
    -- Basic authentication check
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    -- Load character details
    SELECT user_id, nombre_ninja, xp, puntos_stats, rango 
    INTO v_character_user_id, v_char_nombre, v_char_xp, v_current_stat, v_rango_anterior
    FROM reg_characters 
    WHERE id = p_personaje_id AND activo = true AND eliminado_voluntario = false;

    IF v_character_user_id IS NULL THEN
        RAISE EXCEPTION 'El personaje no existe o no está activo';
    END IF;

    -- Verify authorization (owner or admin)
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin'
    ) INTO v_is_admin;

    IF v_character_user_id <> v_user_id AND NOT v_is_admin THEN
        RAISE EXCEPTION 'No autorizado para realizar esta compra';
    END IF;

    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad de puntos a comprar debe ser mayor que 0';
    END IF;

    -- Fetch cost table
    SELECT valor INTO v_costes_json
    FROM sys_configuracion_sistema
    WHERE clave = 'tienda_experiencia_costes';

    IF v_costes_json IS NULL THEN
        RAISE EXCEPTION 'Configuración de costes de stat de experiencia no encontrada';
    END IF;

    -- Sum up costs dynamically for each incremental point
    FOR i IN 1..p_cantidad LOOP
        v_cost_for_level := (v_costes_json->>((v_current_stat + i)::text))::integer;
        
        IF v_cost_for_level IS NULL THEN
            RAISE EXCEPTION 'El nivel de stat % no está configurado en la tabla de costes', (v_current_stat + i);
        END IF;
        
        v_total_calculated_exp := v_total_calculated_exp + v_cost_for_level;
    END LOOP;

    -- Validate against client-sent cost to prevent mismatch/cheating
    IF v_total_calculated_exp <> p_coste_exp_total THEN
        RAISE EXCEPTION 'El coste de experiencia calculado (%) no coincide con el enviado (%)', v_total_calculated_exp, p_coste_exp_total;
    END IF;

    -- Check if character has enough experience points
    IF v_char_xp < v_total_calculated_exp THEN
        RAISE EXCEPTION 'Experiencia insuficiente. Se necesitan % EXP, tienes % EXP', v_total_calculated_exp, v_char_xp;
    END IF;

    -- Calculate the resulting rank based on target stats first
    v_nuevo_rango := public.fn_calcular_rango_personaje(p_personaje_id, v_current_stat + p_cantidad);

    -- Fetch rank rules and check max stats limit
    SELECT valor INTO v_rules
    FROM sys_configuracion_sistema
    WHERE clave = 'rango_stats_rules';

    IF v_rules IS NOT NULL AND v_nuevo_rango IS NOT NULL THEN
        v_max_stats := (v_rules->v_nuevo_rango->>'max')::integer;
        IF v_max_stats IS NOT NULL AND (v_current_stat + p_cantidad) > v_max_stats THEN
            RAISE EXCEPTION 'No puedes superar el límite de % puntos de stat en el rango % sin cumplir los requisitos de técnicas obligatorias para ascender.', v_max_stats, v_nuevo_rango;
        END IF;
    END IF;

    -- Deduct EXP and increment character's total stats points
    UPDATE reg_characters
    SET xp = xp - v_total_calculated_exp,
        puntos_stats = puntos_stats + p_cantidad
    WHERE id = p_personaje_id;

    -- Log action in the global history records (reg_registros)
    INSERT INTO reg_registros (tipo, subtipo, autor_id, data, fecha)
    VALUES (
        'compra',
        'tienda',
        p_personaje_id,
        jsonb_build_object(
            'titulo', v_char_nombre || ' compra ' || p_cantidad || ' punto(s) de stat',
            'objeto_nombre', '+' || p_cantidad || ' Puntos de Stat',
            'glosario_id', null,
            'coste_ryous', 0,
            'coste_exp', v_total_calculated_exp,
            'coste_moneda_evento', 0,
            'categoria_id', null,
            'detalles', 'Nivel de stat aumentado de ' || v_current_stat || ' a ' || (v_current_stat + p_cantidad)
        ),
        now()
    )
    RETURNING id INTO v_registro_id;

    -- Link participant
    INSERT INTO reg_registros_participantes (registro_id, personaje_id, estado)
    VALUES (v_registro_id, p_personaje_id, 'aceptado');

    -- Update character's rank if changed
    IF v_nuevo_rango <> v_rango_anterior THEN
        UPDATE reg_characters SET rango = v_nuevo_rango WHERE id = p_personaje_id;
        
        -- Obtener orden de rangos
        SELECT valor INTO v_rango_order FROM sys_configuracion_sistema WHERE clave = 'orden-rangos';
        v_old_rank_idx := (v_rango_order->>v_rango_anterior)::integer;
        v_new_rank_idx := (v_rango_order->>v_nuevo_rango)::integer;
        
        IF v_new_rank_idx > v_old_rank_idx THEN
            v_verb := 'asciende a';
        ELSE
            v_verb := 'desciende a';
        END IF;
        
        -- Registrar ascenso en el historial
        INSERT INTO reg_registros (tipo, subtipo, autor_id, data, fecha)
        VALUES (
            'accion',
            null,
            p_personaje_id,
            jsonb_build_object(
                'titulo', v_char_nombre || ' ' || v_verb || ' rango ' || v_nuevo_rango,
                'tipo_accion', 'cambio_rango',
                'rango_anterior', v_rango_anterior,
                'rango_nuevo', v_nuevo_rango
            ),
            now()
        )
        RETURNING id INTO v_rango_registro_id;
        
        INSERT INTO reg_registros_participantes (registro_id, personaje_id, estado)
        VALUES (v_rango_registro_id, p_personaje_id, 'aceptado');
    END IF;

    -- Return result payload
    RETURN jsonb_build_object(
        'success', true,
        'registro_id', v_registro_id,
        'nuevo_puntos_stats', v_current_stat + p_cantidad,
        'restante_xp', v_char_xp - v_total_calculated_exp,
        'nuevo_rango', v_nuevo_rango
    );
END;
$function$;
