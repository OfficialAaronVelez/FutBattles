// Chemistry system: players from the same club/nation gain stat boosts
// when placed adjacent to each other in the formation.

import type { FormationSlot, StatKey, UserCard } from '../types'

function adjacent(a: FormationSlot, b: FormationSlot): boolean {
  return (
    Math.abs(a.row - b.row) <= 1 &&
    Math.abs(a.col - b.col) <= 1 &&
    !(a.row === b.row && a.col === b.col)
  )
}

export interface ChemLink {
  slotA: string
  slotB: string
  type: 'club' | 'nation'
}

/** Find all chemistry links between adjacent filled slots */
export function getChemLinks(slots: FormationSlot[]): ChemLink[] {
  const filled = slots.filter(s => s.card)
  const links: ChemLink[] = []

  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      const a = filled[i], b = filled[j]
      if (!adjacent(a, b)) continue

      const cA = a.card!.clubAffinity,   cB = b.card!.clubAffinity
      const nA = a.card!.nationAffinity, nB = b.card!.nationAffinity

      if (cA && cB && cA === cB) {
        links.push({ slotA: a.id, slotB: b.id, type: 'club' })
      } else if (nA && nB && nA === nB) {
        links.push({ slotA: a.id, slotB: b.id, type: 'nation' })
      }
    }
  }

  return links
}

/** Chemistry score for one slot (0–10) */
export function getSlotChemScore(slotId: string, links: ChemLink[]): number {
  let score = 0
  for (const link of links) {
    if (link.slotA === slotId || link.slotB === slotId) {
      score += link.type === 'club' ? 3 : 1
    }
  }
  return Math.min(score, 10)
}

/** Stat boost per point of chemistry score */
export function chemToBoost(score: number): number {
  if (score >= 8) return 5
  if (score >= 5) return 3
  if (score >= 3) return 2
  if (score >= 1) return 1
  return 0
}

/** Display colour for a chemistry score */
export function chemToColor(score: number): string {
  if (score >= 8) return '#44ff9e'
  if (score >= 5) return '#ffd700'
  if (score >= 2) return '#ff9a3c'
  return 'rgba(255,255,255,0.15)'
}

/** Apply chemistry boost to a UserCard's stats (returns new card, does not mutate) */
export function applyChemBoost(card: UserCard, boost: number): UserCard {
  if (boost === 0) return card
  const boosted: Partial<Record<StatKey, number>> = {}
  for (const [k, v] of Object.entries(card.stats)) {
    if (typeof v === 'number') boosted[k as StatKey] = Math.min(99, v + boost)
  }
  return { ...card, stats: boosted }
}
