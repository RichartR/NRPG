-- Migración: hacer lider_id nullable y actualizar trigger para equipos ninja
-- El líder pasa a ser opcional; el mínimo son 2 miembros de cualquier slot.

-- 1. Quitar la restricción NOT NULL de lider_id
ALTER TABLE public.reg_equipos_ninja
  ALTER COLUMN lider_id DROP NOT NULL;

-- 2. Recrear la función del trigger con lider opcional
CREATE OR REPLACE FUNCTION fn_validar_reg_equipos_ninja()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_player_count   INT := 0;
  v_char_name      TEXT;
  v_char_aldea     BIGINT;
  v_lider_rango    TEXT;
  v_lider_aldea    BIGINT;
  v_two_weeks_ago  TIMESTAMPTZ := NOW() - INTERVAL '2 weeks';
BEGIN

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
