import { createClient } from '@/utils/supabase/client';
import { Aldea, RamaClan, SubEspecialidad, Entrenamiento } from '@/domain/types';

export const MasterService = {
  async getAldeas(): Promise<Aldea[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_aldeas')
      .select('*')
      .order('nombre_jap', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getRamas(): Promise<RamaClan[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_ramas_clanes')
      .select('*, info_aldeas(nombre_jap)')
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getSubEspecialidades(): Promise<SubEspecialidad[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_sub_especialidades')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },
  
  async getEntrenamientos(): Promise<Entrenamiento[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_entrenamientos')
      .select('*')
      .eq('activo', true)
      .order('nombre_esp', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },


  async getEstadosCombate(): Promise<{ id: number; nombre: string; activo: boolean }[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_estados_combate')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getSystemConfig(key: string): Promise<any> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sys_configuracion_sistema')
      .select('valor')
      .eq('clave', key)
      .single();
    
    if (error) {
       console.error(`Config fetch error for ${key}:`, error);
       return null;
    }
    return data?.valor;
  },

  async getSystemConfigs(keys: string[]): Promise<Record<string, any>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sys_configuracion_sistema')
      .select('clave, valor')
      .in('clave', keys);
    
    if (error) {
      console.error(`Configs fetch error:`, error);
      return {};
    }

    const configs: Record<string, any> = {};
    data?.forEach(row => {
      configs[row.clave] = row.valor;
    });
    return configs;
  }
};
