-- Migración para habilitar lectura y tiempo real de notificaciones a roles staff (admin, moderador, narrador)
-- y añadir sys_notificaciones_admin a la publicación de Supabase Realtime

-- 1. Helper function para verificar roles de staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.reg_roles
    WHERE user_id = auth.uid() AND rol_id IN ('admin', 'moderador', 'narrador')
  );
END;
$$;

-- 2. Asegurar que las políticas de SELECT en sys_notificaciones_admin permitan a los roles de staff
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.sys_notificaciones_admin;
DROP POLICY IF EXISTS "Permitir lectura a administradores" ON public.sys_notificaciones_admin;
DROP POLICY IF EXISTS "Staff can view notifications" ON public.sys_notificaciones_admin;

CREATE POLICY "Staff can view notifications"
ON public.sys_notificaciones_admin
FOR SELECT
TO authenticated
USING (public.is_staff());

-- 3. Actualizar política de UPDATE para permitir a staff actualizar notificaciones
DROP POLICY IF EXISTS "Permitir actualización a admins" ON public.sys_notificaciones_admin;
DROP POLICY IF EXISTS "Staff can update notifications" ON public.sys_notificaciones_admin;

CREATE POLICY "Staff can update notifications"
ON public.sys_notificaciones_admin
FOR UPDATE
TO authenticated
USING (public.is_staff());

-- 4. Habilitar Realtime para sys_notificaciones_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sys_notificaciones_admin'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sys_notificaciones_admin;
  END IF;
END $$;

ALTER TABLE public.sys_notificaciones_admin REPLICA IDENTITY FULL;
