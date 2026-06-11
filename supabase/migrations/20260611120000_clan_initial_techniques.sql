-- Add config_iniciales to info_ramas_clanes for clan configuration
ALTER TABLE info_ramas_clanes 
ADD COLUMN IF NOT EXISTS config_iniciales jsonb DEFAULT '{"opciones": []}'::jsonb;

-- Add eleccion_tecnicas_clan to reg_characters to persist characters' choices
ALTER TABLE reg_characters 
ADD COLUMN IF NOT EXISTS eleccion_tecnicas_clan jsonb DEFAULT NULL;

-- Create GIN index for config_iniciales
CREATE INDEX IF NOT EXISTS idx_info_ramas_clanes_config_iniciales ON info_ramas_clanes USING gin (config_iniciales);
