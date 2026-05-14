'use client';

import { create } from 'zustand';
import { MasterService } from '@/services/supabase/master.service';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { createClient } from '@/utils/supabase/client';
import { 
  Aldea, 
  RamaClan, 
  SubEspecialidad, 
  StatsEscaladoConfig,
  Glosario,
  Entrenamiento
} from '@/domain/types';

interface MasterState {
  aldeas: Aldea[];
  ramas: RamaClan[];
  subEspecialidades: SubEspecialidad[];
  entrenamientos: Entrenamiento[];
  glosario: Glosario[];
  rangoRules: RangoRules | null;
  escaladoRules: StatsEscaladoConfig | null;
  rankOrder: Record<string, number>;
  requiredTrainingRank: string;
  recursosPJInicio: { ryous_iniciales: number; xp_inicial: number };
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
  entrenamientos: [],
  glosario: [],
  rangoRules: null,
  escaladoRules: null,
  rankOrder: {},
  requiredTrainingRank: 'B',
  recursosPJInicio: { ryous_iniciales: 0, xp_inicial: 0 },
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
        aldeasRes, 
        ramasRes, 
        subEspecialidadesRes, 
        entrenamientosRes,
        glosarioRes,
        rangoRulesRes, 
        escaladoRulesRes,
        rankOrderRes,
        requiredTrainingRankRes,
        recursosPJInicioRes
      ] = await Promise.allSettled([
        MasterService.getAldeas(),
        MasterService.getRamas(),
        MasterService.getSubEspecialidades(),
        MasterService.getEntrenamientos(),
        MasterServerService.getGlosarios(supabase),
        MasterService.getSystemConfig('rango_stats_rules'),
        MasterService.getSystemConfig('stats_escalado_config'),
        MasterService.getSystemConfig('orden-rangos'),
        MasterService.getSystemConfig('rango-acceso-entrenamiento'),
        MasterService.getSystemConfig('recursos_pj_inicio')
      ]);

      const getVal = (res: any, fallback: any) => res.status === 'fulfilled' ? res.value : fallback;

      const rawRankOrder = getVal(rankOrderRes, { "D": 1, "C": 2, "B": 3, "A": 4, "S": 5 });
      const numericRankOrder: Record<string, number> = {};
      Object.entries(rawRankOrder).forEach(([k, v]) => {
        numericRankOrder[k] = Number(v);
      });

      set({
        aldeas: getVal(aldeasRes, []),
        ramas: getVal(ramasRes, []),
        subEspecialidades: getVal(subEspecialidadesRes, []),
        entrenamientos: getVal(entrenamientosRes, []),
        glosario: getVal(glosarioRes, []),
        rangoRules: getVal(rangoRulesRes, null) || {
          "D": { stat_max: 25, puntos_totales: 16, vit_base: 600, ch_base: 200, vel_base: 5, min: 0 },
          "C": { stat_max: 45, puntos_totales: 40, vit_base: 1200, ch_base: 500, vel_base: 8, min: 25 },
          "B": { stat_max: 75, puntos_totales: 80, vit_base: 2500, ch_base: 1000, vel_base: 12, min: 45 },
          "A": { stat_max: 120, puntos_totales: 150, vit_base: 5000, ch_base: 2500, vel_base: 18, min: 75 },
          "S": { stat_max: 200, puntos_totales: 300, vit_base: 10000, ch_base: 6000, vel_base: 25, min: 120 }
        },
        escaladoRules: getVal(escaladoRulesRes, null) || {
          fue_a_vit: 10,
          est_a_ch: 15,
          agi_a_vel_factor: 0.1
        },
        rankOrder: numericRankOrder,
        requiredTrainingRank: getVal(requiredTrainingRankRes, 'B'),
        recursosPJInicio: getVal(recursosPJInicioRes, { ryous_iniciales: 0, xp_inicial: 0 }),
        initialized: true,
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
