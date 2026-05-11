-- Añadir columna de tercer nivel (agrupador)
ALTER TABLE public.documentos_sistemas 
ADD COLUMN IF NOT EXISTS agrupador TEXT;

-- Comentario para que sepas cómo usarlo:
-- categoria: 'ramas'
-- subcategoria: 'Ninjutsu'
-- agrupador: 'Katon'
