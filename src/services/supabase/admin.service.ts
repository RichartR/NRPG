import { createClient } from '@/utils/supabase/client';
import { Aldea, RamaClan, SubEspecialidad, DocumentoSistema, DocumentoCombate, ConfiguracionSistema, Glosario, GlosarioCategoria, GlosarioSubcategoria, Entrenamiento, MisionMaster, Tienda, TiendaObjeto, Elemento, RamaElemento, Rasgo, Sentido, RamaSentido } from '@/domain/types';
import { RewardLogic } from '@/domain/character/logic';
import { RegistrosService } from './registros.service';

export type GlosarioAldeaFilter = number | 'general' | null;

export interface GlosarioPageParams {
  page: number;
  pageSize: number;
  active: boolean;
  search?: string;
  categoriaId?: number | null;
  aldeaId?: GlosarioAldeaFilter;
  ramaId?: number | null;
  ramaIdsForAldea?: number[];
  generalRamaIds?: number[];
}

export const AdminService = {
  // Aldeas
  async saveAldea(aldea: Partial<Aldea>) {
    const supabase = createClient();
    const { id, ...cleanData } = aldea;
    
    if (id) {
      const { data, error } = await supabase.from('info_aldeas').update(cleanData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_aldeas').insert([cleanData]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteAldea(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_aldeas').delete().eq('id', id);
    if (error) throw error;
  },

  // Ramas y Clanes
  async saveRamaClan(rama: Partial<RamaClan>) {
    const supabase = createClient();
    // @ts-ignore - info_aldeas comes from join
    const { info_aldeas, id, ...cleanData } = rama;

    if (id) {
      const { data, error } = await supabase.from('info_ramas_clanes').update(cleanData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_ramas_clanes').insert([cleanData]).select().single();
      if (error) throw error;
      return data;
    }
  },

  // Sub Especialidades
  async saveSubEspecialidad(sub: Partial<SubEspecialidad>) {
    const supabase = createClient();
    if (sub.id) {
      const { data, error } = await supabase.from('info_sub_especialidades').update(sub).eq('id', sub.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_sub_especialidades').insert([sub]).select().single();
      if (error) throw error;
      return data;
    }
  },

  // Documentos y Sistemas
  async saveDocument(doc: Partial<DocumentoSistema>) {
    const supabase = createClient();
    const { id, created_at, ...cleanData } = doc as any;

    if (id) {
      const { data, error } = await supabase.from('info_documentos_sistemas').update(cleanData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_documentos_sistemas').insert([cleanData]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteDocument(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('info_documentos_sistemas').delete().eq('id', id);
    if (error) throw error;
  },

  // Noticias y Eventos
  async saveNewsItem(item: any) {
    const res = await fetch('/api/admin/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar el anuncio');
    }
    return res.json();
  },

  async deleteNewsItem(id: number) {
    const res = await fetch(`/api/admin/news?id=${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar el anuncio');
    }
    return res.json();
  },

  // Documentos de Combate
  async saveCombatDoc(doc: Partial<DocumentoCombate>) {
    const supabase = createClient();
    // @ts-ignore - joined objects
    const { info_ramas_clanes, info_sub_especialidades, id, ...cleanData } = doc;

    if (id) {
      const { data, error } = await supabase.from('info_documentos_combate').update(cleanData).eq('id', id).select('*, info_ramas_clanes(id, nombre), info_sub_especialidades(id, nombre)').single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_documentos_combate').insert([cleanData]).select('*, info_ramas_clanes(id, nombre), info_sub_especialidades(id, nombre)').single();
      if (error) throw error;
      return data;
    }
  },

  async deleteCombatDoc(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_documentos_combate').delete().eq('id', id);
    if (error) throw error;
  },

  // Configuración del Sistema
  async getConfigs(): Promise<ConfiguracionSistema[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sys_configuracion_sistema')
      .select('*')
      .order('titulo', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getConfigByClave(clave: string): Promise<ConfiguracionSistema | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sys_configuracion_sistema')
      .select('*')
      .eq('clave', clave)
      .single();
    if (error) return null;
    return data;
  },

  async updateConfig(id: number, valor: any) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sys_configuracion_sistema')
      .update({ valor })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No se encontró el registro para actualizar');
    return data[0];
  },

  async createConfig(clave: string, titulo: string, valor: any, descripcion?: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sys_configuracion_sistema')
      .insert({ clave, titulo, valor, descripcion })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  
  async deleteConfig(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('sys_configuracion_sistema').delete().eq('id', id);
    if (error) throw error;
  },

  // Glosario / Registro Maestro
  async saveGlosarioCategoria(cat: Partial<GlosarioCategoria>) {
    const supabase = createClient();
    if (cat.id) {
      const { data, error } = await supabase.from('info_glosario_categorias').update(cat).eq('id', cat.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_glosario_categorias').insert([cat]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteGlosarioCategoria(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_glosario_categorias').delete().eq('id', id);
    if (error) throw error;
  },

  async saveGlosarioSubcategoria(sub: Partial<GlosarioSubcategoria>) {
    const supabase = createClient();
    if (sub.id) {
      const { data, error } = await supabase.from('info_glosario_subcategorias').update(sub).eq('id', sub.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_glosario_subcategorias').insert([sub]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteGlosarioSubcategoria(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_glosario_subcategorias').delete().eq('id', id);
    if (error) throw error;
  },

  async getGlosarioPage(params: GlosarioPageParams): Promise<{ data: Glosario[]; count: number }> {
    const supabase = createClient();
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.pageSize || 25);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const searchTerm = params.search?.trim().replace(/,/g, ' ');

    let query: any = supabase
      .from('info_glosario')
      .select('*, info_glosario_categorias(nombre), info_glosario_subcategorias(nombre, slug), info_elementos(nombre_esp, nombre_jap)', { count: 'exact' })
      .eq('activo', params.active);

    if (searchTerm) {
      query = query.or(`nombre_es.ilike.%${searchTerm}%,nombre_jp.ilike.%${searchTerm}%`);
    }

    if (params.categoriaId) {
      query = query.eq('categoria_id', params.categoriaId);
    }

    if (params.ramaId) {
      query = query.eq('rama_clan_id', params.ramaId);
    } else if (params.aldeaId === 'general') {
      const generalRamaIds = params.generalRamaIds || [];
      query = query.is('aldea_id', null);
      query = generalRamaIds.length > 0
        ? query.or(`rama_clan_id.is.null,rama_clan_id.in.(${generalRamaIds.join(',')})`)
        : query.is('rama_clan_id', null);
    } else if (typeof params.aldeaId === 'number') {
      const ramaIds = params.ramaIdsForAldea || [];
      query = ramaIds.length > 0
        ? query.or(`aldea_id.eq.${params.aldeaId},and(aldea_id.is.null,rama_clan_id.in.(${ramaIds.join(',')}))`)
        : query.eq('aldea_id', params.aldeaId);
    }

    const { data, error, count } = await query
      .order('nombre_es', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  },

  async saveGlosario(el: Partial<Glosario>) {
    const supabase = createClient();
    const { info_glosario_categorias, info_glosario_subcategorias, info_elementos, id, ...cleanData } = el as any;

    if (id) {
      const { data, error } = await supabase.from('info_glosario').update(cleanData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_glosario').insert([cleanData]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteGlosario(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_glosario').delete().eq('id', id);
    if (error) throw error;
  },

  // Entrenamientos
  async saveEntrenamiento(ent: Partial<Entrenamiento>) {
    const supabase = createClient();
    // @ts-ignore - joined objects
    const { info_ramas_clanes, info_sub_especialidades, id, ...cleanData } = ent;

    if (id) {
      const { data, error } = await supabase.from('info_entrenamientos').update(cleanData).eq('id', id).select('*, info_ramas_clanes(id, nombre), info_sub_especialidades(id, nombre)').single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_entrenamientos').insert([cleanData]).select('*, info_ramas_clanes(id, nombre), info_sub_especialidades(id, nombre)').single();
      if (error) throw error;
      return data;
    }
  },

  async deleteEntrenamiento(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_entrenamientos').delete().eq('id', id);
    if (error) throw error;
  },

  // Misiones
  async getMisiones(): Promise<MisionMaster[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_misiones')
      .select('*')
      .order('rango', { ascending: true })
      .order('codigo_mision', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async saveMision(mision: Partial<MisionMaster>) {
    const supabase = createClient();
    const { id, ...cleanData } = mision;

    if (id) {
      const { data, error } = await supabase.from('info_misiones').update(cleanData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_misiones').insert([cleanData]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteMision(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_misiones').delete().eq('id', id);
    if (error) throw error;
  },

  // Estados de Combate
  async saveEstadoCombate(estado: any) {
    const supabase = createClient();
    const { id, ...cleanData } = estado;
    if (id) {
      const { data, error } = await supabase.from('info_estados_combate').update(cleanData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_estados_combate').insert([cleanData]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteEstadoCombate(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_estados_combate').delete().eq('id', id);
    if (error) throw error;
  },

  async getEstadosCombate() {
    const supabase = createClient();
    const { data, error } = await supabase.from('info_estados_combate').select('*').order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getDisputes() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sys_notificaciones_admin')
      .select(`
        *,
        personaje:reg_characters(nombre_ninja, url_img),
        registro:reg_registros(*)
      `)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async resolveDispute(notificacionId: string, resolucion: 'aceptada' | 'rechazada') {
    const supabase = createClient();
    
    const { data: notif, error: notifError } = await supabase
      .from('sys_notificaciones_admin')
      .select('*, registro:reg_registros(*)')
      .eq('id', notificacionId)
      .single();
    
    if (notifError) throw notifError;
    if (notif.estado === 'resuelto') {
      throw new Error('Esta disputa ya ha sido resuelta por otro administrador.');
    }

    if (notif.registro_id === null && notif.personaje_id === null) {
      // Es una alerta de IP duplicada (cuenta clon)
      if (resolucion === 'aceptada') {
        // Auto-whitelist de la IP al aceptar la apelación/alerta
        const ipMatch = notif.mensaje.match(/\(([^)]+)\)\.?$/);
        if (ipMatch && ipMatch[1]) {
          const ip = ipMatch[1];
          await supabase.from('sys_whitelisted_ips').upsert({
            ip,
            description: `Auto-whitelist por aprobación de alerta de IP`
          });
        }
      }
    } else if (notif.registro_id === null) {
      // Es una apelación de shinobi archivado por inactividad
      if (resolucion === 'aceptada') {
        // 1. Obtener datos del personaje para saber el user_id
        const { data: character, error: getError } = await supabase
          .from('reg_characters')
          .select('user_id, activo, nombre_ninja')
          .eq('id', notif.personaje_id)
          .single();
        
        if (getError) throw getError;
        if (!character) throw new Error('Personaje no encontrado.');
        if (character.activo) throw new Error('El personaje ya está activo.');

        // 2. Verificar el límite de personajes activos
        const { count, error: countError } = await supabase
          .from('reg_characters')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', character.user_id)
          .eq('activo', true);

        if (countError) throw countError;

        // Obtener limite de la config
        const { data: configData, error: configError } = await supabase
          .from('sys_configuracion')
          .select('valor')
          .eq('clave', 'characters_per_player')
          .single();

        let limit = 1;
        if (!configError && configData?.valor) {
          limit = parseInt(configData.valor, 10);
        }

        if ((count ?? 0) >= limit) {
          throw new Error(`El usuario ya ha alcanzado el límite de personajes activos (${limit}).`);
        }

        // 3. Reactivar el personaje y resetear los campos de archivado
        const { error: updateCharError } = await supabase
          .from('reg_characters')
          .update({
            activo: true,
            eliminado_voluntario: false,
            archived_at: null
          })
          .eq('id', notif.personaje_id);

        if (updateCharError) throw updateCharError;

        // 4. Si profiles.active_char_id está vacío, asignarle este personaje
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('active_char_id')
          .eq('id', character.user_id)
          .single();

        if (!profileError && !profile?.active_char_id) {
          await supabase
            .from('profiles')
            .update({ active_char_id: notif.personaje_id })
            .eq('id', character.user_id);
        }
      }
    } else {
      // Disputa de registro tradicional
      if (resolucion === 'aceptada') {
        const { xp, ryous, pa } = RewardLogic.calculateReward(notif.registro, notif.personaje_id);
        const { data: char, error: charError } = await supabase
          .from('reg_characters')
          .select('xp, ryous, puntos_aprendizaje')
          .eq('id', notif.personaje_id)
          .single();
        
        if (charError) throw charError;

        await supabase.from('reg_characters').update({
          xp: (char.xp || 0) + xp,
          ryous: (char.ryous || 0) + ryous,
          puntos_aprendizaje: (char.puntos_aprendizaje || 0) + pa
        }).eq('id', notif.personaje_id);

        await supabase.from('reg_registros_participantes').update({ estado: 'finalizado_admin' })
          .match({ registro_id: notif.registro_id, personaje_id: notif.personaje_id });

      } else {
        // El admin RECHAZA la disputa (el registro era inválido) -> Borrar registro completo
        await RegistrosService.deleteRegistro(notif.registro_id);
      }
    }

    await supabase.from('sys_notificaciones_admin').update({ 
      estado: 'resuelto',
      resolucion 
    }).eq('id', notificacionId);
  },

  // Gestión de Tiendas Ninja
  async saveTienda(tienda: Partial<Tienda>) {
    const supabase = createClient();
    const { id, ...cleanData } = tienda;
    if (id) {
      const { data, error } = await supabase.from('info_tiendas').update(cleanData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_tiendas').insert([cleanData]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteTienda(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_tiendas').delete().eq('id', id);
    if (error) throw error;
  },

  async saveTiendaObjeto(obj: Partial<TiendaObjeto>) {
    const supabase = createClient();
    const { info_glosario, info_tiendas, id, ...cleanData } = obj as any;
    if (id) {
      const { data, error } = await supabase.from('reg_tiendas_objetos').update(cleanData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('reg_tiendas_objetos').insert([cleanData]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteTiendaObjeto(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('reg_tiendas_objetos').delete().eq('id', id);
    if (error) throw error;
  },

  async reiniciarMonedasEvento() {
    const supabase = createClient();
    const { error } = await supabase
      .from('reg_characters')
      .update({ moneda_evento: 0 })
      .gt('id', 0);
    if (error) throw error;
  },

  async actualizarNombreMoneda(nombre: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('sys_configuracion_sistema')
      .update({ valor: nombre })
      .eq('clave', 'moneda_evento_nombre');
    if (error) throw error;
  },

  // --- Elementos ---
  async saveElemento(elemento: Partial<Elemento>): Promise<Elemento> {
    const supabase = createClient();
    const { id, created_at, ...cleanData } = elemento as any;

    if (id) {
      const { data, error } = await supabase
        .from('info_elementos')
        .update(cleanData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('info_elementos')
        .insert([cleanData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async deleteElemento(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_elementos').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Rama Elementos (vinculaciones) ---
  async saveRamaElemento(rel: Partial<RamaElemento>): Promise<RamaElemento> {
    const supabase = createClient();
    const { id, created_at, info_elementos, ...cleanData } = rel as any;

    if (id) {
      const { data, error } = await supabase
        .from('info_rama_elementos')
        .update(cleanData)
        .eq('id', id)
        .select('*, info_elementos(id, nombre_esp, nombre_jap, url_icono, tipo, activo)')
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('info_rama_elementos')
        .insert([cleanData])
        .select('*, info_elementos(id, nombre_esp, nombre_jap, url_icono, tipo, activo)')
        .single();
      if (error) throw error;
      return data;
    }
  },

  async deleteRamaElemento(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_rama_elementos').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Rasgos ---
  async getRasgos(): Promise<Rasgo[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_rasgos')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async saveRasgo(rasgo: Partial<Rasgo>): Promise<Rasgo> {
    const supabase = createClient();
    const { id, created_at, ...cleanData } = rasgo;
    
    // Convert characters (personajes) array to json if it's sent as an array or string
    let personajesJSON = cleanData.personajes;
    if (typeof personajesJSON === 'string') {
      try {
        personajesJSON = JSON.parse(personajesJSON);
      } catch {
        personajesJSON = [];
      }
    }
    const payload = { ...cleanData, personajes: personajesJSON || [] };

    if (id) {
      const { data, error } = await supabase
        .from('info_rasgos')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('info_rasgos')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async deleteRasgo(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_rasgos').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Sentidos Avanzados ---
  async saveSentido(sentido: Partial<Sentido>): Promise<Sentido> {
    const supabase = createClient();
    const { id, created_at, ...cleanData } = sentido as any;
    if (id) {
      const { data, error } = await supabase.from('info_sentidos').update(cleanData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_sentidos').insert([cleanData]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteSentido(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_sentidos').delete().eq('id', id);
    if (error) throw error;
  },

  async saveRamaSentido(rel: Partial<RamaSentido>): Promise<RamaSentido> {
    const supabase = createClient();
    const { id, created_at, info_sentidos, ...cleanData } = rel as any;
    if (id) {
      const { data, error } = await supabase.from('info_rama_sentidos').update(cleanData).eq('id', id).select('*, info_sentidos(id, nombre, activo)').single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_rama_sentidos').insert([cleanData]).select('*, info_sentidos(id, nombre, activo)').single();
      if (error) throw error;
      return data;
    }
  },

  async deleteRamaSentido(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('info_rama_sentidos').delete().eq('id', id);
    if (error) throw error;
  },
};
