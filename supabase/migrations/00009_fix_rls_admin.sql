-- 1. Eliminar políticas antiguas restrictivas (si existen)
DROP POLICY IF EXISTS "Enable all for admins" ON public.documentos_sistemas;

-- 2. Crear política robusta para administradores
-- Solo permite cambios si el rol en profiles es 'admin'
CREATE POLICY "Admins can manage documents" 
ON public.documentos_sistemas 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 3. Asegurar que todos pueden ver (lectura pública)
DROP POLICY IF EXISTS "Public read access" ON public.documentos_sistemas;
CREATE POLICY "Public read access" 
ON public.documentos_sistemas 
FOR SELECT 
USING (true);
