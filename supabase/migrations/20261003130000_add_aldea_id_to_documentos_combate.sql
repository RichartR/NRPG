ALTER TABLE info_documentos_combate
ADD COLUMN IF NOT EXISTS aldea_id bigint REFERENCES info_aldeas(id) ON DELETE SET NULL;
