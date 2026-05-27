import type {
  Team7v7, FormationSlot,
  BattleMatchup, BattleRound, RollBreakdownEntry,
  RealPlayer, Formation7v7, UserCard,
  CreateDuel, TacticType, CardTrait,
} from '../types'
import { FORMATION_CONFIGS } from '../types'
import { PLAYERS } from '../data/players'

// ─── Constants ───────────────────────────────────────────────────
export const TOTAL_ROUNDS  = 5
const MOMENTUM_THRESHOLD   = 3   // consecutive scoring attacks needed
const MOMENTUM_BONUS       = 12  // flat bonus to attack roll at threshold
const CREATION_BONUS       = 10  // bonus for winning the PAS duel
const MARK_PENALTY         = 12  // extra OOP% applied when player uses same attacker twice in a row
const RAND_ATK             = 18  // attack roll noise (moderate variance)
const RAND_DEF             = 12  // defence roll noise
const RAND_LM              = 10  // last-man roll noise
const RAND_PAS             = 10  // PAS duel noise (low — makes PAS stat decisive)

// ─── Position helpers ────────────────────────────────────────────
type PosGroup = 'attack' | 'midfield' | 'defense'

const ATK_POS  = new Set(['ST','CF','LW','RW'])
const MID_POS  = new Set(['CAM','CM','CDM','LM','RM'])
const DEF_POS  = new Set(['CB','LB','RB','LWB','RWB'])

function posGroup(pos: string | null | undefined): PosGroup | null {
  if (!pos) return null
  if (ATK_POS.has(pos))  return 'attack'
  if (MID_POS.has(pos))  return 'midfield'
  if (DEF_POS.has(pos))  return 'defense'
  return null
}

function rowGroup(row: number): PosGroup {
  if (row === 3) return 'attack'
  if (row === 2) return 'midfield'
  return 'defense'   // row 1 (and any lower)
}

/**
 * Returns penalty % (0–28) applied to ALL stats when a card plays
 * outside its natural position group.
 *
 * Examples:
 *  ST in ATT slot  →  0%   (natural)
 *  CM in ATT slot  →  12%  (adjacent)
 *  CB in ATT slot  →  28%  (far – opposite end)
 *  Card w/ no pos  →  15%  (unknown)
 */
export function oopPenaltyPct(cardPos: string | null | undefined, slotRow: number): number {
  const cg = posGroup(cardPos)
  const rg = rowGroup(slotRow)
  if (cg === null) return 15  // no position on card
  if (cg === rg)   return 0   // perfect match (group match counts as in-position)

  // Opposite ends of the pitch
  if ((cg === 'attack' && rg === 'defense') ||
      (cg === 'defense' && rg === 'attack')) return 28

  // Adjacent (one step away)
  return 12
}

// ─── Defensive shape bonus ───────────────────────────────────────
/**
 * Computes the team's defensive shape score from how well row-1 cards
 * fit their natural position group.
 *   DEF group card in row 1 → +4 pts
 *   MID group card in row 1 →  0 pts
 *   ATK group card in row 1 → -6 pts
 * Result clamped to [-12, +12] and added flat to the defender's roll.
 */
export function calcShapeBonus(slots: FormationSlot[]): number {
  let score = 0
  for (const s of slots) {
    if (s.row !== 1 || !s.card) continue
    const g = posGroup(s.card.position)
    if (g === 'defense')   score += 4
    else if (g === 'attack') score -= 6
    // midfield = 0
  }
  return Math.max(-12, Math.min(12, score))
}

// ─── Player traits ───────────────────────────────────────────────
/**
 * Returns the passive trait for a UserCard, derived purely from its
 * existing stats and position — no new data needed.
 *
 *  Clinical   : SHO ≥ 90 + ATK pos  → +5 to shot roll when beating first defender
 *  Engine     : PAS ≥ 88 + MID pos  → creation duel win gives +15 instead of +10
 *  Brick Wall : DEF ≥ 88 + DEF pos  → last-man gets +3 DEF when this card defends
 *  Speedster  : PAC ≥ 90 + wide pos → OOP penalty halved when in MID row
 *  Enforcer   : PHY ≥ 88 + CB/CDM   → +5 to last-man PHY component
 */
