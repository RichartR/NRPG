'use client';

import { create } from 'zustand';
import { MasterService } from '@/services/supabase/master.service';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { createClient } from '@/utils/supabase/client';
import { 
  Aldea, 
  RamaClan, 
  SubEspecialidad, 
  RangoRules, 
  StatsEscaladoConfig,
  Glosario
} from '@/domain/types';

interface MasterState {
  aldeas: Aldea[];
  ramas: RamaClan[];
  subEspecialidades: SubEspecialidad[];
  glosario: Glosario[];
  rangoRules: RangoRules | null;
  escaladoRules: StatsEscaladoConfig | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useMasterStore = create<MasterState>((set, get) => ({
  aldeas: [],
  ramas: [],
  subEspecialidades: [],
  glosario: [],
  rangoRules: null,
  escaladoRules: null,
  loading: false,
  initialized: false,
  error: null,

  initialize: async () => {
    if (get().initialized) return;
    await get().refresh();
  },

  refresh: async () => {
    set({ loading: true, error: null });
    const supabase = createClient();
    try {
      const [
        aldeas, 
        ramas, 
        subEspecialidades, 
        glosario,
        rangoRules, 
        escaladoRules
      ] = await Promise.all([
        MasterService.getAldeas(),
        MasterService.getRamas(),
        MasterService.getSubEspecialidades(),
        MasterServerService.getGlosarios(supabase),
        MasterService.getSystemConfig('rango_stats_rules'),
        MasterService.getSystemConfig('stats_escalado_config')
      ]);

      set({
        aldeas,
        ramas,
        subEspecialidades,
        glosario,
        rangoRules: rangoRules || {
          "D": { stat_max: 25, puntos_totales: 16, vit_base: 600, ch_base: 200, vel_base: 5, min: 0 },
          "C": { stat_max: 45, puntos_totales: 40, vit_base: 1200, ch_base: 500, vel_base: 8, min: 25 },
          "B": { stat_max: 75, puntos_totales: 80, vit_base: 2500, ch_base: 1000, vel_base: 12, min: 45 },
          "A": { stat_max: 120, puntos_totales: 150, vit_base: 5000, ch_base: 2500, vel_base: 18, min: 75 },
          "S": { stat_max: 200, puntos_totales: 300, vit_base: 10000, ch_base: 6000, vel_base: 25, min: 120 }
        },
        escaladoRules: escaladoRules || {
          fue_a_vit: 10,
          est_a_ch: 15,
          agi_a_vel_factor: 0.1
        },
        initialized: true,
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
