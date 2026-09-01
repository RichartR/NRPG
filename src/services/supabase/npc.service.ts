import { createClient } from '@/utils/supabase/client';
import { InfoNPC } from '@/domain/types';

export const NPCService = {
  async getNPCsByAldea(aldeaId: number | null, client?: any): Promise<InfoNPC[]> {
    const supabase = client || createClient();
    let query = supabase
      .from('info_npc')
      .select('*, aldeas:info_aldeas(id, nombre_completo, abreviatura)')
      .order('id', { ascending: true });

    if (aldeaId !== null && aldeaId !== undefined) {
      query = query.eq('aldea_id', aldeaId);
    } else {
      query = query.is('aldea_id', null);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error al obtener NPCs:', error);
      throw error;
    }
    return data || [];
  },

  async createNPC(npcData: Partial<InfoNPC>, client?: any): Promise<InfoNPC> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('info_npc')
      .insert([npcData])
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear NPC:', error);
      throw error;
    }
    return data;
  },

  async updateNPC(id: number, npcData: Partial<InfoNPC>, client?: any): Promise<InfoNPC> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('info_npc')
      .update(npcData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error al actualizar NPC:', error);
      throw error;
    }
    return data;
  },

  async deleteNPC(id: number, client?: any): Promise<void> {
    const supabase = client || createClient();
    const { error } = await supabase
      .from('info_npc')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar NPC:', error);
      throw error;
    }
  },
};
