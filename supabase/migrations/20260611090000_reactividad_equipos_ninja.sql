-- Migration: Reactivity of teams when a character is archived or changes village.
-- Description: Adds a trigger on reg_characters to automatically remove characters from active teams and dissolve teams with less than 2 members.

-- 1. Redefine fn_validar_reg_equipos_ninja to allow NEW.activo = false to bypass validations
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
    IF NEW.fecha_disolucion IS NULL THEN
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


-- 2. Create the AFTER UPDATE trigger function on reg_characters
CREATE OR REPLACE FUNCTION public.fn_procesar_cambio_personaje_equipo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_team RECORD;
  v_new_lider_id BIGINT;
  v_new_int1_id BIGINT;
  v_new_int2_id BIGINT;
  v_new_int3_id BIGINT;
  v_active_members INT;
  v_dissolved BOOLEAN;
  v_registro_id BIGINT;
  v_motivo TEXT;
BEGIN
  -- Solo actuar si el PJ ha sido archivado (activo cambia a false) o cambia de aldea
  IF (OLD.activo = true AND NEW.activo = false) OR (NEW.aldea_id IS DISTINCT FROM OLD.aldea_id) THEN
    
    IF OLD.activo = true AND NEW.activo = false THEN
      v_motivo := 'archivado';
    ELSE
      v_motivo := 'cambio de aldea';
    END IF;

    -- Buscar todos los equipos ninja activos de los que el personaje formaba parte
    FOR v_team IN 
      SELECT * FROM public.reg_equipos_ninja
      WHERE activo = true
        AND (lider_id = NEW.id OR integrante_1_id = NEW.id OR integrante_2_id = NEW.id OR integrante_3_id = NEW.id)
    LOOP
      -- Inicializar nuevos IDs con los del equipo actual
      v_new_lider_id := v_team.lider_id;
      v_new_int1_id := v_team.integrante_1_id;
      v_new_int2_id := v_team.integrante_2_id;
      v_new_int3_id := v_team.integrante_3_id;

      -- Remover al personaje del slot correspondiente
      IF v_team.lider_id = NEW.id THEN v_new_lider_id := NULL; END IF;
      IF v_team.integrante_1_id = NEW.id THEN v_new_int1_id := NULL; END IF;
      IF v_team.integrante_2_id = NEW.id THEN v_new_int2_id := NULL; END IF;
      IF v_team.integrante_3_id = NEW.id THEN v_new_int3_id := NULL; END IF;

      -- Contar miembros restantes
      v_active_members := 0;
      IF v_new_lider_id IS NOT NULL THEN v_active_members := v_active_members + 1; END IF;
      IF v_new_int1_id IS NOT NULL THEN v_active_members := v_active_members + 1; END IF;
      IF v_new_int2_id IS NOT NULL THEN v_active_members := v_active_members + 1; END IF;
      IF v_new_int3_id IS NOT NULL THEN v_active_members := v_active_members + 1; END IF;

      -- Determinar si se debe disolver
      IF v_active_members < 2 THEN
        v_dissolved := true;
      ELSE
        v_dissolved := false;
      END IF;

      -- Actualizar el equipo ninja
      UPDATE public.reg_equipos_ninja
      SET
        lider_id = v_new_lider_id,
        integrante_1_id = v_new_int1_id,
        integrante_2_id = v_new_int2_id,
        integrante_3_id = v_new_int3_id,
        activo = CASE WHEN v_dissolved THEN false ELSE true END,
        fecha_disolucion = CASE WHEN v_dissolved THEN now() ELSE fecha_disolucion END
      WHERE id = v_team.id;

      -- Registrar la acción en reg_registros
      IF v_dissolved THEN
        INSERT INTO public.reg_registros (tipo, subtipo, autor_id, data, fecha)
        VALUES (
          'accion',
          'equipo_disolucion',
          NEW.id,
          jsonb_build_object(
            'titulo', 'Equipo disuelto automáticamente: ' || v_team.nombre_equipo,
            'subtitulo', NEW.nombre_ninja || ' dejó el equipo por ' || v_motivo || ', reduciendo los miembros por debajo del mínimo (2).',
            'tipo_accion', 'disolucion_equipo_automatica',
            'equipo_id', v_team.id,
            'nombre_equipo', v_team.nombre_equipo
          ),
          now()
        )
        RETURNING id INTO v_registro_id;
      ELSE
        INSERT INTO public.reg_registros (tipo, subtipo, autor_id, data, fecha)
        VALUES (
          'accion',
          'equipo_salida',
          NEW.id,
          jsonb_build_object(
            'titulo', NEW.nombre_ninja || ' ha dejado el equipo ' || v_team.nombre_equipo,
            'subtitulo', 'Salida automática debido a ' || v_motivo || '. El equipo sigue activo con ' || v_active_members || ' miembros.',
            'tipo_accion', 'salida_equipo_automatica',
            'equipo_id', v_team.id,
            'nombre_equipo', v_team.nombre_equipo
          ),
          now()
        )
        RETURNING id INTO v_registro_id;
      END IF;

      -- Vincular participante al registro
      INSERT INTO public.reg_registros_participantes (registro_id, personaje_id, estado)
      VALUES (v_registro_id, NEW.id, 'aceptado');

    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Create trigger on reg_characters
DROP TRIGGER IF EXISTS tr_personaje_cambio_equipo ON public.reg_characters;
CREATE TRIGGER tr_personaje_cambio_equipo
AFTER UPDATE OF activo, aldea_id ON public.reg_characters
FOR EACH ROW
EXECUTE FUNCTION public.fn_procesar_cambio_personaje_equipo();
