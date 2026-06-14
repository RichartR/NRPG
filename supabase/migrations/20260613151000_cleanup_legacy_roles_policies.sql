-- Migration: Cleanup legacy role references in RLS policies and database functions
-- Description: Replaces direct checks on profiles.role = 'admin' with public.is_admin() or reg_roles checks, and migrates existing roles.

-- 1. Asegurar que todos los roles existentes de profiles se migren a reg_roles
INSERT INTO public.reg_roles (user_id, rol_id)
SELECT id, role FROM public.profiles
WHERE role IN ('admin', 'moderador', 'narrador', 'kage', 'delegado')
ON CONFLICT (user_id, rol_id) DO NOTHING;

-- 2. Redefinir la función is_admin() para que use reg_roles exclusivamente sin fallback a profiles.role
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $function$
 BEGIN
   RETURN EXISTS (
     SELECT 1 FROM public.reg_roles
     WHERE user_id = auth.uid() AND rol_id = 'admin'
   );
 END;
 $function$;

-- 3. Redefinir la función has_role() para que use reg_roles exclusivamente
CREATE OR REPLACE FUNCTION public.has_role(role_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $function$
 BEGIN
   RETURN EXISTS (
     SELECT 1 FROM public.reg_roles
     WHERE user_id = auth.uid() AND rol_id = role_name
   );
 END;
 $function$;

-- 4. Actualizar funciones de la base de datos para usar reg_roles / is_admin
-- realizar_compra_tienda
CREATE OR REPLACE FUNCTION public.realizar_compra_tienda(p_personaje_id bigint, p_tienda_objeto_id bigint, p_coste_exp_total integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id uuid;
    v_character_user_id uuid;
    v_is_admin boolean;
    v_tienda_id bigint;
    v_glosario_id bigint;
    v_coste_ryous integer;
    v_coste_exp integer;
    v_coste_moneda_evento integer;
    v_mantener_requisitos boolean;
    v_requisitos_personalizados jsonb;
    v_char_ryous integer;
    v_char_xp integer;
    v_char_moneda_evento integer;
    v_char_pa integer;
    v_glosario_cat_id bigint;
    v_glosario_nombre text;
    v_glosario_es_tienda_exp boolean;
    v_glosario_requisitos jsonb;
    v_coste_pa integer;
    v_final_requisitos jsonb;
    v_registro_id bigint;
    v_inv_tec_id bigint;
    v_moneda_evento_nombre text;
    v_char_nombre text;
BEGIN
    -- 1. Check authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    -- 2. Verify authorization
    SELECT user_id, nombre_ninja, ryous, xp, moneda_evento, puntos_aprendizaje
    INTO v_character_user_id, v_char_nombre, v_char_ryous, v_char_xp, v_char_moneda_evento, v_char_pa
    FROM reg_characters 
    WHERE id = p_personaje_id AND activo = true AND eliminado_voluntario = false;

    IF v_character_user_id IS NULL THEN
        RAISE EXCEPTION 'El personaje no existe o no está activo';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.reg_roles WHERE user_id = v_user_id AND rol_id = 'admin'
    ) INTO v_is_admin;

    IF v_character_user_id <> v_user_id AND NOT v_is_admin THEN
        RAISE EXCEPTION 'No autorizado para realizar esta compra';
    END IF;

    -- 3. Get shop item details
    SELECT tienda_id, glosario_id, coste_ryous, coste_exp, coste_moneda_evento, mantener_requisitos, requisitos_personalizados
    INTO v_tienda_id, v_glosario_id, v_coste_ryous, v_coste_exp, v_coste_moneda_evento, v_mantener_requisitos, v_requisitos_personalizados
    FROM reg_tiendas_objetos
    WHERE id = p_tienda_objeto_id;

    IF v_glosario_id IS NULL THEN
        RAISE EXCEPTION 'El artículo de la tienda no existe';
    END IF;

    -- 4. Get glosario details
    SELECT categoria_id, nombre_es, es_tienda_exp, requisitos, coste_puntos_aprendizaje
    INTO v_glosario_cat_id, v_glosario_nombre, v_glosario_es_tienda_exp, v_glosario_requisitos, v_coste_pa
    FROM info_glosario
    WHERE id = v_glosario_id;

    IF v_glosario_cat_id IS NULL THEN
        RAISE EXCEPTION 'El artículo del glosario no existe';
    END IF;

    -- 5. Determine which requirements to use
    IF v_mantener_requisitos THEN
        v_final_requisitos := v_glosario_requisitos;
    ELSE
        v_final_requisitos := v_requisitos_personalizados;
    END IF;

    -- 6. Check basic resource requirements
    IF v_char_ryous < v_coste_ryous THEN
        RAISE EXCEPTION 'Ryous insuficientes (Se necesitan %, tienes %)', v_coste_ryous, v_char_ryous;
    END IF;

    IF v_char_xp < v_coste_exp THEN
        RAISE EXCEPTION 'Experiencia insuficiente (Se necesita %, tienes %)', v_coste_exp, v_char_xp;
    END IF;

    IF v_char_pa < v_coste_pa THEN
        RAISE EXCEPTION 'Puntos de Aprendizaje (PA) insuficientes (Se necesitan %, tienes %)', v_coste_pa, v_char_pa;
    END IF;

    IF v_char_moneda_evento < v_coste_moneda_evento THEN
        -- Get custom coin name
        SELECT COALESCE(valor::text, '""Monedas de Evento""') INTO v_moneda_evento_nombre
        FROM sys_configuracion_sistema
        WHERE clave = 'moneda_evento_nombre';
        -- Remove quotes from json value
        v_moneda_evento_nombre := trim(both '""' from v_moneda_evento_nombre);
        RAISE EXCEPTION '% insuficientes (Se necesitan %, tienes %)', v_moneda_evento_nombre, v_coste_moneda_evento, v_char_moneda_evento;
    END IF;

    -- 7. Deduct resources
    UPDATE reg_characters
    SET ryous = ryous - v_coste_ryous,
        xp = xp - v_coste_exp,
        puntos_aprendizaje = puntos_aprendizaje - v_coste_pa,
        moneda_evento = moneda_evento - v_coste_moneda_evento
    WHERE id = p_personaje_id;

    -- 8. Add item/technique to character
    IF v_glosario_cat_id = 1 THEN
        -- Check if character already has this technique
        IF EXISTS (SELECT 1 FROM reg_personajes_tecnicas WHERE personaje_id = p_personaje_id AND tecnica_id = v_glosario_id) THEN
            RAISE EXCEPTION 'El personaje ya tiene esta técnica';
        END IF;

        INSERT INTO reg_personajes_tecnicas (personaje_id, tecnica_id)
        VALUES (p_personaje_id, v_glosario_id)
        RETURNING id INTO v_inv_tec_id;
    ELSE
        INSERT INTO public.reg_personajes_inventario (personaje_id, item_id)
        VALUES (p_personaje_id, v_glosario_id)
        RETURNING id INTO v_inv_tec_id;
    END IF;

    -- 9. Create global action log (reg_registros)
    INSERT INTO reg_registros (tipo, subtipo, autor_id, data, fecha)
    VALUES (
        'compra',
        'tienda',
        p_personaje_id,
        jsonb_build_object(
            'titulo', v_char_nombre || ' compra en tienda: ' || v_glosario_nombre,
            'objeto_nombre', v_glosario_nombre,
            'glosario_id', v_glosario_id,
            'coste_ryous', v_coste_ryous,
            'coste_exp', v_coste_exp,
            'coste_puntos_aprendizaje', v_coste_pa,
            'coste_moneda_evento', v_coste_moneda_evento,
            'categoria_id', v_glosario_cat_id
        ),
        now()
    )
    RETURNING id INTO v_registro_id;

    -- 10. Link participant to the record
    INSERT INTO reg_registros_participantes (registro_id, personaje_id, estado)
    VALUES (v_registro_id, p_personaje_id, 'aceptado');

    -- Return success payload
    RETURN jsonb_build_object(
        'success', true,
        'registro_id', v_registro_id,
        'inv_tec_id', v_inv_tec_id,
        'restante_ryous', v_char_ryous - v_coste_ryous,
        'restante_xp', v_char_xp - v_coste_exp,
        'restante_puntos_aprendizaje', v_char_pa - v_coste_pa,
        'restante_moneda_evento', v_char_moneda_evento - v_coste_moneda_evento
    );
END;
$function$;

-- reiniciar_personaje
CREATE OR REPLACE FUNCTION public.reiniciar_personaje(p_personaje_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id uuid;
    v_char_name text;
    v_xp integer;
    v_ryous integer;
    v_pa integer;
    v_moneda_evento integer;
    v_is_free boolean := false;
    v_config_inicio jsonb;
    
    -- Refund calculations
    v_refund jsonb;
    v_total_refund_ryous integer := 0;
    v_total_refund_xp integer := 0;
    v_total_refund_pa integer := 0;
    v_total_refund_moneda_evento integer := 0;
    v_rec record;
    
    -- Total resources
    v_total_xp integer;
    v_total_ryous integer;
    v_total_pa integer;
    v_total_moneda_evento integer;
    
    v_new_xp integer;
    v_new_ryous integer;
    v_new_pa integer;
    v_new_moneda_evento integer;
    v_registro_id bigint;
BEGIN
    -- 1. Check character and retrieve details
    SELECT user_id, nombre_ninja, xp, ryous, puntos_aprendizaje, moneda_evento
    INTO v_user_id, v_char_name, v_xp, v_ryous, v_pa, v_moneda_evento
    FROM public.reg_characters
    WHERE id = p_personaje_id AND activo = true AND eliminado_voluntario = false;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'El personaje no existe o no está activo';
    END IF;

    -- 2. Verify authorization (owner or admin)
    IF auth.uid() <> v_user_id AND NOT EXISTS (
        SELECT 1 FROM public.reg_roles WHERE user_id = auth.uid() AND rol_id = 'admin'
    ) THEN
        RAISE EXCEPTION 'No autorizado para reiniciar este personaje';
    END IF;

    -- 3. Calculate all refunds from currently bought/learned elements to get the total resources
    -- Items in inventory
    FOR v_rec IN SELECT item_id FROM public.reg_personajes_inventario WHERE personaje_id = p_personaje_id LOOP
        v_refund := public.calcular_reembolso_glosario(p_personaje_id, v_rec.item_id);
        v_total_refund_ryous := v_total_refund_ryous + COALESCE((v_refund->>'ryous')::int, 0);
        v_total_refund_xp := v_total_refund_xp + COALESCE((v_refund->>'xp')::int, 0);
        v_total_refund_pa := v_total_refund_pa + COALESCE((v_refund->>'pa')::int, 0);
        v_total_refund_moneda_evento := v_total_refund_moneda_evento + COALESCE((v_refund->>'moneda_evento')::int, 0);
    END LOOP;

    -- Techniques
    FOR v_rec IN SELECT tecnica_id FROM public.reg_personajes_tecnicas WHERE personaje_id = p_personaje_id LOOP
        v_refund := public.calcular_reembolso_glosario(p_personaje_id, v_rec.tecnica_id);
        v_total_refund_ryous := v_total_refund_ryous + COALESCE((v_refund->>'ryous')::int, 0);
        v_total_refund_xp := v_total_refund_xp + COALESCE((v_refund->>'xp')::int, 0);
        v_total_refund_pa := v_total_refund_pa + COALESCE((v_refund->>'pa')::int, 0);
        v_total_refund_moneda_evento := v_total_refund_moneda_evento + COALESCE((v_refund->>'moneda_evento')::int, 0);
    END LOOP;

    -- Trainings
    FOR v_rec IN SELECT entrenamiento_id FROM public.reg_personajes_entrenamientos WHERE personaje_id = p_personaje_id LOOP
        v_refund := public.calcular_reembolso_entrenamiento(p_personaje_id, v_rec.entrenamiento_id);
        v_total_refund_ryous := v_total_refund_ryous + COALESCE((v_refund->>'ryous')::int, 0);
        v_total_refund_xp := v_total_refund_xp + COALESCE((v_refund->>'xp')::int, 0);
        v_total_refund_pa := v_total_refund_pa + COALESCE((v_refund->>'pa')::int, 0);
        v_total_refund_moneda_evento := v_total_refund_moneda_evento + COALESCE((v_refund->>'moneda_evento')::int, 0);
    END LOOP;

    -- Sum up available + spent to get the total resources
    v_total_xp := v_xp + v_total_refund_xp;
    v_total_ryous := v_ryous + v_total_refund_ryous;
    v_total_pa := v_pa + v_total_refund_pa;
    v_total_moneda_evento := v_moneda_evento + v_total_refund_moneda_evento;

    -- 4. Check if free reset period is active
    SELECT COALESCE((valor::text)::boolean, false) INTO v_is_free
    FROM public.sys_configuracion_sistema
    WHERE clave = 'periodo_reseteos_gratuitos';

    -- 5. Calculate final resources based on the total resources
    IF v_is_free THEN
        v_new_xp := v_total_xp;
        v_new_ryous := v_total_ryous;
        v_new_pa := v_total_pa;
        v_new_moneda_evento := v_total_moneda_evento;
    ELSE
        -- 25% cost, keep 75%
        v_new_xp := floor(v_total_xp * 0.75);
        v_new_ryous := floor(v_total_ryous * 0.75);
        v_new_pa := floor(v_total_pa * 0.75);
        v_new_moneda_evento := floor(v_total_moneda_evento * 0.75);
    END IF;

    -- 6. Retrieve datos_inicio_ficha config
    SELECT valor INTO v_config_inicio
    FROM public.sys_configuracion_sistema
    WHERE clave = 'datos_inicio_ficha';

    IF v_config_inicio IS NULL THEN
        RAISE EXCEPTION 'Configuración de inicio de ficha no encontrada';
    END IF;

    -- 7. Wipe all character custom progress relationships
    DELETE FROM public.reg_personajes_ramas WHERE personaje_id = p_personaje_id;
    DELETE FROM public.reg_personajes_entrenamientos WHERE personaje_id = p_personaje_id;
    DELETE FROM public.reg_personajes_rasgos WHERE personaje_id = p_personaje_id;
    DELETE FROM public.reg_personajes_inventario WHERE personaje_id = p_personaje_id;
    DELETE FROM public.reg_personajes_tecnicas WHERE personaje_id = p_personaje_id;

    -- 8. Update character basic stats & resources
    UPDATE public.reg_characters
    SET
        xp = v_new_xp,
        ryous = v_new_ryous,
        puntos_aprendizaje = v_new_pa,
        moneda_evento = v_new_moneda_evento,
        rango = COALESCE(v_config_inicio->>'rango', 'D'),
        rango_jerarquico = COALESCE(v_config_inicio->>'rango_jerarquico', 'Estudiante'),
        stats_base = COALESCE(v_config_inicio->'stats_base', '{"SM":1,"AGI":1,"EST":1,"FUE":1,"GEN":1,"INT":1,"NIN":1,"TAI":1}'::jsonb),
        atributos_derivados = COALESCE(v_config_inicio->'atributos_derivados', '{"CH":0,"VR":1,"DET":1,"RES":0,"VEL":5,"VIT":600}'::jsonb),
        puntos_stats = COALESCE((v_config_inicio->>'puntos_stats')::integer, 8),
        edad = COALESCE((v_config_inicio->>'edad')::integer, 12)::text,
        aldea_id = NULL,
        aldea_updated_at = NOW()
    WHERE id = p_personaje_id;

    -- 9. Re-deliver basic glossary items & techniques
    -- Basic items (categoria_id = 2)
    INSERT INTO public.reg_personajes_inventario (personaje_id, item_id)
    SELECT p_personaje_id, id
    FROM public.info_glosario
    WHERE inicial = true
      AND activo = true
      AND categoria_id = 2
      AND (rama_clan_id IS NULL OR rama_clan_id = 0)
      AND (elemento_id IS NULL OR elemento_id = 0)
      AND (requisitos IS NULL OR (
        (requisitos->>'rama_id' IS NULL) AND
        (requisitos->>'elemento_id' IS NULL) AND
        (requisitos->>'rango' IS NULL OR requisitos->>'rango' = 'D')
      ));

    -- Basic techniques (categoria_id != 2)
    INSERT INTO public.reg_personajes_tecnicas (personaje_id, tecnica_id)
    SELECT p_personaje_id, id
    FROM public.info_glosario
    WHERE inicial = true
      AND activo = true
      AND categoria_id != 2
      AND (rama_clan_id IS NULL OR rama_clan_id = 0)
      AND (elemento_id IS NULL OR elemento_id = 0)
      AND (requisitos IS NULL OR (
        (requisitos->>'rama_id' IS NULL) AND
        (requisitos->>'elemento_id' IS NULL) AND
        (requisitos->>'rango' IS NULL OR requisitos->>'rango' = 'D')
      ));

    -- 10. Create action log
    INSERT INTO public.reg_registros (tipo, subtipo, autor_id, data, fecha)
    VALUES (
        'accion',
        'reseteo',
        p_personaje_id,
        jsonb_build_object(
            'titulo', v_char_name || ' ha reiniciado su personaje',
            'subtitulo', 'Recursos totales: ' || v_total_xp || ' XP, ' || v_total_ryous || ' Ryous, ' || v_total_pa || ' PA, ' || v_total_moneda_evento || ' Monedas de Evento. Conservados: ' || v_new_xp || ' XP, ' || v_new_ryous || ' Ryous, ' || v_new_pa || ' PA, ' || v_new_moneda_evento || ' Monedas de Evento',
            'tipo_accion', 'reinicio_personaje',
            'xp_total', v_total_xp,
            'ryous_totales', v_total_ryous,
            'pa_totales', v_total_pa,
            'monedas_evento_totales', v_total_moneda_evento,
            'xp_conservada', v_new_xp,
            'ryous_conservados', v_new_ryous,
            'pa_conservados', v_new_pa,
            'monedas_evento_conservadas', v_new_moneda_evento,
            'coste_aplicado', NOT v_is_free
        ),
        NOW()
    )
    RETURNING id INTO v_registro_id;

    -- Link participant
    INSERT INTO public.reg_registros_participantes (registro_id, personaje_id, estado)
    VALUES (v_registro_id, p_personaje_id, 'aceptado');

    RETURN jsonb_build_object(
        'success', true,
        'xp', v_new_xp,
        'ryous', v_new_ryous,
        'puntos_aprendizaje', v_new_pa,
        'moneda_evento', v_new_moneda_evento
    );
END;
$function$;

-- comprar_puntos_stat
DROP FUNCTION IF EXISTS public.comprar_puntos_stat(integer, integer, integer);
CREATE OR REPLACE FUNCTION public.comprar_puntos_stat(p_personaje_id bigint, p_cantidad integer, p_coste_exp_total integer)
 RETURNS jsonb
 LANGUAGE plpgsql
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
        SELECT 1 FROM public.reg_roles WHERE user_id = v_user_id AND rol_id = 'admin'
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

-- compatibilidad: algunas rutas llaman con bigint y otras con integer
CREATE OR REPLACE FUNCTION public.fn_calcular_rango_personaje(p_personaje_id bigint, p_puntos_stats integer)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN public.fn_calcular_rango_personaje(p_personaje_id::integer, p_puntos_stats);
END;
$function$;

-- 5. Actualizar políticas de RLS de las tablas para usar public.is_admin() en lugar de profiles.role
-- info_documentos_combate
DROP POLICY IF EXISTS "Admins pueden insertar documentos_combate" ON public.info_documentos_combate;
CREATE POLICY "Admins pueden insertar documentos_combate" ON public.info_documentos_combate
  FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins pueden actualizar documentos_combate" ON public.info_documentos_combate;
CREATE POLICY "Admins pueden actualizar documentos_combate" ON public.info_documentos_combate
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- reg_personajes_ramas
DROP POLICY IF EXISTS "Admins gestionan todas las ramas" ON public.reg_personajes_ramas;
CREATE POLICY "Admins gestionan todas las ramas" ON public.reg_personajes_ramas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can do everything on reg_personajes_ramas" ON public.reg_personajes_ramas;
CREATE POLICY "Admins can do everything on reg_personajes_ramas" ON public.reg_personajes_ramas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- reg_personajes_inventario
DROP POLICY IF EXISTS "Admins gestionan todo el inventario" ON public.reg_personajes_inventario;
CREATE POLICY "Admins gestionan todo el inventario" ON public.reg_personajes_inventario
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can do everything on reg_personajes_inventario" ON public.reg_personajes_inventario;
CREATE POLICY "Admins can do everything on reg_personajes_inventario" ON public.reg_personajes_inventario
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- reg_personajes_tecnicas
DROP POLICY IF EXISTS "Admins gestionan todas las tecnicas" ON public.reg_personajes_tecnicas;
CREATE POLICY "Admins gestionan todas las tecnicas" ON public.reg_personajes_tecnicas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can do everything on reg_personajes_tecnicas" ON public.reg_personajes_tecnicas;
CREATE POLICY "Admins can do everything on reg_personajes_tecnicas" ON public.reg_personajes_tecnicas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- info_entrenamientos
DROP POLICY IF EXISTS "Admins gestionan entrenamientos" ON public.info_entrenamientos;
CREATE POLICY "Admins gestionan entrenamientos" ON public.info_entrenamientos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- reg_characters
DROP POLICY IF EXISTS "Admins can do everything on characters" ON public.reg_characters;
CREATE POLICY "Admins can do everything on characters" ON public.reg_characters
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- reg_registros
DROP POLICY IF EXISTS "Allow owner and admin delete reg_registros" ON public.reg_registros;
CREATE POLICY "Allow owner and admin delete reg_registros" ON public.reg_registros
  FOR DELETE TO authenticated USING (
    (autor_id IN (SELECT id FROM public.reg_characters WHERE user_id = auth.uid())) OR is_admin()
  );

DROP POLICY IF EXISTS "Allow owner and admin update reg_registros" ON public.reg_registros;
CREATE POLICY "Allow owner and admin update reg_registros" ON public.reg_registros
  FOR UPDATE TO authenticated USING (
    (autor_id IN (SELECT id FROM public.reg_characters WHERE user_id = auth.uid())) OR is_admin()
  ) WITH CHECK (
    (autor_id IN (SELECT id FROM public.reg_characters WHERE user_id = auth.uid())) OR is_admin()
  );

-- reg_registros_participantes
DROP POLICY IF EXISTS "Allow involved parties and admin update reg_registros_participa" ON public.reg_registros_participantes;
CREATE POLICY "Allow involved parties and admin update reg_registros_participa" ON public.reg_registros_participantes
  FOR UPDATE TO authenticated USING (
    (personaje_id IN (SELECT id FROM public.reg_characters WHERE user_id = auth.uid())) OR 
    (EXISTS (SELECT 1 FROM public.reg_registros WHERE reg_registros.id = reg_registros_participantes.registro_id AND reg_registros.autor_id IN (SELECT id FROM public.reg_characters WHERE user_id = auth.uid()))) OR 
    is_admin()
  );

-- info_rasgos
DROP POLICY IF EXISTS "Admins pueden gestionar todos los rasgos" ON public.info_rasgos;
CREATE POLICY "Admins pueden gestionar todos los rasgos" ON public.info_rasgos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- reg_personajes_rasgos
DROP POLICY IF EXISTS "Admins pueden gestionar todos los rasgos personajes" ON public.reg_personajes_rasgos;
CREATE POLICY "Admins pueden gestionar todos los rasgos personajes" ON public.reg_personajes_rasgos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- reg_personajes_entrenamientos
DROP POLICY IF EXISTS "Admins pueden gestionar todos los entrenamientos" ON public.reg_personajes_entrenamientos;
CREATE POLICY "Admins pueden gestionar todos los entrenamientos" ON public.reg_personajes_entrenamientos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- reg_equipos_ninja
DROP POLICY IF EXISTS "Miembros del equipo y admins pueden modificar/disolver" ON public.reg_equipos_ninja;
CREATE POLICY "Miembros del equipo y admins pueden modificar/disolver" ON public.reg_equipos_ninja
  FOR UPDATE TO authenticated USING (
    lider_id IN (SELECT id FROM public.reg_characters WHERE user_id = auth.uid()) OR
    integrante_1_id IN (SELECT id FROM public.reg_characters WHERE user_id = auth.uid()) OR
    integrante_2_id IN (SELECT id FROM public.reg_characters WHERE user_id = auth.uid()) OR
    integrante_3_id IN (SELECT id FROM public.reg_characters WHERE user_id = auth.uid()) OR
    is_admin()
  ) WITH CHECK (true);
