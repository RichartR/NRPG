-- Añadir columnas a profiles para baneo de cuentas
ALTER TABLE public.profiles ADD COLUMN banned_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN ban_reason TEXT;

-- Añadir columna a sys_blocked_ips para bloqueo temporal
ALTER TABLE public.sys_blocked_ips ADD COLUMN blocked_until TIMESTAMP WITH TIME ZONE;
