import { SupabaseClient } from '@supabase/supabase-js';
import { Aldea, RamaClan } from '@/domain/types';

export const MasterServerService = {
  async getAldeas(supabase: SupabaseClient): Promise<Aldea[]> {
    const { data, error } = await supabase
      .from('aldeas')
      .select('*')
      .order('nombre_jap');
    if (error) throw error;
    return data || [];
  },

  async getAldeaBySlug(supabase: SupabaseClient, slug: string): Promise<Aldea | null> {
    const { data, error } = await supabase
      .from('aldeas')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) return null;
    return data;
  },

  async getClanesByAldeaId(supabase: SupabaseClient, aldeaId: number): Promise<RamaClan[]> {
    const { data, error } = await supabase
      .from('ramas_clanes')
      .select('*')
      .eq('aldea_id', aldeaId)
      .eq('tipo', 'clan')
      .eq('activo', true);
    if (error) throw error;
    return data || [];
  }
};
