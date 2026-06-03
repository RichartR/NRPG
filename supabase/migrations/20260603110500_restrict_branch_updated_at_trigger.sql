-- Restrict updated_at trigger on reg_personajes_ramas to only fire when rama_id changes

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rama_id IS DISTINCT FROM OLD.rama_id THEN
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
