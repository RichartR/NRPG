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
  }
};
