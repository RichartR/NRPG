-- Update realizar_compra_tienda to check and deduct coste_puntos_aprendizaje (PA)
CREATE OR REPLACE FUNCTION public.realizar_compra_tienda(p_personaje_id bigint, p_tienda_objeto_id bigint)
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
        SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin'
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
        SELECT COALESCE(valor::text, '"Monedas de Evento"') INTO v_moneda_evento_nombre
        FROM sys_configuracion_sistema
        WHERE clave = 'moneda_evento_nombre';
        -- Remove quotes from json value
        v_moneda_evento_nombre := trim(both '"' from v_moneda_evento_nombre);
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
        INSERT INTO reg_personajes_inventario (personaje_id, item_id)
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
