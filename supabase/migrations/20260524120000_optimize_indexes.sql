-- Migration: Optimize database indexes for common search filters
-- Description: Adds indexes to 'activo', 'categoria', 'estado', and foreign keys to speed up read and admin operations.

-- 1. Index on info_noticias_index(activo) to speed up player-facing active news queries
CREATE INDEX IF NOT EXISTS idx_info_noticias_index_activo ON public.info_noticias_index USING btree (activo);

-- 2. Composite index on info_documentos_sistemas(categoria, activo) for category and player view queries
CREATE INDEX IF NOT EXISTS idx_documentos_sistemas_categoria_activo ON public.info_documentos_sistemas USING btree (categoria, activo);

-- 3. Indexes on info_documentos_combate for rama and sub-specialty active queries
CREATE INDEX IF NOT EXISTS idx_documentos_combate_rama_activo ON public.info_documentos_combate USING btree (rama_id, activo);
CREATE INDEX IF NOT EXISTS idx_documentos_combate_sub_especialidad_activo ON public.info_documentos_combate USING btree (sub_especialidad_id, activo);

-- 4. Index on sys_notificaciones_admin(estado) to optimize admin dispute board queries
CREATE INDEX IF NOT EXISTS idx_sys_notificaciones_admin_estado ON public.sys_notificaciones_admin USING btree (estado);
