import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';

export type Rango = 'D' | 'C' | 'B' | 'A' | 'S';

export interface StatsBase {
  NIN: number;
  TAI: number;
  GEN: number;
  INT: number;
  FUE: number;
  AGI: number;
  EST: number;
  SM: number;
}

export interface AtributosDerivados {
  VIT: number;
  CH: number;
  VEL: number;
  RES: number;
  REA: number;
  DET: number;
}

export interface Character {
  id: string;
  nombre_ninja: string;
  rango: Rango;
  xp: number;
  ryos: number;
  stats_base: StatsBase;
  atributos_derivados: AtributosDerivados;
}

interface CharacterState {
  activeCharacter: Character | null;
  loading: boolean;
  error: string | null;
  fetchActiveCharacter: () => Promise<void>;
  calculateDerivados: (rango: Rango, stats: StatsBase) => AtributosDerivados;
}

const RANGO_BASE = {
  D: { vit: 600, ch: 0, res: 0, rea: 1, det: 0 },
  C: { vit: 900, ch: 50, res: 0, rea: 1, det: 1 },
  B: { vit: 1100, ch: 100, res: 15, rea: 1, det: 2 },
  A: { vit: 1200, ch: 150, res: 20, rea: 2, det: 3 },
  S: { vit: 1300, ch: 200, res: 25, rea: 2, det: 4 },
};

export const useCharacterStore = create<CharacterState>((set, get) => ({
  activeCharacter: null,
  loading: false,
  error: null,

  calculateDerivados: (rango, stats) => {
    const base = RANGO_BASE[rango] || RANGO_BASE['D'];
    
    // Fórmulas base (el administrador puede ajustar esto luego)
    // VIT Base + EST * 50
    const VIT = base.vit + (stats.EST * 50);
    // CH Base + NIN * 20
    const CH = base.ch + (stats.NIN * 20);
    // VEL basada en AGI
    const VEL = stats.AGI * 2;
    // RES Base + FUE
    const RES = base.res + stats.FUE;
    // REA Base + AGI/2
    const REA = base.rea + Math.floor(stats.AGI / 2);
    // DET Base + INT/2
    const DET = base.det + Math.floor(stats.INT / 2);

    return { VIT, CH, VEL, RES, REA, DET };
  },

  fetchActiveCharacter: async () => {
    set({ loading: true, error: null });
    const supabase = createClient();
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('active_char_id')
        .eq('id', userData.user.id)
        .single();
        
      if (profileError) throw profileError;
      if (!profile?.active_char_id) {
        set({ activeCharacter: null, loading: false });
        return;
      }

      const { data: charData, error: charError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', profile.active_char_id)
        .single();

      if (charError) throw charError;

      // Calcular derivados actualizados en base a los stats
      const derivados = get().calculateDerivados(charData.rango as Rango, charData.stats_base);

      set({ 
        activeCharacter: {
          ...charData,
          atributos_derivados: derivados
        }, 
        loading: false 
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  }
}));
