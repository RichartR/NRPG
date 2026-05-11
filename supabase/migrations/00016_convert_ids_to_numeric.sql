-- 1. Eliminar temporalmente las claves foráneas
ALTER TABLE public.ramas_clanes DROP COLUMN IF EXISTS aldea_id;

-- 2. Cambiar ID de aldeas a numérico
ALTER TABLE public.aldeas DROP COLUMN id CASCADE;
ALTER TABLE public.aldeas ADD COLUMN id BIGSERIAL PRIMARY KEY;

-- 3. Cambiar ID de ramas_clanes a numérico
ALTER TABLE public.ramas_clanes DROP COLUMN id CASCADE;
ALTER TABLE public.ramas_clanes ADD COLUMN id BIGSERIAL PRIMARY KEY;

-- 4. Re-crear la columna de relación como numérica
ALTER TABLE public.ramas_clanes ADD COLUMN aldea_id BIGINT REFERENCES public.aldeas(id) ON DELETE SET NULL;

-- 5. Hacer lo mismo con elementos (por consistencia)
ALTER TABLE public.elementos DROP COLUMN id CASCADE;
ALTER TABLE public.elementos ADD COLUMN id BIGSERIAL PRIMARY KEY;
