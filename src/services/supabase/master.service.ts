import { createClient } from '@/utils/supabase/client';
import { Aldea, RamaClan, SubEspecialidad, ItemCatalog, TecnicaGlosario, RangoRules, StatsEscaladoConfig } from '@/domain/types';

export const MasterService = {
  async getAldeas(): Promise<Aldea[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('aldeas')
      .select('*')
      .order('nombre_jap', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getRamas(): Promise<RamaClan[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ramas_clanes')
      .select('*, aldeas(nombre_jap)')
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getSubEspecialidades(): Promise<SubEspecialidad[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sub_especialidades')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getItems(): Promise<ItemCatalog[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('items_catalog')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getTecnicas(): Promise<TecnicaGlosario[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('tecnicas_glosario')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getSystemConfig(key: string): Promise<any> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', key)
      .single();
    
    if (error) {
       console.error(`Config fetch error for ${key}:`, error);
       return null;
    }
    return data?.valor;
  }
};
