import { createClient } from '@/utils/supabase/client';
import { Registro, MisionMaster } from '@/domain/types';

export const RegistrosService = {
  async getRegistros(page = 1, limit = 15, filters: { tipo?: string; personaje_id?: number } = {}) {
    const supabase = createClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('reg_registros')
      .select(`
        *,
        autor: reg_characters!reg_registros_autor_id_fkey(nombre_ninja),
        participantes: reg_registros_participantes!reg_registros_participantes_registro_id_fkey(
          *,
          personaje: reg_characters!reg_registros_participantes_personaje_id_fkey(nombre_ninja)
        )
      `, { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(from, to);

    if (filters.tipo) {
      query = query.eq('tipo', filters.tipo);
    }

    if (filters.personaje_id) {
      // Para filtrar por personaje_id, necesitamos buscar si es autor O participante
      // Esto es complejo con una sola query en Supabase si no es una RPC, 
      // pero para el feed global no solemos filtrar por personaje_id.
      // Si se necesita para la ficha, usaremos la relación cargada en CharacterService.
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

    // 3. Aplicar recompensas instantáneas al autor si es misión
    if (payload.tipo === 'mision' && payload.data.recompensa_xp || payload.data.recompensa_ryous) {
      const { data: char } = await supabase
        .from('reg_characters')
        .select('xp, ryous')
        .eq('id', payload.autor_id)
        .single();

      if (char) {
        await supabase
          .from('reg_characters')
          .update({
            xp: (char.xp || 0) + (payload.data.recompensa_xp || 0),
            ryous: (char.ryous || 0) + (payload.data.recompensa_ryous || 0)
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
    
    // First delete participants due to potential FK constraints (though CASCADE is better)
    await supabase.from('reg_registros_participantes').delete().eq('registro_id', id);
    
    const { error } = await supabase
      .from('reg_registros')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
