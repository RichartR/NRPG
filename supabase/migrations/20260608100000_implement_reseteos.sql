-- Migration: Implement character resets and log-based refunds
-- Description: Adds 'periodo_reseteos_gratuitos' to configuration, creates function to reset character, and functions to calculate refunds based on action logs.

-- 1. Insert variable in sys_configuracion_sistema
INSERT INTO public.sys_configuracion_sistema (clave, titulo, valor, descripcion)
VALUES (
  'periodo_reseteos_gratuitos',
  'Periodo de Reseteos Gratuitos',
  'false'::jsonb,
  'Define si los jugadores pueden reiniciar su personaje de forma gratuita o con un coste del 25% de los recursos.'
)
ON CONFLICT (clave) DO NOTHING;

-- 2. Function to calculate refund for a glossary item/technique based on logs
CREATE OR REPLACE FUNCTION public.calcular_reembolso_glosario(p_personaje_id bigint, p_glosario_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_record record;
    v_refund_ryous integer := 0;
    v_refund_xp integer := 0;
    v_refund_pa integer := 0;
    v_refund_moneda_evento integer := 0;
    v_items_count integer := 1;
BEGIN
    -- Look for the latest purchase/learning log for this specific glosario item
    SELECT * INTO v_record
    FROM public.reg_registros r
    JOIN public.reg_registros_participantes rp ON r.id = rp.registro_id
    WHERE rp.personaje_id = p_personaje_id
      AND (
        -- Shop purchase
        ((r.data->>'glosario_id')::bigint = p_glosario_id)
        OR
        -- Multi-item purchase
        (r.data->>'tipo_accion' = 'compra_objetos' AND r.data->'items' @> jsonb_build_array(jsonb_build_object('id', p_glosario_id)))
        OR
        -- Multi-technique learning
        (r.data->>'tipo_accion' = 'aprendizaje_tecnicas' AND r.data->'tecnicas' @> jsonb_build_array(jsonb_build_object('id', p_glosario_id)))
      )
    ORDER BY r.fecha DESC
    LIMIT 1;

    IF v_record.id IS NOT NULL THEN
        -- If it was a direct shop purchase
        IF (v_record.data->>'glosario_id')::bigint = p_glosario_id THEN
            v_refund_ryous := COALESCE((v_record.data->>'coste_ryous')::int, 0);
            v_refund_xp := COALESCE((v_record.data->>'coste_exp')::int, 0);
            v_refund_pa := COALESCE((v_record.data->>'coste_puntos_aprendizaje')::int, 0);
            v_refund_moneda_evento := COALESCE((v_record.data->>'coste_moneda_evento')::int, 0);
        ELSIF v_record.data->>'tipo_accion' = 'compra_objetos' THEN
            -- Get number of items bought in this record to distribute cost (if logged as total)
            v_items_count := jsonb_array_length(v_record.data->'items');
            IF v_items_count = 0 THEN v_items_count := 1; END IF;
            
            v_refund_ryous := COALESCE((v_record.data->>'gasto_ryous')::int, 0) / v_items_count;
            v_refund_xp := COALESCE((v_record.data->>'gasto_xp')::int, 0) / v_items_count;
            v_refund_pa := COALESCE((v_record.data->>'gasto_pc')::int, 0) / v_items_count;
            v_refund_moneda_evento := 0;
        ELSIF v_record.data->>'tipo_accion' = 'aprendizaje_tecnicas' THEN
            -- Get number of techniques learned in this record to distribute cost (if logged as total)
            v_items_count := jsonb_array_length(v_record.data->'tecnicas');
            IF v_items_count = 0 THEN v_items_count := 1; END IF;
            
            v_refund_ryous := COALESCE((v_record.data->>'gasto_ryous')::int, 0) / v_items_count;
            v_refund_xp := COALESCE((v_record.data->>'gasto_xp')::int, 0) / v_items_count;
            v_refund_pa := COALESCE((v_record.data->>'gasto_pc')::int, 0) / v_items_count;
            v_refund_moneda_evento := 0;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'ryous', v_refund_ryous,
        'xp', v_refund_xp,
        'pa', v_refund_pa,
        'moneda_evento', v_refund_moneda_evento
    );
END;
$$;

