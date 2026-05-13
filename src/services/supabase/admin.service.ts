import { createClient } from '@/utils/supabase/client';
import { Aldea, RamaClan, SubEspecialidad, ItemCatalog, TecnicaGlosario, DocumentoSistema, DocumentoCombate } from '@/domain/types';

export const AdminService = {
  // Aldeas
  async saveAldea(aldea: Partial<Aldea>) {
    const supabase = createClient();
    if (aldea.id) {
      const { data, error } = await supabase.from('aldeas').update(aldea).eq('id', aldea.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('aldeas').insert([aldea]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteAldea(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('aldeas').delete().eq('id', id);
    if (error) throw error;
  },

  // Ramas y Clanes
  async saveRamaClan(rama: Partial<RamaClan>) {
    const supabase = createClient();
    if (rama.id) {
      const { data, error } = await supabase.from('ramas_clanes').update(rama).eq('id', rama.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('ramas_clanes').insert([rama]).select().single();
      if (error) throw error;
      return data;
    }
  },

  // Sub Especialidades
  async saveSubEspecialidad(sub: Partial<SubEspecialidad>) {
    const supabase = createClient();
    if (sub.id) {
      const { data, error } = await supabase.from('sub_especialidades').update(sub).eq('id', sub.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('sub_especialidades').insert([sub]).select().single();
      if (error) throw error;
      return data;
    }
  },

  // Items
  async saveItem(item: Partial<ItemCatalog>) {
    const supabase = createClient();
    if (item.id) {
      const { data, error } = await supabase.from('items_catalog').update(item).eq('id', item.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('items_catalog').insert([item]).select().single();
      if (error) throw error;
      return data;
    }
  },

  // Técnicas
  async saveTecnica(tecnica: Partial<TecnicaGlosario>) {
    const supabase = createClient();
    if (tecnica.id) {
      const { data, error } = await supabase.from('tecnicas_glosario').update(tecnica).eq('id', tecnica.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('tecnicas_glosario').insert([tecnica]).select().single();
      if (error) throw error;
      return data;
    }
  },

  // Documentos y Sistemas
  async saveDocument(doc: Partial<DocumentoSistema>) {
    const supabase = createClient();
    if (doc.id) {
      const { data, error } = await supabase.from('documentos_sistemas').update(doc).eq('id', doc.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('documentos_sistemas').insert([doc]).select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteDocument(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('documentos_sistemas').delete().eq('id', id);
    if (error) throw error;
  },

  // Documentos de Combate
  async saveCombatDoc(doc: Partial<DocumentoCombate>) {
    const supabase = createClient();
    if (doc.id) {
      const { data, error } = await supabase.from('documentos_combate').update(doc).eq('id', doc.id).select('*, ramas_clanes(id, nombre), sub_especialidades(id, nombre)').single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('documentos_combate').insert([doc]).select('*, ramas_clanes(id, nombre), sub_especialidades(id, nombre)').single();
      if (error) throw error;
      return data;
    }
  },

  async deleteCombatDoc(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('documentos_combate').delete().eq('id', id);
    if (error) throw error;
  }
};
