-- Migration: Update reiniciar_personaje to calculate total resources (available + spent) before applying reset multiplier
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
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
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
$$;
