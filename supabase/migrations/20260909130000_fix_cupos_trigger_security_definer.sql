-- Migration: Fix fn_balance_village_cupos trigger wrappers
-- Problem: The security advisory migration (20260909110000) correctly revoked EXECUTE
-- on fn_balance_village_cupos() from authenticated/anon, restricting it to service_role.
-- However, the trigger wrapper functions (fn_balance_village_cupos_on_character_change
-- and fn_balance_village_cupos_on_village_change) were NOT SECURITY DEFINER, so they
-- ran with the calling user's permissions (authenticated). When a player saved their
-- character sheet, the trigger fired and the wrapper tried to call fn_balance_village_cupos(),
-- resulting in: "permission denied for function fn_balance_village_cupos".
--
-- Fix: Make both wrapper functions SECURITY DEFINER so they execute with postgres
-- superuser permissions, maintaining the security model (authenticated users never
-- call fn_balance_village_cupos directly) while allowing the trigger chain to work.

CREATE OR REPLACE FUNCTION public.fn_balance_village_cupos_on_character_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.fn_balance_village_cupos();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_balance_village_cupos_on_village_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.fn_balance_village_cupos();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke direct EXECUTE from authenticated (was temporarily granted as workaround)
-- Properly, only service_role should be able to call fn_balance_village_cupos directly.
REVOKE EXECUTE ON FUNCTION public.fn_balance_village_cupos() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_balance_village_cupos() TO service_role;
