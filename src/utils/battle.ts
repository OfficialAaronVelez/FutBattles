import type {
  Team7v7, FormationSlot,
  BattleMatchup, BattleRound,
  RealPlayer, Formation7v7, UserCard,
  CreateDuel,
} from '../types'
import { FORMATION_CONFIGS } from '../types'
import { PLAYERS } from '../data/players'

// ─── Constants ───────────────────────────────────────────────────
export const TOTAL_ROUNDS        = 5
const MOMENTUM_THRESHOLD  = 3   // consecutive scoring attacks needed
const MOMENTUM_BONUS      = 12  // flat bonus to attack roll at threshold
const CREATION_BONUS      = 10  // bonus for winning the PAS duel
const RAND_ATK            = 22  // attack roll noise ceiling (raised from 14 — less deterministic)
const RAND_DEF            = 14  // defence roll noise ceiling (raised from 12)
const RAND_LM             = 12  // last-man roll noise ceiling (raised from 10)
const RAND_PAS            = 18  // PAS duel noise ceiling
// Fatigue: penalty per repeated use of the same attacker in a single match
// 1st use: 0, 2nd: -10, 3rd: -20, 4th+: -30 (capped)
const FATIGUE_PER_USE     = 10
const FATIGUE_MAX_USES    = 3   // penalty caps at 3 stacked uses

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
  return Math.round(s.PAS * 0.85 + rand(0, RAND_PAS))
}

// ─── Create Duel (PAS battle before each round) ──────────────────
function bestPasser(slots: FormationSlot[]): CardStats {
  const mid  = slots.filter(s => s.row === 2 && s.card)
  const pool = mid.length ? mid : slots.filter(s => s.card && s.row > 0)
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

function resolveCreateDuel(playerSlots: FormationSlot[], aiPlayers: RealPlayer[]): CreateDuel {
  const pm = bestPasser(playerSlots)
  const am = bestAiPasser(aiPlayers)
  const pr = pasRoll(pm)
  const ar = pasRoll(am)
  return { playerName: pm.name, playerPas: pm.PAS, playerRoll: pr,
           aiName:     am.name, aiPas:     am.PAS, aiRoll:     ar,
           playerWon:  pr > ar }
}

// ─── Single matchup ──────────────────────────────────────────────
function resolveMatchup(
  attBase:       CardStats,
  defBase:       CardStats,
  lastManBase:   CardStats,
  oopPct:        number,
  chemBonus:     number,
  momBonus:      number,
  createBonus:   number,
  createDuel:    CreateDuel | null,
): BattleMatchup {
  const att = applyModifiers(attBase, oopPct, chemBonus)

  const aRoll  = atkRoll(att, momBonus, createBonus)
  const dRoll  = defRoll(defBase)
  const beatD  = aRoll > dRoll
  const lmR    = beatD ? lastManRollFn(lastManBase) : 0
  const shotR  = beatD ? atkRoll(att, 0, 0) : 0
  const scored = beatD && shotR > lmR

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
    attackerRoll: aRoll,
    defenderRoll: dRoll,
    lastManRoll:  lmR,
    scored,
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
  return def.length
    ? def[rand(0, def.length - 1)]
    : aiPlayers[0]
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
export function resolveRound(
  playerAttackerId: string,
  roundNum:         number,
  playerTeam:       Team7v7,
  aiPlayers:        RealPlayer[],
  momentumPlayer:   number,
  momentumAi:       number,
  attackerUseCount  = 0,   // how many times this card has been used already this match
): BattleRound {
  const chemBonuses = computeChemBonuses(playerTeam.slots)

  // ── Player attack ──
  const pAtkSlot = playerTeam.slots.find(s => s.card?.id === playerAttackerId)
  if (!pAtkSlot?.card) throw new Error('pickBattleAttacker: card not found')

  const pAtkBase  = toCardStats(pAtkSlot.card)
  const pOopPct   = oopPenaltyPct(pAtkSlot.card.position, pAtkSlot.row)
  const pChem     = chemBonuses.get(pAtkSlot.card.id) ?? 0
  const pMomBonus = momentumPlayer >= MOMENTUM_THRESHOLD ? MOMENTUM_BONUS : 0

  // Fatigue penalty — discourages spamming the same attacker every round
  const fatigue      = Math.min(attackerUseCount, FATIGUE_MAX_USES) * FATIGUE_PER_USE
  // Net bonus: momentum can partially cancel fatigue; fatigue can go negative (net penalty)
  const pNetMomBonus = pMomBonus - fatigue

  const createDuel     = resolveCreateDuel(playerTeam.slots, aiPlayers)
  const pCreateBonus   = createDuel.playerWon ? CREATION_BONUS : 0

  const aiDefBase     = toCardStats(aiPickDefender(aiPlayers))
  const aiLastManBase = getLastManStats([], aiPlayers)

  const playerAttack = resolveMatchup(
    pAtkBase, aiDefBase, aiLastManBase,
    pOopPct, pChem, pNetMomBonus, pCreateBonus,
    createDuel,
  )

  // ── AI attack ──
  const aiAtkBase     = toCardStats(aiPickAttacker(aiPlayers))
  const aiMomBonus    = momentumAi >= MOMENTUM_THRESHOLD ? MOMENTUM_BONUS : 0
  const aiCreateBonus = createDuel.playerWon ? 0 : CREATION_BONUS

  const pDefStats     = playerBestDefender(playerTeam.slots, chemBonuses)
  const pLastManStats = getLastManStats(playerTeam.slots)

  const aiAttack = resolveMatchup(
    aiAtkBase, pDefStats, pLastManStats,
    0, 0, aiMomBonus, aiCreateBonus,
    null,
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

  for (let i = 1; i <= TOTAL_ROUNDS; i++) {
    const slot  = attackerSlots[rand(0, attackerSlots.length - 1)]
    const round = resolveRound(slot?.card?.id ?? '', i, playerTeam, aiPlayers, momP, momA)
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
