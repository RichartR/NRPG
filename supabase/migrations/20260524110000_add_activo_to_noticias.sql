-- Migration: Add activo column to info_noticias_index
-- Description: Adds a boolean 'activo' column to manage archived news items.

ALTER TABLE public.info_noticias_index 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
