-- Migration: Traspaso e invitaciones de equipos ninja
-- Description: Adds dynamic triggers to handle team invitation acceptances, transfer character from previous teams, and handle team status updates.

-- 1. Redefine fn_validar_reg_equipos_ninja to set fecha_disolucion ONLY on UPDATE when transitioning from active to inactive.
CREATE OR REPLACE FUNCTION public.fn_validar_reg_equipos_ninja()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_player_count   INT := 0;
  v_char_name      TEXT;
  v_char_aldea     BIGINT;
  v_lider_rango    TEXT;
  v_lider_aldea    BIGINT;
  v_two_weeks_ago  TIMESTAMPTZ := NOW() - INTERVAL '2 weeks';
BEGIN

  -- Si se desactiva el equipo, no hacemos validaciones de integridad de miembros
  IF NEW.activo = false THEN
    IF TG_OP = 'UPDATE' AND OLD.activo = true AND NEW.fecha_disolucion IS NULL THEN
      NEW.fecha_disolucion := now();
    END IF;
    RETURN NEW;
  END IF;

  -- ── Contar miembros ───────────────────────────────────────────────────────
  IF NEW.lider_id         IS NOT NULL THEN v_player_count := v_player_count + 1; END IF;
  IF NEW.integrante_1_id  IS NOT NULL THEN v_player_count := v_player_count + 1; END IF;
  IF NEW.integrante_2_id  IS NOT NULL THEN v_player_count := v_player_count + 1; END IF;
  IF NEW.integrante_3_id  IS NOT NULL THEN v_player_count := v_player_count + 1; END IF;

  -- Mínimo 2, máximo 4
  IF v_player_count < 2 THEN
    RAISE EXCEPTION 'El equipo necesita mínimo 2 miembros.';
  END IF;
  IF v_player_count > 4 THEN
    RAISE EXCEPTION 'El equipo no puede tener más de 4 miembros.';
  END IF;

  -- ── Validar LÍDER (solo si se proporciona) ────────────────────────────────
  IF NEW.lider_id IS NOT NULL THEN
    SELECT aldea_id, rango_jerarquico, nombre_ninja
      INTO v_lider_aldea, v_lider_rango, v_char_name
      FROM public.reg_characters
      WHERE id = NEW.lider_id;

    IF LOWER(COALESCE(v_lider_rango, '')) = 'genin' THEN
      RAISE EXCEPTION 'El líder del equipo (%) debe ser rango Chunin o superior.', v_char_name;
    END IF;

    IF v_lider_aldea IS DISTINCT FROM NEW.aldea_id THEN
      RAISE EXCEPTION 'El líder del equipo (%) no pertenece a la aldea seleccionada.', v_char_name;
    END IF;
  END IF;

  -- ── Validar cada integrante ───────────────────────────────────────────────
  DECLARE
    v_ids BIGINT[] := ARRAY[NEW.integrante_1_id, NEW.integrante_2_id, NEW.integrante_3_id];
    v_id  BIGINT;
  BEGIN
    FOREACH v_id IN ARRAY v_ids LOOP
      CONTINUE WHEN v_id IS NULL;

      SELECT aldea_id, nombre_ninja INTO v_char_aldea, v_char_name
        FROM public.reg_characters WHERE id = v_id;

      -- Misma aldea
      IF v_char_aldea IS DISTINCT FROM NEW.aldea_id THEN
        RAISE EXCEPTION 'El integrante % no pertenece a la aldea seleccionada.', v_char_name;
      END IF;

      -- No puede estar ya en otro equipo activo (excepto si pasaron 2 semanas)
      IF EXISTS (
        SELECT 1 FROM public.reg_equipos_ninja
        WHERE activo = TRUE
          AND id != COALESCE(NEW.id, -1)
          AND (lider_id = v_id OR integrante_1_id = v_id OR integrante_2_id = v_id OR integrante_3_id = v_id)
          AND fecha_creacion > v_two_weeks_ago
      ) THEN
        RAISE EXCEPTION 'El integrante % ya pertenece a otro equipo activo y no han pasado 2 semanas.', v_char_name;
      END IF;
    END LOOP;
  END;

  -- Igual para el líder (si existe) en la comprobación de equipo previo
  IF NEW.lider_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.reg_equipos_ninja
      WHERE activo = TRUE
        AND id != COALESCE(NEW.id, -1)
        AND (lider_id = NEW.lider_id OR integrante_1_id = NEW.lider_id OR integrante_2_id = NEW.lider_id OR integrante_3_id = NEW.lider_id)
        AND fecha_creacion > v_two_weeks_ago
    ) THEN
      SELECT nombre_ninja INTO v_char_name FROM public.reg_characters WHERE id = NEW.lider_id;
      RAISE EXCEPTION 'El líder % ya pertenece a otro equipo activo y no han pasado 2 semanas.', v_char_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- 2. Create function to process team invitation acceptance
