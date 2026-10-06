import { describe, it, expect } from 'vitest';
import { StatsLogic, RewardLogic, NinjutsuLogic } from './logic';
import { CharacterStats, AtributosDerivados, StatsEscaladoConfig, RangoRules } from '../types';

describe('StatsLogic', () => {
  const baseRules = {
    min: 0,
    max: 50,
    stat_max: 20,
    puntos_totales: 50,
    vit_base: 500,
    ch_base: 100,
    vel_base: 2
  };

  const escalado: StatsEscaladoConfig = {
    fue_a_vit: 15,
    est_a_ch: 10,
    agi_a_vel_factor: 10
  };

  describe('calculateDerivedStats', () => {
    it('calculates derived stats correctly based on attributes and scaling rules', () => {
      const stats: CharacterStats = {
        NIN: 5,
        GEN: 5,
        TAI: 5,
        SM: 0,
        FUE: 10,
        AGI: 25,
        EST: 20,
        INT: 40
      };

      const derived: AtributosDerivados = StatsLogic.calculateDerivedStats(stats, baseRules, escalado);

      // VIT = vit_base (500) + FUE (10) * fue_a_vit (15) = 650
      expect(derived.VIT).toBe(650);
      // CH = ch_base (100) + EST (20) * est_a_ch (10) = 300
      expect(derived.CH).toBe(300);
      // VEL = vel_base (2) + Math.floor(AGI (25) / agi_a_vel_factor (10)) = 2 + 2 = 4
      expect(derived.VEL).toBe(4);
      // RES = Math.floor(EST (20) / 5) = 4
      expect(derived.RES).toBe(4);
      // VR = 1 + Math.floor(EST (20) / 20) = 1 + 1 = 2
      expect(derived.VR).toBe(2);
      // DET = 1 + Math.floor(INT (40) / 20) = 1 + 2 = 3
      expect(derived.DET).toBe(3);
    });

    it('handles zero stats gracefully', () => {
      const stats: CharacterStats = {
        NIN: 0,
        GEN: 0,
        TAI: 0,
        SM: 0,
        FUE: 0,
        AGI: 0,
        EST: 0,
        INT: 0
      };

      const derived = StatsLogic.calculateDerivedStats(stats, baseRules, escalado);

      expect(derived.VIT).toBe(500);
      expect(derived.CH).toBe(100);
      expect(derived.VEL).toBe(2);
      expect(derived.RES).toBe(0);
      expect(derived.VR).toBe(1);
      expect(derived.DET).toBe(1);
    });
  });

  describe('validateStatChange', () => {
    const rules: RangoRules = {
      D: {
        min: 0,
        max: 50,
        stat_max: 20,
        puntos_totales: 50,
        vit_base: 500,
        ch_base: 100,
        vel_base: 2,
        limites: { '15': 2 }
      }
    };

    const currentStats: CharacterStats = {
      NIN: 10,
      GEN: 5,
      TAI: 5,
      SM: 1,
      FUE: 5,
      AGI: 5,
      EST: 5,
      INT: 5
    };

    it('returns error for invalid rank', () => {
      const result = StatsLogic.validateStatChange('NIN', 12, currentStats, 'INVALID', 50, rules);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Rango no válido');
    });

    it('returns error when new value is less than 1', () => {
      const result = StatsLogic.validateStatChange('NIN', 0, currentStats, 'D', 50, rules);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('mínimo para cualquier estadística es 1');
    });

    it('returns error when exceeding stat_max for current rank', () => {
      const result = StatsLogic.validateStatChange('NIN', 25, currentStats, 'D', 50, rules);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('máximo para tu rango es 20');
    });

    it('returns error when total points exceed available pool', () => {
      // current other stats sum = 26; newValue = 30; 26 + 30 = 56 > 50
      const result = StatsLogic.validateStatChange('NIN', 20, currentStats, 'D', 35, rules);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('No tienes suficientes puntos');
    });

    it('returns error when exceeding rank tier limits (e.g. maximum stats >= threshold)', () => {
      // Rules allow at most 2 stats >= 15
      const highStats: CharacterStats = {
        NIN: 15,
        GEN: 15,
        TAI: 5,
        SM: 1,
        FUE: 5,
        AGI: 5,
        EST: 5,
        INT: 5
      };
      // Changing TAI to 16 would make 3 stats >= 15
      const result = StatsLogic.validateStatChange('TAI', 16, highStats, 'D', 100, rules);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('LÍMITE ALCANZADO');
    });

    it('approves valid stat change within limits', () => {
      const result = StatsLogic.validateStatChange('NIN', 14, currentStats, 'D', 50, rules);
      expect(result.valid).toBe(true);
    });
  });

  describe('calculateAutoRank', () => {
    const rules: RangoRules = {
      D: { min: 0, max: 50, stat_max: 20, puntos_totales: 50, vit_base: 500, ch_base: 100, vel_base: 2 },
      C: { min: 50, max: 100, stat_max: 30, puntos_totales: 100, vit_base: 700, ch_base: 200, vel_base: 3 },
      B: { min: 100, max: 150, stat_max: 40, puntos_totales: 150, vit_base: 900, ch_base: 300, vel_base: 4 }
    };

    it('returns D if stat points do not reach C threshold', () => {
      const rank = StatsLogic.calculateAutoRank(30, rules);
      expect(rank).toBe('D');
    });

    it('advances to C if stat points reach 50 and no mandatory blockers exist', () => {
      const rank = StatsLogic.calculateAutoRank(50, rules);
      expect(rank).toBe('C');
    });

    it('advances to B if stat points reach 100 and no mandatory blockers exist', () => {
      const rank = StatsLogic.calculateAutoRank(120, rules);
      expect(rank).toBe('B');
    });

    it('blocks promotion if mandatory technique for current rank is not possessed', () => {
      const glosario = [
        { id: 101, rango: 'D', obligatoria_ascenso: true }
      ];
      const playerTechs: any[] = []; // Character does not possess tech 101

      const rank = StatsLogic.calculateAutoRank(60, rules, playerTechs, [], glosario);
      expect(rank).toBe('D'); // Blocked at D
    });

    it('allows promotion when mandatory technique is learned', () => {
      const glosario = [
        { id: 101, rango: 'D', obligatoria_ascenso: true }
      ];
      const playerTechs = [{ tecnica_id: 101 }];

      const rank = StatsLogic.calculateAutoRank(60, rules, playerTechs, [], glosario);
      expect(rank).toBe('C');
    });
  });
});

