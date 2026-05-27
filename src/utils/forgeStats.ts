export const STAT_MIN = 40
export const STAT_MAX = 99

export function clampStat(val: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, val))
}

/** How much room remains before hitting the stat cap. */
export function statHeadroom(base: number): number {
  return Math.max(0, STAT_MAX - base)
}

/** Add a flat bonus, never exceeding the cap. */
export function applyStatBonus(base: number, bonus: number): number {
  if (bonus <= 0) return clampStat(base + bonus)
  return clampStat(base + Math.min(bonus, statHeadroom(base)))
}

/** Apply a signed delta (bonuses respect headroom; penalties do not). */
export function applyStatDelta(base: number, delta: number): number {
  return delta >= 0 ? applyStatBonus(base, delta) : clampStat(base + delta)
}

/** Multiplier boost capped by remaining headroom — prevents trivial 99s from high bases. */
export function applyMultBoost(base: number, mult: number): number {
  const maxVal = base + statHeadroom(base)
  return clampStat(Math.min(Math.round(base * mult), maxVal))
}
