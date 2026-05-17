import { Profile } from '@/domain/types';
import { createClient } from '@/utils/supabase/client';

export const ProfileService = {
  async getProfile(userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async getActiveCharacterId(userId: string): Promise<number | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('active_char_id')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data?.active_char_id;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const supabase = createClient();
    
    // Intentamos la actualización normal
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    // Si da error 400 y estamos intentando actualizar url_img, 
    // es posible que la columna no exista, así que probamos con url_avatar
    if (error && error.code === '42703' && 'url_img' in updates) {
      const { url_img, ...rest } = updates;
      return await supabase
        .from('profiles')
        .update({ ...rest, url_avatar: url_img })
        .eq('id', userId);
    }

    if (error) throw error;
  }
};
