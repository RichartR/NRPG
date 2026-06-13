-- Crear tabla maestra de info_roles
CREATE TABLE IF NOT EXISTS public.info_roles (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  id_rol_discord TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Poblar roles por defecto
INSERT INTO public.info_roles (id, nombre) VALUES
  ('admin', 'Administrador'),
  ('moderador', 'Moderador'),
  ('narrador', 'Narrador'),
  ('kage', 'Kage'),
  ('delegado', 'Delegado')
ON CONFLICT (id) DO NOTHING;

-- Crear tabla relacional reg_roles
CREATE TABLE IF NOT EXISTS public.reg_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rol_id TEXT NOT NULL REFERENCES public.info_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT reg_roles_user_id_rol_id_key UNIQUE (user_id, rol_id)
);

-- Crear índices para optimizar búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_reg_roles_user_id ON public.reg_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_reg_roles_rol_id ON public.reg_roles(rol_id);

-- Añadir columna tipo a la tabla sys_notificaciones_admin para clasificar apelaciones
ALTER TABLE public.sys_notificaciones_admin ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'disputa';

-- Crear índice para la columna tipo
CREATE INDEX IF NOT EXISTS idx_sys_notificaciones_admin_tipo ON public.sys_notificaciones_admin(tipo);

-- Redefinir la función is_admin() para que admita tanto perfiles heredados como reg_roles
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.reg_roles
    WHERE user_id = auth.uid() AND rol_id = 'admin'
  );
END;
$function$;

-- Crear función genérica has_role(role_name) para comprobar otros roles
CREATE OR REPLACE FUNCTION public.has_role(role_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.reg_roles
    WHERE user_id = auth.uid() AND rol_id = role_name
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = role_name
  );
END;
$function$;

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.info_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reg_roles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para info_roles
CREATE POLICY "Permitir lectura de info_roles a todos" ON public.info_roles
  FOR SELECT USING (true);

CREATE POLICY "Permitir gestión completa de info_roles solo a administradores" ON public.info_roles
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Políticas de RLS para reg_roles
CREATE POLICY "Permitir lectura de reg_roles a usuarios autenticados" ON public.reg_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir gestión completa de reg_roles solo a administradores" ON public.reg_roles
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
