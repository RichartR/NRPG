// Vercel Trigger: Force new deployment with type fixes
export interface Profile {
  id: string;
  username: string;
  role: 'admin' | 'user';
  active_char_id?: number | null;
  url_avatar?: string;
  url_img?: string | null;
}

export interface Aldea {
  id: number;
  nombre_jap: string;
  nombre_español: string;
  nombre_completo: string;
  slug: string;
  abreviatura?: string;
  url_imagen?: string;
  url_icono?: string;
  descripcion?: string;
  activo: boolean;
  categoria_id?: number | null;
}

export interface Elemento {
  id: number;
  nombre_esp: string;
  nombre_jap: string;
  url_icono?: string | null;
  tipo: 'basico' | 'avanzado';
  activo: boolean;
  created_at?: string;
}

export interface RamaElemento {
  id: number;
  rama_id?: number | null;
  sub_especialidad_id?: number | null;
  elemento_id: number;
  tipo: 'fijo' | 'seleccionable';
  activo: boolean;
  created_at?: string;
  // Joins
  info_elementos?: Elemento;
}

export interface RamaClan {
  nombre_español?: string;
  id: number;
  nombre: string;
  slug: string;
  descripcion?: string;
  tipo: 'rama' | 'clan' | 'especialidad';
  aldea_id?: number;
  activo: boolean;
  es_especial?: boolean;
  es_repetible?: boolean;
  url_imagen?: string;
}

export interface SubEspecialidad {
  id: number;
  rama_id: number;
  nombre: string;
  nombre_español?: string;
  slug: string;
  descripcion?: string;
  url_imagen?: string;
  activo: boolean;
  es_repetible?: boolean;
}

export interface GlosarioCategoria {
  id: number;
  nombre: string;
  slug: string;
  activo: boolean;
}

export interface GlosarioSubcategoria {
  id: number;
  categoria_id: number;
  nombre: string;
  slug: string;
  activo: boolean;
}

export interface Entrenamiento {
  id: number;
  id_ramaclan: number;
  id_subespecialidad: number | null;
  nombre_esp: string;
  nombre_jp: string;
  activo: boolean;
  created_at?: string;
  // Joins
  info_ramas_clanes?: RamaClan;
  info_sub_especialidades?: SubEspecialidad;
}

export interface Glosario {
  id: number;
  categoria_id: number;
  subcategoria_id?: number;
  aldea_id?: number | null;
  rama_clan_id?: number | null;
  sub_especialidad_id?: number | null;
  elemento_id?: number | null;
  nombre_es: string;
  nombre_jp?: string;
  requisitos: any;
  coste_exp: number;
  coste_ryous: number;
  coste_puntos_combate: number;
  activo: boolean;
  inicial?: boolean;
  es_tienda_exp?: boolean;
  descripcion?: string;
  // Joins opcionales
  info_glosario_categorias?: GlosarioCategoria;
  info_glosario_subcategorias?: GlosarioSubcategoria;
}

export interface RangoRules {
  [rango: string]: {
    stat_max: number;
    puntos_totales: number;
    vit_base: number;
    ch_base: number;
    vel_base: number;
    min: number; // Para el cálculo de auto-rango
  };
}

export interface StatsEscaladoConfig {
  fue_a_vit: number;
  est_a_ch: number;
  agi_a_vel_factor: number;
}

export interface CharacterStats {
  NIN: number;
  GEN: number;
  TAI: number;
  SM: number;
  FUE: number;
  AGI: number;
  EST: number;
  INT: number;
}

export interface AtributosDerivados {
  VIT: number;
  CH: number;
  VEL: number;
  RES: number;
  VR: number;
  DET: number;
}

export interface Character {
  personajes_acciones: any;
  personajes_combates: any;
  personajes_misiones: any;
  id: number;
  user_id: string;
  nombre_ninja: string;
  hobba_name: string;
  aldea_id: number | null;
  rango: string;
  rango_jerarquico: string;
  stats_base: CharacterStats;
  atributos_derivados: AtributosDerivados;
  puntos_stats: number;
  xp: number;
  ryous: number;
  puntos_combate: number;
  moneda_evento: number; // Moneda de Evento del personaje
  tiempo_rpg: string;
  edad: number;
  sexo: string;
  activo: boolean;
  eliminado_voluntario?: boolean;
  archived_at?: string | null;
  apariencia_msg_id?: string;
  historia_msg_id?: string;
  url_img?: string | null;
  
