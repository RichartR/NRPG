-- Añadir columna last_ip a la tabla profiles
ALTER TABLE public.profiles ADD COLUMN last_ip TEXT;

-- Crear tabla sys_blocked_ips
CREATE TABLE public.sys_blocked_ips (
  ip TEXT PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear tabla sys_whitelisted_ips
CREATE TABLE public.sys_whitelisted_ips (
  ip TEXT PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.sys_blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_whitelisted_ips ENABLE ROW LEVEL SECURITY;

-- Políticas para sys_blocked_ips
CREATE POLICY "Permitir lectura de IPs bloqueadas a todos" ON public.sys_blocked_ips
  FOR SELECT USING (true);

CREATE POLICY "Permitir gestión de IPs bloqueadas solo a administradores" ON public.sys_blocked_ips
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Políticas para sys_whitelisted_ips
CREATE POLICY "Permitir lectura de lista blanca a todos" ON public.sys_whitelisted_ips
  FOR SELECT USING (true);

CREATE POLICY "Permitir gestión de lista blanca solo a administradores" ON public.sys_whitelisted_ips
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
