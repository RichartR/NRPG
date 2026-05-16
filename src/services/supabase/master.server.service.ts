import { SupabaseClient } from '@supabase/supabase-js';
import { Aldea, RamaClan, SubEspecialidad, DocumentoSistema, DocumentoCombate, ConfiguracionSistema, Glosario, GlosarioCategoria, GlosarioSubcategoria, Entrenamiento } from '@/domain/types';

// Extended RamaClan with joined aldea for slug/abreviatura navigation
export interface RamaConAldea extends RamaClan {
  aldeas?: { slug: string; abreviatura: string } | null;
}

export const MasterServerService = {
  async getAldeas(supabase: SupabaseClient): Promise<Aldea[]> {
    const { data, error } = await supabase
      .from('info_aldeas')
      .select('*')
      .order('nombre_jap');
    if (error) throw error;
    return data || [];
  },

  async getRamas(supabase: SupabaseClient): Promise<RamaClan[]> {
    const { data, error } = await supabase
      .from('info_ramas_clanes')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getSubEspecialidades(supabase: SupabaseClient): Promise<SubEspecialidad[]> {
    const { data, error } = await supabase
      .from('info_sub_especialidades')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAldeaById(supabase: SupabaseClient, id: number): Promise<Aldea | null> {
    const { data, error } = await supabase
      .from('info_aldeas')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  async getAldeaBySlug(supabase: SupabaseClient, slug: string): Promise<Aldea | null> {
    const { data, error } = await supabase
      .from('info_aldeas')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) return null;
    return data;
  },

  async getAldeasActivas(supabase: SupabaseClient): Promise<Aldea[]> {
    const { data, error } = await supabase
      .from('info_aldeas')
      .select('*')
      .eq('activo', true)
      .order('nombre_completo');
    if (error) throw error;
    return data || [];
  },

  async getCharacterCountsByAldea(supabase: SupabaseClient, aldeaIds: number[]): Promise<Record<string, number>> {
    const countsMap: Record<string, number> = {};

    const countPromises = [
      ...aldeaIds.map(async (id) => {
        const { count } = await supabase
          .from('reg_characters')
          .select('*', { count: 'exact', head: true })
          .eq('aldea_id', id);
        countsMap[id] = count || 0;
      }),
      (async () => {
        const { count } = await supabase
          .from('reg_characters')
          .select('*', { count: 'exact', head: true })
          .is('aldea_id', null);
        countsMap['renegados'] = count || 0;
      })()
    ];

    await Promise.all(countPromises);
    return countsMap;
  },

  async getNinjasByAldea(supabase: SupabaseClient, aldeaId: number | null) {
    let query = supabase
      .from('reg_characters')
      .select('*, info_aldeas(nombre_completo)')
      .order('nombre_ninja');

    if (aldeaId === null) {
      query = query.is('aldea_id', null);
    } else {
      query = query.eq('aldea_id', aldeaId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getRamasGlobales(supabase: SupabaseClient): Promise<RamaClan[]> {
    const { data, error } = await supabase
      .from('info_ramas_clanes')
      .select('*')
      .eq('tipo', 'rama')
      .eq('activo', true)
      .is('aldea_id', null)
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getRamaBySlug(supabase: SupabaseClient, slug: string): Promise<RamaConAldea | null> {
    const { data, error } = await supabase
      .from('info_ramas_clanes')
      .select('*, info_aldeas(slug, abreviatura)')
      .eq('slug', slug)
      .single();
    if (error) return null;
    return data as RamaConAldea;
  },

  async getSubEspecialidadesByRama(supabase: SupabaseClient, ramaId: number): Promise<SubEspecialidad[]> {
    const { data, error } = await supabase
      .from('info_sub_especialidades')
      .select('*')
      .eq('rama_id', ramaId)
      .eq('activo', true)
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getSubEspecialidadBySlug(supabase: SupabaseClient, ramaId: number, slug: string): Promise<SubEspecialidad | null> {
    const { data, error } = await supabase
      .from('info_sub_especialidades')
      .select('*')
      .eq('rama_id', ramaId)
      .eq('slug', slug)
      .single();
    if (error) return null;
    return data;
  },

  async getDocumentosCombateByRama(supabase: SupabaseClient, ramaId: number): Promise<DocumentoCombate[]> {
    const { data, error } = await supabase
      .from('info_documentos_combate')
      .select('*')
      .eq('rama_id', ramaId)
      .is('sub_especialidad_id', null)
      .eq('activo', true);
    if (error) throw error;
    return data || [];
  },

  async getDocumentosCombateBySubEspecialidad(supabase: SupabaseClient, subEspecialidadId: number): Promise<DocumentoCombate[]> {
    const { data, error } = await supabase
      .from('info_documentos_combate')
      .select('*')
      .eq('sub_especialidad_id', subEspecialidadId)
      .eq('activo', true)
      .order('titulo', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getDocumentosSistemas(supabase: SupabaseClient): Promise<DocumentoSistema[]> {
    const { data, error } = await supabase
      .from('info_documentos_sistemas')
      .select('*')
      .eq('categoria', 'sistemas')
      .eq('activo', true)
      .order('titulo', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getConfiguracion(supabase: SupabaseClient, clave: string): Promise<string | null> {
    const { data } = await supabase
      .from('sys_configuracion_sistema')
      .select('valor')
      .eq('clave', clave)
      .single();
    return data?.valor as string ?? null;
  },

  async getClanesByAldeaId(supabase: SupabaseClient, aldeaId: number): Promise<RamaClan[]> {
    const { data, error } = await supabase
      .from('info_ramas_clanes')
      .select('*')
      .eq('aldea_id', aldeaId)
      .eq('tipo', 'clan')
      .eq('activo', true);
    if (error) throw error;
    return data || [];
  },

  async getDocumentosByCategoria(supabase: SupabaseClient, categoria: string): Promise<DocumentoSistema[]> {
    const { data, error } = await supabase
      .from('info_documentos_sistemas')
      .select('*')
      .eq('categoria', categoria)
      .eq('activo', true)
      .order('titulo', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getDocumentoSistemaByClave(supabase: SupabaseClient, clave: string): Promise<DocumentoSistema | null> {
    const { data } = await supabase
      .from('info_documentos_sistemas')
      .select('*')
      .eq('clave', clave)
      .single();
    return data ?? null;
  },

  async getDocumentoCombateByClave(supabase: SupabaseClient, clave: string): Promise<DocumentoCombate | null> {
    const { data } = await supabase
      .from('info_documentos_combate')
      .select('*, info_ramas_clanes(slug), info_sub_especialidades(slug, info_ramas_clanes(slug))')
      .eq('clave', clave)
      .single();
    return data ?? null;
  },

  async getNoticiasIndex(supabase: SupabaseClient, limit = 10) {
    const { data, error } = await supabase
      .from('info_noticias_index')
      .select('*')
      .order('id', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  // --- Admin methods ---
  async getAdminAldeas(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('info_aldeas')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAdminRamas(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('info_ramas_clanes')
      .select('*, info_aldeas(id, nombre_jap, abreviatura)')
      .order('tipo', { ascending: false })
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAdminSubEspecialidades(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('info_sub_especialidades')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAdminDocumentosCombate(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('info_documentos_combate')
      .select('*, info_ramas_clanes(id, nombre, tipo), info_sub_especialidades(id, nombre)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAdminRamasActivas(supabase: SupabaseClient): Promise<RamaClan[]> {
    const { data, error } = await supabase
      .from('info_ramas_clanes')
      .select('id, nombre, tipo, slug, activo, aldea_id')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAdminSubEspecialidadesActivas(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('info_sub_especialidades')
      .select('id, nombre, rama_id')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAdminDocumentosSistemasByCategories(supabase: SupabaseClient, categorias: string[]) {
    const { data, error } = await supabase
      .from('info_documentos_sistemas')
      .select('*')
      .in('categoria', categorias)
      .order('titulo', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAdminDocumentosSistemasExcludingCategory(supabase: SupabaseClient, categoria: string) {
    const { data, error } = await supabase
      .from('info_documentos_sistemas')
      .select('*')
      .neq('categoria', categoria)
      .order('categoria', { ascending: true })
      .order('titulo', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getCategoriaDocumentos(supabase: SupabaseClient, slugs?: string[]) {
    let query = supabase.from('info_categorias_documentos').select('*').order('nombre', { ascending: true });
    if (slugs && slugs.length > 0) {
      query = query.in('slug', slugs);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getAdminConfigs(supabase: SupabaseClient): Promise<ConfiguracionSistema[]> {
    const { data, error } = await supabase
      .from('sys_configuracion_sistema')
      .select('*')
      .order('clave', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Glosario / Registro Maestro
  async getGlosarioCategorias(supabase: SupabaseClient): Promise<GlosarioCategoria[]> {
    const { data, error } = await supabase
      .from('info_glosario_categorias')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getGlosarioSubcategorias(supabase: SupabaseClient): Promise<GlosarioSubcategoria[]> {
    const { data, error } = await supabase
      .from('info_glosario_subcategorias')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getGlosarios(supabase: SupabaseClient, options?: { categoriaId?: number, onlyInitial?: boolean }): Promise<Glosario[]> {
    let query = supabase
      .from('info_glosario')
      .select('*, info_glosario_categorias(nombre), info_glosario_subcategorias(nombre)')
      .eq('activo', true)
      .order('nombre_es', { ascending: true });
    
    if (options?.categoriaId) {
      query = query.eq('categoria_id', options.categoriaId);
    }
    
    if (options?.onlyInitial) {
      query = query.eq('inicial', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getAdminEntrenamientos(supabase: SupabaseClient): Promise<Entrenamiento[]> {
    const { data, error } = await supabase
      .from('info_entrenamientos')
      .select('*, info_ramas_clanes(id, nombre), info_sub_especialidades(id, nombre)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};
