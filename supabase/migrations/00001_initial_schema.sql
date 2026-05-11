-- Create extension for UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    discord_id TEXT,
    active_char_id UUID
    -- We will add the FK to characters after creating the table to avoid circular dependency
);

-- 2. Characters
CREATE TABLE public.characters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    nombre_ninja TEXT NOT NULL,
    aldea_id UUID,
    rango TEXT DEFAULT 'D',
    xp INTEGER DEFAULT 0,
    ryos INTEGER DEFAULT 0,
    stats_base JSONB DEFAULT '{"NIN":0, "TAI":0, "GEN":0, "INT":0, "FUE":0, "AGI":0, "EST":0, "SM":0}'::jsonb,
    atributos_derivados JSONB DEFAULT '{"VIT":600, "CH":0, "VEL":0, "RES":0, "REA":0, "DET":0}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add active_char_id foreign key to profiles
ALTER TABLE public.profiles
ADD CONSTRAINT fk_active_char
FOREIGN KEY (active_char_id) REFERENCES public.characters(id) ON DELETE SET NULL;

-- 3. Items Catalog
CREATE TABLE public.items_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    imagen_url TEXT,
    categoria TEXT
);

-- 4. User Inventory
CREATE TABLE public.user_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES public.items_catalog(id) ON DELETE CASCADE NOT NULL,
    cantidad INTEGER DEFAULT 1,
    obtenido_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tecnicas Glosario
CREATE TABLE public.tecnicas_glosario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    rama_id UUID,
    subcategoria TEXT,
    rango TEXT,
    drive_url TEXT
);

-- 6. Discord News Index
CREATE TABLE public.noticias_index (
    id BIGSERIAL PRIMARY KEY,
    titulo TEXT,
    discord_msg_id TEXT UNIQUE NOT NULL,
    categoria TEXT,
    slug TEXT UNIQUE
);

-- Set RLS (Row Level Security)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicas_glosario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noticias_index ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles (Users can read all profiles, but only update their own)
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for Characters
CREATE POLICY "Public characters are viewable by everyone."
  ON public.characters FOR SELECT USING (true);

CREATE POLICY "Users can create their own characters."
  ON public.characters FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own characters."
  ON public.characters FOR UPDATE USING (auth.uid() = user_id);

-- Policies for Items Catalog (Read-only for users)
CREATE POLICY "Items are viewable by everyone."
  ON public.items_catalog FOR SELECT USING (true);

-- Policies for User Inventory
CREATE POLICY "Public inventory is viewable by everyone."
  ON public.user_inventory FOR SELECT USING (true);

-- Policies for Glosario
CREATE POLICY "Glosario is viewable by everyone."
  ON public.tecnicas_glosario FOR SELECT USING (true);

-- Policies for Noticias Index
CREATE POLICY "Noticias index is viewable by everyone."
  ON public.noticias_index FOR SELECT USING (true);
