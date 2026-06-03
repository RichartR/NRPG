-- Add updated_at to reg_personajes_ramas and aldea_updated_at to reg_characters

-- 1. Alter reg_personajes_ramas
ALTER TABLE public.reg_personajes_ramas 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 2. Alter reg_characters
ALTER TABLE public.reg_characters 
ADD COLUMN IF NOT EXISTS aldea_updated_at timestamp with time zone DEFAULT now();

-- 3. Create or replace trigger function for updating updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for reg_personajes_ramas
DROP TRIGGER IF EXISTS tr_update_reg_personajes_ramas_updated_at ON public.reg_personajes_ramas;
CREATE TRIGGER tr_update_reg_personajes_ramas_updated_at
    BEFORE UPDATE ON public.reg_personajes_ramas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create trigger function for tracking village change
CREATE OR REPLACE FUNCTION public.tr_update_character_aldea_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.aldea_id IS DISTINCT FROM OLD.aldea_id THEN
        NEW.aldea_updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for reg_characters
DROP TRIGGER IF EXISTS tr_character_aldea_change ON public.reg_characters;
CREATE TRIGGER tr_character_aldea_change
    BEFORE UPDATE ON public.reg_characters
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_update_character_aldea_date();