export function getCardTrait(card: UserCard): CardTrait | null {
  const s   = card.stats
  const pos = card.position
  if (!pos) return null

  if ((s.SHO ?? 0) >= 90 && ATK_POS.has(pos))
    return { type: 'clinical', label: 'Clinical' }
  if ((s.PAS ?? 0) >= 88 && MID_POS.has(pos))
    return { type: 'engine', label: 'Engine' }
  if ((s.DEF ?? 0) >= 88 && DEF_POS.has(pos))
    return { type: 'brick-wall', label: 'Brick Wall' }
  if ((s.PAC ?? 0) >= 90 && ['LW', 'RW', 'LM', 'RM'].includes(pos))
    return { type: 'speedster', label: 'Speedster' }
  if ((s.PHY ?? 0) >= 88 && ['CB', 'CDM'].includes(pos))
    return { type: 'enforcer', label: 'Enforcer' }

  return null
}

// ─── Chemistry ───────────────────────────────────────────────────
/** +3 per club match, +2 per nation match, capped at 15. */
export function computeChemBonuses(slots: FormationSlot[]): Map<string, number> {
  const cards = slots.map(s => s.card).filter((c): c is UserCard => c !== null)
  const bonuses = new Map<string, number>()
  for (const card of cards) {
    let bonus = 0
    for (const other of cards) {
      if (other.id === card.id) continue
      if (card.clubAffinity   && card.clubAffinity   === other.clubAffinity)   bonus += 3
      if (card.nationAffinity && card.nationAffinity === other.nationAffinity) bonus += 2
    }
    bonuses.set(card.id, Math.min(bonus, 15))
  }
  return bonuses
}

// ─── Stat helpers ────────────────────────────────────────────────
type CardStats = {
  id:  string; name: string
  PAC: number; SHO: number; PAS: number
  DRI: number; DEF: number; PHY: number
}

function toCardStats(card: UserCard | RealPlayer): CardStats {
  const s = card.stats as Record<string, number>
  return {
    id:   'id' in card ? (card as RealPlayer).id : (card as UserCard).id,
    name: card.name,
    PAC: s.PAC ?? 70, SHO: s.SHO ?? 70, PAS: s.PAS ?? 70,
    DRI: s.DRI ?? 70, DEF: s.DEF ?? 70, PHY: s.PHY ?? 70,
  }
}

function applyModifiers(base: CardStats, oopPct: number, chemBonus: number): CardStats {
  const mult = 1 - oopPct / 100
  const cap  = (v: number) => Math.max(40, Math.min(99, Math.round(v * mult) + chemBonus))
  return {
    ...base,
    PAC: cap(base.PAC), SHO: cap(base.SHO), PAS: cap(base.PAS),
    DRI: cap(base.DRI), DEF: cap(base.DEF), PHY: cap(base.PHY),
  }
}

// ─── Roll functions ──────────────────────────────────────────────
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function atkRoll(s: CardStats, momBonus: number, createBonus: number): number {
  return Math.round(s.PAC * 0.30 + s.SHO * 0.45 + s.DRI * 0.25 + momBonus + createBonus + rand(0, RAND_ATK))
}

function defRoll(s: CardStats): number {
  return Math.round(s.DEF * 0.6 + s.PHY * 0.4 + rand(0, RAND_DEF))
}

function lastManRollFn(s: CardStats): number {
  return Math.round(s.DEF * 0.65 + s.PHY * 0.35 + rand(0, RAND_LM))
}

function pasRoll(s: CardStats): number {
  return Math.round(s.PAS * 0.90 + rand(0, RAND_PAS))
}

// ─── Create Duel (PAS battle before each round) ──────────────────
// excludeIds: cards already assigned to attack/defense roles this round
function bestPasser(slots: FormationSlot[], excludeIds: string[] = []): CardStats {
  const mid  = slots.filter(s => s.row === 2 && s.card && !excludeIds.includes(s.card.id))
  const pool = mid.length
    ? mid
    : slots.filter(s => s.card && !excludeIds.includes(s.card.id))
  if (!pool.length) return { id:'_', name:'Midfielder', PAC:70,SHO:70,PAS:72,DRI:70,DEF:65,PHY:70 }
  return toCardStats(pool.reduce((best, s) => {
    const pas = s.card!.stats.PAS ?? 70
    return pas > (best.card?.stats.PAS ?? 70) ? s : best
  }).card!)
}

