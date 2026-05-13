import { CharacterStats, AtributosDerivados, RangoRules, StatsEscaladoConfig } from "../types";

export const StatsLogic = {
  calculateDerivedStats(
    stats: CharacterStats,
    bases: RangoRules[string],
    escalado: StatsEscaladoConfig
  ): AtributosDerivados {
    return {
      VIT: (Number(bases.vit_base) || 0) + (Number(stats.FUE) * (Number(escalado.fue_a_vit) || 0)),
      CH: (Number(bases.ch_base) || 0) + (Number(stats.EST) * (Number(escalado.est_a_ch) || 0)),
      VEL: (Number(bases.vel_base) || 0) + Math.floor(Number(stats.AGI) / (Number(escalado.agi_a_vel_factor) || 10)),
      RES: Math.floor(Number(stats.EST) / 5),
      VR: 1 + Math.floor(Number(stats.EST) / 20),
      DET: 1 + Math.floor(Number(stats.INT) / 20)
    };
  },

  calculateAutoRank(puntos_stats: number, rules: RangoRules): string {
    const rulesEntries = Object.entries(rules);
    let newRango = 'D';
    let maxThresholdFound = -1;

    rulesEntries.forEach(([r, rule]: any) => {
      const threshold = Number(rule.min) || 0;
      if (puntos_stats >= threshold && threshold >= maxThresholdFound) {
        maxThresholdFound = threshold;
        newRango = r;
      }
    });
    return newRango;
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
