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
      .select('*, personajes_ramas:reg_personajes_ramas(*, rama:info_ramas_clanes(nombre), sub_especialidad:info_sub_especialidades(nombre)), personajes_entrenamientos:reg_personajes_entrenamientos(*, info_entrenamientos(*))')
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

  async upsertRama(
    supabase: SupabaseClient,
    characterId: string | number,
    slot: number,
    ramaId: number,
    subEspecialidadId: number | null,
    elementoPrincipalId?: number | null,
    elementoSecundarioId?: number | null,
    elementoTerciarioId?: number | null
  ) {
    const { error } = await supabase.from('reg_personajes_ramas').upsert({
      personaje_id: characterId,
      slot,
      rama_id: ramaId,
      sub_especialidad_id: subEspecialidadId || null,
      elemento_principal_id: elementoPrincipalId || null,
      elemento_secundario_id: elementoSecundarioId || null,
      elemento_terciario_id: elementoTerciarioId || null
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
      const mapped = ramas.map((r, idx) => ({
        personaje_id: characterId,
        slot: r.slot || idx + 1,
        rama_id: r.rama_id,
        sub_especialidad_id: r.sub_especialidad_id || null,
        elemento_principal_id: r.elemento_principal_id || null,
        elemento_secundario_id: r.elemento_secundario_id || null,
        elemento_terciario_id: r.elemento_terciario_id || null
      }));
      const { error } = await supabase.from('reg_personajes_ramas').upsert(mapped, { onConflict: 'personaje_id, slot' });
      if (error) throw error;
    }
  },

  async bulkUpdateEntrenamientos(supabase: SupabaseClient, characterId: string | number, entrenamientos: any[]) {
    await supabase.from('reg_personajes_entrenamientos').delete().eq('personaje_id', characterId);
    if (entrenamientos && entrenamientos.length > 0) {
      const mapped = entrenamientos.map(e => ({
        personaje_id: characterId,
        rama_id: e.rama_id,
        entrenamiento_id: e.entrenamiento_id
      }));
      const { error } = await supabase.from('reg_personajes_entrenamientos').insert(mapped);
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

  async insertRamas(supabase: SupabaseClient, characterId: string | number, ramas: { rama_id: number; sub_especialidad_id?: number; elemento_principal_id?: number; elemento_secundario_id?: number; elemento_terciario_id?: number }[]) {
    if (ramas.length === 0) return;
    const { error } = await supabase.from('reg_personajes_ramas').insert(
      ramas.map((r, idx) => ({
        personaje_id: characterId,
        rama_id: r.rama_id,
        sub_especialidad_id: r.sub_especialidad_id || null,
        elemento_principal_id: r.elemento_principal_id || null,
        elemento_secundario_id: r.elemento_secundario_id || null,
        elemento_terciario_id: r.elemento_terciario_id || null,
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
  },

  async archiveCharacter(supabase: SupabaseClient, characterId: string | number, voluntario: boolean = true) {
    const { error } = await supabase
      .from('reg_characters')
      .update({
        activo: false,
        eliminado_voluntario: voluntario,
        archived_at: new Date().toISOString()
      })
      .eq('id', characterId);

    if (error) throw error;

    // Si es voluntario, inmediatamente liberamos los requisitos del glosario y limpiamos active_char_id de profiles
    if (voluntario) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ active_char_id: null })
        .eq('active_char_id', characterId);

      if (profileError) {
        console.error('Error clearing active_char_id on profiles:', profileError);
      }

      await this.releaseGlossaryRequirements(supabase, characterId);
    }
  },

  async restoreCharacter(supabase: SupabaseClient, characterId: string | number) {
    // 1. Obtener el personaje para saber a qué usuario pertenece
    const { data: character, error: getError } = await supabase
      .from('reg_characters')
      .select('user_id, activo')
      .eq('id', characterId)
      .single();

    if (getError) throw getError;
    if (!character) throw new Error('Character not found');
    if (character.activo) throw new Error('Character is already active');

    // 2. Verificar el límite de personajes del usuario
    const limitReached = await this.hasReachedCharacterLimit(supabase, character.user_id);
    if (limitReached) {
      throw new Error('User has reached active character limit');
    }

    // 3. Reactivar el personaje y resetear los campos de archivado
    const { error: updateError } = await supabase
      .from('reg_characters')
      .update({
        activo: true,
        eliminado_voluntario: false,
        archived_at: null
      })
      .eq('id', characterId);

    if (updateError) throw updateError;

    // 4. Si el perfil del jugador no tiene un personaje activo en este momento, vincularle este personaje restaurado
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active_char_id')
      .eq('id', character.user_id)
      .single();

    if (!profileError && (!profile || !profile.active_char_id)) {
      await supabase
        .from('profiles')
        .update({ active_char_id: characterId })
        .eq('id', character.user_id);
    }
  },

  async releaseGlossaryRequirements(supabase: SupabaseClient, characterId: string | number) {
    const targetIdStr = String(characterId);
    const targetIdNum = Number(characterId);

    // 1. Traer todos los elementos del glosario que tengan requisitos
    const { data: items, error: getError } = await supabase
      .from('info_glosario')
      .select('id, requisitos');

    if (getError) throw getError;
    if (!items) return;

    for (const item of items) {
      if (!item.requisitos) continue;

      let req = typeof item.requisitos === 'string' ? JSON.parse(item.requisitos) : item.requisitos;
      if (!req || req.personaje_id === undefined || req.personaje_id === null) continue;

      let changed = false;
      const pid = req.personaje_id;

      if (Array.isArray(pid)) {
        const filtered = pid.filter(id => String(id) !== targetIdStr);
        if (filtered.length !== pid.length) {
          req.personaje_id = filtered.length > 0 ? filtered : null;
          changed = true;
        }
      } else if (typeof pid === 'number') {
        if (pid === targetIdNum) {
          req.personaje_id = null;
          changed = true;
        }
      } else if (typeof pid === 'string') {
        if (pid === targetIdStr) {
          req.personaje_id = null;
          changed = true;
        } else if (pid.includes(',')) {
          const parts = pid.split(',').map(p => p.trim());
          const filtered = parts.filter(p => p !== targetIdStr);
          if (filtered.length !== parts.length) {
            req.personaje_id = filtered.length > 0 ? filtered.join(',') : null;
            changed = true;
          }
        }
      }

      if (changed) {
        const { error: updateError } = await supabase
          .from('info_glosario')
          .update({ requisitos: req })
          .eq('id', item.id);
        if (updateError) throw updateError;
      }
    }
  },

  async cleanupCharacters(supabase: SupabaseClient): Promise<{
    voluntariosBorrados: number;
    inactivosArchivados: number;
    inactivosLiberadosGlosario: number;
    inactivosBorrados: number;
  }> {
    const now = new Date();

    // Calcular límites de tiempo
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(now.getMonth() - 3);

    const seisMesesAtras = new Date(); // 3 meses archivados para inactivos (3 meses actividad + 3 meses archivo = 6 meses)
    seisMesesAtras.setMonth(now.getMonth() - 3);

    const unAnoAtras = new Date(); // 9 meses archivados para inactivos (3 meses actividad + 9 meses archivo = 12 meses)
    unAnoAtras.setMonth(now.getMonth() - 9);

    // --- REGLA 1: Eliminación voluntaria de más de 3 meses ---
    const { data: voluntaries, error: errVol } = await supabase
      .from('reg_characters')
      .select('id')
      .eq('activo', false)
      .eq('eliminado_voluntario', true)
      .lte('archived_at', tresMesesAtras.toISOString());

    if (errVol) throw errVol;

    let voluntariosBorrados = 0;
    if (voluntaries && voluntaries.length > 0) {
      const ids = voluntaries.map(v => v.id);
      const { error: errDelVol } = await supabase
        .from('reg_characters')
        .delete()
        .in('id', ids);
      if (errDelVol) throw errDelVol;
      voluntariosBorrados = ids.length;
    }

    // --- REGLA 4: Eliminación física de inactivos de más de 1 año (9 meses archivados) ---
    const { data: inactiveDels, error: errInactDel } = await supabase
      .from('reg_characters')
      .select('id')
      .eq('activo', false)
      .eq('eliminado_voluntario', false)
      .lte('archived_at', unAnoAtras.toISOString());

    if (errInactDel) throw errInactDel;

    let inactivosBorrados = 0;
    if (inactiveDels && inactiveDels.length > 0) {
      const ids = inactiveDels.map(i => i.id);
      const { error: errDelInact } = await supabase
        .from('reg_characters')
        .delete()
        .in('id', ids);
      if (errDelInact) throw errDelInact;
      inactivosBorrados = ids.length;
    }

    // --- REGLA 3: Liberación de requisitos de inactivos de más de 6 meses (3 meses archivados) ---
    const { data: inactiveLibs, error: errInactLib } = await supabase
      .from('reg_characters')
      .select('id')
      .eq('activo', false)
      .eq('eliminado_voluntario', false)
      .lte('archived_at', seisMesesAtras.toISOString());

    if (errInactLib) throw errInactLib;

    let inactivosLiberadosGlosario = 0;
    if (inactiveLibs && inactiveLibs.length > 0) {
      for (const char of inactiveLibs) {
        await this.releaseGlossaryRequirements(supabase, char.id);
        inactivosLiberadosGlosario++;
      }
    }

    // --- REGLA 2: Archivado de personajes activos sin actividad en 3 meses ---
    const { data: activeChars, error: errAct } = await supabase
      .from('reg_characters')
      .select('id, created_at')
      .eq('activo', true)
      .lte('created_at', tresMesesAtras.toISOString());

    if (errAct) throw errAct;

    let inactivosArchivados = 0;
    if (activeChars && activeChars.length > 0) {
      for (const char of activeChars) {
        // Verificar registros creados por el personaje en los últimos 3 meses
        const { count: authorRegs, error: errAut } = await supabase
          .from('reg_registros')
          .select('*', { count: 'exact', head: true })
          .eq('autor_id', char.id)
          .gte('fecha', tresMesesAtras.toISOString());

        if (errAut) throw errAut;

        // Verificar registros en los que ha participado en los últimos 3 meses
        const { data: participations, error: errPart } = await supabase
          .from('reg_registros_participantes')
          .select('registro:reg_registros(fecha)')
          .eq('personaje_id', char.id);

        if (errPart) throw errPart;

        const hasRecentParticipation = participations?.some((p: any) => {
          if (!p.registro || !p.registro.fecha) return false;
          const regDate = new Date(p.registro.fecha);
          return regDate >= tresMesesAtras;
        }) ?? false;

        const hasActivity = (authorRegs ?? 0) > 0 || hasRecentParticipation;

        if (!hasActivity) {
          await this.archiveCharacter(supabase, char.id, false);
          inactivosArchivados++;
        }
      }
    }

    return {
      voluntariosBorrados,
      inactivosArchivados,
      inactivosLiberadosGlosario,
      inactivosBorrados
    };
  },

  async getArchivedCharacters(supabase: SupabaseClient): Promise<any[]> {
    const { data, error } = await supabase
      .from('reg_characters')
      .select(`
        id,
        nombre_ninja,
        hobba_name,
        rango,
        rango_jerarquico,
        url_img,
        eliminado_voluntario,
        archived_at,
        created_at,
        user_id,
        profiles:user_id(username)
      `)
      .eq('activo', false)
      .order('archived_at', { ascending: false });

    if (error) {
      console.error('Error fetching archived characters:', error);
      return [];
    }
    return data || [];
  }
};
