export type CardCosmetic = 'base' | 'neon' | 'fire' | 'ice' | 'chrome' | 'shadow'

export type StatKey = 'PAC' | 'SHO' | 'PAS' | 'DRI' | 'DEF' | 'PHY'
export const STAT_KEYS: StatKey[] = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY']

export type MiniGameType =
  | 'normal' | 'slots' | 'minefield' | 'push'
  | 'double-or-nothing' | 'pressure-drop' | 'heist' | 'phantom'

export const MINI_GAMES: MiniGameType[] = [
  'normal', 'slots', 'minefield', 'push', 'double-or-nothing', 'pressure-drop', 'heist', 'phantom',
]

export type Position =
  | 'ST' | 'CF' | 'LW' | 'RW'
  | 'CAM' | 'CM' | 'CDM' | 'LM' | 'RM'
  | 'LB' | 'RB' | 'CB' | 'LWB' | 'RWB'

export const POSITIONS: Position[] = [
  'ST', 'CF', 'LW', 'RW',
  'CAM', 'CM', 'CDM', 'LM', 'RM',
  'LB', 'RB', 'CB', 'LWB', 'RWB',
]

export type PlayerStats = Record<StatKey, number>

export type PackRarity = 'bronze' | 'silver' | 'gold' | 'icon'

export interface RealPlayer {
  id: string
  name: string
  club: string
  nation: string
  position: Position
  overall: number
  stats: PlayerStats
  wikiTitle?: string  // Wikipedia article title for thumbnail lookup
}

export interface UserCard {
  id: string
  name: string
  position: Position | null
  stats: Partial<PlayerStats>
  cosmetic: CardCosmetic
  createdAt: number
  clubAffinity?: string    // club of the real player who donated the position
  nationAffinity?: string  // nation of the real player who donated the position
  imageUrl?: string        // custom portrait uploaded at forge time
}

export interface PackCard {
  realPlayer: RealPlayer
  isBonus: boolean
  cosmeticOffer?: CardCosmetic
}

export type LockedSlot = {
  stat: StatKey
  value: number
  fromPlayer: string
}

export type LockedPosition = {
  position: Position
  fromPlayer: string
}

export interface PackOpeningState {
  packCards: PackCard[]
  currentCardIndex: number
  lockedStats: Partial<Record<StatKey, LockedSlot>>
  lockedPosition: LockedPosition | null
  lockedCosmetic: CardCosmetic | null
  playerName: string
  rarity: PackRarity
  phase: 'intro' | 'opening' | 'done'
  /** Coins paid when opening this pack. 0 for free/tutorial packs. Used for refund on cancel. */
  costPaid: number
  miniGames: MiniGameType[]
}

export interface BattleRecord {
  id: string
  date: number
  result: 'win' | 'loss' | 'draw'
  playerGoals: number
  aiGoals: number
  formation: string   // stored as display string; Formation7v7 values may change across versions
  coinsEarned: number
}

// --- Battle types ---

// Formation names are DEF-MID-ATK, 7 outfield players (no GK)
export type Formation7v7 = '3-2-2' | '2-3-2' | '3-3-1' | '1-3-3' | '2-4-1'

export type TacticType = 'press' | 'counter' | 'park' | 'balanced'

export type TraitType = 'clinical' | 'engine' | 'brick-wall' | 'speedster' | 'enforcer'
export interface CardTrait { type: TraitType; label: string }

export const FORMATIONS: Formation7v7[] = ['3-2-2', '2-3-2', '3-3-1', '1-3-3', '2-4-1']

export interface FormationSlot {
  id: string
  label: Position
  row: number   // 1=DEF (bottom display), 2=MID, 3=ATT (top display)
  col: number   // 0=left, 1=center, 2=right
  card: UserCard | null
}

export interface Team7v7 {
  formation: Formation7v7
  slots: FormationSlot[]
}

// The PAS duel that opens every round
export interface CreateDuel {
  playerName: string;  playerPas: number;  playerRoll: number
  aiName:     string;  aiPas:     number;  aiRoll:     number
  playerWon:  boolean
}

export interface RollBreakdownEntry { label: string; value: number }

export interface BattleMatchup {
  attacker: {
    name:       string
    pac:        number
    sho:        number
    dri:        number
    oopPenalty: number   // % stat reduction applied (0 = in-position)
    chemBonus:  number   // flat bonus from club/nation chemistry
  }
  defender: { name: string; def: number; phy: number }
  lastMan:  { name: string; def: number; phy: number }   // second line of defence (no GK)
  createDuel:   CreateDuel | null   // null on AI attack (shared from player side)
  attackerRoll: number
  defenderRoll: number
  lastManRoll:  number
  shotRoll:     number   // actual shot roll vs last man (separate random from attackerRoll)
  scored:       boolean
  traitFired?:  string | null   // trait effect label if a trait fired this matchup
  tacticNote?:  string | null   // tactic effect description
  // Full breakdown of how each roll was calculated
  atkBreakdown: { statBase: number; bonuses: RollBreakdownEntry[]; dice: number }
  defBreakdown: { statBase: number; bonuses: RollBreakdownEntry[]; dice: number }
  lmBreakdown:  { statBase: number; bonuses: RollBreakdownEntry[]; dice: number } | null
  shotBreakdown:{ statBase: number; bonuses: RollBreakdownEntry[]; dice: number } | null
}

