import { createClient } from '@/utils/supabase/client';

export interface MapaMarcador {
  id: string;
  nombre: string;
  descripcion?: string | null;
  lat: number;
  lng: number;
  icono: string;
  color_fondo?: string | null;
  imagen_sala?: string | null;
  created_at?: string;
}

export interface MapaConexion {
  id: string;
  origen_id: string;
  destino_id: string;
  color: string;
  tipo_icono: 'linea' | 'url';
  icono_url?: string | null;
  imagen_ida?: string | null;    // imagen viajando de origen → destino
  imagen_vuelta?: string | null; // imagen viajando de destino → origen
  created_at?: string;
}

export const MapaService = {
  async getMarcadores(): Promise<MapaMarcador[]> {
    const supabase = createClient();
    const { data: markers, error: markerError } = await supabase
      .from('mapa_marcadores')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (markerError) {
      console.error('Error fetching map markers:', markerError.message, markerError.details);
      throw new Error(markerError.message);
    }

    if (!markers || markers.length === 0) return [];

    const { data: images } = await supabase
      .from('mapa_salas_imagenes')
      .select('*');

    const imagesMap = new Map(images?.map((img: any) => [img.marcador_id, img.imagen_url]) || []);

    return markers.map((item: any) => ({
      ...item,
      imagen_sala: imagesMap.get(item.id) || null,
    }));
  },

  async getConexiones(): Promise<MapaConexion[]> {
    const supabase = createClient();
    const { data: connections, error: connError } = await supabase
      .from('mapa_conexiones')
      .select('*');
    
    if (connError) {
      console.error('Error fetching map connections:', connError.message, connError.details);
      throw new Error(connError.message);
    }

    if (!connections || connections.length === 0) return [];

    const { data: images } = await supabase
      .from('mapa_conexiones_imagenes')
      .select('*');

    const imagesMap = new Map(
      images?.map((img: any) => [img.conexion_id, img]) || []
    );

    return connections.map((conn: any) => {
      const imgRow = imagesMap.get(conn.id);
      return {
        ...conn,
        tipo_icono: conn.tipo_icono || 'linea',
        icono_url: conn.icono_url || null,
        imagen_ida: imgRow?.imagen_url_ida || null,
        imagen_vuelta: imgRow?.imagen_url_vuelta || null,
      };
    });
  },

  async crearMarcador(
    nombre: string,
    descripcion: string | null,
    lat: number,
    lng: number,
    icono: string,
    color_fondo: string,
    imagen_sala?: string | null
  ): Promise<MapaMarcador> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('mapa_marcadores')
      .insert({
        nombre,
        descripcion,
        lat,
        lng,
        icono,
        color_fondo
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating map marker:', error.message, error.details);
      throw new Error(error.message);
    }

    if (imagen_sala && data) {
      const { error: imgError } = await supabase
        .from('mapa_salas_imagenes')
        .insert({
          marcador_id: data.id,
          imagen_url: imagen_sala
        });
      if (imgError) {
        console.error('Error creating room image:', imgError.message);
      } else {
        data.imagen_sala = imagen_sala;
      }
    }
    return data;
  },

  async editarMarcador(
    id: string,
    nombre: string,
    descripcion: string | null,
    icono: string,
    color_fondo: string,
    imagen_sala?: string | null
  ): Promise<MapaMarcador> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('mapa_marcadores')
      .update({
        nombre,
        descripcion,
        icono,
        color_fondo
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating map marker:', error.message, error.details);
      throw new Error(error.message);
    }

    if (data) {
      if (imagen_sala) {
        const { error: imgError } = await supabase
          .from('mapa_salas_imagenes')
          .upsert({ marcador_id: id, imagen_url: imagen_sala });
        if (imgError) console.error('Error updating room image:', imgError.message);
        data.imagen_sala = imagen_sala;
      } else {
        await supabase
          .from('mapa_salas_imagenes')
          .delete()
          .eq('marcador_id', id);
        data.imagen_sala = null;
      }
    }
    return data;
  },

  async actualizarPosicionMarcador(id: string, lat: number, lng: number): Promise<MapaMarcador> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('mapa_marcadores')
      .update({ lat, lng })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating map marker position:', error.message, error.details);
      throw new Error(error.message);
    }
    return data;
  },

  async eliminarMarcador(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('mapa_marcadores')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting map marker:', error.message, error.details);
      throw new Error(error.message);
    }
  },

  async crearConexion(
    origenId: string,
    destinoId: string,
    color: string = '#d97706',
    imagen_ida?: string | null,
    imagen_vuelta?: string | null,
    tipo_icono: 'linea' | 'url' = 'linea',
    icono_url?: string | null
  ): Promise<MapaConexion> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('mapa_conexiones')
      .insert({
        origen_id: origenId,
        destino_id: destinoId,
        color,
        tipo_icono,
        icono_url: icono_url || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating map connection:', error.message, error.details);
      throw new Error(error.message);
    }

    if (data && (imagen_ida || imagen_vuelta)) {
      const { error: imgError } = await supabase
        .from('mapa_conexiones_imagenes')
        .insert({
          conexion_id: data.id,
          imagen_url_ida: imagen_ida || null,
          imagen_url_vuelta: imagen_vuelta || null,
        });
      if (imgError) {
        console.error('Error creating connection image:', imgError.message);
      } else {
        data.imagen_ida = imagen_ida || null;
        data.imagen_vuelta = imagen_vuelta || null;
      }
    }
    return data;
  },

  async editarConexion(
    origenId: string,
    destinoId: string,
    color: string,
    imagen_ida: string | null,
    imagen_vuelta: string | null,
    tipo_icono: 'linea' | 'url' = 'linea',
    icono_url?: string | null
  ): Promise<void> {
    const supabase = createClient();
    
    // Find connection ID first
    const { data: conn, error: connFindError } = await supabase
      .from('mapa_conexiones')
      .select('id')
      .eq('origen_id', origenId)
      .eq('destino_id', destinoId)
      .single();

    if (connFindError || !conn) {
      console.error('Error finding connection to edit:', connFindError?.message);
      throw new Error('No se encontró la conexión para editar.');
    }

    const { error: connError } = await supabase
      .from('mapa_conexiones')
      .update({ color, tipo_icono, icono_url: icono_url || null })
      .eq('id', conn.id);
    
    if (connError) {
      console.error('Error updating connection color:', connError.message);
      throw new Error(connError.message);
    }

    if (imagen_ida || imagen_vuelta) {
      const { error: imgError } = await supabase
        .from('mapa_conexiones_imagenes')
        .upsert({
          conexion_id: conn.id,
          imagen_url_ida: imagen_ida || null,
          imagen_url_vuelta: imagen_vuelta || null,
        });
      if (imgError) {
        console.error('Error updating connection image:', imgError.message);
        throw new Error(imgError.message);
      }
    } else {
      await supabase
        .from('mapa_conexiones_imagenes')
        .delete()
        .eq('conexion_id', conn.id);
    }
  },

  async eliminarConexion(origenId: string, destinoId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('mapa_conexiones')
      .delete()
      .or(`and(origen_id.eq.${origenId},destino_id.eq.${destinoId}),and(origen_id.eq.${destinoId},destino_id.eq.${origenId})`);
    
    if (error) {
      console.error('Error deleting map connection:', error.message, error.details);
      throw new Error(error.message);
    }
  },

  async actualizarTodasLasConexiones(
    tipo_icono: 'linea' | 'url',
    color?: string,
    icono_url?: string | null
  ): Promise<void> {
    const supabase = createClient();
    const updateData: any = { tipo_icono };
    if (color) updateData.color = color;
    if (icono_url !== undefined) updateData.icono_url = icono_url;
    
    // We update all rows using a standard filter that matches all UUIDs (e.g. id is not null)
    const { error } = await supabase
      .from('mapa_conexiones')
      .update(updateData)
      .filter('id', 'not.is', null);

    if (error) {
      console.error('Error updating all connections:', error.message);
      throw new Error(error.message);
    }
  }
};