function bestAiPasser(aiPlayers: RealPlayer[]): CardStats {
  const sorted = [...aiPlayers].sort((a, b) => (b.stats.PAS ?? 70) - (a.stats.PAS ?? 70))
  return sorted.length ? toCardStats(sorted[0]) : { id:'_', name:'AI Mid', PAC:70,SHO:70,PAS:72,DRI:70,DEF:65,PHY:70 }
}

function resolveCreateDuel(playerSlots: FormationSlot[], aiPlayers: RealPlayer[], excludeIds: string[] = [], pressBonus = 0): CreateDuel {
  const pm = bestPasser(playerSlots, excludeIds)
  const am = bestAiPasser(aiPlayers)
  const pr = pasRoll(pm) + pressBonus
  const ar = pasRoll(am)
  return { playerName: pm.name, playerPas: pm.PAS, playerRoll: pr,
           aiName:     am.name, aiPas:     am.PAS, aiRoll:     ar,
           playerWon:  pr > ar }
}

// ─── Single matchup ──────────────────────────────────────────────
function resolveMatchup(
  attBase:         CardStats,
  defBase:         CardStats,
  lastManBase:     CardStats,
  oopPct:          number,
  chemBonus:       number,
  momBonus:        number,
  createBonus:     number,
  createDuel:      CreateDuel | null,
  atkFlatBonus:    number = 0,       // tactic / trait flat adjustments to attack roll
  defFlatBonus:    number = 0,       // tactic flat adjustments to defender roll
  lastManFlatBonus: number = 0,      // tactic / trait flat adjustments to last-man roll
  shapeBonus:      number = 0,       // defensive shape score (added to defender roll)
  attackerTrait:   CardTrait | null = null,
  defenderTrait:   CardTrait | null = null,
  tacticNote:      string | null = null,
): BattleMatchup {
  const att = applyModifiers(attBase, oopPct, chemBonus)

  const aBaseRoll = atkRoll(att, momBonus, createBonus) + atkFlatBonus
  const dBaseRoll = defRoll(defBase) + defFlatBonus + shapeBonus
  const beatD     = aBaseRoll > dBaseRoll

  // Clinical trait: +5 shot bonus when attacker beats first defender
  const clinicalFires = beatD && attackerTrait?.type === 'clinical'

  // Last-man rolls — apply trait bonuses if applicable
  let lmEffDef = lastManBase.DEF
  let lmEffPhy = lastManBase.PHY
  if (defenderTrait?.type === 'brick-wall') lmEffDef += 3   // Brick Wall
  if (defenderTrait?.type === 'enforcer')   lmEffPhy += 5   // Enforcer

  const lmBaseRoll  = beatD ? Math.round(lmEffDef * 0.65 + lmEffPhy * 0.35 + rand(0, RAND_LM)) + lastManFlatBonus : 0
  const shotR       = beatD ? atkRoll(att, 0, clinicalFires ? 5 : 0) : 0
  const scored      = beatD && shotR > lmBaseRoll

  const traitFired = clinicalFires
    ? '⚡ Clinical — +5 shot bonus'
    : (defenderTrait?.type === 'brick-wall' && beatD)
    ? '🧱 Brick Wall — last-man +3 DEF'
    : (defenderTrait?.type === 'enforcer' && beatD)
    ? '💪 Enforcer — last-man +5 PHY'
    : null

  // ── Roll breakdowns (for in-game transparency display) ──────────
  // Short tactic label: strip everything after " — "
  const tacticLabel = tacticNote ? tacticNote.split(' — ')[0] : 'Tactic'

  // ATK breakdown
  const atkStatBase  = Math.round(att.PAC * 0.30 + att.SHO * 0.45 + att.DRI * 0.25)
  const atkBonuses: RollBreakdownEntry[] = []
  if (momBonus > 0)       atkBonuses.push({ label: '🔥 Momentum', value: momBonus })
  if (createBonus > 0)    atkBonuses.push({ label: 'Possession', value: createBonus })
  if (createBonus < 0)    atkBonuses.push({ label: 'Counter loss', value: createBonus })
  if (atkFlatBonus !== 0) atkBonuses.push({ label: tacticLabel, value: atkFlatBonus })
  const atkBonusSum = atkBonuses.reduce((s, b) => s + b.value, 0)
  const atkDice     = aBaseRoll - atkStatBase - atkBonusSum

  // DEF breakdown
  const defStatBase  = Math.round(defBase.DEF * 0.60 + defBase.PHY * 0.40)
  const defBonuses: RollBreakdownEntry[] = []
  if (shapeBonus !== 0)    defBonuses.push({ label: shapeBonus > 0 ? 'Shape ↑' : 'Shape ↓', value: shapeBonus })
  if (defFlatBonus !== 0)  defBonuses.push({ label: tacticLabel, value: defFlatBonus })
  const defBonusSum = defBonuses.reduce((s, b) => s + b.value, 0)
  const defDice     = dBaseRoll - defStatBase - defBonusSum

  // LM breakdown — null when defender wasn't beaten
  const lmPureBase  = Math.round(lastManBase.DEF * 0.65 + lastManBase.PHY * 0.35)
  const lmTraitBon  = Math.round(lmEffDef * 0.65 + lmEffPhy * 0.35) - lmPureBase
  const lmBonuses: RollBreakdownEntry[] = []
  if (beatD) {
    if (lmTraitBon !== 0)       lmBonuses.push({ label: defenderTrait?.type === 'brick-wall' ? 'Brick Wall' : 'Enforcer', value: lmTraitBon })
    if (lastManFlatBonus !== 0) lmBonuses.push({ label: tacticLabel, value: lastManFlatBonus })
  }
  const lmBonusSum = lmBonuses.reduce((s, b) => s + b.value, 0)
  const lmDice     = beatD ? lmBaseRoll - lmPureBase - lmBonusSum : 0

  // SHOT breakdown — null when defender wasn't beaten
  // shotR = atkRoll(att, 0, clinicalBonus) — uses SAME att stats, fresh dice
  const shotBonuses: RollBreakdownEntry[] = []
  if (clinicalFires) shotBonuses.push({ label: '⚡ Clinical', value: 5 })
  const shotBonusSum = shotBonuses.reduce((s, b) => s + b.value, 0)
  const shotDice     = beatD ? shotR - atkStatBase - shotBonusSum : 0

  return {
    attacker: {
      name: attBase.name,
      pac:  att.PAC, sho: att.SHO, dri: att.DRI,
      oopPenalty: oopPct,
      chemBonus,
    },
    defender: { name: defBase.name, def: defBase.DEF, phy: defBase.PHY },
    lastMan:  { name: lastManBase.name, def: lastManBase.DEF, phy: lastManBase.PHY },
    createDuel,
    attackerRoll: aBaseRoll,
    defenderRoll: dBaseRoll,
    lastManRoll:  lmBaseRoll,
    shotRoll:     shotR,
    scored,
    traitFired:   traitFired ?? null,
    tacticNote:   tacticNote ?? null,
    atkBreakdown: { statBase: atkStatBase, bonuses: atkBonuses, dice: atkDice },
    defBreakdown: { statBase: defStatBase, bonuses: defBonuses, dice: defDice },
    lmBreakdown:  beatD ? { statBase: lmPureBase, bonuses: lmBonuses, dice: lmDice } : null,
    shotBreakdown: beatD ? { statBase: atkStatBase, bonuses: shotBonuses, dice: shotDice } : null,
  }
}

