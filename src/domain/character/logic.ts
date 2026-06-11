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

  calculateAutoRank(
    puntos_stats: number,
    rules: RangoRules,
    tecnicasPersonaje: any[] = [],
    ramasPersonaje: any[] = [],
    glosarioTecnicas: any[] = [],
    subEspecialidades: any[] = []
  ): string {
    const rulesEntries = Object.entries(rules);
    // Sort ranks by min threshold ascending (D, C, B, A, S, etc.)
    const sortedRanks = rulesEntries.sort((a: any, b: any) => (Number(a[1].min) || 0) - (Number(b[1].min) || 0));
    
    let newRango = 'D';

    for (const [r, rule] of sortedRanks) {
      const threshold = Number(rule.min) || 0;
      if (puntos_stats < threshold) {
        break; // Stats don't meet requirements for this or higher ranks
      }

      // If we are trying to go from the current newRango to the next rank r,
      // we must verify that all mandatory techniques of newRango are acquired.
      if (newRango !== r && glosarioTecnicas.length > 0) {
        const currentRankCheck = newRango;
        const playerBranches = ramasPersonaje.map(rp => Number(rp.rama_id));
        const playerSubSpecs = ramasPersonaje.map(rp => rp.sub_especialidad_id ? Number(rp.sub_especialidad_id) : null).filter(Boolean);
        const playerElements = ramasPersonaje.reduce((acc: number[], rp) => {
          if (rp.elemento_principal_id) acc.push(Number(rp.elemento_principal_id));
          if (rp.elemento_secundario_id) acc.push(Number(rp.elemento_secundario_id));
          if (rp.elemento_terciario_id) acc.push(Number(rp.elemento_terciario_id));
          return acc;
        }, []);

        const ninjutsuRama = ramasPersonaje.find(rp => Number(rp.rama_id) === 4);
        let isNinIIorIII = false;
        if (ninjutsuRama && ninjutsuRama.sub_especialidad_id) {
          const sub = subEspecialidades.find((s: any) => Number(s.id) === Number(ninjutsuRama.sub_especialidad_id));
          if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
            isNinIIorIII = true;
          }
        }

        // A) If isNinIIorIII, check if they have enough basic Ninjutsu techniques of the current rank
        const rankRule = rules[currentRankCheck] as any;
        const reqBasicas = rankRule?.basicas_requeridas || 0;
        if (isNinIIorIII && reqBasicas > 0) {
          const playerTechIds = tecnicasPersonaje.map(pt => Number(pt.tecnica_id));
          
          // Count learned techniques of currentRankCheck that are basic Ninjutsu
          const basicCount = glosarioTecnicas.filter(t => {
            const tRank = t.rango || t.requisitos?.rango;
            return t.basica === true && Number(t.rama_clan_id) === 4 && tRank === currentRankCheck && playerTechIds.includes(t.id);
          }).length;

          if (basicCount < reqBasicas) {
            break; // Blocked: doesn't have the maximum basic techniques allowed/required
          }
        }

        // Filter master techniques of currentRankCheck that are mandatory for advancement
        const mandatoryTechs = glosarioTecnicas.filter(t => {
          const tRank = t.rango || t.requisitos?.rango;
          const isMandatory = t.obligatoria_ascenso || t.requisitos?.obligatoria_ascenso;
          if (!isMandatory || tRank !== currentRankCheck) return false;

          // If Ninjutsu II or III is active, exclude basic Ninjutsu techniques from mandatory check (already validated above)
          if (isNinIIorIII && Number(t.rama_clan_id) === 4 && t.basica === true) {
            return false;
          }

          // Check if it belongs to the player's branches/specs/elements.
          // If the technique has no branch, spec, or element, it is general.
          const hasBranch = t.rama_clan_id !== null && t.rama_clan_id !== undefined;
          const hasSubSpec = t.sub_especialidad_id !== null && t.sub_especialidad_id !== undefined;
          const hasElement = t.elemento_id !== null && t.elemento_id !== undefined;

          if (!hasBranch && !hasSubSpec && !hasElement) return true; // General technique of this rank

          const matchBranch = hasBranch && playerBranches.includes(Number(t.rama_clan_id));
          const matchSubSpec = hasSubSpec && playerSubSpecs.includes(Number(t.sub_especialidad_id));
          const matchElement = hasElement && playerElements.includes(Number(t.elemento_id));

          return matchBranch || matchSubSpec || matchElement;
        });

        // Verify player has all of these mandatory techniques
        const playerTechIds = tecnicasPersonaje.map(pt => Number(pt.tecnica_id));
        const hasAllMandatory = mandatoryTechs.every(mt => playerTechIds.includes(mt.id));

        if (!hasAllMandatory) {
          break; // Blocked: player hasn't purchased all mandatory techniques of currentRankCheck
        }
      }

      newRango = r;
    }

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
  calculateReward(registro: any, personajeId: number): { xp: number; ryous: number; pa: number } {
    const { tipo, data } = registro;

    if (registro.subtipo === 'evento_premios' || registro.subtipo === 'narracion') {
      const globalXp = Number(data.global_xp) || 0;
      const globalRyous = Number(data.global_ryous) || 0;
      const globalPa = Number(data.global_pa) || 0;
      const partPremio = data.participantes_premios?.find((p: any) => Number(p.personaje_id) === Number(personajeId));

      const xpExtra = Number(partPremio?.xp_extra) || 0;
      const ryousExtra = Number(partPremio?.ryous_extra) || 0;
      const paExtra = Number(partPremio?.pa_extra) || 0;

      return {
        xp: globalXp + xpExtra,
        ryous: globalRyous + ryousExtra,
        pa: globalPa + paExtra
      };
    }

    if (tipo === 'combate') {
      const isTeamA = data.equipo_a?.some((p: any) => Number(p.id) === Number(personajeId));
      const isTeamB = data.equipo_b?.some((p: any) => Number(p.id) === Number(personajeId));
      const participant = [...(data.equipo_a || []), ...(data.equipo_b || [])].find((p: any) => Number(p.id) === Number(personajeId));

      if (!participant || participant.huye) return { xp: 0, ryous: 0, pa: 0 };
      if (data.ganador === 'Empate') return { xp: 0, ryous: 0, pa: 0 };

      const config = data.config_xp;
      if (!config) return { xp: 0, ryous: 0, pa: 0 };

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
      let xp = 0;
      if (!section) {
        if (isWinner) xp = Number(config.ganar) || 0;
        else xp = Number(config.perder) || 0;
      } else {
        if (diff >= 2) xp = Number(section.mas_2) || 0;
        else if (diff === 1) xp = Number(section.mas_1) || 0;
        else if (diff === 0) xp = Number(section.igual) || 0;
        else if (diff === -1) xp = Number(section.menos_1) || 0;
        else xp = Number(section.menos_2) || 0;
      }

      const pa = RewardLogic.calculateCombatPA(registro, personajeId);

      return { xp, ryous: 0, pa };
    }

    // Misiones o Acciones
    if (tipo === 'mision') {
      if (data.fallida) {
        return {
          xp: Number(data.recompensa_xp_fallida) || 0,
          ryous: Number(data.recompensa_ryous_fallida) || 0,
          pa: Number(data.recompensa_pa_fallida) || 0
        };
      }
      return {
        xp: Number(data.recompensa_xp) || 0,
        ryous: Number(data.recompensa_ryous) || 0,
        pa: Number(data.recompensa_pa) || 0
      };
    }

    return {
      xp: Number(data.recompensa_xp) || 0,
      ryous: Number(data.recompensa_ryous) || 0,
      pa: Number(data.recompensa_pa) || 0
    };
  },

  calculateCombatPA(registro: any, personajeId: number): number {
    const { tipo, data } = registro;
    if (tipo !== 'combate' || !data || data.ganador === 'Empate') return 0;

    const isTeamA = data.equipo_a?.some((p: any) => Number(p.id) === Number(personajeId));
    const isTeamB = data.equipo_b?.some((p: any) => Number(p.id) === Number(personajeId));
    const participant = [...(data.equipo_a || []), ...(data.equipo_b || [])].find((p: any) => Number(p.id) === Number(personajeId));

    // Solo se suma si no huye
    if (!participant || participant.huye) return 0;

    const config = data.config_pa;
    if (!config) return 0;

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

    const section = isWinner ? config.victoria : config.derrota;
    if (!section) return 0;

    if (diff >= 2) return Number(section.mas_2) || 0;
    if (diff === 1) return Number(section.mas_1) || 0;
    if (diff === 0) return Number(section.igual) || 0;
    if (diff === -1) return Number(section.menos_1) || 0;
    return Number(section.menos_2) || 0;
  }
};

