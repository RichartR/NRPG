/**
 * Calcula los cupos máximos permitidos por clan en función de los cupos máximos de la aldea.
 *
 * Reglas:
 * - Base mínima: 4 cupos.
 * - Con 14 cupos de aldea (base inicial): 4 cupos de clan.
 * - Cada 5 cupos de aldea (alcanzando 15, 20, 25, 30...): se abre +1 cupo de clan.
 *   - 14 cupos -> 4 cupos clan
 *   - 16 cupos (alcanza 15) -> 5 cupos clan
 *   - 18 cupos -> 5 cupos clan
 *   - 20 cupos (alcanza 20) -> 6 cupos clan
 *   - 22 cupos -> 6 cupos clan
 *   - 24 cupos -> 6 cupos clan
 *   - 26 cupos (alcanza 25) -> 7 cupos clan
 */
export function getCuposMaximosClan(cuposAldea: number | string | null | undefined): number {
  const C = Number(cuposAldea) || 14;
  return Math.max(4, 4 + Math.floor((C - 10) / 5));
}
