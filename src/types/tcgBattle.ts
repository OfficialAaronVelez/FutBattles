// ─────────────────────────────────────────────────────────────────────────────
//  FutBattles  ·  Soccer TCG  ·  Battle Engine Types
// ─────────────────────────────────────────────────────────────────────────────
import type { TCGCard, TCGPlayerCard, TCGStadiumCard, TCGManagerCard } from './tcg'

/** A Player card deployed on the field — has mutable HP and exhausted state */
export interface FieldUnit {
  uid: string              // unique instance id (cardId + '_' + timestamp)
  card: TCGPlayerCard
  hp: number               // current HP (starts at card.hp)
  exhausted: boolean       // true = attacked this turn / just deployed
  atkBonus: number         // accumulated ATK bonuses from upgrades/abilities
  defBonus: number         // accumulated DEF bonuses from upgrades/abilities
  justPlayed: boolean      // true on the turn it was deployed (can't attack)
}

/** One side of the battle (player or AI) */
export interface BattleSide {
  deck: TCGCard[]          // remaining draw pile
  hand: TCGCard[]          // cards in hand (max 7)
  field: FieldUnit[]       // deployed Player cards (max 4)
  stadiumHp: number        // current HP
  stadiumCard: TCGStadiumCard
  managerCard: TCGManagerCard
  actionsLeft: number      // action tokens remaining this turn
  maxActions: number       // base actions for this turn
  epicUsed: boolean        // has the manager's epic action been used?
}

/** Pending attack — waiting for player to pick a target */
export interface PendingAttack {
  attackerUid: string
}

/** One log entry in the battle feed */
export interface LogEntry {
  id: number
  text: string
  accent: 'neutral' | 'player' | 'ai' | 'crit' | 'death' | 'draw'
}

export type BattlePhase =
  | 'mulligan'         // player decides to keep/redraw initial hand
  | 'player-draw'      // momentary: showing "Draw" step
  | 'player-main'      // player can play cards and attack
  | 'ai-turn'          // AI is processing its turn
  | 'game-over'        // someone's stadium HP = 0

export interface BattleState {
  phase: BattlePhase
  turn: number              // increments each time a side ends their turn
  activePlayer: 'player' | 'ai'
  player: BattleSide
  ai: BattleSide
  pendingAttack: PendingAttack | null
  log: LogEntry[]
  winner: 'player' | 'ai' | null
  logSeq: number
}