CREATE OR REPLACE FUNCTION public.fn_procesar_aceptacion_invitacion_equipo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_subtipo          TEXT;
  v_data             JSONB;
  v_equipo_id        BIGINT;
  v_nombre_equipo    TEXT;
  v_propuesta        JSONB;
  v_char_name        TEXT;
  v_prev_team        RECORD;
  v_prev_lider_id    BIGINT;
  v_prev_int1_id     BIGINT;
  v_prev_int2_id     BIGINT;
  v_prev_int3_id     BIGINT;
  v_prev_count       INT;
  v_new_team         RECORD;
  v_new_lider_id     BIGINT;
  v_new_int1_id      BIGINT;
  v_new_int2_id      BIGINT;
  v_new_int3_id      BIGINT;
  v_new_count        INT;
  v_new_activo       BOOLEAN;
  v_new_registro_id  BIGINT;
  v_two_weeks_ago    TIMESTAMPTZ := NOW() - INTERVAL '2 weeks';
BEGIN
  -- Solo actuar si el estado cambia a 'aceptado'
  IF NEW.estado = 'aceptado' AND OLD.estado = 'pendiente' THEN
    
    -- Obtener detalles del registro
    SELECT subtipo, data INTO v_subtipo, v_data
      FROM public.reg_registros
      WHERE id = NEW.registro_id;

    IF v_subtipo = 'equipo_invitacion' THEN
      v_equipo_id := (v_data->>'equipo_id')::bigint;
      v_nombre_equipo := v_data->>'nombre_equipo';
      v_propuesta := v_data->'propuesta_miembros';

      SELECT nombre_ninja INTO v_char_name FROM public.reg_characters WHERE id = NEW.personaje_id;

      -- 1. Gestionar equipo anterior si ya pertenece a uno activo
      FOR v_prev_team IN
        SELECT * FROM public.reg_equipos_ninja
        WHERE activo = true
          AND id != v_equipo_id
          AND (lider_id = NEW.personaje_id OR integrante_1_id = NEW.personaje_id OR integrante_2_id = NEW.personaje_id OR integrante_3_id = NEW.personaje_id)
      LOOP
        -- Validar si han transcurrido las 2 semanas reglamentarias
        IF v_prev_team.fecha_creacion > v_two_weeks_ago THEN
          RAISE EXCEPTION 'El personaje % no puede cambiar de equipo hasta transcurridas 2 semanas desde la creación de su equipo actual (%)', v_char_name, v_prev_team.nombre_equipo;
        END IF;

        -- Rellenar slots temporales vaciando al personaje que sale
        v_prev_lider_id := CASE WHEN v_prev_team.lider_id = NEW.personaje_id THEN NULL ELSE v_prev_team.lider_id END;
        v_prev_int1_id  := CASE WHEN v_prev_team.integrante_1_id = NEW.personaje_id THEN NULL ELSE v_prev_team.integrante_1_id END;
        v_prev_int2_id  := CASE WHEN v_prev_team.integrante_2_id = NEW.personaje_id THEN NULL ELSE v_prev_team.integrante_2_id END;
        v_prev_int3_id  := CASE WHEN v_prev_team.integrante_3_id = NEW.personaje_id THEN NULL ELSE v_prev_team.integrante_3_id END;

        -- Contar miembros restantes en el equipo anterior
        v_prev_count := 0;
        IF v_prev_lider_id IS NOT NULL THEN v_prev_count := v_prev_count + 1; END IF;
        IF v_prev_int1_id  IS NOT NULL THEN v_prev_count := v_prev_count + 1; END IF;
        IF v_prev_int2_id  IS NOT NULL THEN v_prev_count := v_prev_count + 1; END IF;
        IF v_prev_int3_id  IS NOT NULL THEN v_prev_count := v_prev_count + 1; END IF;

        -- Actualizar o disolver el equipo anterior
        IF v_prev_count < 2 THEN
          UPDATE public.reg_equipos_ninja
          SET
            lider_id = v_prev_lider_id,
            integrante_1_id = v_prev_int1_id,
            integrante_2_id = v_prev_int2_id,
            integrante_3_id = v_prev_int3_id,
            activo = false,
            fecha_disolucion = now()
          WHERE id = v_prev_team.id;

          -- Registrar disolución
          INSERT INTO public.reg_registros (tipo, subtipo, autor_id, data, fecha)
          VALUES (
            'accion',
            'equipo_disolucion',
            NEW.personaje_id,
            jsonb_build_object(
              'titulo', 'Equipo disuelto automáticamente: ' || v_prev_team.nombre_equipo,
              'subtitulo', v_char_name || ' dejó el equipo para unirse a ' || v_nombre_equipo || ', quedando por debajo del mínimo de miembros (2).',
              'tipo_accion', 'disolucion_equipo_automatica',
              'equipo_id', v_prev_team.id,
              'nombre_equipo', v_prev_team.nombre_equipo
            ),
            now()
          );
        ELSE
          UPDATE public.reg_equipos_ninja
          SET
            lider_id = v_prev_lider_id,
            integrante_1_id = v_prev_int1_id,
            integrante_2_id = v_prev_int2_id,
            integrante_3_id = v_prev_int3_id
          WHERE id = v_prev_team.id;

          -- Registrar salida
          INSERT INTO public.reg_registros (tipo, subtipo, autor_id, data, fecha)
          VALUES (
            'accion',
            'equipo_salida',
            NEW.personaje_id,
            jsonb_build_object(
              'titulo', v_char_name || ' ha dejado el equipo ' || v_prev_team.nombre_equipo,
              'subtitulo', 'Cambió al equipo ' || v_nombre_equipo || '. El equipo anterior sigue activo con ' || v_prev_count || ' miembros.',
              'tipo_accion', 'salida_equipo_automatica',
              'equipo_id', v_prev_team.id,
              'nombre_equipo', v_prev_team.nombre_equipo
            ),
            now()
          );
        END IF;
      END LOOP;

      -- 2. Añadir al personaje al nuevo equipo
      SELECT * INTO v_new_team
        FROM public.reg_equipos_ninja
        WHERE id = v_equipo_id;

      IF v_new_team.id IS NOT NULL THEN
        -- Reasignar slots inyectando el ID del personaje en el slot correspondiente según la propuesta original
        v_new_lider_id := CASE WHEN (v_propuesta->>'lider_id')::bigint = NEW.personaje_id THEN NEW.personaje_id ELSE v_new_team.lider_id END;
        v_new_int1_id  := CASE WHEN (v_propuesta->>'integrante_1_id')::bigint = NEW.personaje_id THEN NEW.personaje_id ELSE v_new_team.integrante_1_id END;
        v_new_int2_id  := CASE WHEN (v_propuesta->>'integrante_2_id')::bigint = NEW.personaje_id THEN NEW.personaje_id ELSE v_new_team.integrante_2_id END;
        v_new_int3_id  := CASE WHEN (v_propuesta->>'integrante_3_id')::bigint = NEW.personaje_id THEN NEW.personaje_id ELSE v_new_team.integrante_3_id END;

        -- Calcular total miembros en el nuevo equipo
        v_new_count := 0;
        IF v_new_lider_id IS NOT NULL THEN v_new_count := v_new_count + 1; END IF;
        IF v_new_int1_id  IS NOT NULL THEN v_new_count := v_new_count + 1; END IF;
        IF v_new_int2_id  IS NOT NULL THEN v_new_count := v_new_count + 1; END IF;
        IF v_new_int3_id  IS NOT NULL THEN v_new_count := v_new_count + 1; END IF;

        -- El equipo se activa al tener 2 o más miembros
        v_new_activo := (v_new_count >= 2);

        UPDATE public.reg_equipos_ninja
        SET
          lider_id = v_new_lider_id,
          integrante_1_id = v_new_int1_id,
          integrante_2_id = v_new_int2_id,
          integrante_3_id = v_new_int3_id,
          activo = v_new_activo,
          fecha_disolucion = CASE WHEN v_new_activo THEN NULL ELSE fecha_disolucion END
        WHERE id = v_equipo_id;

        -- Registrar incorporación
        INSERT INTO public.reg_registros (tipo, subtipo, autor_id, data, fecha)
        VALUES (
          'accion',
          'equipo_entrada',
          NEW.personaje_id,
          jsonb_build_object(
            'titulo', v_char_name || ' se ha unido al equipo ' || v_nombre_equipo,
            'subtitulo', 'Aceptó la invitación. El equipo ahora tiene ' || v_new_count || ' miembros y está ' || (CASE WHEN v_new_activo THEN 'ACTIVO' ELSE 'PENDIENTE de más miembros' END) || '.',
            'tipo_accion', 'entrada_equipo_automatica',
            'equipo_id', v_equipo_id,
            'nombre_equipo', v_nombre_equipo
          ),
          now()
        )
        RETURNING id INTO v_new_registro_id;

        -- Vincular participante al registro
        INSERT INTO public.reg_registros_participantes (registro_id, personaje_id, estado)
        VALUES (v_new_registro_id, NEW.personaje_id, 'aceptado');
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Create AFTER UPDATE trigger on reg_registros_participantes
DROP TRIGGER IF EXISTS tr_registro_participante_cambio ON public.reg_registros_participantes;
CREATE TRIGGER tr_registro_participante_cambio
AFTER UPDATE OF estado ON public.reg_registros_participantes
FOR EACH ROW
EXECUTE FUNCTION public.fn_procesar_aceptacion_invitacion_equipo();
