-- Emblem/icon URL for village cards (local /assets or external)
ALTER TABLE public.info_aldeas
  ADD COLUMN IF NOT EXISTS url_icono text;

COMMENT ON COLUMN public.info_aldeas.url_icono IS 'Village emblem image URL (e.g. /assets/logos_aldeas/konoha.webp)';
