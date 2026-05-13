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
  url_icono?: string;
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

export interface Glosario {
  id: number;
  categoria_id: number;
  subcategoria_id?: number;
  nombre_es: string;
  nombre_jp?: string;
  requisitos: any;
  coste_exp: number;
  coste_ryo: number;
  activo: boolean;
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
  activo: boolean;
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
  info_glosario?: Glosario;
}

export interface PersonajeTecnica {
  personaje_id: string;
  tecnica_id: number;
  info_glosario?: Glosario;
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

export interface ConfiguracionSistema {
  id: number;
  clave: string;
  titulo: string;
  valor: any;
  descripcion?: string;
  created_at?: string;
}