describe('RewardLogic', () => {
  describe('applyExpLimit', () => {
    it('returns full exp when below cap limit', () => {
      const result = RewardLogic.applyExpLimit(50, 100, 200);
      expect(result.effectiveExp).toBe(50);
      expect(result.discardedExp).toBe(0);
    });

    it('caps exp when reaching limit and calculates discarded exp', () => {
      const result = RewardLogic.applyExpLimit(100, 150, 200);
      expect(result.effectiveExp).toBe(50);
      expect(result.discardedExp).toBe(50);
    });

    it('discards all exp when already at or above cap', () => {
      const result = RewardLogic.applyExpLimit(50, 200, 200);
      expect(result.effectiveExp).toBe(0);
      expect(result.discardedExp).toBe(50);
    });

    it('returns raw amount when no limit is defined', () => {
      const result = RewardLogic.applyExpLimit(50, 100, null);
      expect(result.effectiveExp).toBe(50);
      expect(result.discardedExp).toBe(0);
    });

    it('handles negative or zero rawExp safely', () => {
      const result = RewardLogic.applyExpLimit(0, 10, 100);
      expect(result.effectiveExp).toBe(0);
      expect(result.discardedExp).toBe(0);
    });
  });

  describe('applyPaLimit', () => {
    it('applies PA limit correctly when reaching threshold', () => {
      const result = RewardLogic.applyPaLimit(20, 90, 100);
      expect(result.effectivePa).toBe(10);
      expect(result.discardedPa).toBe(10);
    });

    it('allows full PA if limit is not exceeded', () => {
      const result = RewardLogic.applyPaLimit(10, 50, 100);
      expect(result.effectivePa).toBe(10);
      expect(result.discardedPa).toBe(0);
    });

    it('discards all PA if current total is at or above limit', () => {
      const result = RewardLogic.applyPaLimit(5, 100, 100);
      expect(result.effectivePa).toBe(0);
      expect(result.discardedPa).toBe(5);
    });
  });

  describe('calculateBoostedReward', () => {
    const tiers = [
      { porcentaje: 50, multiplicador: 2 },
      { porcentaje: 80, multiplicador: 1.5 }
    ];

    it('applies boost multiplier when below lowest tier threshold', () => {
      const boosted = RewardLogic.calculateBoostedReward(10, 40, 200, tiers);
      expect(boosted).toBe(20);
    });

    it('applies second tier multiplier when between tiers', () => {
      const boosted = RewardLogic.calculateBoostedReward(10, 120, 200, tiers);
      expect(boosted).toBe(15);
    });

    it('returns raw amount when above all tier thresholds', () => {
      const boosted = RewardLogic.calculateBoostedReward(10, 180, 200, tiers);
      expect(boosted).toBe(10);
    });

    it('returns raw amount when config is null or undefined', () => {
      expect(RewardLogic.calculateBoostedReward(10, 10, 100, null)).toBe(10);
      expect(RewardLogic.calculateBoostedReward(10, 10, 100, undefined)).toBe(10);
    });
  });

  describe('calculateReward', () => {
    it('calculates event rewards correctly including participant extras', () => {
      const registro = {
        subtipo: 'evento_premios',
        data: {
          global_xp: 30,
          global_ryous: 1000,
          global_pa: 2,
          participantes_premios: [
            { personaje_id: 1, xp_extra: 10, ryous_extra: 500, pa_extra: 1 },
            { personaje_id: 2, xp_extra: 0, ryous_extra: 0, pa_extra: 0 }
          ]
        }
      };

      const reward1 = RewardLogic.calculateReward(registro, 1);
      expect(reward1).toEqual({ xp: 40, ryous: 1500, pa: 3 });

      const reward2 = RewardLogic.calculateReward(registro, 2);
      expect(reward2).toEqual({ xp: 30, ryous: 1000, pa: 2 });
    });

    it('calculates healing rewards: zero if healing self, gives exp if healing others', () => {
      const healSelf = {
        subtipo: 'sanacion',
        data: {
          sanado: { id: 1 },
          exp_cura: 5
        }
      };
      expect(RewardLogic.calculateReward(healSelf, 1)).toEqual({ xp: 0, ryous: 0, pa: 0 });

      const healOther = {
        subtipo: 'sanacion',
        data: {
          sanado: { id: 2 },
          exp_cura: 5,
          medicos: [{ id: 1 }]
        }
      };
      expect(RewardLogic.calculateReward(healOther, 1)).toEqual({ xp: 5, ryous: 0, pa: 0 });
    });

    it('calculates mission rewards: success vs failure', () => {
      const successMission = {
        tipo: 'mision',
        data: {
          recompensa_xp: 50,
          recompensa_ryous: 2000,
          recompensa_pa: 2
        }
      };
      expect(RewardLogic.calculateReward(successMission, 1)).toEqual({
        xp: 50,
        ryous: 2000,
        pa: 2
      });

      const failedMission = {
        tipo: 'mision',
        data: {
          fallida: true,
          recompensa_xp_fallida: 15,
          recompensa_ryous_fallida: 500,
          recompensa_pa_fallida: 0
        }
      };
      expect(RewardLogic.calculateReward(failedMission, 1)).toEqual({
        xp: 15,
        ryous: 500,
        pa: 0
      });
    });

    it('calculates combat rewards: zero if fled, calculates victory xp and combat PA', () => {
      const combatFled = {
        tipo: 'combate',
        data: {
          equipo_a: [{ id: 1, huye: true, huye_gana_exp: false, rango: 'D' }],
          equipo_b: [{ id: 2, rango: 'D' }],
          ganador: 'B',
          config_xp: { victoria: { igual: 30 }, derrota: { igual: 10 } }
        }
      };
      expect(RewardLogic.calculateReward(combatFled, 1)).toEqual({ xp: 0, ryous: 0, pa: 0 });

      const combatWon = {
        tipo: 'combate',
        fecha: '2026-09-01T00:00:00Z',
        data: {
          equipo_a: [{ id: 1, rango: 'D' }],
          equipo_b: [{ id: 2, rango: 'D' }],
          ganador: 'A',
          config_xp: { victoria: { igual: 40 }, derrota: { igual: 10 } },
          config_pa: { victoria: { igual: 2 }, derrota: { igual: 0 } }
        }
      };
      const result = RewardLogic.calculateReward(combatWon, 1);
      expect(result.xp).toBe(40);
      expect(result.pa).toBe(2);
      expect(result.ryous).toBe(0);
    });

    it('applies outnumbered bonus multiplier in post-rule combat victories', () => {
      const combatOutnumbered = {
        tipo: 'combate',
        fecha: '2026-09-10T00:00:00Z', // post numerical diff rule
        data: {
          equipo_a: [{ id: 1, rango: 'D' }], // 1 player
          equipo_b: [{ id: 2, rango: 'D' }, { id: 3, rango: 'D' }], // 2 players (diff = 1)
          ganador: 'A',
          config_xp: { victoria: { igual: 20 }, derrota: { igual: 5 } },
          config_pa: { victoria: { igual: 1 } }
        }
      };
      // xp = 20 * (1 + 0.5 * 1) = 30
      const res = RewardLogic.calculateReward(combatOutnumbered, 1);
      expect(res.xp).toBe(30);
    });
  });
});

