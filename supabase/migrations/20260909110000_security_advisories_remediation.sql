-- Migration: 20260909110000_security_advisories_remediation.sql
-- Description: Blindaje de search_path y restricción de permisos en funciones SECURITY DEFINER
-- según recomendaciones oficiales del Security Advisor de Supabase.

-- ============================================================================
-- 1. FIJACIÓN DE SEARCH_PATH = public (Prevención de inyecciones / hijacking)
-- ============================================================================
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.tr_update_character_aldea_date() SET search_path = public;
ALTER FUNCTION public.check_xp_limit() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_new_character_active() SET search_path = public;

ALTER FUNCTION public.fn_balance_village_cupos() SET search_path = public;
ALTER FUNCTION public.fn_balance_village_cupos_on_character_change() SET search_path = public;
ALTER FUNCTION public.fn_balance_village_cupos_on_village_change() SET search_path = public;

ALTER FUNCTION public.fn_validar_reg_equipos_ninja() SET search_path = public;
ALTER FUNCTION public.fn_procesar_cambio_personaje_equipo() SET search_path = public;
ALTER FUNCTION public.fn_procesar_aceptacion_invitacion_equipo() SET search_path = public;

ALTER FUNCTION public.comprar_puntos_stat(bigint, integer, integer) SET search_path = public;
ALTER FUNCTION public.realizar_compra_tienda(bigint, bigint) SET search_path = public;
ALTER FUNCTION public.realizar_compra_tienda(bigint, bigint, integer) SET search_path = public;
ALTER FUNCTION public.calcular_reembolso_glosario(bigint, bigint) SET search_path = public;
ALTER FUNCTION public.calcular_reembolso_entrenamiento(bigint, bigint) SET search_path = public;
ALTER FUNCTION public.get_valid_glosario_items(bigint, bigint) SET search_path = public;
ALTER FUNCTION public.reiniciar_personaje(bigint) SET search_path = public;

ALTER FUNCTION public.fn_calcular_rango_personaje(bigint, integer) SET search_path = public;
ALTER FUNCTION public.fn_calcular_rango_personaje(integer, integer) SET search_path = public;

ALTER FUNCTION public.otorgar_skin_jugador(uuid, bigint, text, uuid) SET search_path = public;
ALTER FUNCTION public.equipar_skin_personaje(bigint, bigint) SET search_path = public;

-- ============================================================================
-- 2. CONTROL DE PRIVILEGIOS EN FUNCIONES SECURITY DEFINER
-- ============================================================================

-- A. Triggers Internos (solo ejecutados por el motor de base de datos)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_character_active() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_procesar_aceptacion_invitacion_equipo() FROM PUBLIC, anon, authenticated;

-- B. Funciones Administrativas e Internas (solo service_role)
REVOKE EXECUTE ON FUNCTION public.fn_balance_village_cupos() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_balance_village_cupos() TO service_role;

REVOKE EXECUTE ON FUNCTION public.otorgar_skin_jugador(uuid, bigint, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.otorgar_skin_jugador(uuid, bigint, text, uuid) TO service_role;

-- C. Funciones RLS (revocar a visitantes no autenticados 'anon', mantener authenticated y service_role)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated, service_role;

-- D. Función de Equipar Skin (revocar a anon, restringir y validar propiedad)
REVOKE EXECUTE ON FUNCTION public.equipar_skin_personaje(bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equipar_skin_personaje(bigint, bigint) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.equipar_skin_personaje(p_character_id bigint, p_skin_id bigint DEFAULT NULL::bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_char_user_id UUID;
    v_es_predeterminada BOOLEAN;
    v_tiene_skin BOOLEAN;
BEGIN
    SELECT user_id INTO v_char_user_id
    FROM public.reg_characters
    WHERE id = p_character_id;

    IF v_char_user_id IS NULL THEN
        RAISE EXCEPTION 'Personaje no encontrado.';
    END IF;

    -- Validar que el usuario que ejecuta la función sea el dueño o admin
    IF v_char_user_id != auth.uid() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'No tienes permiso para modificar este personaje.';
    END IF;

    IF p_skin_id IS NULL THEN
        UPDATE public.reg_characters
        SET skin_equipada_id = NULL
        WHERE id = p_character_id;
        RETURN TRUE;
    END IF;

    SELECT es_predeterminada INTO v_es_predeterminada
    FROM public.skins_ficha
    WHERE id = p_skin_id AND activa = true;

    IF v_es_predeterminada IS TRUE THEN
        UPDATE public.reg_characters
        SET skin_equipada_id = p_skin_id
        WHERE id = p_character_id;
        RETURN TRUE;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.jugador_skins
        WHERE user_id = v_char_user_id AND skin_id = p_skin_id
    ) INTO v_tiene_skin;

    IF v_tiene_skin THEN
        UPDATE public.reg_characters
        SET skin_equipada_id = p_skin_id
        WHERE id = p_character_id;
        RETURN TRUE;
    ELSE
        RAISE EXCEPTION 'El jugador no posee esta skin.';
    END IF;
END;
$function$;

/*
-- ============================================================================
-- INSTRUCCIONES DE ROLLBACK (en caso de requerir reversión completa):
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_character_active() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_procesar_aceptacion_invitacion_equipo() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_balance_village_cupos() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.otorgar_skin_jugador(uuid, bigint, text, uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equipar_skin_personaje(bigint, bigint) TO PUBLIC, anon;

ALTER FUNCTION public.update_updated_at_column() RESET search_path;
ALTER FUNCTION public.tr_update_character_aldea_date() RESET search_path;
ALTER FUNCTION public.check_xp_limit() RESET search_path;
ALTER FUNCTION public.handle_new_user() RESET search_path;
ALTER FUNCTION public.handle_new_character_active() RESET search_path;
ALTER FUNCTION public.fn_balance_village_cupos() RESET search_path;
ALTER FUNCTION public.fn_balance_village_cupos_on_character_change() RESET search_path;
ALTER FUNCTION public.fn_balance_village_cupos_on_village_change() RESET search_path;
ALTER FUNCTION public.fn_validar_reg_equipos_ninja() RESET search_path;
ALTER FUNCTION public.fn_procesar_cambio_personaje_equipo() RESET search_path;
ALTER FUNCTION public.fn_procesar_aceptacion_invitacion_equipo() RESET search_path;
ALTER FUNCTION public.comprar_puntos_stat(bigint, integer, integer) RESET search_path;
ALTER FUNCTION public.realizar_compra_tienda(bigint, bigint) RESET search_path;
ALTER FUNCTION public.realizar_compra_tienda(bigint, bigint, integer) RESET search_path;
ALTER FUNCTION public.calcular_reembolso_glosario(bigint, bigint) RESET search_path;
ALTER FUNCTION public.calcular_reembolso_entrenamiento(bigint, bigint) RESET search_path;
ALTER FUNCTION public.get_valid_glosario_items(bigint, bigint) RESET search_path;
ALTER FUNCTION public.reiniciar_personaje(bigint) RESET search_path;
ALTER FUNCTION public.fn_calcular_rango_personaje(bigint, integer) RESET search_path;
ALTER FUNCTION public.fn_calcular_rango_personaje(integer, integer) RESET search_path;
ALTER FUNCTION public.otorgar_skin_jugador(uuid, bigint, text, uuid) RESET search_path;
ALTER FUNCTION public.equipar_skin_personaje(bigint, bigint) RESET search_path;
*/
