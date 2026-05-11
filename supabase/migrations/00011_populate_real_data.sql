-- Limpiar datos antiguos (opcional, si quieres empezar de cero)
-- DELETE FROM public.documentos_sistemas WHERE categoria IN ('aldeas', 'ramas', 'general');

-- 1. Insertar Documentos de Raíz (General)
INSERT INTO public.documentos_sistemas (titulo, clave, descripcion, categoria, subcategoria, url_drive, icono, activo)
VALUES 
    ('[NRPG] Armas Básicas', 'armas-basicas', 'Catálogo de armas iniciales y equipamiento ninja estándar.', 'general', 'Inicio', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Sword', true),
    ('[NRPG] Técnicas Básicas', 'tecnicas-basicas', 'Manual de Jutsus básicos de la academia y técnicas universales.', 'general', 'Inicio', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Zap', true)
ON CONFLICT (clave) DO NOTHING;

-- 2. Insertar Estructura de Aldeas
INSERT INTO public.documentos_sistemas (titulo, clave, descripcion, categoria, subcategoria, url_drive, icono, activo)
VALUES 
    ('Konohagakure - Clanes y Especialidades', 'konoha-info', 'Información sobre Aburame, Hyuuga, Inuzuka, Uchiha y más.', 'aldeas', 'Konohagakure', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Leaf', true),
    ('Sunagakure - Marionetas y Viento', 'suna-info', 'Suna Ichizoku, Satetsu y especialidades de la arena.', 'aldeas', 'Sunagakure', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Wind', true),
    ('Kirigakure - Los 7 Espadachines', 'kiri-info', 'Clanes Hozuki, Kaguya, Yuki y las Shinobi Gatana.', 'aldeas', 'Kirigakure', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Waves', true),
    ('Iwagakure - Voluntad de Piedra', 'iwa-info', 'Clan Kamizuru, Kibaku Nendo y el Kekkei Genkai Youton.', 'aldeas', 'Iwagakure', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Mountain', true),
    ('Kumogakure - El Rayo del Kumo', 'kumo-info', 'Especialidades Akurobatto-Ryū, Kumo-Ryū y Ranton.', 'aldeas', 'Kumogakure', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Zap', true)
ON CONFLICT (clave) DO NOTHING;

-- 3. Insertar Estructura de Ramas
INSERT INTO public.documentos_sistemas (titulo, clave, descripcion, categoria, subcategoria, url_drive, icono, activo)
VALUES 
    ('RAMAS - FUNCIONAMIENTO', 'ramas-funcionamiento', 'Guía general sobre cómo funcionan las especialidades y el aprendizaje.', 'ramas', 'General', 'https://docs.google.com/document/d/1GRQxTMrz8abEGxO4WDCuS_l6g5pBrqaybHp5ZdYfOZU/edit', 'Info', true),
    ('Técnicas por Rama (Excel)', 'tecnicas-excel', 'Base de datos completa de técnicas filtrada por especialidad.', 'ramas', 'General', 'https://docs.google.com/spreadsheets/d/1DM2VWC89f-QTsQO7s4BJ5l3SWZZfjOqddxirXwyWh4o/edit', 'Table', true),
    ('Especialidad: Bukijutsu', 'rama-bukijutsu', 'Dominio de armas blancas, proyectiles y herramientas ninja.', 'ramas', 'Bukijutsu', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Sword', true),
    ('Especialidad: Ninjutsu', 'rama-ninjutsu', 'Técnicas elementales (Katon, Suiton, Doton, Raiton, Fuuton).', 'ramas', 'Ninjutsu', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Zap', true),
    ('Especialidad: Genjutsu', 'rama-genjutsu', 'Artes ilusorias y manipulación de la percepción.', 'ramas', 'Genjutsu', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Eye', true),
    ('Especialidad: Taijutsu', 'rama-taijutsu', 'Combate cuerpo a cuerpo y estilos de lucha físicos.', 'ramas', 'Taijutsu', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Fist', true),
    ('Especialidad: Iryō-nin', 'rama-iryo', 'Artes médicas, curación y venenos.', 'ramas', 'Iryoninjutsu', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Heart', true),
    ('Especialidad: Kanchi', 'rama-kanchi', 'Habilidades sensoriales y detección de chakra.', 'ramas', 'Sensorial', 'https://drive.google.com/drive/folders/1QfVmpzAXv-vQFPejCM6QUbteyQDaeyXf', 'Radar', true)
ON CONFLICT (clave) DO NOTHING;
