-- Migration: Make url_default column nullable in public.info_acompanantes
-- Description: Drops the NOT NULL constraint on url_default to support companion types that do not have/need default images.

ALTER TABLE public.info_acompanantes ALTER COLUMN url_default DROP NOT NULL;
