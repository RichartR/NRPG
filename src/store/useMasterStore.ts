'use client';

import { create } from 'zustand';
import { MasterService } from '@/services/supabase/master.service';
import { Aldea, RamaClan, SubEspecialidad, ItemCatalog, TecnicaGlosario, RangoRules, StatsEscaladoConfig } from '@/domain/types';

interface MasterState {
  aldeas: Aldea[];
  ramas: RamaClan[];
  subEspecialidades: SubEspecialidad[];
  items: ItemCatalog[];
  tecnicas: TecnicaGlosario[];
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
  items: [],
  tecnicas: [],
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
    try {
      const [
        aldeas, ramas, subEspecialidades, items, tecnicas, 
        rangoRules, escaladoRules
      ] = await Promise.all([
        MasterService.getAldeas(),
        MasterService.getRamas(),
        MasterService.getSubEspecialidades(),
        MasterService.getItems(),
        MasterService.getTecnicas(),
        MasterService.getSystemConfig('rango_stats_rules'),
        MasterService.getSystemConfig('stats_escalado_config')
      ]);

      set({
        aldeas,
        ramas,
        subEspecialidades,
        items,
        tecnicas,
        rangoRules: rangoRules || {
          "D": { stat_max: 25, puntos_totales: 16, vit_base: 600, ch_base: 200, vel_base: 5, min: 0 },
          "C": { stat_max: 45, puntos_totales: 40, vit_base: 1200, ch_base: 500, vel_base: 8, min: 25 },
          "B": { stat_max: 70, puntos_totales: 75, vit_base: 2500, ch_base: 1200, vel_base: 12, min: 50 },
          "A": { stat_max: 100, puntos_totales: 120, vit_base: 5000, ch_base: 3000, vel_base: 18, min: 85 },
          "S": { stat_max: 150, puntos_totales: 200, vit_base: 10000, ch_base: 7000, vel_base: 25, min: 150 }
        },
        escaladoRules: escaladoRules || {
          fue_a_vit: 50,
          est_a_ch: 20,
          agi_a_vel_factor: 10
        },
        initialized: true,
        loading: false
      });
    } catch (err: any) {
      console.error("Error refreshing master store:", err.message || err);
      set({ error: err.message || "Error desconocido", loading: false });
    }
  }
}));
