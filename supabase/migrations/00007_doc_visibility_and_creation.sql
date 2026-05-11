-- Añadir columna de visibilidad
ALTER TABLE public.documentos_sistemas 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Comentario para el registro
COMMENT ON COLUMN public.documentos_sistemas.activo IS 'Si es falso, el documento no se mostrará a los jugadores';

-- Asegurarnos de que los actuales estén activos
UPDATE public.documentos_sistemas SET activo = true WHERE activo IS NULL;
