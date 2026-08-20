-- Migration: Add discord_announcement_msg_id column to info_noticias_index
ALTER TABLE public.info_noticias_index ADD COLUMN IF NOT EXISTS discord_announcement_msg_id text;
