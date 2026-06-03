-- Database Performance Optimizations

-- 1. Create missing indexes for foreign keys to speed up joins and cascade updates/deletes
CREATE INDEX IF NOT EXISTS idx_reg_personajes_inventario_personaje_id ON public.reg_personajes_inventario(personaje_id);
CREATE INDEX IF NOT EXISTS idx_reg_personajes_inventario_item_id ON public.reg_personajes_inventario(item_id);
CREATE INDEX IF NOT EXISTS idx_reg_tiendas_objetos_tienda_id ON public.reg_tiendas_objetos(tienda_id);
CREATE INDEX IF NOT EXISTS idx_reg_tiendas_objetos_glosario_id ON public.reg_tiendas_objetos(glosario_id);

-- 2. Consolidate duplicate/redundant RLS policies (keeping only one version)
DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propias ramas" ON public.reg_personajes_ramas;
DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propias tecnicas" ON public.reg_personajes_tecnicas;

-- 3. Optimize RLS policies by rewriting "IN (SELECT ...)" subqueries to "EXISTS (SELECT 1 ...)"

-- public.reg_personajes_ramas
DROP POLICY IF EXISTS "Gestión de ramas propia" ON public.reg_personajes_ramas;
CREATE POLICY "Gestión de ramas propia" ON public.reg_personajes_ramas
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.reg_characters 
        WHERE reg_characters.id = reg_personajes_ramas.personaje_id 
          AND reg_characters.user_id = auth.uid()
    ));

-- public.reg_personajes_tecnicas
DROP POLICY IF EXISTS "Gestión de técnicas propia" ON public.reg_personajes_tecnicas;
CREATE POLICY "Gestión de técnicas propia" ON public.reg_personajes_tecnicas
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.reg_characters 
        WHERE reg_characters.id = reg_personajes_tecnicas.personaje_id 
          AND reg_characters.user_id = auth.uid()
    ));

-- public.reg_personajes_entrenamientos
DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propios entrenamientos" ON public.reg_personajes_entrenamientos;
CREATE POLICY "Usuarios pueden gestionar sus propios entrenamientos" ON public.reg_personajes_entrenamientos
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.reg_characters 
        WHERE reg_characters.id = reg_personajes_entrenamientos.personaje_id 
          AND reg_characters.user_id = auth.uid()
    ));

-- public.reg_personajes_rasgos
DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propios rasgos" ON public.reg_personajes_rasgos;
CREATE POLICY "Usuarios pueden gestionar sus propios rasgos" ON public.reg_personajes_rasgos
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.reg_characters 
        WHERE reg_characters.id = reg_personajes_rasgos.personaje_id 
          AND reg_characters.user_id = auth.uid()
    ));
