export interface Profile {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface Aldea {
  id: number;
  nombre_jap: string;
  nombre_español: string;
  nombre_completo: string;
  slug: string;
  abreviatura?: string;
  url_imagen?: string;
  descripcion?: string;
  activo: boolean;
}

export interface RamaClan {
  id: number;
  nombre: string;
  slug: string;
  descripcion?: string;
  tipo: 'rama' | 'clan';
  aldea_id?: number;
  activo: boolean;
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
}

export interface ItemCatalog {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria: string;
  precio: number;
  url_imagen?: string;
  activo: boolean;
}

export interface TecnicaGlosario {
  id: number;
  nombre: string;
  descripcion?: string;
  rango: string;
  subcategoria: string;
  url_imagen?: string;
  activo: boolean;
}

export interface RangoRules {
  [rango: string]: {
    stat_max: number;
    puntos_totales: number;
    vit_base: number;
    ch_base: number;
    vel_base: number;
    res_base: number;
    rea_base: number;
    det_base: number;
  };
}

export interface StatsEscaladoConfig {
  vit_factor: number;
  ch_factor: number;
  vel_factor: number;
  res_factor: number;
  rea_factor: number;
  det_factor: number;
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
  id: string;
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
  tiempo_rpg: string;
  edad: number;
  sexo: string;
  apariencia_msg_id?: string;
  historia_msg_id?: string;
  
  // Relations
  profiles?: { username: string };
  aldeas?: Aldea;
  personajes_inventario?: PersonajeItem[];
  personajes_tecnicas?: PersonajeTecnica[];
  personajes_ramas?: PersonajeRama[];
  
  // UI helper fields
  apariencia?: string;
  historia?: string;
}

export interface PersonajeItem {
  personaje_id: string;
  item_id: number;
  cantidad: number;
  items_catalog?: ItemCatalog;
}

export interface PersonajeTecnica {
  personaje_id: string;
  tecnica_id: number;
  tecnicas_glosario?: TecnicaGlosario;
}

export interface PersonajeRama {
  personaje_id: string;
  rama_id: number;
  sub_especialidad_id: number | null;
  slot: number;
  ramas_clanes?: RamaClan;
  sub_especialidades?: SubEspecialidad;
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
  rama_id?: number;
  sub_especialidad_id?: number;
  activo: boolean;
  ramas_clanes?: RamaClan;
  sub_especialidades?: SubEspecialidad;
}
