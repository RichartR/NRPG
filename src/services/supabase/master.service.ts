import { createClient } from '@/utils/supabase/client';
import { Aldea, RamaClan, SubEspecialidad, Entrenamiento, Elemento, RamaElemento, Glosario, GlosarioCategoria, GlosarioSubcategoria } from '@/domain/types';

export const MasterService = {
  async getAldeas(): Promise<Aldea[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_aldeas')
      .select('*');
    
    if (error) throw error;
    if (!data) return [];

    const mainIds = [1, 2, 3, 4, 5];
    return data.sort((a, b) => {
      const aIsMain = mainIds.includes(a.id);
      const bIsMain = mainIds.includes(b.id);
      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;
      return a.id - b.id;
    });
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

  async getElementos(): Promise<Elemento[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_elementos')
      .select('*')
      .order('tipo', { ascending: true })
      .order('nombre_esp', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getRamaElementos(): Promise<RamaElemento[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_rama_elementos')
      .select('*, info_elementos(id, nombre_esp, nombre_jap, url_icono, tipo, activo)')
      .eq('activo', true);

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
  },

  async getGlosarioCategorias(): Promise<GlosarioCategoria[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_glosario_categorias')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getGlosarioSubcategorias(): Promise<GlosarioSubcategoria[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_glosario_subcategorias')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getGlosarios(options?: { categoriaId?: number, onlyInitial?: boolean }): Promise<Glosario[]> {
    const supabase = createClient();
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

  async getAdminRamasActivas(): Promise<RamaClan[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_ramas_clanes')
      .select('id, nombre, tipo, slug, activo, aldea_id')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAdminElementosActivos(): Promise<Elemento[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_elementos')
      .select('*')
      .eq('activo', true)
      .order('nombre_esp', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAldeasActivas(): Promise<Aldea[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_aldeas')
      .select('*')
      .eq('activo', true);
    if (error) throw error;
    if (!data) return [];

    const mainIds = [1, 2, 3, 4, 5];
    return data.sort((a, b) => {
      const aIsMain = mainIds.includes(a.id);
      const bIsMain = mainIds.includes(b.id);
      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;
      return a.id - b.id;
    });
  },

  async getEquiposAldea(aldeaId: number): Promise<any[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reg_equipos_ninja')
      .select(`
        *,
        lider:lider_id(id, nombre_ninja, profiles:user_id(username)),
        integrante_1:integrante_1_id(id, nombre_ninja, profiles:user_id(username)),
        integrante_2:integrante_2_id(id, nombre_ninja, profiles:user_id(username)),
        integrante_3:integrante_3_id(id, nombre_ninja, profiles:user_id(username))
      `)
      .eq('aldea_id', aldeaId)
      .eq('activo', true)
      .order('fecha_creacion', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async crearEquipo(nombreEquipo: string, aldeaId: number, liderId: number, int1Id: number, int2Id: number | null, int3Id: number | null): Promise<any> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reg_equipos_ninja')
      .insert({
        nombre_equipo: nombreEquipo,
        aldea_id: aldeaId,
        lider_id: liderId,
        integrante_1_id: int1Id,
        integrante_2_id: int2Id,
        integrante_3_id: int3Id,
        activo: true
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async disolverEquipo(equipoId: number): Promise<any> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reg_equipos_ninja')
      .update({ activo: false, fecha_disolucion: new Date().toISOString() })
      .eq('id', equipoId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
