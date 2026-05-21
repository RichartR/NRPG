-- Migration: Add character archiving columns
-- Description: Adds columns to track voluntary vs inactivity archiving and when they occurred.

-- Add columns for archiving tracking
ALTER TABLE reg_characters ADD COLUMN IF NOT EXISTS eliminado_voluntario BOOLEAN DEFAULT FALSE;
ALTER TABLE reg_characters ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Create indices to optimize the cleanup cron queries
CREATE INDEX IF NOT EXISTS idx_characters_archive ON reg_characters (activo, eliminado_voluntario, archived_at);