// ─── AI pickers ──────────────────────────────────────────────────
function aiPickAttacker(aiPlayers: RealPlayer[]): RealPlayer {
  const atk = aiPlayers.filter(p => ATK_POS.has(p.position) || MID_POS.has(p.position))
  const pool = atk.length ? atk : aiPlayers
  return pool[rand(0, pool.length - 1)] ?? aiPlayers[0]
}

function aiPickDefender(aiPlayers: RealPlayer[]): RealPlayer {
  const def = aiPlayers.filter(p => DEF_POS.has(p.position))
  const pool = def.length ? def : aiPlayers
  // Always use best defender by DEF+PHY — AI plays smart
  return pool.reduce((best, p) => {
    const v = (p.stats.DEF ?? 0) + (p.stats.PHY ?? 0)
    return v > ((best.stats.DEF ?? 0) + (best.stats.PHY ?? 0)) ? p : best
  }, pool[0])
}

/**
 * Second line of defence — the "last man" who faces the shot if the
 * first defender is beaten. For the player side: second-best DEF card
 * in row 1. For AI: second-best defender by DEF stat.
 */
function getLastManStats(slots: FormationSlot[], aiPlayers?: RealPlayer[]): CardStats {
  if (aiPlayers) {
    const defs = [...aiPlayers]
      .filter(p => DEF_POS.has(p.position))
      .sort((a, b) => (b.stats.DEF ?? 0) - (a.stats.DEF ?? 0))
    if (defs.length >= 2) return toCardStats(defs[1])
    if (defs.length === 1) {
      const s = toCardStats(defs[0])
      return { ...s, DEF: Math.max(40, s.DEF - 10), PHY: Math.max(40, s.PHY - 8) }
    }
    // Fallback: weakest outfield player
    return toCardStats(aiPlayers[aiPlayers.length - 1] ?? aiPlayers[0])
  }
  // Player side: second-best defender in row 1
  const defSlots = slots
    .filter(s => s.row === 1 && s.card)
    .sort((a, b) => (b.card!.stats.DEF ?? 0) - (a.card!.stats.DEF ?? 0))
  if (defSlots.length >= 2) return toCardStats(defSlots[1].card!)
  if (defSlots.length === 1) {
    const s = toCardStats(defSlots[0].card!)
    return { ...s, DEF: Math.max(40, s.DEF - 10), PHY: Math.max(40, s.PHY - 8) }
  }
  return { id:'lm', name:'Last Man', PAC:65,SHO:40,PAS:60,DRI:55,DEF:72,PHY:70 }
}

