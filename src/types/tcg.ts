// ─────────────────────────────────────────────────────────────────────────────
//  FutBattles  ·  Soccer TCG  ·  Type definitions
// ─────────────────────────────────────────────────────────────────────────────

export type TCGAspect =
  | 'Pressing'   // Red   — high press, counter-attack, aggression
  | 'Precision'  // Blue  — possession, passing, technical
  | 'Physical'   // Orange — strength, direct play, aerial
  | 'Tactical'   // Purple — shape, formation, positioning
  | 'Star Power' // Gold  — individual brilliance, flair
  | 'Pace'       // Green — speed, transitions, wide play

export const TCG_ASPECTS: TCGAspect[] = [
  'Pressing', 'Precision', 'Physical', 'Tactical', 'Star Power', 'Pace',
]

export const ASPECT_COLORS: Record<TCGAspect, { bg: string; glow: string; text: string }> = {
  'Pressing':   { bg: '#c0182b', glow: 'rgba(220,40,60,0.65)',   text: '#ff8095' },
  'Precision':  { bg: '#1254c0', glow: 'rgba(40,100,240,0.65)',  text: '#7db4ff' },
  'Physical':   { bg: '#b05010', glow: 'rgba(210,110,30,0.65)',  text: '#ffb060' },
  'Tactical':   { bg: '#6020b8', glow: 'rgba(140,50,230,0.65)', text: '#d090ff' },
  'Star Power': { bg: '#a07800', glow: 'rgba(220,180,0,0.65)',  text: '#ffe060' },
  'Pace':       { bg: '#0a7840', glow: 'rgba(20,190,90,0.65)',  text: '#50ffaa' },
}

export type TCGCardType = 'Player' | 'Manager' | 'Stadium' | 'Tactic' | 'Upgrade'

export const TCG_CARD_TYPES: TCGCardType[] = [
  'Manager', 'Stadium', 'Player', 'Tactic', 'Upgrade',
]

export type TCGPosition =
  | 'ST' | 'CF' | 'LW' | 'RW'
  | 'CAM' | 'CM' | 'CDM' | 'LM' | 'RM'
  | 'LB' | 'RB' | 'CB' | 'LWB' | 'RWB'
  | 'GK'

// ── Base card ────────────────────────────────────────────────────────────────
interface TCGCardBase {
  id: string
  name: string
  type: TCGCardType
  aspects: [TCGAspect] | [TCGAspect, TCGAspect]  // 1 or 2 aspects
  cost: number                                     // action cost to play
  ability: string                                  // rules text
  flavorText?: string                              // italic quote
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary'
  setCode: string                                  // e.g. "FB-01"
  cardNumber: number
  emoji: string                                    // used as art placeholder
}

// ── Player ───────────────────────────────────────────────────────────────────
export interface TCGPlayerCard extends TCGCardBase {
  type: 'Player'
  position: TCGPosition
  nationality: string
  club: string
  atk: number   // attack power (1–12)
  def: number   // defense power (1–12)
  hp: number    // hit points (1–10)
}

// ── Manager (Leader equivalent) ──────────────────────────────────────────────
export interface TCGManagerCard extends TCGCardBase {
  type: 'Manager'
  nationality: string
  leaderAbility: string   // passive bonus while on the bench
  epicAction: string      // once-per-game activated ability
}

// ── Stadium (Base equivalent) ────────────────────────────────────────────────
export interface TCGStadiumCard extends TCGCardBase {
  type: 'Stadium'
  hp: number        // base hit points (20–35)
  capacity: string  // flavour — "80,000 seats" style
  passiveAbility: string
}

// ── Tactic (Event equivalent) ────────────────────────────────────────────────
export interface TCGTacticCard extends TCGCardBase {
  type: 'Tactic'
}

// ── Upgrade ──────────────────────────────────────────────────────────────────
export interface TCGUpgradeCard extends TCGCardBase {
  type: 'Upgrade'
  attachRestriction?: string  // e.g. "Attach to a Player with Pace aspect"
}

// ── Union ────────────────────────────────────────────────────────────────────
export type TCGCard =
  | TCGPlayerCard
  | TCGManagerCard
  | TCGStadiumCard
  | TCGTacticCard
  | TCGUpgradeCard

// ── Deck ─────────────────────────────────────────────────────────────────────
export interface TCGDeck {
  id: string
  name: string
  manager: string  // card id
  stadium: string  // card id
  cards: string[]  // up to 48 card ids (max 3 copies of any single card)
  aspects: [TCGAspect] | [TCGAspect, TCGAspect]
  createdAt: number
}
