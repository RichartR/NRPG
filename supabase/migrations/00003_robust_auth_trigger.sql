-- Mejorar la robustez del trigger de creación de perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  extracted_username TEXT;
  extracted_discord_id TEXT;
  base_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- 1. Extraer Username de los metadatos (Email signup)
  extracted_username := new.raw_user_meta_data->>'username';
  
  -- 2. Si es OAuth (Discord), extraer de los campos de Discord
  IF extracted_username IS NULL THEN
    extracted_username := COALESCE(
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Ninja'
    );
    
    -- Extraer ID de Discord si existe
    IF new.raw_app_meta_data->>'provider' = 'discord' THEN
      extracted_discord_id := new.raw_user_meta_data->>'sub';
    END IF;
  END IF;

  -- 3. Limpiar el username (quitar espacios, etc.)
  extracted_username := regexp_replace(extracted_username, '\s+', '_', 'g');
  base_username := extracted_username;

  -- 4. Bucle para asegurar que el username sea único
  -- Si ya existe, le añade un sufijo (ej: Ninja_1, Ninja_2...)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = extracted_username) LOOP
    counter := counter + 1;
    extracted_username := base_username || '_' || counter;
  END LOOP;

  -- 5. Insertar con protección de duplicados por ID
  INSERT INTO public.profiles (id, username, discord_id)
  VALUES (new.id, extracted_username, extracted_discord_id)
  ON CONFLICT (id) DO UPDATE 
  SET 
    username = EXCLUDED.username,
    discord_id = COALESCE(public.profiles.discord_id, EXCLUDED.discord_id);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- En caso de error crítico, al menos dejamos que el usuario se cree en Auth
  -- aunque el perfil falle (podemos debugear luego)
  -- Pero para Supabase Auth, si devolvemos NULL el registro falla.
  -- Así que devolvemos NEW de todos modos.
  RETURN NEW;
END;
$$;