export const NinjutsuLogic = {
  validateNinjutsuLimits(
    ramas: any[],
    tecnicas: any[],
    subEspecialidades: any[]
  ): { valid: boolean; error?: string } {
    const ninjutsuRama = ramas.find(r => Number(r.rama_id) === 4);
    if (!ninjutsuRama || !ninjutsuRama.sub_especialidad_id) {
      return { valid: true };
    }

    const sub = subEspecialidades.find(s => Number(s.id) === Number(ninjutsuRama.sub_especialidad_id));
    if (!sub || (sub.slug !== 'ninjutsu-ii' && sub.slug !== 'ninjutsu-iii')) {
      return { valid: true };
    }

    const subSlug = sub.slug;

    // Filter basic Ninjutsu techniques (category_id = 1)
    const basicNinjutsu = tecnicas.filter(t => {
      const info = t.info_glosario || t;
      return info && Number(info.rama_clan_id) === 4 && info.basica === true && Number(info.categoria_id || 1) === 1;
    });

    if (basicNinjutsu.length > 8) {
      return { valid: false, error: "LÍMITE ALCANZADO: El límite máximo de técnicas de Ninjutsu Básico es de 8." };
    }

    const counts: Record<string, number> = { D: 0, C: 0, B: 0, A: 0, S: 0 };
    for (const t of basicNinjutsu) {
      const info = t.info_glosario || t;
      const r = (info.rango || 'D').toUpperCase();
      counts[r] = (counts[r] || 0) + 1;
    }

    if (counts.D > 3) {
      return { valid: false, error: "LÍMITE ALCANZADO: Solo se permiten hasta 3 técnicas de Rango D de Ninjutsu Básico." };
    }
    if (counts.C > 3) {
      return { valid: false, error: "LÍMITE ALCANZADO: Solo se permiten hasta 3 técnicas de Rango C de Ninjutsu Básico." };
    }
    if (counts.B > 2) {
      return { valid: false, error: "LÍMITE ALCANZADO: Solo se permiten hasta 2 técnicas de Rango B de Ninjutsu Básico." };
    }
    if (counts.A > 0 || counts.S > 0) {
      return { valid: false, error: "LÍMITE ALCANZADO: No se permiten técnicas de Rango A o S de Ninjutsu Básico." };
    }

    // Validar restricciones de rango por slot
    for (const t of tecnicas) {
      const info = t.info_glosario || t;
      if (info && info.elemento_id && Number(info.categoria_id || 1) === 1) {
        const elementId = Number(info.elemento_id);
        const rank = (info.rango || 'D').toUpperCase();

        // Elemento secundario: Máximo rango B
        if (ninjutsuRama.elemento_secundario_id && Number(ninjutsuRama.elemento_secundario_id) === elementId) {
          if (rank === 'A' || rank === 'S') {
            return { valid: false, error: `Restricción de Elemento Secundario: La técnica ${info.nombre_es || ('ID ' + info.id)} no puede ser superior a Rango B.` };
          }
        }

        // Elemento terciario: Máximo rango C
        if (subSlug === 'ninjutsu-iii' && ninjutsuRama.elemento_terciario_id && Number(ninjutsuRama.elemento_terciario_id) === elementId) {
          if (rank === 'B' || rank === 'A' || rank === 'S') {
            return { valid: false, error: `Restricción de Elemento Terciario: La técnica ${info.nombre_es || ('ID ' + info.id)} no puede ser superior a Rango C.` };
          }
        }
      }
    }

    return { valid: true };
  }
};
