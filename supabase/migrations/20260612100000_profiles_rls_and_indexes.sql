-- Política RLS para permitir a los administradores actualizar perfiles de usuario
CREATE POLICY "Permitir actualización de perfiles a administradores" ON public.profiles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Índices para optimizar búsquedas frecuentes y filtros de baneo
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON public.profiles(discord_id);
CREATE INDEX IF NOT EXISTS idx_profiles_last_ip ON public.profiles(last_ip);
CREATE INDEX IF NOT EXISTS idx_profiles_banned_until ON public.profiles(banned_until) WHERE banned_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sys_blocked_ips_blocked_until ON public.sys_blocked_ips(blocked_until) WHERE blocked_until IS NOT NULL;
