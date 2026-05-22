import { createClient } from '@/utils/supabase/client';
import { Tienda, TiendaObjeto } from '@/domain/types';

export const TiendasService = {
  /**
   * Obtiene todas las tiendas (o solo las activas)
   */
  async getTiendas(soloActivas = true): Promise<Tienda[]> {
    const supabase = createClient();
    let query = supabase.from('info_tiendas').select('*').order('id', { ascending: true });
    
    if (soloActivas) {
      query = query.eq('activo', true);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Obtiene una tienda por su ID
   */
  async getTiendaById(id: number): Promise<Tienda> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('info_tiendas')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  },

  /**
   * Obtiene todos los objetos/técnicas asignados a una tienda
   */
  async getTiendaObjetos(tiendaId: number): Promise<TiendaObjeto[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reg_tiendas_objetos')
      .select(`
        *,
        info_glosario (
          *,
          info_glosario_categorias(nombre),
          info_glosario_subcategorias(nombre)
        )
      `)
      .eq('tienda_id', tiendaId)
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async realizarCompra(personajeId: number, tiendaObjetoId: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('realizar_compra_tienda', {
      p_personaje_id: personajeId,
      p_tienda_objeto_id: tiendaObjetoId
    });

    if (error) throw error;
    return data;
  },

  /**
   * Ejecuta la compra transaccional de puntos de stat en la base de datos a través de RPC
   */
  async comprarPuntosStat(personajeId: number, cantidad: number, costeExpTotal: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('comprar_puntos_stat', {
      p_personaje_id: personajeId,
      p_cantidad: cantidad,
      p_coste_exp_total: costeExpTotal
    });

    if (error) throw error;
    return data;
  },

  /**
   * Obtiene la tabla de configuración de costes de puntos de stat de la Tienda de EXP
   */
  async getTiendaExperienciaCostes(): Promise<Record<string, number>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sys_configuracion_sistema')
      .select('valor')
      .eq('clave', 'tienda_experiencia_costes')
      .single();

    if (error) {
      console.error('Error fetching experience shop costs:', error);
      return {};
    }
    return data?.valor || {};
  }
};
