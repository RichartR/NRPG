-- 1. Modificar la estructura de la tabla aldeas
ALTER TABLE public.aldeas 
RENAME COLUMN nombre TO nombre_jap;

ALTER TABLE public.aldeas 
ADD COLUMN IF NOT EXISTS abreviatura TEXT,
ADD COLUMN IF NOT EXISTS nombre_español TEXT,
ADD COLUMN IF NOT EXISTS nombre_completo TEXT,
ADD COLUMN IF NOT EXISTS url_icono TEXT;

-- 2. Actualizar los datos existentes con la nueva estructura
UPDATE public.aldeas SET 
    abreviatura = 'Konoha',
    nombre_español = 'Hoja',
    nombre_completo = 'Aldea Oculta de la Hoja',
    url_icono = 'https://i.imgur.com/e2O3Yg9.png' -- Ejemplo de icono
WHERE slug = 'konoha';

UPDATE public.aldeas SET 
    abreviatura = 'Suna',
    nombre_español = 'Arena',
    nombre_completo = 'Aldea Oculta de la Arena',
    url_icono = 'https://i.imgur.com/your_suna_icon.png'
WHERE slug = 'suna';

UPDATE public.aldeas SET 
    abreviatura = 'Kiri',
    nombre_español = 'Niebla',
    nombre_completo = 'Aldea Oculta de la Niebla',
    url_icono = 'https://i.imgur.com/your_kiri_icon.png'
WHERE slug = 'kiri';

UPDATE public.aldeas SET 
    abreviatura = 'Kumo',
    nombre_español = 'Nube',
    nombre_completo = 'Aldea Oculta de las Nubes',
    url_icono = 'https://i.imgur.com/your_kumo_icon.png'
WHERE slug = 'kumo';

UPDATE public.aldeas SET 
    abreviatura = 'Iwa',
    nombre_español = 'Roca',
    nombre_completo = 'Aldea Oculta de la Roca',
    url_icono = 'https://i.imgur.com/your_iwa_icon.png'
WHERE slug = 'iwa';
