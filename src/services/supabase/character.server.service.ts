import { SupabaseClient } from '@supabase/supabase-js';
import { Character } from '@/domain/types';

/**
 * Server-side character service used by API Routes (Next.js Route Handlers).
 * Receives the SupabaseClient instance created from '@/utils/supabase/server'.
 */
export const CharacterServerService = {
  async getCharacterById(supabase: SupabaseClient, id: string): Promise<Character | null> {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Character;
  },

  async createCharacter(supabase: SupabaseClient, payload: Record<string, unknown>): Promise<Character> {
    const { data, error } = await supabase
      .from('characters')
      .insert({ ...payload, activo: true })
      .select()
      .single();
    if (error) throw error;
    return data as Character;
  },

  async updateCharacterFields(supabase: SupabaseClient, id: string, fields: Record<string, unknown>) {
    const { error } = await supabase.from('characters').update(fields).eq('id', id);
    if (error) throw error;
  },

  async upsertRama(supabase: SupabaseClient, characterId: string, slot: number, ramaId: number, subEspecialidadId: number | null) {
    const { error } = await supabase.from('personajes_ramas').upsert({
      personaje_id: characterId, slot, rama_id: ramaId, sub_especialidad_id: subEspecialidadId || null
    }, { onConflict: 'personaje_id, slot' });
    if (error) throw error;
  },

  async deleteRamaSlot(supabase: SupabaseClient, characterId: string, slot: number) {
    const { error } = await supabase.from('personajes_ramas').delete().eq('personaje_id', characterId).eq('slot', slot);
    if (error) throw error;
  },

  async replaceInventario(supabase: SupabaseClient, characterId: string, items: { item_id: number; cantidad: number }[]) {
    await supabase.from('personajes_inventario').delete().eq('personaje_id', characterId);
    if (items.length > 0) {
      const { error } = await supabase.from('personajes_inventario').insert(
        items.map(i => ({ personaje_id: characterId, item_id: i.item_id, cantidad: i.cantidad }))
      );
      if (error) throw error;
    }
  },

  async replaceTecnicas(supabase: SupabaseClient, characterId: string, tecnicas: { tecnica_id: number }[]) {
    await supabase.from('personajes_tecnicas').delete().eq('personaje_id', characterId);
    if (tecnicas.length > 0) {
      const { error } = await supabase.from('personajes_tecnicas').insert(
        tecnicas.map(t => ({ personaje_id: characterId, tecnica_id: t.tecnica_id }))
      );
      if (error) throw error;
    }
  },

  async insertRamas(supabase: SupabaseClient, characterId: string, ramas: { rama_id: number; sub_especialidad_id?: number }[]) {
    if (ramas.length === 0) return;
    const { error } = await supabase.from('personajes_ramas').insert(
      ramas.map((r, idx) => ({ personaje_id: characterId, rama_id: r.rama_id, sub_especialidad_id: r.sub_especialidad_id || null, slot: idx + 1 }))
    );
    if (error) throw error;
  },

  async insertPersonajeMensaje(supabase: SupabaseClient, personajeId: string, discordMessageId: string, tipo: string) {
    const { error } = await supabase
      .from('personajes_mensajes')
      .insert({ personaje_id: personajeId, discord_message_id: discordMessageId, tipo });
    if (error) throw error;
  }
};