describe('NinjutsuLogic', () => {
  it('returns valid when character has standard branches without elemental restrictions', () => {
    const ramas = [{ rama_id: 1 }]; // Taijutsu
    const tecnicas: any[] = [];
    const subEspecialidades: any[] = [];

    const result = NinjutsuLogic.validateNinjutsuLimits(ramas, tecnicas, subEspecialidades);
    expect(result.valid).toBe(true);
  });

  it('restricts elemental clan to only Ninjutsu I specialization', () => {
    const ramas = [
      {
        rama_id: 4,
        sub_especialidad_id: 402,
        info_ramas_clanes: { config_iniciales: JSON.stringify({ clan_elemental: true }) }
      }
    ];
    const subEspecialidades = [
      { id: 402, slug: 'ninjutsu-ii' }
    ];

    const result = NinjutsuLogic.validateNinjutsuLimits(ramas, [], subEspecialidades);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Ninjutsu solo puede tener la especialidad de 'Ninjutsu I (1 Elemento)'");
  });

  it('rejects basic ninjutsu exceeding maximum allowed counts per rank', () => {
    const ramas = [{ rama_id: 4, sub_especialidad_id: 401 }];
    const subEspecialidades = [{ id: 401, slug: 'ninjutsu-ii' }];
    // Create 4 basic D rank techniques (max is 3)
    const tecnicas = [
      { id: 1, rama_clan_id: 4, elemento_id: 1, basica: true, rango: 'D', categoria_id: 1 },
      { id: 2, rama_clan_id: 4, elemento_id: 1, basica: true, rango: 'D', categoria_id: 1 },
      { id: 3, rama_clan_id: 4, elemento_id: 1, basica: true, rango: 'D', categoria_id: 1 },
      { id: 4, rama_clan_id: 4, elemento_id: 1, basica: true, rango: 'D', categoria_id: 1 }
    ];

    const result = NinjutsuLogic.validateNinjutsuLimits(ramas, tecnicas, subEspecialidades);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Solo se permiten hasta 3 técnicas de Rango D');
  });

  it('strictly forbids Rank A or S basic ninjutsu', () => {
    const ramas = [{ rama_id: 4, sub_especialidad_id: 401 }];
    const subEspecialidades = [{ id: 401, slug: 'ninjutsu-ii' }];
    const tecnicas = [
      { id: 1, rama_clan_id: 4, elemento_id: 1, basica: true, rango: 'A', categoria_id: 1 }
    ];

    const result = NinjutsuLogic.validateNinjutsuLimits(ramas, tecnicas, subEspecialidades);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No se permiten técnicas de Rango A o S');
  });

  it('restricts secondary element techniques to Rank B maximum', () => {
    const ramas = [
      {
        rama_id: 4,
        sub_especialidad_id: 401,
        elemento_principal_id: 1,
        elemento_secundario_id: 2
      }
    ];
    const subEspecialidades = [{ id: 401, slug: 'ninjutsu-ii' }];
    // Learning Rank A technique of secondary element (id 2) is forbidden
    const tecnicas = [
      { id: 50, nombre_es: 'Chidori Nagashi', elemento_id: 2, rango: 'A', categoria_id: 1 }
    ];

    const result = NinjutsuLogic.validateNinjutsuLimits(ramas, tecnicas, subEspecialidades);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Restricción de Elemento Secundario');
  });

  it('restricts tertiary element techniques in Ninjutsu III to Rank C maximum', () => {
    const ramas = [
      {
        rama_id: 4,
        sub_especialidad_id: 403,
        elemento_principal_id: 1,
        elemento_secundario_id: 2,
        elemento_terciario_id: 3
      }
    ];
    const subEspecialidades = [{ id: 403, slug: 'ninjutsu-iii' }];
    // Learning Rank B technique of tertiary element (id 3) is forbidden
    const tecnicas = [
      { id: 80, nombre_es: 'Karyu Endan', elemento_id: 3, rango: 'B', categoria_id: 1 }
    ];

    const result = NinjutsuLogic.validateNinjutsuLimits(ramas, tecnicas, subEspecialidades);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Restricción de Elemento Terciario');
  });
});
