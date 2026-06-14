import { createClient } from '@/utils/supabase/client';
import { Registro, MisionMaster } from '@/domain/types';

export const RegistrosService = {
  async getRegistros(page = 1, limit = 15, filters: { tipo?: string; subtipo?: string; personaje_id?: number; startDate?: string; endDate?: string } = {}) {
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

    if (filters.subtipo) {
      query = query.eq('subtipo', filters.subtipo);
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
    autor_id: number | null;
    participantes_ids: number[];
  }) {
    const res = await fetch('/api/registros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', payload })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear el registro');
    }
    return await res.json();
  },

  async searchCharacters(query: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reg_characters')
      .select('id, nombre_ninja, hobba_name, rango')
      .eq('activo', true)
      .or(`nombre_ninja.ilike.%${query}%,hobba_name.ilike.%${query}%`)
      .limit(5);
    
    if (error) throw error;
    return data || [];
  },

  async updateRegistro(id: number, payload: Partial<Registro> & { participantes_ids?: number[] }) {
    const res = await fetch('/api/registros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, payload })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar el registro');
    }
    return await res.json();
  },

  async deleteRegistro(id: number) {
    const res = await fetch('/api/registros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar el registro');
    }
    return await res.json();
  }
};