export interface BattleRound {
  roundNum:      number
  playerAttack:  BattleMatchup
  aiAttack:      BattleMatchup
  playerScored:  boolean
  aiScored:      boolean
  momentumAfter: { player: number; ai: number }
}

export interface BattleResult {
  rounds:           BattleRound[]
  playerGoals:      number
  aiGoals:          number
  winner:           'player' | 'ai' | 'draw'
  manOfMatch:       string | null
  performanceCoins: number
  streakMultiplier: number
}

export type BattlePhase = 'team-select' | 'round-pick' | 'battling' | 'result'

export interface ActiveBattle {
  phase:           BattlePhase
  playerTeam:      Team7v7 | null
  aiPlayers:       RealPlayer[]
  aiFormation:     Formation7v7
  result:          BattleResult | null
  // Round tracking (populated by runBattle, updated by confirmBattleRound / advanceBattleRound)
  currentRound:    number
  totalRounds:     number
  playerGoals:     number   // cumulative AFTER each completed round animation
  aiGoals:         number
  completedRounds: BattleRound[]
  momentumPlayer:  number   // consecutive scoring attacks (resets on miss)
  momentumAi:      number
  subUsed:         boolean
  subSlotId:       string | null       // which slot was subbed (null = no sub yet)
  lastAttackerId:  string | null       // for man-marking: the card used to attack last round
  currentTactic:   TacticType | null   // tactic selected for the current round (cleared after round resolves)
}

// Formation layout configs — 7 outfield players, no GK
// row 1 = DEF (bottom), row 2 = MID, row 3 = ATK (top)
export const FORMATION_CONFIGS: Record<
  Formation7v7,
  Array<{ id: string; label: Position; row: number; col: number }>
> = {
  // 3-2-2: 3 DEF · 2 MID · 2 ATK
  '3-2-2': [
    { id: 'lst', label: 'ST', row: 3, col: 0 },
    { id: 'rst', label: 'ST', row: 3, col: 2 },
    { id: 'lm',  label: 'LM', row: 2, col: 0 },
    { id: 'rm',  label: 'RM', row: 2, col: 2 },
    { id: 'lb',  label: 'LB', row: 1, col: 0 },
    { id: 'cb',  label: 'CB', row: 1, col: 1 },
    { id: 'rb',  label: 'RB', row: 1, col: 2 },
  ],
  // 2-3-2: 2 DEF · 3 MID · 2 ATK
  '2-3-2': [
    { id: 'lw',  label: 'LW', row: 3, col: 0 },
    { id: 'rw',  label: 'RW', row: 3, col: 2 },
    { id: 'lm',  label: 'LM', row: 2, col: 0 },
    { id: 'cm',  label: 'CM', row: 2, col: 1 },
    { id: 'rm',  label: 'RM', row: 2, col: 2 },
    { id: 'lb',  label: 'LB', row: 1, col: 0 },
    { id: 'rb',  label: 'RB', row: 1, col: 2 },
  ],
  // 3-3-1: 3 DEF · 3 MID · 1 ATK
  '3-3-1': [
    { id: 'st',  label: 'ST', row: 3, col: 1 },
    { id: 'lm',  label: 'LM', row: 2, col: 0 },
    { id: 'cm',  label: 'CM', row: 2, col: 1 },
    { id: 'rm',  label: 'RM', row: 2, col: 2 },
    { id: 'lb',  label: 'LB', row: 1, col: 0 },
    { id: 'cb',  label: 'CB', row: 1, col: 1 },
    { id: 'rb',  label: 'RB', row: 1, col: 2 },
  ],
  // 1-3-3: 1 DEF · 3 MID · 3 ATK
  '1-3-3': [
    { id: 'lw',  label: 'LW', row: 3, col: 0 },
    { id: 'cf',  label: 'CF', row: 3, col: 1 },
    { id: 'rw',  label: 'RW', row: 3, col: 2 },
    { id: 'lm',  label: 'LM', row: 2, col: 0 },
    { id: 'cm',  label: 'CM', row: 2, col: 1 },
    { id: 'rm',  label: 'RM', row: 2, col: 2 },
    { id: 'cb',  label: 'CB', row: 1, col: 1 },
  ],
  // 2-4-1: 2 DEF · 4 MID · 1 ATK
  '2-4-1': [
    { id: 'st',  label: 'ST',  row: 3, col: 1 },
    { id: 'llm', label: 'LM',  row: 2, col: 0 },
    { id: 'lcm', label: 'CM',  row: 2, col: 1 },
    { id: 'cam', label: 'CAM', row: 2, col: 2 },
    { id: 'rrm', label: 'RM',  row: 2, col: 3 },
    { id: 'lb',  label: 'LB',  row: 1, col: 0 },
    { id: 'rb',  label: 'RB',  row: 1, col: 3 },
  ],
}
