-- Añadir columna 'activo' a aldeas
ALTER TABLE public.aldeas 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Añadir columna 'activo' a ramas_clanes
ALTER TABLE public.ramas_clanes 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Añadir columna 'activo' a elementos (por coherencia, ya que estamos)
ALTER TABLE public.elementos 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
