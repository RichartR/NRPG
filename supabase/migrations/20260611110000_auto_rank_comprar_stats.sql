-- ====================================================================
-- RANGO AUTOMÁTICO AL COMPRAR STATS
-- ====================================================================

-- 1. Función para calcular el rango automático basado en la base de datos
CREATE OR REPLACE FUNCTION public.fn_calcular_rango_personaje(p_personaje_id integer, p_puntos_stats integer)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_rango_actual character varying := 'D';
    v_rango_candidato character varying;
    v_min_threshold integer;
    v_req_basicas integer;
    v_player_basica_count integer;
    v_rules jsonb;
    v_order jsonb;
    v_sorted_ranks record;
    
    -- Datos del personaje
    v_player_branches integer[];
    v_player_subspecs integer[];
    v_player_elements integer[];
    v_player_techs integer[];
    
    -- Validaciones de Ninjutsu y técnicas obligatorias
    v_is_nin_ii_or_iii boolean := false;
    v_mandatory_tech_count integer;
    v_matching_tech_count integer;
BEGIN
    -- Obtener reglas y orden desde la configuración del sistema
    SELECT valor INTO v_rules FROM sys_configuracion_sistema WHERE clave = 'rango_stats_rules';
    SELECT valor INTO v_order FROM sys_configuracion_sistema WHERE clave = 'orden-rangos';
    
    IF v_rules IS NULL OR v_order IS NULL THEN
        RETURN 'D';
    END IF;

    -- Obtener ramas y subespecialidades activas del personaje
    SELECT array_agg(DISTINCT rama_id::integer) FILTER (WHERE rama_id IS NOT NULL),
           array_agg(DISTINCT sub_especialidad_id::integer) FILTER (WHERE sub_especialidad_id IS NOT NULL)
    INTO v_player_branches, v_player_subspecs
    FROM reg_personajes_ramas
    WHERE personaje_id = p_personaje_id;
    
    -- Obtener elementos del personaje
    SELECT array_agg(DISTINCT elem)
    INTO v_player_elements
    FROM (
        SELECT elemento_principal_id::integer AS elem FROM reg_personajes_ramas WHERE personaje_id = p_personaje_id AND elemento_principal_id IS NOT NULL
        UNION
        SELECT elemento_secundario_id::integer AS elem FROM reg_personajes_ramas WHERE personaje_id = p_personaje_id AND elemento_secundario_id IS NOT NULL
        UNION
        SELECT elemento_terciario_id::integer AS elem FROM reg_personajes_ramas WHERE personaje_id = p_personaje_id AND elemento_terciario_id IS NOT NULL
    ) q;

    -- Valores por defecto para evitar arrays nulos
    IF v_player_branches IS NULL THEN v_player_branches := ARRAY[]::integer[]; END IF;
    IF v_player_subspecs IS NULL THEN v_player_subspecs := ARRAY[]::integer[]; END IF;
    IF v_player_elements IS NULL THEN v_player_elements := ARRAY[]::integer[]; END IF;

    -- Técnicas aprendidas por el personaje
    SELECT array_agg(tecnica_id::integer)
    INTO v_player_techs
    FROM reg_personajes_tecnicas
    WHERE personaje_id = p_personaje_id;
    
    IF v_player_techs IS NULL THEN v_player_techs := ARRAY[]::integer[]; END IF;

    -- Comprobar si tiene Ninjutsu II o III activo
    SELECT EXISTS (
        SELECT 1 
        FROM reg_personajes_ramas r
        JOIN info_sub_especialidades s ON s.id = r.sub_especialidad_id
        WHERE r.personaje_id = p_personaje_id 
          AND r.rama_id = 4 
          AND s.slug IN ('ninjutsu-ii', 'ninjutsu-iii')
    ) INTO v_is_nin_ii_or_iii;

    -- Iterar por los rangos en orden ascendente según configuración
    FOR v_sorted_ranks IN 
        SELECT key AS r_key, (value->>'min')::integer AS min_threshold
        FROM jsonb_each(v_rules)
        ORDER BY (v_order->>key)::integer ASC
    LOOP
        v_rango_candidato := v_sorted_ranks.r_key;
        v_min_threshold := v_sorted_ranks.min_threshold;
        
        -- Si los puntos de estadísticas son menores que el mínimo para este rango, nos detenemos aquí
        IF p_puntos_stats < v_min_threshold THEN
            EXIT;
        END IF;

        -- Si intentamos pasar de rango, validamos técnicas obligatorias del rango actual
        IF v_rango_actual <> v_rango_candidato THEN
            
            -- A) Si es Nin II/III, requerir el máximo de técnicas básicas permitidas del rango actual
            v_req_basicas := COALESCE((v_rules->v_rango_actual->>'basicas_requeridas')::integer, 0);
            IF v_is_nin_ii_or_iii AND v_req_basicas > 0 THEN
                SELECT COUNT(*)
                INTO v_player_basica_count
                FROM reg_personajes_tecnicas pt
                JOIN info_glosario tg ON tg.id = pt.tecnica_id
                WHERE pt.personaje_id = p_personaje_id
                  AND tg.activo = true
                  AND tg.rama_clan_id = 4
                  AND tg.basica = true
                  AND (tg.rango = v_rango_actual OR tg.requisitos->>'rango' = v_rango_actual);

                IF v_player_basica_count < v_req_basicas THEN
                    EXIT; -- Bloqueado por no alcanzar el número de básicas requeridas
                END IF;
            END IF;

            -- B) Validar resto de técnicas obligatorias (generales u otras ramas no Ninjutsu Básico)
            SELECT COUNT(*),
                   COALESCE(SUM(CASE WHEN t.id = ANY(v_player_techs) THEN 1 ELSE 0 END), 0)
            INTO v_mandatory_tech_count, v_matching_tech_count
            FROM info_glosario t
            WHERE t.activo = true
              AND (t.rango = v_rango_actual OR t.requisitos->>'rango' = v_rango_actual)
              AND (t.obligatoria_ascenso = true OR t.requisitos->>'obligatoria_ascenso' = 'true')
              -- Excluir técnicas de Ninjutsu Básico si es Nin II/III (ya validadas arriba cuantitativamente)
              AND NOT (v_is_nin_ii_or_iii AND t.rama_clan_id = 4 AND t.basica = true)
              AND (
                (t.rama_clan_id IS NULL AND t.sub_especialidad_id IS NULL AND t.elemento_id IS NULL)
                OR (t.rama_clan_id IS NOT NULL AND t.rama_clan_id = ANY(v_player_branches))
                OR (t.sub_especialidad_id IS NOT NULL AND t.sub_especialidad_id = ANY(v_player_subspecs))
                OR (t.elemento_id IS NOT NULL AND t.elemento_id = ANY(v_player_elements))
              );
              
            -- Si no tiene todas las técnicas obligatorias de la etapa anterior, no puede ascender más
            IF v_matching_tech_count < v_mandatory_tech_count THEN
                EXIT;
            END IF;
        END IF;
        
        v_rango_actual := v_rango_candidato;
    END LOOP;

    RETURN v_rango_actual;
END;
$function$;


-- 2. Actualizar la función comprar_puntos_stat para recalcular el rango y persistir/registrar cambios
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

    -- Recalculate rank automatically
    v_nuevo_rango := public.fn_calcular_rango_personaje(p_personaje_id, v_current_stat + p_cantidad);
    
    IF v_nuevo_rango <> v_rango_anterior THEN
        -- Actualizar rango del personaje
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
