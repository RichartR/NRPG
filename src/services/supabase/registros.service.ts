import { createClient } from '@/utils/supabase/client';
import { Registro, MisionMaster } from '@/domain/types';
import { RewardLogic } from '@/domain/character/logic';

export const RegistrosService = {
  async getRegistros(page = 1, limit = 15, filters: { tipo?: string; personaje_id?: number; startDate?: string; endDate?: string } = {}) {
    const supabase = createClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('reg_registros')
      .select(`
        *,
        autor: reg_characters!reg_registros_autor_id_fkey(nombre_ninja, url_img, profiles!user_id(username, url_avatar, url_img)),
        participantes: reg_registros_participantes!reg_registros_participantes_registro_id_fkey(
          *,
          personaje: reg_characters!reg_registros_participantes_personaje_id_fkey(nombre_ninja, url_img, profiles!user_id(username, url_avatar, url_img))
        )
      `, { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(from, to);

    if (filters.tipo) {
      query = query.eq('tipo', filters.tipo);
    }

    if (filters.startDate) {
      query = query.gte('fecha', `${filters.startDate}T00:00:00Z`);
    }

    if (filters.endDate) {
      query = query.lte('fecha', `${filters.endDate}T23:59:59Z`);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Error fetching registros:', error);
      throw error;
    }
    return { data: (data as Registro[]) || [], count: count || 0 };
  },

  async getMisionesByRango(rango: string): Promise<MisionMaster[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_misiones')
      .select('*')
      .eq('rango', rango)
      .order('codigo_mision', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async createRegistro(payload: {
    tipo: 'mision' | 'accion' | 'combate';
    subtipo?: string;
    data: any;
    autor_id: number;
    participantes_ids: number[];
  }) {
    const supabase = createClient();

    // 1. Crear el registro base
    const { data: registro, error: regError } = await supabase
      .from('reg_registros')
      .insert({
        tipo: payload.tipo,
        subtipo: payload.subtipo,
        data: payload.data,
        autor_id: payload.autor_id
      })
      .select()
      .single();

    if (regError) throw regError;

    // 2. Crear participantes
    if (payload.participantes_ids.length > 0) {
      const participantsData = payload.participantes_ids.map(pid => ({
        registro_id: registro.id,
        personaje_id: pid,
        estado: pid === payload.autor_id ? 'aceptado' : 'pendiente'
      }));

      const { error: partError } = await supabase
        .from('reg_registros_participantes')
        .insert(participantsData);
      
      if (partError) throw partError;
    }

    // 3. Aplicar recompensas instantáneas al autor
    const { xp, ryous } = RewardLogic.calculateReward(registro, payload.autor_id);
    
    if (xp > 0 || ryous > 0) {
      const { data: char } = await supabase
        .from('reg_characters')
        .select('xp, ryous')
        .eq('id', payload.autor_id)
        .single();

      if (char) {
        await supabase
          .from('reg_characters')
          .update({
            xp: (char.xp || 0) + xp,
            ryous: (char.ryous || 0) + ryous
          })
          .eq('id', payload.autor_id);
      }
    }

    return registro;
  },

  async searchCharacters(query: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reg_characters')
      .select('id, nombre_ninja')
      .ilike('nombre_ninja', `%${query}%`)
      .limit(5);
    
    if (error) throw error;
    return data || [];
  },

  async updateRegistro(id: number, payload: Partial<Registro>) {
    const supabase = createClient();
    const { error } = await supabase
      .from('reg_registros')
      .update({
        subtipo: payload.subtipo,
        data: payload.data
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteRegistro(id: number) {
    const supabase = createClient();
    
    // 1. Obtener participantes y registro para revertir recompensas
    const { data: registro } = await supabase.from('reg_registros').select('*').eq('id', id).single();
    const { data: participantes } = await supabase.from('reg_registros_participantes').select('*').eq('registro_id', id);
    
    if (registro && participantes) {
      for (const p of participantes) {
        if (p.estado === 'aceptado') {
          const { xp, ryous } = RewardLogic.calculateReward(registro, p.personaje_id);
          
          const { data: char } = await supabase.from('reg_characters').select('xp, ryous').eq('id', p.personaje_id).single();
          if (char) {
            await supabase.from('reg_characters').update({
              xp: (char.xp || 0) - xp,
              ryous: (char.ryous || 0) - ryous
            }).eq('id', p.personaje_id);
          }
        }
      }
    }

    // 2. Eliminar (CASCADE debería encargarse de los participantes si está configurado, si no lo hacemos manual)
    await supabase.from('reg_registros_participantes').delete().eq('registro_id', id);
    const { error } = await supabase
      .from('reg_registros')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
