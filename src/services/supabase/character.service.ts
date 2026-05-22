import { createClient } from '@/utils/supabase/client';
import { Character, PersonajeRama, PersonajeItem, PersonajeTecnica, Registro, Glosario } from '@/domain/types';
import { RewardLogic } from '@/domain/character/logic';

export const CharacterService = {
  async getCharacterById(id: number): Promise<Character> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reg_characters')
      .select(`
        *, 
        profiles!user_id(username, url_avatar, url_img),
        info_aldeas(*), 
        reg_personajes_inventario!reg_personajes_inventario_personaje_id_fkey(*, info_glosario(*, info_glosario_categorias(nombre), info_glosario_subcategorias(nombre))), 
        reg_personajes_tecnicas!reg_personajes_tecnicas_personaje_id_fkey(*, info_glosario(*, info_glosario_categorias(nombre), info_glosario_subcategorias(nombre))), 
        reg_personajes_ramas!reg_personajes_ramas_personaje_id_fkey(*, info_ramas_clanes(*), info_sub_especialidades(*), info_entrenamientos(*)),
        registros_autor: reg_registros!reg_registros_autor_id_fkey(*, autor: reg_characters!reg_registros_autor_id_fkey(nombre_ninja), participantes: reg_registros_participantes!reg_registros_participantes_registro_id_fkey(*, personaje: reg_characters!reg_registros_participantes_personaje_id_fkey(nombre_ninja))),
        registros_participante: reg_registros_participantes!reg_registros_participantes_personaje_id_fkey(*, registro: reg_registros!reg_registros_participantes_registro_id_fkey(*, autor: reg_characters!reg_registros_autor_id_fkey(nombre_ninja), participantes: reg_registros_participantes!reg_registros_participantes_registro_id_fkey(*, personaje: reg_characters!reg_registros_participantes_personaje_id_fkey(nombre_ninja))))
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Normalización ultra-segura de propiedades
    return {
      ...data,
      aldeas: data.info_aldeas || data.aldeas,
      personajes_ramas: data.reg_personajes_ramas || data.personajes_ramas || data.ramas || [],
      personajes_inventario: data.reg_personajes_inventario || data.personajes_inventario || data.inventario || [],
      personajes_tecnicas: data.reg_personajes_tecnicas || data.personajes_tecnicas || data.tecnicas || [],
      registros_autor: data.registros_autor || [],
      registros_participante: data.registros_participante || []
    } as Character;
  },

  async createCharacter(character: Partial<Character>): Promise<Character> {
    const supabase = createClient();
    
    // 1. Crear el personaje base
    const { data: newChar, error: charError } = await supabase.from('reg_characters').insert({
      hobba_name: character.hobba_name?.trim(),
      nombre_ninja: character.nombre_ninja?.trim(),
      aldea_id: character.aldea_id || null,
      rango: character.rango || 'D',
      rango_jerarquico: character.rango_jerarquico,
      stats_base: character.stats_base,
      atributos_derivados: character.atributos_derivados,
      puntos_stats: character.puntos_stats,
      sexo: character.sexo,
      edad: character.edad,
      url_img: character.url_img || null,
      activo: true
    }).select().single();

    if (charError) throw charError;

    // 2. Obtener elementos iniciales del glosario
    const { data: initialItems } = await supabase
      .from('info_glosario')
      .select('id, categoria_id')
      .eq('inicial', true)
      .eq('activo', true);

    if (initialItems && initialItems.length > 0) {
      const inventoryPack = initialItems
        .filter(i => i.categoria_id === 2) // Solo Objetos
        .map(i => ({ personaje_id: newChar.id, item_id: i.id }));

      const techniquesPack = initialItems
        .filter(i => i.categoria_id !== 2) // Todo lo que no sea objeto (Técnicas, Pasivas, etc)
        .map(i => ({ personaje_id: newChar.id, tecnica_id: i.id }));

      // 3. Insertar packs (si existen)
      if (inventoryPack.length > 0) {
        await supabase.from('reg_personajes_inventario').insert(inventoryPack);
      }
      if (techniquesPack.length > 0) {
        await supabase.from('reg_personajes_tecnicas').insert(techniquesPack);
      }
    }

    return newChar as Character;
  },

  async updateCharacter(id: number, updates: Partial<Character>) {
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
        url_img: updates.url_img,
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
          id_entrenamiento: r.id_entrenamiento || null,
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
          item_id: i.item_id
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
  },

  async deleteCharacter(id: number) {
    const supabase = createClient();
    const { error } = await supabase
      .from('reg_characters')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getNotifications(personajeId: number) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reg_registros_participantes')
      .select(`
        *,
        registro:reg_registros(
          *,
          autor:reg_characters!reg_registros_autor_id_fkey(nombre_ninja)
        )
      `)
      .eq('personaje_id', personajeId)
      .eq('estado', 'pendiente');
    
    if (error) throw error;
    return data || [];
  },

  async respondToRecord(personajeId: number, registroId: number, respuesta: 'aceptar' | 'rechazar', comentario?: string) {
    const supabase = createClient();
    
    const { data: registro, error: regError } = await supabase
      .from('reg_registros')
      .select('*')
      .eq('id', registroId)
      .single();
    
    if (regError) throw regError;

    if (respuesta === 'aceptar') {
      const { xp, ryous } = RewardLogic.calculateReward(registro, personajeId);
      const combatPts = RewardLogic.calculateCombatPoints(registro, personajeId);
      
      const { data: char, error: charError } = await supabase
        .from('reg_characters')
        .select('xp, ryous, puntos_combate')
        .eq('id', personajeId)
        .single();
      
      if (charError) throw charError;

      const { error: updError } = await supabase
        .from('reg_characters')
        .update({
          xp: (char.xp || 0) + xp,
          ryous: (char.ryous || 0) + ryous,
          puntos_combate: (char.puntos_combate || 0) + combatPts
        })
        .eq('id', personajeId);
      
      if (updError) throw updError;

      await supabase
        .from('reg_registros_participantes')
        .update({ estado: 'aceptado' })
        .match({ registro_id: registroId, personaje_id: personajeId });

    } else {
      await supabase
        .from('reg_registros_participantes')
        .update({ 
          estado: 'rechazado',
          comentario_rechazo: comentario 
        })
        .match({ registro_id: registroId, personaje_id: personajeId });

      const { error: notifError } = await supabase
        .from('sys_notificaciones_admin')
        .insert({
          registro_id: registroId,
          personaje_id: personajeId,
          mensaje: comentario || 'Sin motivo especificado',
          estado: 'pendiente'
        });

      if (notifError) {
        console.error('Error creating admin notification:', notifError);
        throw notifError;
      }
    }
  },

  async getValidItems(personajeId: number, categoriaId?: number): Promise<Glosario[]> {
    if (!personajeId || isNaN(personajeId)) return [];

    const supabase = createClient();
    
    // Solo enviamos los parámetros que tienen valor real
    const rpcParams: any = { p_personaje_id: personajeId };
    if (categoriaId !== undefined && categoriaId !== null) {
      rpcParams.p_categoria_id = categoriaId;
    }

    const { data, error } = await supabase.rpc('get_valid_glosario_items', rpcParams);

    if (error) {
      console.error('Error in get_valid_glosario_items:', error);
      return [];
    }
    
    return (data || []).map((item: any) => ({
      ...item,
      info_glosario_categorias: item.info_glosario_categorias,
      info_glosario_subcategorias: item.info_glosario_subcategorias
    })) as Glosario[];
  },

  async checkPendingAppeal(characterId: number): Promise<boolean> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sys_notificaciones_admin')
      .select('id')
      .eq('personaje_id', characterId)
      .eq('estado', 'pendiente')
      .is('registro_id', null);
    
    if (error) {
      console.error('Error checking pending appeal:', error);
      return false;
    }
    return (data && data.length > 0);
  },

  async appealArchive(characterId: number): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('sys_notificaciones_admin')
      .insert({
        personaje_id: characterId,
        registro_id: null,
        mensaje: 'El jugador ha apelado para recuperar su cuenta archivada por inactividad',
        estado: 'pendiente'
      });
    
    if (error) throw error;
  }
};
