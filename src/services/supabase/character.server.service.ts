import { SupabaseClient } from '@supabase/supabase-js';
import { Character } from '@/domain/types';

/**
 * Server-side character service used by API Routes (Next.js Route Handlers).
 * Receives the SupabaseClient instance created from '@/utils/supabase/server'.
 */
export const CharacterServerService = {
  async getCharacterById(supabase: SupabaseClient, id: string | number): Promise<Character | null> {
    const { data, error } = await supabase
      .from('reg_characters')
      .select('*, personajes_ramas:reg_personajes_ramas(*, rama:info_ramas_clanes(nombre), sub_especialidad:info_sub_especialidades(nombre))')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as any; // Cast as any since we added joins not in basic Character type
  },

  async hasReachedCharacterLimit(supabase: SupabaseClient, userId: string): Promise<boolean> {
    // Obtener el límite configurado (por defecto 1 si no existe la clave)
    const { MasterServerService } = await import('./master.server.service');
    const limitRaw = await MasterServerService.getConfiguracion(supabase, 'characters_per_player');
    const limit = limitRaw ? parseInt(limitRaw, 10) : 1;

    const { count } = await supabase
      .from('reg_characters')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('activo', true);

    return (count ?? 0) >= limit;
  },

  async createCharacter(supabase: SupabaseClient, payload: Record<string, unknown>): Promise<Character> {
    const { data, error } = await supabase
      .from('reg_characters')
      .insert({ ...payload, activo: true })
      .select()
      .single();

    // Si la columna url_img no existe (error 42703), intentamos insertar sin ella
    if (error && error.code === '42703' && 'url_img' in payload) {
      const { url_img, ...rest } = payload;
      const { data: retryData, error: retryError } = await supabase
        .from('reg_characters')
        .insert({ ...rest, activo: true })
        .select()
        .single();
      if (retryError) throw retryError;
      return retryData as Character;
    }

    if (error) throw error;
    return data as Character;
  },

  async updateCharacterFields(supabase: SupabaseClient, id: string | number, fields: Record<string, unknown>) {
    const { error } = await supabase.from('reg_characters').update(fields).eq('id', id);
    
    // Si la columna url_img no existe (error 42703), intentamos guardar sin ella
    if (error && error.code === '42703' && 'url_img' in fields) {
      const { url_img, ...rest } = fields;
      const { error: retryError } = await supabase.from('reg_characters').update(rest).eq('id', id);
      if (retryError) throw retryError;
      return;
    }

    if (error) throw error;
  },

  async upsertRama(supabase: SupabaseClient, characterId: string | number, slot: number, ramaId: number, subEspecialidadId: number | null, entrenamientoId: number | null) {
    const { error } = await supabase.from('reg_personajes_ramas').upsert({
      personaje_id: characterId, 
      slot, 
      rama_id: ramaId, 
      sub_especialidad_id: subEspecialidadId || null,
      id_entrenamiento: entrenamientoId || null
    }, { onConflict: 'personaje_id, slot' });
    if (error) throw error;
  },

  async deleteRamaSlot(supabase: SupabaseClient, characterId: string | number, slot: number) {
    const { error } = await supabase.from('reg_personajes_ramas').delete().eq('personaje_id', characterId).eq('slot', slot);
    if (error) throw error;
  },

  async bulkUpdateRamas(supabase: SupabaseClient, characterId: string | number, ramas: any[]) {
    // 1. Identificar slots a eliminar (los que no vienen en el nuevo array)
    const activeSlots = ramas.map(r => r.slot).filter(Boolean);
    if (activeSlots.length < 2) {
      // Si solo tenemos 1 o 0 ramas, borramos los slots que ya no existan
      // (asumiendo que hay un máximo de 2 slots)
      const slotsToDelete = [1, 2].filter(s => !activeSlots.includes(s));
      for (const slot of slotsToDelete) {
        await this.deleteRamaSlot(supabase, characterId, slot);
      }
    }

    // 2. Realizar un UPSERT masivo (una sola petición)
    // Esto permite que Postgres valide la restricción de unicidad al final de la operación,
    // permitiendo "intercambios" de ramas entre slots sin dar error de duplicado.
    if (ramas.length > 0) {
      const { error } = await supabase.from('reg_personajes_ramas').upsert(
        ramas.map((r, idx) => ({
          personaje_id: characterId,
          slot: r.slot || idx + 1,
          rama_id: r.rama_id,
          sub_especialidad_id: r.sub_especialidad_id || null,
          id_entrenamiento: r.id_entrenamiento || null
        })), 
        { onConflict: 'personaje_id, slot' }
      );
      if (error) throw error;
    }
  },

  async replaceInventario(supabase: SupabaseClient, characterId: string | number, items: { item_id: number; cantidad: number }[]) {
    await supabase.from('reg_personajes_inventario').delete().eq('personaje_id', characterId);
    if (items.length > 0) {
      const { error } = await supabase.from('reg_personajes_inventario').insert(
        items.map(i => ({ personaje_id: characterId, item_id: i.item_id }))
      );
      if (error) throw error;
    }
  },

  async replaceTecnicas(supabase: SupabaseClient, characterId: string | number, tecnicas: { tecnica_id: number }[]) {
    await supabase.from('reg_personajes_tecnicas').delete().eq('personaje_id', characterId);
    if (tecnicas.length > 0) {
      const { error } = await supabase.from('reg_personajes_tecnicas').insert(
        tecnicas.map(t => ({ personaje_id: characterId, tecnica_id: t.tecnica_id }))
      );
      if (error) throw error;
    }
  },

  async insertRamas(supabase: SupabaseClient, characterId: string | number, ramas: { rama_id: number; sub_especialidad_id?: number; id_entrenamiento?: number }[]) {
    if (ramas.length === 0) return;
    const { error } = await supabase.from('reg_personajes_ramas').insert(
      ramas.map((r, idx) => ({ 
        personaje_id: characterId, 
        rama_id: r.rama_id, 
        sub_especialidad_id: r.sub_especialidad_id || null, 
        id_entrenamiento: r.id_entrenamiento || null,
        slot: idx + 1 
      }))
    );
    if (error) throw error;
  },

  async insertPersonajeMensaje(supabase: SupabaseClient, personajeId: string | number, discordMessageId: string, tipo: string) {
    const { error } = await supabase
      .from('reg_personajes_mensajes')
      .insert({ personaje_id: personajeId, discord_message_id: discordMessageId, tipo });
    if (error) throw error;
  }
};