// ─── Best defender picker (player side) ──────────────────────────
function playerBestDefender(slots: FormationSlot[], chemBonuses: Map<string, number>): CardStats {
  const defSlots = slots.filter(s => s.row === 1 && s.card)
  if (!defSlots.length) {
    return { id:'def', name:'Defender', PAC:65,SHO:40,PAS:60,DRI:55,DEF:78,PHY:76 }
  }
  const best = defSlots.reduce((b, s) => {
    const v = (s.card!.stats.DEF ?? 0) + (s.card!.stats.PHY ?? 0)
    return v > b.val ? { s, val: v } : b
  }, { s: defSlots[0], val: -1 }).s

  const card = best.card!
  return applyModifiers(
    toCardStats(card),
    oopPenaltyPct(card.position, best.row),
    chemBonuses.get(card.id) ?? 0,
  )
}

// ─── Public: resolve one round ───────────────────────────────────
// playerAttackerId : card the player chose to attack with
// playerDefenderId : card the player chose to defend with ('' = auto-pick best)
// lastAttackerId   : attacker used LAST round — triggers man-marking if same
// tactic           : tactic selected for this round (null = balanced)
export function resolveRound(
  playerAttackerId: string,
  playerDefenderId: string,
  roundNum:         number,
  playerTeam:       Team7v7,
  aiPlayers:        RealPlayer[],
  momentumPlayer:   number,
  momentumAi:       number,
  lastAttackerId:   string | null = null,
  tactic:           TacticType | null = null,
): BattleRound {
  const chemBonuses = computeChemBonuses(playerTeam.slots)

  // ── Player attacker slot & traits ──
  const pAtkSlot = playerTeam.slots.find(s => s.card?.id === playerAttackerId)
  if (!pAtkSlot?.card) throw new Error('resolveRound: attacker card not found')

  const pAtkBase  = toCardStats(pAtkSlot.card)
  const pChem     = chemBonuses.get(pAtkSlot.card.id) ?? 0
  const pMomBonus = momentumPlayer >= MOMENTUM_THRESHOLD ? MOMENTUM_BONUS : 0

  // OOP penalty restored + man-marking on top
  const pOopPct   = oopPenaltyPct(pAtkSlot.card.position, pAtkSlot.row)
  const isMarked  = lastAttackerId !== null && lastAttackerId === playerAttackerId
  const markPct   = isMarked ? MARK_PENALTY : 0

  const pAtkTrait = getCardTrait(pAtkSlot.card)
  // Speedster: halve OOP in MID row (only the OOP portion, not the mark)
  const speedsterActive = pAtkTrait?.type === 'speedster' && pAtkSlot.row === 2
  const effectiveOop = speedsterActive
    ? Math.max(0, Math.round(pOopPct / 2)) + markPct
    : pOopPct + markPct

  // ── Player defender slot & traits ──
  const pDefSlot   = playerTeam.slots.find(s => s.card?.id === playerDefenderId)
  const pDefTrait  = pDefSlot?.card ? getCardTrait(pDefSlot.card) : null
  const pDefStats  = pDefSlot?.card
    ? applyModifiers(
        toCardStats(pDefSlot.card),
        oopPenaltyPct(pDefSlot.card.position, pDefSlot.row),
        chemBonuses.get(pDefSlot.card.id) ?? 0,
      )
    : playerBestDefender(playerTeam.slots, chemBonuses)   // fallback for simulateBattle

  const pLastManStats = getLastManStats(playerTeam.slots)

  // ── Shape bonus (adds to defender's roll in AI attack) ──
  const shapeBonus = calcShapeBonus(playerTeam.slots)

  // ── Engine trait on best midfielder (creation duel) ──
  const creationExcludeIds = [playerAttackerId, playerDefenderId]
  const passerSlot = playerTeam.slots.find(s => {
    if (!s.card || creationExcludeIds.includes(s.card.id)) return false
    if (s.row === 2) return true
    return false
  }) ?? playerTeam.slots.find(s => s.card && !creationExcludeIds.includes(s.card.id))
  const passerTrait    = passerSlot?.card ? getCardTrait(passerSlot.card) : null
  const engineActive   = passerTrait?.type === 'engine'
  const engineBonus    = engineActive ? 5 : 0   // +5 extra on creation win → 15 total

  // ── Tactic modifiers ──
  const pressBonus        = tactic === 'press'   ? 5  : 0   // +5 to player PAS roll
  const parkAtkPenalty    = tactic === 'park'    ? -10 : 0  // -10 flat to player attack roll
  const parkDefBonus      = tactic === 'park'    ? 8  : 0   // +8 to player defender & last-man
  const pressDefPenalty   = tactic === 'press'   ? -5 : 0   // player DEF -5 when AI attacks (caught high)

  // ── Creation duel ──
  const createDuel = resolveCreateDuel(
    playerTeam.slots, aiPlayers, creationExcludeIds, pressBonus,
  )

  // Counter tactic: creation win = +18; creation loss = -5 (instead of +10 / 0)
  const counterWinBonus = (tactic === 'counter' && createDuel.playerWon) ? 8 : 0
  const counterLossPenalty = (tactic === 'counter' && !createDuel.playerWon) ? -5 : 0
  const pCreateBonus = createDuel.playerWon
    ? CREATION_BONUS + engineBonus + counterWinBonus
    : counterLossPenalty

  // ── Tactic note for animation display ──
  let pAtkTacticNote: string | null = null
  let pDefTacticNote: string | null = null
  if (tactic === 'park')   pAtkTacticNote = '🚌 Park the Bus — ATK −10'
  if (tactic === 'park')   pDefTacticNote = '🚌 Park the Bus — DEF +8'
  if (tactic === 'press' && createDuel.playerWon)   pAtkTacticNote = '📣 Press High — +5 possession'
  if (tactic === 'press' && !createDuel.playerWon)  pDefTacticNote = '📣 Press High — DEF −5 (exposed)'
  if (tactic === 'counter' && createDuel.playerWon) pAtkTacticNote = '⚡ Counter — +8 ATK on transition'
  if (tactic === 'counter' && !createDuel.playerWon) pAtkTacticNote = '⚡ Counter — −5 ATK (no counter chance)'

  // ── Player attack ──
  const aiDefBase     = toCardStats(aiPickDefender(aiPlayers))
  const aiLastManBase = getLastManStats([], aiPlayers)

  const playerAttack = resolveMatchup(
    pAtkBase, aiDefBase, aiLastManBase,
    effectiveOop,
    pChem, pMomBonus, pCreateBonus,
    createDuel,
    parkAtkPenalty,       // atkFlatBonus
    0,                    // defFlatBonus (AI defender — not affected by player tactic)
    0,                    // lastManFlatBonus
    0,                    // shapeBonus (shape is for the player's defense)
    pAtkTrait,            // attackerTrait
    null,                 // defenderTrait (no player defender here)
    pAtkTacticNote,
  )

  // ── AI attack ──
  const aiAtkBase     = toCardStats(aiPickAttacker(aiPlayers))
  const aiMomBonus    = momentumAi >= MOMENTUM_THRESHOLD ? MOMENTUM_BONUS : 0
  const aiCreateBonus = createDuel.playerWon ? 0 : CREATION_BONUS

  const aiAttack = resolveMatchup(
    aiAtkBase, pDefStats, pLastManStats,
    0,         // AI has no OOP in this model
    0,         // no chem for AI
    aiMomBonus,
    aiCreateBonus,
    null,
    0,                                    // atkFlatBonus
    parkDefBonus + pressDefPenalty,       // defFlatBonus: park +8, press -5
    parkDefBonus,                         // lastManFlatBonus: park +8
    shapeBonus,                           // shapeBonus from formation
    null,                                 // attackerTrait (AI attacker has no trait)
    pDefTrait,                            // defenderTrait: player's defender trait
    pDefTacticNote,
  )

  // ── Momentum update ──
  const newMomP = playerAttack.scored
    ? (momentumPlayer >= MOMENTUM_THRESHOLD ? 1 : momentumPlayer + 1) : 0
  const newMomA = aiAttack.scored
    ? (momentumAi >= MOMENTUM_THRESHOLD ? 1 : momentumAi + 1) : 0

  return {
    roundNum,
    playerAttack,
    aiAttack,
    playerScored: playerAttack.scored,
    aiScored:     aiAttack.scored,
    momentumAfter: { player: newMomP, ai: newMomA },
  }
}

