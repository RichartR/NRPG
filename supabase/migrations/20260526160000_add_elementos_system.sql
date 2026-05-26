-- =========================================================
-- Sistema de Elementos: Ninjutsu Elemental y Vinculación
-- =========================================================

-- 1. Tabla catálogo de elementos
CREATE TABLE IF NOT EXISTS info_elementos (
  id            SERIAL PRIMARY KEY,
  nombre_esp    TEXT NOT NULL,
  nombre_jap    TEXT NOT NULL,
  url_icono     TEXT,
  tipo          TEXT NOT NULL DEFAULT 'basico' CHECK (tipo IN ('basico', 'avanzado')),
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de vinculación rama/sub-especialidad → elemento
CREATE TABLE IF NOT EXISTS info_rama_elementos (
  id                   SERIAL PRIMARY KEY,
  rama_id              INT REFERENCES info_ramas_clanes(id) ON DELETE CASCADE,
  sub_especialidad_id  INT REFERENCES info_sub_especialidades(id) ON DELETE CASCADE,
  elemento_id          INT NOT NULL REFERENCES info_elementos(id) ON DELETE CASCADE,
  tipo                 TEXT NOT NULL DEFAULT 'fijo' CHECK (tipo IN ('fijo', 'seleccionable')),
  activo               BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_rama_or_sub CHECK (rama_id IS NOT NULL OR sub_especialidad_id IS NOT NULL)
);

-- 3. Flag de repetibilidad en ramas/clanes
ALTER TABLE info_ramas_clanes
  ADD COLUMN IF NOT EXISTS es_repetible BOOLEAN NOT NULL DEFAULT false;

-- 4. Flag de repetibilidad en sub-especialidades
ALTER TABLE info_sub_especialidades
  ADD COLUMN IF NOT EXISTS es_repetible BOOLEAN NOT NULL DEFAULT false;

-- 5. Columnas de elementos elegidos en la tabla de ramas del personaje
ALTER TABLE reg_personajes_ramas
  ADD COLUMN IF NOT EXISTS elemento_principal_id  INT REFERENCES info_elementos(id),
  ADD COLUMN IF NOT EXISTS elemento_secundario_id INT REFERENCES info_elementos(id),
  ADD COLUMN IF NOT EXISTS elemento_terciario_id  INT REFERENCES info_elementos(id);

-- =========================================================
-- RLS: info_elementos
-- =========================================================
ALTER TABLE info_elementos ENABLE ROW LEVEL SECURITY;

-- Lectura pública (mismo patrón que info_ramas_clanes, info_sub_especialidades, etc.)
CREATE POLICY "Lectura pública de elementos"
  ON info_elementos
  FOR SELECT
  TO public
  USING (true);

-- Solo admins pueden crear, editar y borrar
CREATE POLICY "Admins gestionan elementos"
  ON info_elementos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- =========================================================
-- RLS: info_rama_elementos
-- =========================================================
ALTER TABLE info_rama_elementos ENABLE ROW LEVEL SECURITY;

-- Lectura pública (los jugadores necesitan leer qué elementos tiene cada rama)
CREATE POLICY "Lectura pública de rama_elementos"
  ON info_rama_elementos
  FOR SELECT
  TO public
  USING (true);

-- Solo admins pueden crear, editar y borrar
CREATE POLICY "Admins gestionan rama_elementos"
  ON info_rama_elementos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- =========================================================
-- Índices de optimización: info_elementos
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_elementos_tipo        ON info_elementos(tipo);
CREATE INDEX IF NOT EXISTS idx_elementos_activo      ON info_elementos(activo);
CREATE INDEX IF NOT EXISTS idx_elementos_tipo_activo ON info_elementos(tipo, activo);

-- =========================================================
-- Índices de optimización: info_rama_elementos
-- =========================================================
-- FKs base
CREATE INDEX IF NOT EXISTS idx_rama_elementos_rama  ON info_rama_elementos(rama_id);
CREATE INDEX IF NOT EXISTS idx_rama_elementos_sub   ON info_rama_elementos(sub_especialidad_id);
CREATE INDEX IF NOT EXISTS idx_rama_elementos_elem  ON info_rama_elementos(elemento_id);
-- Filtros comunes
CREATE INDEX IF NOT EXISTS idx_rama_elementos_activo    ON info_rama_elementos(activo);
CREATE INDEX IF NOT EXISTS idx_rama_elementos_tipo      ON info_rama_elementos(tipo);
-- Compuestos para las consultas más habituales
CREATE INDEX IF NOT EXISTS idx_rama_elementos_rama_tipo ON info_rama_elementos(rama_id, tipo);
CREATE INDEX IF NOT EXISTS idx_rama_elementos_sub_tipo  ON info_rama_elementos(sub_especialidad_id, tipo);

-- =========================================================
-- Índices en FK de elementos en reg_personajes_ramas
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_personajes_ramas_elem_principal  ON reg_personajes_ramas(elemento_principal_id);
CREATE INDEX IF NOT EXISTS idx_personajes_ramas_elem_secundario ON reg_personajes_ramas(elemento_secundario_id);
CREATE INDEX IF NOT EXISTS idx_personajes_ramas_elem_terciario  ON reg_personajes_ramas(elemento_terciario_id);

-- =========================================================
-- Seed: 5 Elementos Básicos
-- =========================================================
INSERT INTO info_elementos (nombre_esp, nombre_jap, tipo, activo) VALUES
  ('Fuego',    'Katon',   'basico', true),
  ('Agua',     'Suiton',  'basico', true),
  ('Tierra',   'Doton',   'basico', true),
  ('Rayo',     'Raiton',  'basico', true),
  ('Viento',   'Fuuton',  'basico', true)
ON CONFLICT DO NOTHING;

-- =========================================================
-- Seed: Sub-especialidades de Ninjutsu Elemental (rama_id = 4)
-- =========================================================
INSERT INTO info_sub_especialidades (rama_id, nombre, slug, activo, es_repetible) VALUES
  (4, 'Ninjutsu I',   'ninjutsu-i',   true, false),
  (4, 'Ninjutsu II',  'ninjutsu-ii',  true, false),
  (4, 'Ninjutsu III', 'ninjutsu-iii', true, false)
ON CONFLICT DO NOTHING;
