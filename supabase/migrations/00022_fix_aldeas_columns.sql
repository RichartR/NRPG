-- Renombrar columna nombre a nombre_jap en la tabla aldeas
ALTER TABLE public.aldeas 
RENAME COLUMN nombre TO nombre_jap;