// ─── Post-battle stats ───────────────────────────────────────────
export function computeManOfMatch(rounds: BattleRound[]): string | null {
  let best = { name: '', roll: 0 }
  for (const r of rounds) {
    if (r.playerAttack.attackerRoll > best.roll)
      best = { name: r.playerAttack.attacker.name, roll: r.playerAttack.attackerRoll }
  }
  return best.name || null
}

export function computePerformanceCoins(
  playerGoals: number,
  aiGoals:     number,
  winner:      'player' | 'ai' | 'draw',
  winStreak:   number,   // consecutive wins BEFORE this game
): number {
  let coins = winner === 'player' ? 80 : winner === 'draw' ? 25 : 10
  coins += playerGoals * 18
  if (aiGoals === 0) coins += 35   // clean sheet bonus
  const mult = winStreak >= 5 ? 2.0
             : winStreak >= 3 ? 1.5
             : winStreak >= 2 ? 1.25
             : 1.0
  return Math.round(coins * mult)
}

// ─── AI team generator (unchanged) ───────────────────────────────
export function generateAiTeam(formation: Formation7v7, targetOverall: number): RealPlayer[] {
  const config = FORMATION_CONFIGS[formation]
  const result: RealPlayer[] = []
  const used = new Set<string>()

  for (const slot of config) {
    const pos = slot.label
    const isAtk = ATK_POS.has(pos)
    const isDef = DEF_POS.has(pos)

    const candidates = PLAYERS
      .filter(p => !used.has(p.id))
      .filter(p => isAtk ? ATK_POS.has(p.position)
                 : isDef ? DEF_POS.has(p.position)
                 : true)
      .sort((a, b) => Math.abs(a.overall - targetOverall) - Math.abs(b.overall - targetOverall))

    const pick = candidates[rand(0, Math.min(3, candidates.length - 1))]
    if (pick) { result.push(pick); used.add(pick.id) }
  }
  return result
}

