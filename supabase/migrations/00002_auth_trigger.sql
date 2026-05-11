-- Función que se ejecuta al registrar un nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  extracted_username TEXT;
  extracted_discord_id TEXT;
BEGIN
  -- Intentar extraer el username proporcionado por el registro por email
  extracted_username := new.raw_user_meta_data->>'username';
  
  -- Si es nulo, significa que probablemente viene de Discord (OAuth)
  IF extracted_username IS NULL THEN
    -- Discord suele enviar preferred_username o full_name
    extracted_username := COALESCE(
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'custom_claims'->>'global_name',
      new.raw_user_meta_data->>'full_name',
      'Ninja_' || substr(new.id::text, 1, 8)
    );
    -- En caso de Discord, también podemos extraer el provider_id
    -- Pero dado que raw_app_meta_data tiene provider='discord', provider_id está en sub
    IF new.raw_app_meta_data->>'provider' = 'discord' THEN
      extracted_discord_id := new.raw_user_meta_data->>'sub';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, username, discord_id)
  VALUES (new.id, extracted_username, extracted_discord_id);
  
  RETURN NEW;
END;
$$;

-- Crear el Trigger asociado a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
