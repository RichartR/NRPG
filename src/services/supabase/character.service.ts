import { createClient } from '@/utils/supabase/client';
import { Character, PersonajeRama, PersonajeItem, PersonajeTecnica } from '@/domain/types';

export const CharacterService = {
  async getCharacterById(id: string): Promise<Character> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reg_characters')
      .select(`
        *, 
        profiles!user_id(username),
        info_aldeas(*), 
        reg_personajes_inventario!personaje_id(*, info_glosario(*)), 
        reg_personajes_tecnicas!personaje_id(*, info_glosario(*)), 
        reg_personajes_ramas!personaje_id(*, info_ramas_clanes(*), info_sub_especialidades(*))
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Character;
  },

  async createCharacter(character: Partial<Character>): Promise<Character> {
    const supabase = createClient();
    const { data, error } = await supabase.from('reg_characters').insert({
      hobba_name: character.hobba_name?.trim(),
      nombre_ninja: character.nombre_ninja?.trim(),
      aldea_id: character.aldea_id || null,
      rango: character.rango,
      rango_jerarquico: character.rango_jerarquico,
      stats_base: character.stats_base,
      atributos_derivados: character.atributos_derivados,
      puntos_stats: character.puntos_stats,
      sexo: character.sexo,
      edad: character.edad,
      activo: true
    }).select().single();

    if (error) throw error;
    return data as Character;
  },

  async updateCharacter(id: string, updates: Partial<Character>) {
    const supabase = createClient();
    const { error } = await supabase
      .from('reg_characters')
      .update({
        nombre_ninja: updates.nombre_ninja,
        hobba_name: updates.hobba_name,
        aldea_id: updates.aldea_id,
        rango: updates.rango,
        rango_jerarquico: updates.rango_jerarquico,
        stats_base: updates.stats_base,
        atributos_derivados: updates.atributos_derivados,
        puntos_stats: updates.puntos_stats,
        xp: updates.xp,
        ryous: updates.ryous,
        tiempo_rpg: updates.tiempo_rpg,
        edad: updates.edad,
        sexo: updates.sexo,
        activo: updates.activo
      })
      .eq('id', id);

    if (error) throw error;
  },

  async updateCharacterRamas(id: string, ramas: PersonajeRama[]) {
    const supabase = createClient();
    await supabase.from('reg_personajes_ramas').delete().eq('personaje_id', id);
    if (ramas.length > 0) {
      const { error } = await supabase.from('reg_personajes_ramas').insert(
        ramas.map(r => ({
          personaje_id: id,
          rama_id: r.rama_id,
          sub_especialidad_id: r.sub_especialidad_id,
          slot: r.slot || 1
        }))
      );
      if (error) throw error;
    }
  },

  async updateCharacterInventory(id: string, items: PersonajeItem[]) {
    const supabase = createClient();
    await supabase.from('reg_personajes_inventario').delete().eq('personaje_id', id);
    if (items.length > 0) {
      const { error } = await supabase.from('reg_personajes_inventario').insert(
        items.map(i => ({ 
          personaje_id: id, 
          item_id: i.item_id, 
          cantidad: i.cantidad 
        }))
      );
      if (error) throw error;
    }
  },

  async updateCharacterTecnicas(id: string, tecnicas: PersonajeTecnica[]) {
    const supabase = createClient();
    await supabase.from('reg_personajes_tecnicas').delete().eq('personaje_id', id);
    if (tecnicas.length > 0) {
      const { error } = await supabase.from('reg_personajes_tecnicas').insert(
        tecnicas.map(t => ({ 
          personaje_id: id, 
          tecnica_id: t.tecnica_id 
        }))
      );
      if (error) throw error;
    }
  }
};
