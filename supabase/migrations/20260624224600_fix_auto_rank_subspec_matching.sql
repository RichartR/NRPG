-- Fix fn_calcular_rango_personaje to strictly match subcategory when chosen, matching the frontend logic
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
    v_eleccion_clan jsonb;
    v_clan_rama_id integer;
    v_clan_subspec_id integer;
    
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

    -- Obtener elección de clan de reg_characters
    SELECT eleccion_tecnicas_clan INTO v_eleccion_clan
    FROM reg_characters
    WHERE id = p_personaje_id;

    -- Inicializar arrays vacíos si son nulos
    IF v_player_branches IS NULL THEN v_player_branches := ARRAY[]::integer[]; END IF;
    IF v_player_subspecs IS NULL THEN v_player_subspecs := ARRAY[]::integer[]; END IF;

    IF v_eleccion_clan IS NOT NULL THEN
        v_clan_rama_id := (v_eleccion_clan->>'rama_id')::integer;
        v_clan_subspec_id := (v_eleccion_clan->>'sub_especialidad_id')::integer;

        IF v_clan_rama_id IS NOT NULL AND NOT (v_clan_rama_id = ANY(v_player_branches)) THEN
            v_player_branches := array_append(v_player_branches, v_clan_rama_id);
        END IF;

        IF v_clan_subspec_id IS NOT NULL AND NOT (v_clan_subspec_id = ANY(v_player_subspecs)) THEN
            v_player_subspecs := array_append(v_player_subspecs, v_clan_subspec_id);
            
            DECLARE
                v_subspec_rama_id integer;
            BEGIN
                SELECT rama_id INTO v_subspec_rama_id FROM info_sub_especialidades WHERE id = v_clan_subspec_id;
                IF v_subspec_rama_id IS NOT NULL AND NOT (v_subspec_rama_id = ANY(v_player_branches)) THEN
                    v_player_branches := array_append(v_player_branches, v_subspec_rama_id);
                END IF;
            END;
        END IF;
    END IF;
    
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

    IF v_player_elements IS NULL THEN v_player_elements := ARRAY[]::integer[]; END IF;

    -- Elemento por elección de clan
    IF v_clan_subspec_id IS NOT NULL THEN
        DECLARE
            v_subspec_slug text;
            v_subspec_nombre text;
            v_elem_id integer;
        BEGIN
            SELECT slug, nombre INTO v_subspec_slug, v_subspec_nombre FROM info_sub_especialidades WHERE id = v_clan_subspec_id;
            SELECT id INTO v_elem_id FROM info_elementos 
            WHERE lower(nombre_jap) = lower(v_subspec_slug) 
               OR lower(nombre_esp) = lower(v_subspec_nombre) 
               OR lower(nombre_jap) = lower(v_subspec_nombre)
            LIMIT 1;

            IF v_elem_id IS NOT NULL AND NOT (v_elem_id = ANY(v_player_elements)) THEN
                v_player_elements := array_append(v_player_elements, v_elem_id);
            END IF;
        END;
    END IF;

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

    IF NOT v_is_nin_ii_or_iii AND v_eleccion_clan IS NOT NULL AND (v_eleccion_clan->>'rama_id')::integer = 4 AND (v_eleccion_clan->>'sub_especialidad_id')::integer IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 
            FROM info_sub_especialidades s 
            WHERE s.id = (v_eleccion_clan->>'sub_especialidad_id')::integer 
              AND s.slug IN ('ninjutsu-ii', 'ninjutsu-iii')
        ) INTO v_is_nin_ii_or_iii;
    END IF;

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
                -- 1. General technique (no branch, no subspec, no element)
                (t.rama_clan_id IS NULL AND t.sub_especialidad_id IS NULL AND t.elemento_id IS NULL)
                
                -- 2. Elemental technique
                OR (t.elemento_id IS NOT NULL AND t.elemento_id = ANY(v_player_elements))
                
                -- 3. Branch technique
                OR (
                  t.rama_clan_id IS NOT NULL 
                  AND t.rama_clan_id = ANY(v_player_branches)
                  AND (
                    CASE 
                      WHEN COALESCE(
                        (SELECT sub_especialidad_id::integer FROM reg_personajes_ramas WHERE personaje_id = p_personaje_id AND rama_id = t.rama_clan_id AND sub_especialidad_id IS NOT NULL LIMIT 1),
                        CASE WHEN (v_eleccion_clan->>'rama_id')::integer = t.rama_clan_id THEN (v_eleccion_clan->>'sub_especialidad_id')::integer ELSE NULL END
                      ) IS NOT NULL 
                      THEN 
                        t.sub_especialidad_id IS NOT NULL AND t.sub_especialidad_id = COALESCE(
                          (SELECT sub_especialidad_id::integer FROM reg_personajes_ramas WHERE personaje_id = p_personaje_id AND rama_id = t.rama_clan_id AND sub_especialidad_id IS NOT NULL LIMIT 1),
                          CASE WHEN (v_eleccion_clan->>'rama_id')::integer = t.rama_clan_id THEN (v_eleccion_clan->>'sub_especialidad_id')::integer ELSE NULL END
                        )
                      ELSE 
                        t.sub_especialidad_id IS NULL
                    END
                  )
                )
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
