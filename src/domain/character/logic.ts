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

    if (newValue < 1) {
      return { valid: false, message: "El valor mínimo para cualquier estadística es 1" };
    }

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

export const RewardLogic = {
  calculateReward(registro: any, personajeId: number): { xp: number; ryous: number } {
    const { tipo, data } = registro;

    if (registro.subtipo === 'evento_premios' || registro.subtipo === 'narracion') {
      const globalXp = Number(data.global_xp) || 0;
      const globalRyous = Number(data.global_ryous) || 0;
      const partPremio = data.participantes_premios?.find((p: any) => Number(p.personaje_id) === Number(personajeId));

      const xpExtra = Number(partPremio?.xp_extra) || 0;
      const ryousExtra = Number(partPremio?.ryous_extra) || 0;

      return {
        xp: globalXp + xpExtra,
        ryous: globalRyous + ryousExtra
      };
    }

    if (tipo === 'combate') {
      const isTeamA = data.equipo_a?.some((p: any) => Number(p.id) === Number(personajeId));
      const isTeamB = data.equipo_b?.some((p: any) => Number(p.id) === Number(personajeId));
      const participant = [...(data.equipo_a || []), ...(data.equipo_b || [])].find((p: any) => Number(p.id) === Number(personajeId));

      if (!participant || participant.huye) return { xp: 0, ryous: 0 };
      if (data.ganador === 'Empate') return { xp: 0, ryous: 0 };

      const config = data.config_xp;
      if (!config) return { xp: 0, ryous: 0 };

      // Calcular el rango máximo de cada bando
      const RANK_SCALE: Record<string, number> = { 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5 };
      
      const maxRankA = (data.equipo_a || []).reduce((max: number, p: any) => {
        const val = RANK_SCALE[(p.rango || 'D').toUpperCase()] || 1;
        return val > max ? val : max;
      }, 1);

      const maxRankB = (data.equipo_b || []).reduce((max: number, p: any) => {
        const val = RANK_SCALE[(p.rango || 'D').toUpperCase()] || 1;
        return val > max ? val : max;
      }, 1);

      const isWinner = data.ganador === (isTeamA ? 'A' : 'B');
      const ownMaxRankVal = isTeamA ? maxRankA : maxRankB;
      const opponentMaxRankVal = isTeamA ? maxRankB : maxRankA;

      const diff = opponentMaxRankVal - ownMaxRankVal;

      // Obtener el mapeo de EXP según victoria/derrota y diferencia
      const section = isWinner ? config.victoria : config.derrota;
      if (!section) {
        // Fallback si la config es antigua (para evitar caídas en registros viejos)
        let xpFallback = 0;
        if (isWinner) xpFallback = Number(config.ganar) || 0;
        else xpFallback = Number(config.perder) || 0;
        return { xp: xpFallback, ryous: 0 };
      }

      let xp = 0;
      if (diff >= 2) xp = Number(section.mas_2) || 0;
      else if (diff === 1) xp = Number(section.mas_1) || 0;
      else if (diff === 0) xp = Number(section.igual) || 0;
      else if (diff === -1) xp = Number(section.menos_1) || 0;
      else xp = Number(section.menos_2) || 0;

      return { xp, ryous: 0 };
    }

    // Misiones o Acciones
    if (tipo === 'mision') {
      if (data.fallida) {
        return {
          xp: Number(data.recompensa_xp_fallida) || 0,
          ryous: Number(data.recompensa_ryous_fallida) || 0
        };
      }
      return {
        xp: Number(data.recompensa_xp) || 0,
        ryous: Number(data.recompensa_ryous) || 0
      };
    }

    return {
      xp: Number(data.recompensa_xp) || 0,
      ryous: Number(data.recompensa_ryous) || 0
    };
  },

  calculateCombatPoints(registro: any, personajeId: number): number {
    const { tipo, data } = registro;
    if (tipo !== 'combate' || !data || data.ganador === 'Empate') return 0;

    const isTeamA = data.equipo_a?.some((p: any) => Number(p.id) === Number(personajeId));
    const isTeamB = data.equipo_b?.some((p: any) => Number(p.id) === Number(personajeId));
    const participant = [...(data.equipo_a || []), ...(data.equipo_b || [])].find((p: any) => Number(p.id) === Number(personajeId));

    // Solo se suma al bando ganador y si no huye
    if (!participant || participant.huye) return 0;

    const winningBando = data.ganador; // 'A' o 'B'
    const playerBando = isTeamA ? 'A' : 'B';
    if (playerBando !== winningBando) return 0;

    // Calcular el rango máximo del bando oponente
    const opponentTeam = winningBando === 'A' ? (data.equipo_b || []) : (data.equipo_a || []);
    const RANK_SCALE: Record<string, number> = { 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5 };

    const opponentMaxRankVal = opponentTeam.reduce((max: number, p: any) => {
      const val = RANK_SCALE[(p.rango || 'D').toUpperCase()] || 1;
      return val > max ? val : max;
    }, 1);

    const ownRankVal = RANK_SCALE[(participant.rango || 'D').toUpperCase()] || 1;

    // Fórmula: 2 + (Rango enemigo máximo - Rango jugador)
    const diff = opponentMaxRankVal - ownRankVal;
    return Math.max(0, 2 + diff);
  }
};
