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
    const combatPts = RewardLogic.calculateCombatPoints(registro, payload.autor_id);
    
    if (xp > 0 || ryous > 0 || combatPts > 0) {
      const { data: char } = await supabase
        .from('reg_characters')
        .select('xp, ryous, puntos_combate')
        .eq('id', payload.autor_id)
        .single();

      if (char) {
        await supabase
          .from('reg_characters')
          .update({
            xp: (char.xp || 0) + xp,
            ryous: (char.ryous || 0) + ryous,
            puntos_combate: (char.puntos_combate || 0) + combatPts
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
      .select('id, nombre_ninja, rango')
      .ilike('nombre_ninja', `%${query}%`)
      .limit(5);
    
    if (error) throw error;
    return data || [];
  },

  async updateRegistro(id: number, payload: Partial<Registro> & { participantes_ids?: number[] }) {
    const supabase = createClient();
    
    // 1. Obtener el registro viejo y sus participantes actuales de la DB
    const { data: oldRegistro } = await supabase.from('reg_registros').select('*').eq('id', id).single();
    const { data: currentDbParticipants } = await supabase.from('reg_registros_participantes').select('*').eq('registro_id', id);
    
    if (!oldRegistro) throw new Error('Registro no encontrado');
    
    // Inyectar fecha de última modificación en el JSON data
    const updatedData = {
      ...payload.data,
      fecha_modificacion: new Date().toISOString()
    };
    
    // 2. Actualizar el registro base
    const { error: updateError } = await supabase
      .from('reg_registros')
      .update({
        subtipo: payload.subtipo,
        data: updatedData
      })
      .eq('id', id);
    
    if (updateError) throw updateError;

    // Si no se pasaron participantes_ids, no hay nada que sincronizar
    if (!payload.participantes_ids) return;

    const newParticipantIds = payload.participantes_ids;
    const oldParticipants = currentDbParticipants || [];
    const oldParticipantIds = oldParticipants.map(p => p.personaje_id);

    // A. ELIMINADOS: En la DB vieja pero NO en la nueva lista
    const removedParticipants = oldParticipants.filter(p => !newParticipantIds.includes(p.personaje_id));
    for (const p of removedParticipants) {
      if (p.estado === 'aceptado') {
        const { xp, ryous } = RewardLogic.calculateReward(oldRegistro, p.personaje_id);
        const combatPts = RewardLogic.calculateCombatPoints(oldRegistro, p.personaje_id);
        const { data: char } = await supabase.from('reg_characters').select('xp, ryous, puntos_combate').eq('id', p.personaje_id).single();
        if (char) {
          await supabase.from('reg_characters').update({
            xp: Math.max(0, (char.xp || 0) - xp),
            ryous: Math.max(0, (char.ryous || 0) - ryous),
            puntos_combate: Math.max(0, (char.puntos_combate || 0) - combatPts)
          }).eq('id', p.personaje_id);
        }
      }
      // Eliminar participación de la DB
      await supabase.from('reg_registros_participantes').delete().eq('id', p.id);
    }

    // B. AÑADIDOS: En la nueva lista pero NO en la DB vieja
    const addedParticipantIds = newParticipantIds.filter(pid => !oldParticipantIds.includes(pid));
    const autorId = payload.autor_id || oldRegistro.autor_id;
    for (const pid of addedParticipantIds) {
      const isAutor = pid === autorId;
      const estado = isAutor ? 'aceptado' : 'pendiente';

      const { data: newPart } = await supabase
        .from('reg_registros_participantes')
        .insert({
          registro_id: id,
          personaje_id: pid,
          estado
        })
        .select()
        .single();

      if (isAutor && newPart) {
        // Al autor se le entrega la recompensa inmediatamente (basado en el NUEVO registro ya actualizado)
        const newRegistroFull = { ...oldRegistro, subtipo: payload.subtipo, data: payload.data };
        const { xp, ryous } = RewardLogic.calculateReward(newRegistroFull, pid);
        const combatPts = RewardLogic.calculateCombatPoints(newRegistroFull, pid);

        const { data: char } = await supabase.from('reg_characters').select('xp, ryous, puntos_combate').eq('id', pid).single();
        if (char) {
          await supabase.from('reg_characters').update({
            xp: (char.xp || 0) + xp,
            ryous: (char.ryous || 0) + ryous,
            puntos_combate: (char.puntos_combate || 0) + combatPts
          }).eq('id', pid);
        }
      }
    }

    // C. EXISTENTES: En ambas listas. Si ya aceptaron, ajustamos diferencias de recompensas por si cambiaron de valor
    const existingParticipants = oldParticipants.filter(p => newParticipantIds.includes(p.personaje_id));
    const newRegistroFull = { ...oldRegistro, subtipo: payload.subtipo, data: payload.data };
    for (const p of existingParticipants) {
      if (p.estado === 'aceptado') {
        const oldRewards = RewardLogic.calculateReward(oldRegistro, p.personaje_id);
        const newRewards = RewardLogic.calculateReward(newRegistroFull, p.personaje_id);
        const oldCombatPts = RewardLogic.calculateCombatPoints(oldRegistro, p.personaje_id);
        const newCombatPts = RewardLogic.calculateCombatPoints(newRegistroFull, p.personaje_id);

        const diffXp = newRewards.xp - oldRewards.xp;
        const diffRyous = newRewards.ryous - oldRewards.ryous;
        const diffCombatPts = newCombatPts - oldCombatPts;

        if (diffXp !== 0 || diffRyous !== 0 || diffCombatPts !== 0) {
          const { data: char } = await supabase.from('reg_characters').select('xp, ryous, puntos_combate').eq('id', p.personaje_id).single();
          if (char) {
            await supabase.from('reg_characters').update({
              xp: Math.max(0, (char.xp || 0) + diffXp),
              ryous: Math.max(0, (char.ryous || 0) + diffRyous),
              puntos_combate: Math.max(0, (char.puntos_combate || 0) + diffCombatPts)
            }).eq('id', p.personaje_id);
          }
        }
      }
    }
  },

  async deleteRegistro(id: number) {
    const supabase = createClient();
    
    // 1. Obtener participantes y registro para revertir recompensas
    const { data: registro } = await supabase.from('reg_registros').select('*').eq('id', id).single();
    const { data: participantes } = await supabase.from('reg_registros_participantes').select('*').eq('registro_id', id);
    
    if (registro) {
      if (participantes) {
        for (const p of participantes) {
          if (p.estado === 'aceptado') {
            const { xp, ryous } = RewardLogic.calculateReward(registro, p.personaje_id);
            const combatPts = RewardLogic.calculateCombatPoints(registro, p.personaje_id);
            
            const { data: char } = await supabase.from('reg_characters').select('xp, ryous, puntos_combate').eq('id', p.personaje_id).single();
            if (char) {
              await supabase.from('reg_characters').update({
                xp: Math.max(0, (char.xp || 0) - xp),
                ryous: Math.max(0, (char.ryous || 0) - ryous),
                puntos_combate: Math.max(0, (char.puntos_combate || 0) - combatPts)
              }).eq('id', p.personaje_id);
            }
          }
        }
      }

      // Revert costs/expenses (refund) for general actions
      if (registro.tipo === 'accion') {
        const spentXp = Number(registro.data?.gasto_xp) || 0;
        const spentRyous = Number(registro.data?.gasto_ryous) || 0;
        const spentPC = Number(registro.data?.gasto_pc) || 0;

        if (spentXp > 0 || spentRyous > 0 || spentPC > 0) {
          const { data: char } = await supabase.from('reg_characters').select('xp, ryous, puntos_combate').eq('id', registro.autor_id).single();
          if (char) {
            await supabase.from('reg_characters').update({
              xp: (char.xp || 0) + spentXp,
              ryous: (char.ryous || 0) + spentRyous,
              puntos_combate: (char.puntos_combate || 0) + spentPC
            }).eq('id', registro.autor_id);
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
