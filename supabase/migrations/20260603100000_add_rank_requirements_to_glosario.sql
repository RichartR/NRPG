-- Add rango and obligatoria_ascenso columns to info_glosario
ALTER TABLE info_glosario ADD COLUMN IF NOT EXISTS rango VARCHAR(10) DEFAULT NULL;
ALTER TABLE info_glosario ADD COLUMN IF NOT EXISTS obligatoria_ascenso BOOLEAN DEFAULT FALSE NOT NULL;

-- Populate rango column with existing rango from requisitos JSON if present
UPDATE info_glosario
SET rango = requisitos->>'rango'
WHERE requisitos IS NOT NULL AND requisitos->>'rango' IS NOT NULL;