  // Relations
  profiles?: Profile | Profile[];
  aldeas?: Aldea;
  personajes_inventario?: PersonajeItem[];
  personajes_tecnicas?: PersonajeTecnica[];
  personajes_ramas?: PersonajeRama[];
  registros_autor?: Registro[];
  registros_participante?: RegistroParticipante[];
  
  // UI helper fields
  apariencia?: string;
  historia?: string;
}

export interface MisionMaster {
  id: number;
  codigo_mision: string;
  rango: string;
  exp: number;
  ryous: number;
  imagen_frontal?: string;
  imagen_trasera?: string;
}

export interface Registro {
  recompensa_xp: number;
  id: number;
  tipo: 'mision' | 'accion' | 'combate' | 'compra';
  subtipo?: string;
  data: {
    titulo: string;
    codigo_mision?: string;
    recompensa_xp?: number;
    recompensa_ryous?: number;
    urls_imagenes?: string[];
    [key: string]: any;
  };
  autor_id: number;
  fecha: string;
  // Joins
  autor?: { nombre_ninja: string; url_img?: string | null; profiles?: any };
  participantes?: RegistroParticipante[];
}

export interface RegistroParticipante {
  registro_id: number;
  personaje_id: number;
  estado: 'pendiente' | 'aceptado' | 'rechazado' | 'disputa_admin' | 'finalizado_admin';
  comentario_rechazo?: string;
  // Joins
  personaje?: { nombre_ninja: string; url_img?: string | null; profiles?: any };
  registro?: Registro;
}

export interface NotificacionAdmin {
  id: string;
  registro_id: number;
  personaje_id: number;
  mensaje: string;
  estado: 'pendiente' | 'resuelto';
  resolucion?: 'aceptada' | 'rechazada';
  created_at: string;
  // Joins
  registro?: Registro;
  personaje?: { nombre_ninja: string; url_img?: string | null };
}

export interface PersonajeItem {
  id?: number;
  personaje_id: number;
  item_id: number;
  info_glosario?: Glosario;
}

export interface PersonajeTecnica {
  id?: number;
  personaje_id: number;
  tecnica_id: number;
  info_glosario?: Glosario;
}

export interface PersonajeRama {
  personaje_id: string;
  rama_id: number;
  sub_especialidad_id: number | null;
  id_entrenamiento: number | null;
  slot: number;
  elemento_principal_id?: number | null;
  elemento_secundario_id?: number | null;
  elemento_terciario_id?: number | null;
  // Joins
  info_ramas_clanes?: RamaClan;
  info_sub_especialidades?: SubEspecialidad;
  info_entrenamientos?: Entrenamiento;
  info_elemento_principal?: Elemento | null;
  info_elemento_secundario?: Elemento | null;
  info_elemento_terciario?: Elemento | null;
}

export interface DocumentoSistema {
  id: string;
  titulo: string;
  clave: string;
  categoria: string;
  subcategoria?: string;
  url_drive: string;
  url_imagen?: string;
  descripcion?: string;
  activo: boolean;
}

export interface DocumentoCombate {
  id: number;
  titulo: string;
  clave: string;
  descripcion?: string;
  url_drive: string;
  url_imagen?: string;
  rama_id?: number;
  sub_especialidad_id?: number;
  activo: boolean;
  ramas_clanes?: RamaClan;
  sub_especialidades?: SubEspecialidad;
}

export interface ConfiguracionSistema {
  id: number;
  clave: string;
  titulo: string;
  valor: any;
  descripcion?: string;
  created_at?: string;
}

export interface EstadoCombate {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface Tienda {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  es_evento: boolean;
  es_experiencia: boolean;
  nombre_moneda?: string | null;
  url_imagen?: string | null;
  created_at?: string;
}

export interface TiendaObjeto {
  id: number;
  tienda_id: number;
  glosario_id: number;
  coste_ryous: number;
  coste_exp: number;
  coste_moneda_evento: number;
  mantener_requisitos: boolean;
  requisitos_personalizados?: any;
  created_at?: string;
  // Joins
  info_glosario?: Glosario;
  info_tiendas?: Tienda;
}

