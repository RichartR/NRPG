-- Migration: Add combat_presets column to reg_characters
-- Allows storing customized combat presets, macros and roleplay snippets for techniques, items, and passives.

ALTER TABLE public.reg_characters
ADD COLUMN IF NOT EXISTS combat_presets JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.reg_characters.combat_presets IS 'List of combat presets, macros and formatted copy templates for techniques, items, and passives';