-- 3. Function to calculate refund for training based on logs
CREATE OR REPLACE FUNCTION public.calcular_reembolso_entrenamiento(p_personaje_id bigint, p_entrenamiento_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_record record;
    v_refund_ryous integer := 0;
    v_refund_xp integer := 0;
    v_refund_pa integer := 0;
    v_items_count integer := 1;
BEGIN
    SELECT * INTO v_record
    FROM public.reg_registros r
    JOIN public.reg_registros_participantes rp ON r.id = rp.registro_id
    WHERE rp.personaje_id = p_personaje_id
      AND r.data->>'tipo_accion' = 'compra_entrenamientos'
      AND r.data->'entrenamientos' @> jsonb_build_array(jsonb_build_object('id', p_entrenamiento_id))
    ORDER BY r.fecha DESC
    LIMIT 1;

    IF v_record.id IS NOT NULL THEN
        v_items_count := jsonb_array_length(v_record.data->'entrenamientos');
        IF v_items_count = 0 THEN v_items_count := 1; END IF;
        
        v_refund_ryous := COALESCE((v_record.data->>'gasto_ryous')::int, 0) / v_items_count;
        v_refund_xp := COALESCE((v_record.data->>'gasto_xp')::int, 0) / v_items_count;
        v_refund_pa := COALESCE((v_record.data->>'gasto_pc')::int, 0) / v_items_count;
    END IF;

    RETURN jsonb_build_object(
        'ryous', v_refund_ryous,
        'xp', v_refund_xp,
        'pa', v_refund_pa
    );
END;
$$;

-- 4. Function to reset character
CREATE OR REPLACE FUNCTION public.reiniciar_personaje(p_personaje_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id uuid;
    v_char_name text;
    v_xp integer;
    v_ryous integer;
    v_pa integer;
    v_moneda_evento integer;
    v_is_free boolean := false;
    v_config_inicio jsonb;
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
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'No autorizado para reiniciar este personaje';
    END IF;

    -- 3. Check if free reset period is active
    SELECT COALESCE((valor::text)::boolean, false) INTO v_is_free
    FROM public.sys_configuracion_sistema
    WHERE clave = 'periodo_reseteos_gratuitos';

    -- 4. Calculate final resources
    IF v_is_free THEN
        v_new_xp := v_xp;
        v_new_ryous := v_ryous;
        v_new_pa := v_pa;
        v_new_moneda_evento := v_moneda_evento;
    ELSE
        -- 25% cost, keep 75%
        v_new_xp := floor(v_xp * 0.75);
        v_new_ryous := floor(v_ryous * 0.75);
        v_new_pa := floor(v_pa * 0.75);
        v_new_moneda_evento := floor(v_moneda_evento * 0.75);
    END IF;

    -- 5. Retrieve datos_inicio_ficha config
    SELECT valor INTO v_config_inicio
    FROM public.sys_configuracion_sistema
    WHERE clave = 'datos_inicio_ficha';

    IF v_config_inicio IS NULL THEN
        RAISE EXCEPTION 'Configuración de inicio de ficha no encontrada';
    END IF;

    -- 6. Wipe all character custom progress relationships
    DELETE FROM public.reg_personajes_ramas WHERE personaje_id = p_personaje_id;
    DELETE FROM public.reg_personajes_entrenamientos WHERE personaje_id = p_personaje_id;
    DELETE FROM public.reg_personajes_rasgos WHERE personaje_id = p_personaje_id;
    DELETE FROM public.reg_personajes_inventario WHERE personaje_id = p_personaje_id;
    DELETE FROM public.reg_personajes_tecnicas WHERE personaje_id = p_personaje_id;

    -- 7. Update character basic stats & resources
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

    -- 8. Re-deliver basic glossary items & techniques
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

    -- 9. Create action log
    INSERT INTO public.reg_registros (tipo, subtipo, autor_id, data, fecha)
    VALUES (
        'accion',
        'reseteo',
        p_personaje_id,
        jsonb_build_object(
            'titulo', v_char_name || ' ha reiniciado su personaje',
            'subtitulo', 'Recursos mantenidos: ' || v_new_xp || ' XP, ' || v_new_ryous || ' Ryous, ' || v_new_pa || ' PA, ' || v_new_moneda_evento || ' Monedas de Evento',
            'tipo_accion', 'reinicio_personaje',
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
$$;