export function buildEmptyTeam(formation: Formation7v7): FormationSlot[] {
  return FORMATION_CONFIGS[formation].map(cfg => ({ ...cfg, card: null }))
}

// ─── Legacy full-sim (kept for tutorial auto-battle fallback) ────
export function simulateBattle(playerTeam: Team7v7, aiPlayers: RealPlayer[]) {
  // Auto-pick first available attacker each round
  const attackerSlots = playerTeam.slots.filter(s => s.row >= 2 && s.card)
  let playerGoals = 0, aiGoals = 0
  let momP = 0, momA = 0
  const rounds: BattleRound[] = []

  const defSlots = playerTeam.slots.filter(s => s.row === 1 && s.card)
  for (let i = 1; i <= TOTAL_ROUNDS; i++) {
    const atkSlot = attackerSlots[rand(0, attackerSlots.length - 1)]
    const defSlot = defSlots[rand(0, defSlots.length - 1)]
    const round = resolveRound(
      atkSlot?.card?.id ?? '',
      defSlot?.card?.id ?? '',
      i, playerTeam, aiPlayers, momP, momA,
    )
    rounds.push(round)
    if (round.playerScored) playerGoals++
    if (round.aiScored)     aiGoals++
    momP = round.momentumAfter.player
    momA = round.momentumAfter.ai
  }

  const winner = playerGoals > aiGoals ? 'player' : aiGoals > playerGoals ? 'ai' : 'draw'
  return {
    rounds, playerGoals, aiGoals, winner,
    manOfMatch:       computeManOfMatch(rounds),
    performanceCoins: computePerformanceCoins(playerGoals, aiGoals, winner, 0),
    streakMultiplier: 1,
  }
}
