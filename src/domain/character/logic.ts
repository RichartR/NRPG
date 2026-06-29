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
    subEspecialidades: any[] = [],
    eleccionClan: any = null,
    elementos: any[] = []
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

        // Incluir ramas reales y las de elección del clan
        const playerBranches = [
          ...ramasPersonaje.map(rp => Number(rp.rama_id)),
          ...(eleccionClan?.rama_id ? [Number(eleccionClan.rama_id)] : [])
        ];
        if (eleccionClan?.sub_especialidad_id) {
          const subEsp = subEspecialidades.find((s: any) => s.id === Number(eleccionClan.sub_especialidad_id));
          if (subEsp?.rama_id && !playerBranches.includes(Number(subEsp.rama_id))) {
            playerBranches.push(Number(subEsp.rama_id));
          }
        }

        const playerSubSpecs = [
          ...ramasPersonaje.map(rp => rp.sub_especialidad_id ? Number(rp.sub_especialidad_id) : null).filter(Boolean),
          ...(eleccionClan?.sub_especialidad_id ? [Number(eleccionClan.sub_especialidad_id)] : [])
        ];

        const playerElements = ramasPersonaje.reduce((acc: number[], rp) => {
          if (rp.elemento_principal_id) acc.push(Number(rp.elemento_principal_id));
          if (rp.elemento_secundario_id) acc.push(Number(rp.elemento_secundario_id));
          if (rp.elemento_terciario_id) acc.push(Number(rp.elemento_terciario_id));
          return acc;
        }, []);

        // Mapear elementos de la elección de clan
        if (eleccionClan?.sub_especialidad_id && elementos.length > 0) {
          const sub = subEspecialidades.find((s: any) => s.id === Number(eleccionClan.sub_especial_id || eleccionClan.sub_especialidad_id));
          if (sub) {
            const elem = elementos.find((el: any) => {
              const clean = (s: string) => (s || '').toLowerCase().replace(/uu/g, 'u').trim();
              return clean(sub.slug) === clean(el.nombre_jap) ||
                clean(sub.nombre) === clean(el.nombre_esp) ||
                clean(sub.nombre) === clean(el.nombre_jap);
            });
            if (elem) {
              playerElements.push(Number(elem.id));
            }
          }
        }

        const ninjutsuRama = ramasPersonaje.find(rp => Number(rp.rama_id) === 4);
        let isNinIIorIII = false;
        if (ninjutsuRama && ninjutsuRama.sub_especialidad_id) {
          const sub = subEspecialidades.find((s: any) => Number(s.id) === Number(ninjutsuRama.sub_especialidad_id));
          if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
            isNinIIorIII = true;
          }
        }
        if (!isNinIIorIII && eleccionClan && Number(eleccionClan.rama_id) === 4 && eleccionClan.sub_especialidad_id) {
          const sub = subEspecialidades.find((s: any) => Number(s.id) === Number(eleccionClan.sub_especialidad_id));
          if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
            isNinIIorIII = true;
          }
        }

        let isNinI = false;
        if (ninjutsuRama && ninjutsuRama.sub_especialidad_id) {
          const sub = subEspecialidades.find((s: any) => Number(s.id) === Number(ninjutsuRama.sub_especialidad_id));
          if (sub && sub.slug === 'ninjutsu-i') {
            isNinI = true;
          }
        }
        if (!isNinI && eleccionClan && Number(eleccionClan.rama_id) === 4 && eleccionClan.sub_especialidad_id) {
          const sub = subEspecialidades.find((s: any) => Number(s.id) === Number(eleccionClan.sub_especialidad_id));
          if (sub && sub.slug === 'ninjutsu-i') {
            isNinI = true;
          }
        }

        const clanElementalRama = ramasPersonaje.find(r => {
          const clanInfo = r.info_ramas_clanes || r.info_rama;
          if (!clanInfo) return false;
          let config = clanInfo.config_iniciales;
          if (typeof config === 'string') {
            try {
              config = JSON.parse(config);
            } catch {
              return false;
            }
          }
          return config?.clan_elemental === true;
        });
        const isClanElemental = !!clanElementalRama;

        // A) If isNinIIorIII or has elemental clan, check if they have enough basic techniques of the current rank
        const rankRule = rules[currentRankCheck] as any;
        const reqBasicas = rankRule?.basicas_requeridas || 0;
        if ((isNinIIorIII || (isClanElemental && !isNinI)) && reqBasicas > 0) {
          const playerTechIds = tecnicasPersonaje.map(pt => Number(pt.tecnica_id));

          // Count learned techniques of currentRankCheck that are basic Ninjutsu or from the elemental clan
          const basicCount = glosarioTecnicas.filter(t => {
            const tRank = t.rango || t.requisitos?.rango;
            const rId = Number(t.rama_clan_id);
            const isNinjutsuOrClan = rId === 4 || (clanElementalRama && rId === Number(clanElementalRama.rama_id));
            return t.basica === true && isNinjutsuOrClan && tRank === currentRankCheck && playerTechIds.includes(t.id);
          }).length;


          if (basicCount < reqBasicas) {
            break; // Blocked: doesn't have the required basic techniques
          }
        }

        // Filter master techniques of currentRankCheck that are mandatory for advancement
        const mandatoryTechs = glosarioTecnicas.filter(t => {
          const tRank = t.rango || t.requisitos?.rango;
          const isMandatory = t.obligatoria_ascenso || t.requisitos?.obligatoria_ascenso;
          if (!isMandatory || tRank !== currentRankCheck) return false;

          // If Ninjutsu II/III or elemental clan is active, exclude basic techniques from mandatory check (already validated above)
          const rId = Number(t.rama_clan_id);
          const isNinjutsuOrClan = rId === 4 || (clanElementalRama && rId === Number(clanElementalRama.rama_id));
          if ((isNinIIorIII || (isClanElemental && !isNinI)) && isNinjutsuOrClan && t.basica === true) {
            return false;
          }

          // Check if it belongs to the player's branches/specs/elements.
          // If the technique has no branch, spec, or element, it is general.
          const hasBranch = t.rama_clan_id !== null && t.rama_clan_id !== undefined;
          const hasSubSpec = t.sub_especialidad_id !== null && t.sub_especialidad_id !== undefined;
          const hasElement = t.elemento_id !== null && t.elemento_id !== undefined;

          if (!hasBranch && !hasSubSpec && !hasElement) return true; // General technique of this rank

          if (hasElement) {
            const elId = Number(t.elemento_id);
            if (rId === 4) {
              // Si es técnica de la rama de Ninjutsu, solo es obligatoria para ascender
              // si pertenece a los elementos configurados específicamente en su rama de Ninjutsu (no los del clan elemental).
              const ninjutsuElements: number[] = [];
              if (ninjutsuRama) {
                if (ninjutsuRama.elemento_principal_id) ninjutsuElements.push(Number(ninjutsuRama.elemento_principal_id));
                if (ninjutsuRama.elemento_secundario_id) ninjutsuElements.push(Number(ninjutsuRama.elemento_secundario_id));
                if (ninjutsuRama.elemento_terciario_id) ninjutsuElements.push(Number(ninjutsuRama.elemento_terciario_id));
              }
              if (eleccionClan && Number(eleccionClan.rama_id) === 4) {
                // Si la especialidad viene de elección de clan
                if (clanElementalRama?.elemento_principal_id) {
                  ninjutsuElements.push(Number(clanElementalRama.elemento_principal_id));
                }
              }
              return ninjutsuElements.includes(elId);
            }
            return playerElements.includes(elId);
          }

          if (hasBranch) {
            const ramaId = Number(t.rama_clan_id);
            const hasThisBranch = playerBranches.includes(ramaId);
            if (!hasThisBranch) return false;

            // Find if the character has a subcategory for this branch
            const branchEntry = ramasPersonaje.find(rp => Number(rp.rama_id) === ramaId);
            const clanEntry = (eleccionClan && Number(eleccionClan.rama_id) === ramaId) ? eleccionClan : null;
            const chosenSubId = branchEntry?.sub_especialidad_id || clanEntry?.sub_especialidad_id;

            if (chosenSubId) {
              // Player has a subcategory for this branch. Only count techniques of that subcategory.
              return hasSubSpec && Number(t.sub_especialidad_id) === Number(chosenSubId);
            } else {
              // Player does not have a subcategory for this branch.
              // So they only check the branch itself (techniques that have no subcategory).
              return !hasSubSpec;
            }
          }

          return false;
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
    subEspecialidades: any[],
    eleccionClan: any = null,
    ramaElementos: any[] = []
  ): { valid: boolean; error?: string } {
    const ninjutsuRama = ramas.find(r => Number(r.rama_id) === 4);

    let isNinIIorIIIInBranch = false;
    if (ninjutsuRama && ninjutsuRama.sub_especialidad_id) {
      const sub = subEspecialidades.find(s => Number(s.id) === Number(ninjutsuRama.sub_especialidad_id));
      if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
        isNinIIorIIIInBranch = true;
      }
    }

    let isNinIIorIIIInClan = false;
    if (eleccionClan && Number(eleccionClan.rama_id) === 4 && eleccionClan.sub_especialidad_id) {
      const sub = subEspecialidades.find(s => Number(s.id) === Number(eleccionClan.sub_especialidad_id));
      if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
        isNinIIorIIIInClan = true;
      }
    }

    const clanElementalRama = ramas.find(r => {
      const clanInfo = r.info_ramas_clanes || r.info_rama;
      if (!clanInfo) return false;
      let config = clanInfo.config_iniciales;
      if (typeof config === 'string') {
        try {
          config = JSON.parse(config);
        } catch {
          return false;
        }
      }
      return config?.clan_elemental === true;
    });
    const isClanElemental = !!clanElementalRama;

    if (!isNinIIorIIIInBranch && !isNinIIorIIIInClan && !isClanElemental) {
      return { valid: true };
    }

    // 1. Si el clan es elemental y la otra rama es Ninjutsu, debe ser únicamente Ninjutsu I
    if (isClanElemental && ninjutsuRama) {
      const sub = subEspecialidades.find(s => Number(s.id) === Number(ninjutsuRama.sub_especialidad_id));
      if (sub && sub.slug !== 'ninjutsu-i') {
        return { valid: false, error: "RESTRICCIÓN: Al poseer un clan elemental, la rama de Ninjutsu solo puede tener la especialidad de 'Ninjutsu I (1 Elemento)'." };
      }
    }

    // 2. Extraer los elementos básicos del clan elemental
    let clanBasicElementIds: number[] = [];
    if (isClanElemental && ramaElementos.length > 0 && clanElementalRama) {
      clanBasicElementIds = ramaElementos
        .filter((re: any) => {
          const isFijo = re.tipo === 'fijo';
          const isSameRama = Number(re.rama_id) === Number(clanElementalRama.rama_id);
          const isBasic = re.info_elementos?.tipo === 'basico' || re.elemento_tipo === 'basico';
          return isFijo && isSameRama && isBasic;
        })
        .map((re: any) => Number(re.elemento_id));
    }

    // 3. Validar que el elemento de Ninjutsu I esté entre los básicos del clan elemental
    if (isClanElemental && ninjutsuRama && clanBasicElementIds.length > 0) {
      const ninPrincipalElementId = ninjutsuRama.elemento_principal_id ? Number(ninjutsuRama.elemento_principal_id) : null;
      if (ninPrincipalElementId && !clanBasicElementIds.includes(ninPrincipalElementId)) {
        return { valid: false, error: "RESTRICCIÓN: El elemento principal de Ninjutsu I debe ser uno de los elementos básicos de tu clan elemental." };
      }
    }

    // 4. Validar técnicas avanzadas de Ninjutsu de elementos básicos del clan
    if (isClanElemental && clanBasicElementIds.length > 0) {
      for (const t of tecnicas) {
        const info = t.info_glosario || t;
        if (
          info &&
          (Number(info.rama_clan_id) === 4 || Number(info.categoria_id) === 1) &&
          info.basica !== true &&
          info.elemento_id
        ) {
          const tElementId = Number(info.elemento_id);
          if (clanBasicElementIds.includes(tElementId)) {
            // Debe estar seleccionado como principal en alguna de las ramas (clan o Ninjutsu)
            const isPrincipal = ramas.some(r => Number(r.elemento_principal_id) === tElementId);
            if (!isPrincipal) {
              return {
                valid: false,
                error: `RESTRICCIÓN: Para aprender la técnica avanzada "${info.nombre_es}", debes tener su elemento correspondiente seleccionado como principal.`
              };
            }
          }
        }
      }
    }

    let ninjutsuIElementId: number | null = null;
    if (ninjutsuRama) {
      const sub = subEspecialidades.find(s => Number(s.id) === Number(ninjutsuRama.sub_especialidad_id));
      if (sub && sub.slug === 'ninjutsu-i' && ninjutsuRama.elemento_principal_id) {
        ninjutsuIElementId = Number(ninjutsuRama.elemento_principal_id);
      }
    }

    const isFromClan = !isNinIIorIIIInBranch && isNinIIorIIIInClan;
    const clanIds = ramas.map(r => Number(r.rama_id)).filter(id => id !== 4 && id > 0);

    // Filter basic techniques
    const basicNinjutsu = tecnicas.filter(t => {
      const info = t.info_glosario || t;
      if (!info || info.basica !== true || Number(info.categoria_id || 1) !== 1) return false;

      // Excluir técnicas del elemento de Ninjutsu I del conteo para límites del clan elemental
      if (isClanElemental && !isNinIIorIIIInBranch && !isNinIIorIIIInClan && ninjutsuIElementId !== null) {
        if (Number(info.elemento_id) === ninjutsuIElementId) {
          return false;
        }
      }

      const rId = Number(info.rama_clan_id);
      return rId === 4;
    });

    let limitTotal = isFromClan ? 6 : 8;
    let maxD = 3;
    let maxC = isFromClan ? 2 : 3;
    let maxB = isFromClan ? 1 : 2;

    if (isClanElemental && !isNinIIorIIIInBranch && !isNinIIorIIIInClan) {
      const clanInfo = clanElementalRama.info_ramas_clanes || clanElementalRama.info_rama;
      const clanSlug = clanInfo?.slug || '';

      limitTotal = 5;
      maxD = 3;

      if (clanSlug === 'kekkei-genkai-yoton-kasai') {
        maxC = 1;
        maxB = 1;
      } else {
        // Por defecto o Ranton (kekkei-genkai-ranton-reiza)
        maxC = 2;
        maxB = 0;
      }
    }

    const clanInfo = clanElementalRama ? (clanElementalRama.info_ramas_clanes || clanElementalRama.info_rama || clanElementalRama) : null;
    const clanName = clanInfo?.nombre || "Clan";

    const counts: Record<string, number> = { D: 0, C: 0, B: 0, A: 0, S: 0 };
    for (const t of basicNinjutsu) {
      const info = t.info_glosario || t;
      let req = info.requisitos;
      if (typeof req === 'string') {
        try { req = JSON.parse(req); } catch {}
      }
      const r = (info.rango || req?.rango || 'D').toUpperCase();
      counts[r] = (counts[r] || 0) + 1;
    }

    const targetStr = isClanElemental && !isNinIIorIIIInBranch && !isNinIIorIIIInClan
      ? `para el ${clanName}`
      : "de Ninjutsu Básico";

    if (counts.D > maxD) {
      return { valid: false, error: `LÍMITE ALCANZADO: Solo se permiten hasta ${maxD} técnicas de Rango D ${targetStr}.` };
    }
    if (counts.C > maxC) {
      return { valid: false, error: `LÍMITE ALCANZADO: Solo se permiten hasta ${maxC} técnicas de Rango C ${targetStr}.` };
    }
    if (counts.B > maxB) {
      return { valid: false, error: `LÍMITE ALCANZADO: Solo se permiten hasta ${maxB} técnicas de Rango B ${targetStr}.` };
    }
    if (counts.A > 0 || counts.S > 0) {
      return { valid: false, error: `LÍMITE ALCANZADO: No se permiten técnicas de Rango A o S ${targetStr}.` };
    }

    if (basicNinjutsu.length > limitTotal) {
      const bandoStr = isClanElemental && !isNinIIorIIIInBranch && !isNinIIorIIIInClan
        ? `para el ${clanName}`
        : isFromClan
          ? "para el Clan"
          : "de Ninjutsu Básico";
      return { valid: false, error: `LÍMITE ALCANZADO: El límite máximo de técnicas de Ninjutsu Básico es de ${limitTotal} ${bandoStr}.` };
    }

    // Validar restricciones de rango por slot
    for (const t of tecnicas) {
      const info = t.info_glosario || t;
      if (info && info.elemento_id && Number(info.categoria_id || 1) === 1) {
        const elementId = Number(info.elemento_id);
        let req = info.requisitos;
        if (typeof req === 'string') {
          try { req = JSON.parse(req); } catch {}
        }
        const rank = (info.rango || req?.rango || 'D').toUpperCase();

        if (ninjutsuRama) {
          // Elemento secundario: Máximo rango B
          if (ninjutsuRama.elemento_secundario_id && Number(ninjutsuRama.elemento_secundario_id) === elementId) {
            if (rank === 'A' || rank === 'S') {
              return { valid: false, error: `Restricción de Elemento Secundario: La técnica ${info.nombre_es || ('ID ' + info.id)} no puede ser superior a Rango B.` };
            }
          }

          // Elemento terciario: Máximo rango C
          // Obtenemos el slug de la subespecialidad activa
          const activeSubId = isNinIIorIIIInClan ? eleccionClan.sub_especialidad_id : ninjutsuRama.sub_especialidad_id;
          const activeSub = subEspecialidades.find(s => Number(s.id) === Number(activeSubId));
          const activeSlug = activeSub?.slug || '';

          if (activeSlug === 'ninjutsu-iii' && ninjutsuRama.elemento_terciario_id && Number(ninjutsuRama.elemento_terciario_id) === elementId) {
            if (rank === 'B' || rank === 'A' || rank === 'S') {
              return { valid: false, error: `Restricción de Elemento Terciario: La técnica ${info.nombre_es || ('ID ' + info.id)} no puede ser superior a Rango C.` };
            }
          }
        }
      }
    }

    return { valid: true };
  }
};
