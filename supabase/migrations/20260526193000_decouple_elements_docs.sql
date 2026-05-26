-- 1. Añadir columna elemento_id a info_documentos_combate
ALTER TABLE info_documentos_combate 
ADD COLUMN IF NOT EXISTS elemento_id bigint REFERENCES info_elementos(id) ON DELETE SET NULL;

-- 2. Migrar documentos de combate de sub-especialidades de elemento a los verdaderos elementos
-- Mapea buscando coincidencias de nombres de elementos por nombre en español o japonés
UPDATE info_documentos_combate doc
SET 
  elemento_id = elem.id,
  sub_especialidad_id = NULL
FROM info_sub_especialidades sub
JOIN info_elementos elem ON (
  LOWER(elem.nombre_esp) = LOWER(sub.nombre) OR 
  LOWER(elem.nombre_jap) = LOWER(sub.nombre) OR 
  LOWER(elem.nombre_esp) = LOWER(sub.nombre_español)
)
WHERE doc.sub_especialidad_id = sub.id 
  AND doc.rama_id = 4;

-- 3. Limpiar sub-especialidades que en realidad son elementos para que no aparezcan duplicadas
-- Borra sub-especialidades de la rama 4 cuyo nombre o slug coincida con elementos reales
DELETE FROM info_sub_especialidades
WHERE rama_id = 4 
  AND (
    LOWER(nombre) IN (SELECT LOWER(nombre_esp) FROM info_elementos UNION SELECT LOWER(nombre_jap) FROM info_elementos) OR
    LOWER(slug) IN (SELECT LOWER(nombre_esp) FROM info_elementos UNION SELECT LOWER(nombre_jap) FROM info_elementos)
  );
