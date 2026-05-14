import { createClient } from '@/utils/supabase/client';
import { Aldea, RamaClan, SubEspecialidad, DocumentoSistema, DocumentoCombate, ConfiguracionSistema, Glosario, GlosarioCategoria, GlosarioSubcategoria, Entrenamiento } from '@/domain/types';

export const AdminService = {
  // Aldeas
  async saveAldea(aldea: Partial<Aldea>) {
    const supabase = createClient();
    const { url_icono, id, ...cleanData } = aldea;
    
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
    if (doc.id) {
      const { data, error } = await supabase.from('info_documentos_sistemas').update(doc).eq('id', doc.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('info_documentos_sistemas').insert([doc]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteDocument(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('info_documentos_sistemas').delete().eq('id', id);
    if (error) throw error;
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

  async saveGlosario(el: Partial<Glosario>) {
    const supabase = createClient();
    const { info_glosario_categorias, info_glosario_subcategorias, id, ...cleanData } = el;

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
  }
};
