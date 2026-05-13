import { CharacterStats, AtributosDerivados, RangoRules, StatsEscaladoConfig } from "../types";

export const StatsLogic = {
  calculateDerivedStats(
    stats: CharacterStats,
    bases: RangoRules[string],
    escalado: StatsEscaladoConfig
  ): AtributosDerivados {
    return {
      VIT: bases.vit_base + (stats.EST * (escalado.vit_factor || 50)),
      CH: bases.ch_base + (stats.NIN * (escalado.ch_factor || 20)),
      VEL: bases.vel_base + (stats.AGI * (escalado.vel_factor || 2)),
      RES: bases.res_base + (stats.FUE * (escalado.res_factor || 1)),
      VR: bases.rea_base + Math.floor(stats.AGI / (escalado.rea_factor || 2)),
      DET: bases.det_base + Math.floor(stats.INT / (escalado.det_factor || 2)),
    };
  },

  calculateAutoRank(puntos_stats: number, rules: RangoRules): string {
    const sortedRanks = Object.entries(rules).sort((a, b) => b[1].puntos_totales - a[1].puntos_totales);
    for (const [rank, data] of sortedRanks) {
      if (puntos_stats >= data.puntos_totales) return rank;
    }
    return 'D';
  },

  validateStatChange(
    statName: keyof CharacterStats,
    newValue: number,
    currentStats: CharacterStats,
    rango: string,
    puntosTotales: number,
    rules: RangoRules
  ): { valid: boolean; message?: string } {
    const rulesForRank = rules[rango];
    if (!rulesForRank) return { valid: false, message: "Rango no válido" };

    if (newValue > rulesForRank.stat_max) {
      return { valid: false, message: `El máximo para tu rango es ${rulesForRank.stat_max}` };
    }

    const otherStatsSum = Object.entries(currentStats)
      .filter(([name]) => name !== statName)
      .reduce((sum, [_, val]) => sum + val, 0);

    if (otherStatsSum + newValue > puntosTotales) {
      return { valid: false, message: "No tienes suficientes puntos" };
    }

    return { valid: true };
  }
};
