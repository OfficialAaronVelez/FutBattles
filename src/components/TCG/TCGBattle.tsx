// ─────────────────────────────────────────────────────────────────────────────
//  FutBattles  ·  Soccer TCG  ·  Battle Screen  v2
//  Pitch layout · Formation zones · Goal counter · Clear-defense mechanic
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react'
import type { TCGCard, TCGPlayerCard, TCGStadiumCard, TCGManagerCard, TCGAspect } from '../../types/tcg'
import { ASPECT_COLORS } from '../../types/tcg'
import type { BattleState, BattleSide, FieldUnit, LogEntry } from '../../types/tcgBattle'
import {
  PLAYER_MANAGER, PLAYER_STADIUM, PLAYER_MAIN_DECK,
  AI_MANAGER, AI_STADIUM, AI_MAIN_DECK,
} from '../../data/tcgDecks'

// ─────────────────────────────────────────────────────────────────────────────
//  Position zones (soccer roles)
// ─────────────────────────────────────────────────────────────────────────────
// Row 1 = Defenders, Row 2 = Midfielders, Row 3 = Forwards
const DEF_POSITIONS = new Set(['GK','LB','CB','RB','LWB','RWB'])
const MID_POSITIONS = new Set(['CDM','LM','CM','RM','CAM'])

function posRow(pos: string): 1 | 2 | 3 {
  if (DEF_POSITIONS.has(pos)) return 1
  if (MID_POSITIONS.has(pos)) return 2
  return 3
}
// Left-to-right ordering within a row
const LATERAL_ORDER: Record<string, number> = {
  LB: 0, LWB: 0, LW: 0, LM: 0,
  CB: 1, CDM: 1,
  GK: 2, CM: 2, ST: 2, CF: 2, CAM: 2,
  RM: 3,
  RW: 4, RWB: 4, RB: 4,
}
function lateralOrder(pos: string): number { return LATERAL_ORDER[pos] ?? 2 }

/** True if side has any unexhausted defender on the field */
function hasActiveDefenders(side: BattleSide): boolean {
  return side.field.some(u => !u.exhausted && posRow(u.card.position) === 1)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Soccer commentary helpers
// ─────────────────────────────────────────────────────────────────────────────
const GOAL_LINES = [
  (name: string) => `⚽ GOAL! ${name} fires and it's in the net! Unstoppable!`,
  (name: string) => `🎯 ${name} with a thunderbolt! The goalkeeper had no chance!`,
  (name: string) => `💥 Clinical finish from ${name}! Pure quality!`,
  (name: string) => `⚡ ${name} cuts inside and SHOOTS — GOAL! The crowd goes wild!`,
  (name: string) => `🔥 ${name} — and that is a WORLDIE! Nothing the keeper could do!`,
  (name: string) => `⚽ Magnificent goal from ${name}! What a run, what a finish!`,
]
const TACKLE_LINES = [
  (d: string, a: string) => `🛡️ ${d} makes the tackle — ${a}'s chance is denied!`,
  (d: string, a: string) => `💪 ${d} with an incredible block on ${a}!`,
  (d: string, a: string) => `🚫 ${a}'s shot charged down by ${d}! Crucial intervention!`,
  (d: string, a: string) => `🦅 ${d} reads the game brilliantly — ${a} stopped cold!`,
]
const DEFEAT_LINES = [
  (name: string) => `💀 ${name} is down! Carried off the pitch!`,
  (name: string) => `😬 ${name} can't continue — a big loss for the team!`,
]
function rndGoal(name: string): string { return GOAL_LINES[Math.floor(Math.random() * GOAL_LINES.length)](name) }
function rndTackle(d: string, a: string): string { return TACKLE_LINES[Math.floor(Math.random() * TACKLE_LINES.length)](d, a) }
function rndDefeat(name: string): string { return DEFEAT_LINES[Math.floor(Math.random() * DEFEAT_LINES.length)](name) }

// ─────────────────────────────────────────────────────────────────────────────
//  Pure game-logic helpers
// ─────────────────────────────────────────────────────────────────────────────
let _uid = 0
function nextUid(cardId: string) { return `${cardId}_${++_uid}` }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function drawN(side: BattleSide, n: number): { side: BattleSide; drawn: TCGCard[] } {
  const drawn = side.deck.slice(0, n)
  const newHand = [...side.hand, ...drawn].slice(0, 7)
  return { side: { ...side, deck: side.deck.slice(n), hand: newHand }, drawn }
}

function actionsForTurn(turn: number): number {
  if (turn <= 2) return 3
  if (turn <= 5) return 4
  if (turn <= 8) return 5
  return 6
}

function applyManagerBonus(units: FieldUnit[], manager: TCGManagerCard): FieldUnit[] {
  return units.map(u => {
    let atkB = 0, defB = 0
    if (manager.id === 'mgr-004') {
      if (['LW','RW','LB','RB','LWB','RWB'].includes(u.card.position)) { atkB += 1; defB += 1 }
    }
    if (manager.id === 'mgr-006') {
      if (['CB','LB','RB','CDM','LWB','RWB'].includes(u.card.position)) defB += 2
    }
    if (manager.id === 'mgr-005' && u.card.aspects.includes('Star Power' as TCGAspect)) atkB += 1
    return { ...u, atkBonus: u.atkBonus + atkB, defBonus: u.defBonus + defB }
  })
}

function effectiveAtk(u: FieldUnit): number { return u.card.atk + u.atkBonus }
function effectiveDef(u: FieldUnit): number { return u.card.def + u.defBonus }

function makeSide(manager: TCGManagerCard, stadium: TCGStadiumCard, mainDeck: TCGCard[], handSize = 6): BattleSide {
  const shuffled = shuffle(mainDeck)
  return {
    deck: shuffled.slice(handSize), hand: shuffled.slice(0, handSize),
    field: [], stadiumHp: stadium.hp, stadiumCard: stadium,
    managerCard: manager, actionsLeft: 3, maxActions: 3, epicUsed: false,
  }
}

function addLog(state: BattleState, text: string, accent: LogEntry['accent'] = 'neutral'): BattleState {
  return {
    ...state,
    logSeq: state.logSeq + 1,
    log: [{ id: state.logSeq + 1, text, accent }, ...state.log].slice(0, 60),
  }
}

function checkWinner(state: BattleState): 'player' | 'ai' | null {
  if (state.ai.stadiumHp <= 0) return 'player'
  if (state.player.stadiumHp <= 0) return 'ai'
  return null
}

function initBattle(): BattleState {
  _uid = 0
  return {
    phase: 'mulligan',
    turn: 1,
    activePlayer: 'player',
    player: makeSide(PLAYER_MANAGER, PLAYER_STADIUM, PLAYER_MAIN_DECK),
    ai:     makeSide(AI_MANAGER, AI_STADIUM, AI_MAIN_DECK),
    pendingAttack: null,
    log: [{ id: 1, text: '⚽ Kick off! Klöpff\'s Andfield Press vs Ancellión\'s Galacticos!', accent: 'neutral' }],
    winner: null,
    logSeq: 1,
    playerGoals: 0,
    aiGoals: 0,
    pendingGoalFlash: null,
  }
}

// ── Play a card from hand ─────────────────────────────────────────────────────
function playCardFromHand(state: BattleState, side: 'player' | 'ai', handIndex: number): BattleState {
  const sideData = state[side]
  const card = sideData.hand[handIndex]
  if (!card) return state

  let cost = card.cost
  if (sideData.managerCard.id === 'mgr-001' &&
      (card.aspects.includes('Precision' as TCGAspect) || card.aspects.includes('Tactical' as TCGAspect))) {
    cost = Math.max(0, cost - 1)
  }
  if (sideData.actionsLeft < cost) return state

  const newHand = sideData.hand.filter((_, i) => i !== handIndex)
  let newSide: BattleSide = { ...sideData, hand: newHand, actionsLeft: sideData.actionsLeft - cost }
  let logText = ''

  if (card.type === 'Player') {
    const pc = card as TCGPlayerCard
    if (newSide.field.length >= 5) return state
    const unit: FieldUnit = { uid: nextUid(card.id), card: pc, hp: pc.hp, exhausted: true, justPlayed: true, atkBonus: 0, defBonus: 0 }
    newSide = { ...newSide, field: applyManagerBonus([...newSide.field, unit], newSide.managerCard) }
    logText = `${side === 'player' ? '👤' : '🤖'} deployed ${pc.name} (${pc.position}) — ${effectiveAtk(unit)}⚔ ${effectiveDef(unit)}🛡`

  } else if (card.type === 'Tactic') {
    const result = resolveTactic(state, side, card, newSide)
    newSide = result.side; logText = result.log; state = result.state

  } else if (card.type === 'Upgrade') {
    if (newSide.field.length === 0) {
      return state  // nowhere to attach
    }
    const target = newSide.field[0]
    let atkB = 0, defB = 0
    if (card.id === 'upg-001') atkB = 2
    if (card.id === 'upg-003') atkB = 1
    if (card.id === 'upg-004') defB = 2
    if (card.id === 'upg-006') defB = 1
    newSide = { ...newSide, field: newSide.field.map(u => u.uid === target.uid ? { ...u, atkBonus: u.atkBonus + atkB, defBonus: u.defBonus + defB } : u) }
    logText = `${side === 'player' ? '👤' : '🤖'} equipped ${card.name} on ${target.card.name} (${atkB > 0 ? `+${atkB} ATK` : `+${defB} DEF`})`
  }

  const newState: BattleState = { ...state, [side]: newSide }
  const withLog = addLog(newState, logText, side === 'player' ? 'player' : 'ai')
  const w = checkWinner(withLog)
  return w ? { ...withLog, winner: w, phase: 'game-over' } : withLog
}

// ── Tactic resolution ─────────────────────────────────────────────────────────
function resolveTactic(
  state: BattleState, side: 'player' | 'ai', card: TCGCard, currentSide: BattleSide
): { state: BattleState; side: BattleSide; log: string } {
  const oppKey = side === 'player' ? 'ai' : 'player'
  let opp = state[oppKey]
  let cur = currentSide
  let log = `${side === 'player' ? '👤' : '🤖'} played ${card.name}`

  if (card.id === 'tac-001') {
    cur = { ...cur, field: cur.field.map(u => ({ ...u, atkBonus: u.atkBonus + 2 })) }
    log = `⚡ El Clásico Press! All your players gain +2 ATK this turn!`
  } else if (card.id === 'tac-002') {
    const { side: d } = drawN(cur, 2); cur = d
    log = `🔄 Tiki-Taka! Crisp passing play — drew 2 cards!`
  } else if (card.id === 'tac-003') {
    opp = { ...opp, stadiumHp: Math.max(0, opp.stadiumHp - 3) }
    const goalSide = side === 'player' ? 'player' : 'ai'
    state = { ...state, [goalSide === 'player' ? 'playerGoals' : 'aiGoals']: (state[goalSide === 'player' ? 'playerGoals' : 'aiGoals']) + 1, pendingGoalFlash: goalSide }
    log = `🎯 Route One! A long ball thunders into the net — GOAL! 3 direct damage!`
  } else if (card.id === 'tac-004') {
    if (cur.field.length > 0) {
      const t = cur.field[0]
      cur = { ...cur, field: cur.field.map(u => u.uid === t.uid ? { ...u, atkBonus: u.atkBonus + 3 } : u) }
      log = `🎭 False Nine! ${t.card.name} drops deep and surges forward — +3 ATK!`
    }
  } else if (card.id === 'tac-005') {
    const p = cur.field.find(u => u.card.aspects.includes('Pace' as TCGAspect))
    if (p) {
      cur = { ...cur, field: cur.field.map(u => u.uid === p.uid ? { ...u, atkBonus: u.atkBonus + 4 } : u) }
      log = `💨 Turbo Sprint! ${p.card.name} hits top gear — +4 ATK!`
    }
  } else if (card.id === 'tac-007') {
    opp = { ...opp, stadiumHp: Math.max(0, opp.stadiumHp - 4) }
    const goalSide = side === 'player' ? 'player' : 'ai'
    state = { ...state, [goalSide === 'player' ? 'playerGoals' : 'aiGoals']: (state[goalSide === 'player' ? 'playerGoals' : 'aiGoals']) + 1, pendingGoalFlash: goalSide }
    log = `🏋️ Set Piece Special — the ball curls into the top corner! GOAL! 4 damage!`
  } else if (card.id === 'tac-008') {
    opp = { ...opp, field: opp.field.map(u => ({ ...u, exhausted: true })) }
    log = `🔴 GEGENPRESS! The press is on — ALL enemy players are pinned down!`
  } else if (card.id === 'tac-009') {
    const ready = cur.field.find(u => !u.exhausted)
    if (ready) {
      const dmg = effectiveAtk(ready)
      opp = { ...opp, stadiumHp: Math.max(0, opp.stadiumHp - dmg) }
      cur = { ...cur, field: cur.field.map(u => u.uid === ready.uid ? { ...u, exhausted: true } : u) }
      const goalSide = side === 'player' ? 'player' : 'ai'
      state = { ...state, [goalSide === 'player' ? 'playerGoals' : 'aiGoals']: (state[goalSide === 'player' ? 'playerGoals' : 'aiGoals']) + 1, pendingGoalFlash: goalSide }
      log = `🏹 Counter-Strike! ${ready.card.name} breaks at pace — GOAL! ${dmg} damage!`
    }
  } else if (card.id === 'tac-010') {
    const { side: d } = drawN(cur, 1); cur = d
    log = `🚩 Offside Trap — referee raises the flag! Drew 1 card.`
  }

  return { state: { ...state, [oppKey]: opp }, side: cur, log }
}

// ── Attack resolution ─────────────────────────────────────────────────────────
function resolveAttack(
  state: BattleState,
  atkSideKey: 'player' | 'ai',
  attackerUid: string,
  targetType: 'unit' | 'stadium',
  targetUid?: string,
): BattleState {
  const defSideKey = atkSideKey === 'player' ? 'ai' : 'player'
  let atk = state[atkSideKey]
  let def = state[defSideKey]

  const attacker = atk.field.find(u => u.uid === attackerUid)
  if (!attacker || attacker.exhausted) return state

  const atkVal = effectiveAtk(attacker)
  let s: BattleState = { ...state, pendingAttack: null, pendingGoalFlash: null }

  if (targetType === 'stadium') {
    // ── GOAL SCORED ──
    const dmg = atkVal
    def = { ...def, stadiumHp: Math.max(0, def.stadiumHp - dmg) }
    atk = { ...atk, field: atk.field.map(u => u.uid === attackerUid ? { ...u, exhausted: true } : u) }

    const goalKey  = atkSideKey === 'player' ? 'playerGoals' : 'aiGoals'
    const newGoals = s[goalKey] + 1

    s = { ...s, [atkSideKey]: atk, [defSideKey]: def, [goalKey]: newGoals, pendingGoalFlash: atkSideKey }
    s = addLog(s, rndGoal(attacker.card.name), 'crit')

  } else if (targetType === 'unit' && targetUid) {
    // ── TACKLE / DUEL ──
    const target = def.field.find(u => u.uid === targetUid)
    if (!target) return state

    const defVal    = effectiveDef(target)
    const dmgDealt  = Math.max(1, atkVal - defVal)
    const counterAtk = effectiveAtk(target)
    const counterDmg = !target.exhausted ? Math.max(0, counterAtk - effectiveDef(attacker)) : 0

    const newTargetHp = target.hp - dmgDealt
    const newAtkHp    = attacker.hp - counterDmg

    const targetDefeated   = newTargetHp <= 0
    const attackerDefeated = newAtkHp <= 0

    let atkField = atk.field.map(u => u.uid === attackerUid ? { ...u, hp: Math.max(0, newAtkHp), exhausted: true } : u)
    let defField = def.field.map(u => u.uid === targetUid ? { ...u, hp: Math.max(0, newTargetHp) } : u)

    // Klöpff: if player's defender survives, gain +1 ATK
    if (defSideKey === 'player' && state.player.managerCard.id === 'mgr-002' && !targetDefeated) {
      defField = defField.map(u => u.uid === targetUid ? { ...u, atkBonus: u.atkBonus + 1 } : u)
    }

    if (attackerDefeated) atkField = atkField.filter(u => u.uid !== attackerUid)
    if (targetDefeated)   defField = defField.filter(u => u.uid !== targetUid)

    atk = { ...atk, field: atkField }
    def = { ...def, field: defField }
    s = { ...s, [atkSideKey]: atk, [defSideKey]: def }

    if (targetDefeated) {
      s = addLog(s, rndTackle(attacker.card.name, target.card.name), 'player')
      s = addLog(s, rndDefeat(target.card.name), 'death')
    } else if (attackerDefeated) {
      s = addLog(s, `💪 ${target.card.name} stands firm — ${attacker.card.name} is overpowered!`, 'ai')
      s = addLog(s, rndDefeat(attacker.card.name), 'death')
    } else {
      const hitPct = dmgDealt / target.card.hp
      if (hitPct >= 0.5) {
        s = addLog(s, `⚽ ${attacker.card.name} bursts through! ${target.card.name} takes ${dmgDealt} damage — barely hanging on!`, atkSideKey === 'player' ? 'player' : 'ai')
      } else {
        s = addLog(s, `⚔️ ${attacker.card.name} (${atkVal}⚔) vs ${target.card.name} (${defVal}🛡) — ${dmgDealt} damage dealt`, atkSideKey === 'player' ? 'player' : 'ai')
      }
      if (counterDmg > 0) s = addLog(s, `↩ ${target.card.name} strikes back — ${counterDmg} damage!`, defSideKey === 'player' ? 'player' : 'ai')
    }
  }

  const w = checkWinner(s)
  return w ? { ...s, winner: w, phase: 'game-over' } : s
}

// ── Start of turn ─────────────────────────────────────────────────────────────
function startTurn(state: BattleState, side: 'player' | 'ai'): BattleState {
  const maxAct = actionsForTurn(state.turn)
  const { side: afterDraw } = drawN(state[side], 1)
  const refreshed: BattleSide = {
    ...afterDraw, actionsLeft: maxAct, maxActions: maxAct,
    field: afterDraw.field.map(u => ({ ...u, exhausted: false, justPlayed: false })),
  }
  const s = addLog(
    { ...state, [side]: refreshed, activePlayer: side, pendingAttack: null },
    `── ${side === 'player' ? '⚽ YOUR TURN' : '🤖 AI TURN'} · Turn ${state.turn} · ${maxAct} actions ──`,
  )
  return { ...s, phase: side === 'player' ? 'player-main' : 'ai-turn' }
}

function endTurn(state: BattleState): BattleState {
  const next     = state.activePlayer === 'player' ? 'ai' : 'player'
  const nextTurn = next === 'player' ? state.turn + 1 : state.turn
  return startTurn({ ...state, turn: nextTurn }, next)
}

// ── AI logic ──────────────────────────────────────────────────────────────────
function runAIStep(state: BattleState): { state: BattleState; done: boolean } {
  let s = state
  const ai = s.ai
  const playerField = s.player.field
  const playerDefenders = playerField.filter(u => !u.exhausted && posRow(u.card.position) === 1)

  // 1. Deploy a player card if field < 5
  if (ai.field.length < 5 && ai.actionsLeft > 0) {
    // Prefer to play defenders if player has MID/FWD units that threaten
    const playerAtkUnits = playerField.filter(u => posRow(u.card.position) > 1)
    const wantDefender = playerAtkUnits.length > ai.field.filter(u => posRow(u.card.position) === 1).length

    const playable = ai.hand
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.type === 'Player' && c.cost <= ai.actionsLeft)
      .sort((a, b) => {
        const aRow = posRow((a.c as TCGPlayerCard).position)
        const bRow = posRow((b.c as TCGPlayerCard).position)
        if (wantDefender) {
          if (aRow === 1 && bRow !== 1) return -1
          if (bRow === 1 && aRow !== 1) return 1
        }
        return b.c.cost - a.c.cost
      })

    if (playable.length > 0) {
      s = playCardFromHand(s, 'ai', playable[0].i)
      return { state: s, done: false }
    }
  }

  // 2. Play a tactic
  if (s.ai.actionsLeft > 0) {
    const idx = s.ai.hand.findIndex(c =>
      (c.type === 'Tactic' || c.type === 'Upgrade') && c.cost <= s.ai.actionsLeft
    )
    if (idx >= 0) {
      s = playCardFromHand(s, 'ai', idx)
      return { state: s, done: false }
    }
  }

  // 3. Attack with a ready unit
  const readyUnit = s.ai.field.find(u => !u.exhausted)
  if (readyUnit) {
    if (playerDefenders.length > 0) {
      // Must go through defenders — pick the one with lowest HP
      const weakestDef = [...playerDefenders].sort((a, b) => a.hp - b.hp)[0]
      s = resolveAttack(s, 'ai', readyUnit.uid, 'unit', weakestDef.uid)
    } else if (playerField.length > 0) {
      // Attack weakest remaining unit
      const weakest = [...playerField].sort((a, b) => a.hp - b.hp)[0]
      s = resolveAttack(s, 'ai', readyUnit.uid, 'unit', weakest.uid)
    } else {
      // Path is clear — SCORE!
      s = resolveAttack(s, 'ai', readyUnit.uid, 'stadium')
    }
    return { state: s, done: false }
  }

  return { state: endTurn(s), done: true }
}

// ─────────────────────────────────────────────────────────────────────────────
//  UI Components
// ─────────────────────────────────────────────────────────────────────────────

function AspectDot({ aspect, size = 12 }: { aspect: TCGAspect; size?: number }) {
  const c = ASPECT_COLORS[aspect]
  const icons: Record<TCGAspect, string> = {
    Pressing: '⚡', Precision: '🎯', Physical: '💪', Tactical: '♟️', 'Star Power': '⭐', Pace: '🏃',
  }
  return (
    <div title={aspect} style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: c.bg, boxShadow: `0 0 4px ${c.glow}`,
      display: 'grid', placeItems: 'center', fontSize: size * 0.6, lineHeight: 1,
    }}>
      {icons[aspect]}
    </div>
  )
}

// ── BIGGER Field Unit Card ────────────────────────────────────────────────────
function FieldUnitCard({
  unit, selected, validTarget, onClick,
}: { unit: FieldUnit; selected?: boolean; validTarget?: boolean; onClick?: () => void }) {
  const accent = ASPECT_COLORS[unit.card.aspects[0]]
  const atk    = effectiveAtk(unit)
  const def    = effectiveDef(unit)
  const hpPct  = (unit.hp / unit.card.hp) * 100
  const isDef  = posRow(unit.card.position) === 1

  const borderColor = selected ? accent.text
    : validTarget ? 'var(--red-1)'
    : unit.exhausted ? 'rgba(255,255,255,0.08)'
    : `${accent.text}66`

  // Keyword bold split
  const ability = unit.card.ability
  const dashIdx = ability.indexOf('—')
  const keyword  = dashIdx > 0 && dashIdx < 28 ? ability.slice(0, dashIdx + 1) : null
  const body     = keyword ? ability.slice(dashIdx + 1).trim() : ability

  return (
    <div
      onClick={onClick}
      style={{
        width: 148, flexShrink: 0,
        borderRadius: 10, overflow: 'hidden',
        background: selected
          ? `linear-gradient(160deg, ${accent.bg}88, var(--bg-1))`
          : validTarget
          ? 'linear-gradient(160deg, rgba(255,71,103,0.18), var(--bg-1))'
          : `linear-gradient(160deg, ${accent.bg}44, var(--bg-1))`,
        border: `2px solid ${borderColor}`,
        opacity: unit.exhausted ? 0.5 : 1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        transform: selected ? 'translateY(-6px) scale(1.03)' : validTarget ? 'translateY(-3px)' : 'none',
        boxShadow: selected
          ? `0 8px 24px ${accent.glow}`
          : validTarget ? '0 4px 16px rgba(255,71,103,0.35)' : '0 2px 8px rgba(0,0,0,0.4)',
        position: 'relative',
      }}
    >
      {/* Exhausted badge */}
      {unit.exhausted && (
        <div style={{
          position: 'absolute', top: 5, right: 5, zIndex: 4,
          fontSize: 9, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '1px 5px',
          color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
        }}>
          TIRED
        </div>
      )}

      {/* Just played indicator */}
      {unit.justPlayed && (
        <div style={{
          position: 'absolute', top: 5, left: 5, zIndex: 4,
          fontSize: 8, background: `${accent.bg}cc`, borderRadius: 4, padding: '1px 5px',
          color: accent.text, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
          border: `1px solid ${accent.text}55`,
        }}>
          NEW
        </div>
      )}

      {/* Art area */}
      <div style={{
        height: 72, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${accent.bg}cc, rgba(0,0,0,0.5))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 38, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>
          {unit.card.emoji}
        </div>
        {/* Zone indicator */}
        <div style={{
          position: 'absolute', bottom: 4, left: 5,
          fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 800,
          color: isDef ? '#4488ff' : '#ff8095',
          background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '1px 4px',
          letterSpacing: '0.08em',
        }}>
          {unit.card.position}
        </div>
        {/* Aspects */}
        <div style={{ position: 'absolute', bottom: 4, right: 5, display: 'flex', gap: 3 }}>
          {unit.card.aspects.map(a => <AspectDot key={a} aspect={a} size={11} />)}
        </div>
      </div>

      {/* Name */}
      <div style={{
        padding: '5px 8px 2px',
        fontFamily: 'var(--font-display)', fontSize: 13,
        color: 'var(--ink-0)', letterSpacing: '0.03em', lineHeight: 1.1,
        borderTop: `1px solid ${accent.text}33`,
        background: `linear-gradient(90deg, ${accent.bg}44, transparent)`,
      }}>
        {unit.card.name}
      </div>

      {/* ATK / DEF / HP row */}
      <div style={{ display: 'flex', gap: 0, padding: '4px 8px' }}>
        {[
          { label: '⚔', val: atk, base: unit.card.atk, color: accent.text },
          { label: '🛡', val: def, base: unit.card.def, color: '#4488ff' },
          { label: '❤', val: unit.hp, base: unit.card.hp, color: unit.hp < unit.card.hp * 0.4 ? '#ff4767' : '#44ff9e' },
        ].map(({ label, val, base, color }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 16, lineHeight: 1,
              color, textShadow: `0 0 6px ${color}66`,
              fontWeight: val > base ? 900 : 700,
            }}>
              {val}
            </div>
            <div style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* HP bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', margin: '0 8px 5px' }}>
        <div style={{
          width: `${hpPct}%`, height: '100%', borderRadius: 2,
          background: hpPct > 50 ? '#44ff9e' : hpPct > 25 ? '#ffd66b' : '#ff4767',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Ability text */}
      <div style={{ padding: '0 8px 7px', fontSize: 9, lineHeight: 1.45, color: 'var(--ink-2)' }}>
        {keyword && (
          <span style={{ fontWeight: 900, color: accent.text }}>{keyword} </span>
        )}
        <span style={{
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {body}
        </span>
      </div>
    </div>
  )
}

// ── Hand Card ─────────────────────────────────────────────────────────────────
function HandCard({ card, selected, playable, affordable, onClick }: {
  card: TCGCard; selected: boolean; playable: boolean; affordable: boolean; onClick: () => void
}) {
  const accent  = ASPECT_COLORS[card.aspects[0]]
  const isPlayer = card.type === 'Player'
  const pc       = isPlayer ? card as TCGPlayerCard : null
  const ability  = card.ability
  const dashIdx  = ability.indexOf('—')
  const keyword  = dashIdx > 0 && dashIdx < 28 ? ability.slice(0, dashIdx + 1) : null
  const body     = keyword ? ability.slice(dashIdx + 1).trim() : ability

  return (
    <div
      onClick={onClick}
      style={{
        width: 96, flexShrink: 0,
        borderRadius: 9, overflow: 'hidden',
        background: selected
          ? `linear-gradient(160deg, ${accent.bg}99, var(--bg-1))`
          : `linear-gradient(160deg, ${accent.bg}44, var(--bg-2))`,
        border: selected
          ? `2px solid ${accent.text}`
          : affordable
          ? `1px solid ${accent.text}55`
          : '1px solid rgba(255,255,255,0.07)',
        opacity: playable ? 1 : 0.38,
        cursor: playable ? 'pointer' : 'not-allowed',
        transform: selected ? 'translateY(-10px)' : 'none',
        transition: 'all 0.15s',
        boxShadow: selected ? `0 8px 24px ${accent.glow}` : 'none',
      }}
    >
      {/* Art + cost */}
      <div style={{
        height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${accent.bg}99, rgba(0,0,0,0.4))`,
        position: 'relative', fontSize: 26,
      }}>
        {card.emoji}
        {/* Cost orb */}
        <div style={{
          position: 'absolute', bottom: 4, right: 5,
          width: 18, height: 18, borderRadius: '50%',
          background: accent.bg, border: `1px solid ${accent.text}99`,
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--ink-0)', fontWeight: 900,
        }}>
          {card.cost}
        </div>
        {/* Type chip */}
        <div style={{
          position: 'absolute', top: 4, left: 4, fontSize: 7,
          background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '1px 4px',
          color: accent.text, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
        }}>
          {card.type === 'Player' ? (card as TCGPlayerCard).position : card.type.slice(0, 3).toUpperCase()}
        </div>
      </div>

      {/* Name */}
      <div style={{
        padding: '4px 6px 2px',
        fontFamily: 'var(--font-display)', fontSize: 11,
        color: 'var(--ink-0)', letterSpacing: '0.02em', lineHeight: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        borderTop: `1px solid ${accent.text}33`,
        background: `linear-gradient(90deg, ${accent.bg}33, transparent)`,
      }}>
        {card.name}
      </div>

      {/* Stats row (Player) */}
      {pc && (
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '2px 4px' }}>
          <span style={{ fontSize: 9, color: accent.text, fontWeight: 700 }}>{pc.atk}⚔</span>
          <span style={{ fontSize: 9, color: '#4488ff', fontWeight: 700 }}>{pc.def}🛡</span>
          <span style={{ fontSize: 9, color: '#ff4767', fontWeight: 700 }}>{pc.hp}❤</span>
        </div>
      )}

      {/* Ability snippet */}
      <div style={{ padding: '2px 6px 6px', fontSize: 8, lineHeight: 1.4, color: 'var(--ink-2)' }}>
        {keyword && <span style={{ fontWeight: 900, color: accent.text }}>{keyword} </span>}
        <span style={{
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {body}
        </span>
      </div>

      {/* Aspects */}
      <div style={{ display: 'flex', gap: 3, padding: '0 6px 5px' }}>
        {card.aspects.map(a => <AspectDot key={a} aspect={a} size={10} />)}
      </div>
    </div>
  )
}

// ── Stadium Bar ───────────────────────────────────────────────────────────────
function StadiumBar({ card, hp, maxHp, manager }: {
  card: TCGStadiumCard; hp: number; maxHp: number; manager: TCGManagerCard
}) {
  const pct    = Math.max(0, (hp / maxHp) * 100)
  const accent = ASPECT_COLORS[card.aspects[0]]
  const hpColor = pct > 60 ? '#44ff9e' : pct > 30 ? '#ffd66b' : '#ff4767'

  return (
    <div style={{
      padding: '8px 12px',
      background: `linear-gradient(90deg, ${accent.bg}33, transparent)`,
      border: `1px solid ${accent.text}33`, borderRadius: 10,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 7, flexShrink: 0,
        background: accent.bg, display: 'grid', placeItems: 'center',
        fontSize: 18, boxShadow: `0 0 8px ${accent.glow}`,
      }}>
        {manager.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-0)', lineHeight: 1 }}>{card.name}</div>
            <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>MGR · {manager.name}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: hpColor, lineHeight: 1 }}>{hp}</span>
            <span style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}> / {maxHp} HP</span>
          </div>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 3,
            background: hpColor, transition: 'width 0.4s ease, background 0.4s',
            boxShadow: pct < 30 ? `0 0 6px ${hpColor}` : 'none',
          }} />
        </div>
      </div>
    </div>
  )
}

// ── Battle Log ────────────────────────────────────────────────────────────────
function BattleLog({ entries }: { entries: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0 }, [entries.length])

  const colors: Record<LogEntry['accent'], string> = {
    neutral: 'var(--ink-3)', player: 'var(--cyan-1)',
    ai: 'var(--red-0)', crit: 'var(--gold-1)', death: 'var(--red-1)', draw: 'var(--purple-1)',
  }

  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 8px', scrollbarWidth: 'thin' }}>
      {entries.map(e => (
        <div key={e.id} style={{
          fontSize: 9.5, lineHeight: 1.45, color: colors[e.accent],
          padding: '3px 5px', marginBottom: 2,
          background: e.accent !== 'neutral' ? 'rgba(255,255,255,0.025)' : 'transparent',
          borderRadius: 4,
          borderLeft: e.accent !== 'neutral' ? `2px solid ${colors[e.accent]}55` : 'none',
          animation: 'slide-up-fade 0.2s ease',
        }}>
          {e.text}
        </div>
      ))}
    </div>
  )
}

// ── Action Tokens ─────────────────────────────────────────────────────────────
function ActionTokens({ left, max }: { left: number; max: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 14, height: 14, borderRadius: '50%',
          background: i < left ? 'var(--gold-1)' : 'rgba(255,255,255,0.08)',
          boxShadow: i < left ? '0 0 6px var(--gold-glow)' : 'none',
          border: `1px solid ${i < left ? 'var(--gold-2)' : 'rgba(255,255,255,0.1)'}`,
          transition: 'all 0.2s',
        }} />
      ))}
      <span style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginLeft: 2 }}>
        {left}/{max}
      </span>
    </div>
  )
}

// ── Goal Flash ────────────────────────────────────────────────────────────────
function GoalFlash({ side }: { side: 'player' | 'ai' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: side === 'player' ? 'rgba(37,224,255,0.12)' : 'rgba(255,71,103,0.12)',
      animation: 'boom-overlay-in 0.15s ease-out',
    }}>
      <div style={{
        textAlign: 'center',
        animation: 'slide-up-fade 0.2s ease',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 80,
          letterSpacing: '0.06em',
          lineHeight: 1,
          color: side === 'player' ? 'var(--cyan-1)' : 'var(--red-1)',
          textShadow: `0 0 40px ${side === 'player' ? 'var(--cyan-glow)' : 'var(--red-glow)'}`,
        }}>
          {side === 'player' ? 'GOAL!' : 'CONCEDED!'}
        </div>
        <div style={{ fontSize: 48, marginTop: 8 }}>⚽</div>
      </div>
    </div>
  )
}

// ── Formation Half (soccer pitch half for one team) ───────────────────────────
// Shows 3 rows: DEF / MID / FWD sorted left-to-right by lateral position.
// AI half: DEF on top (away from center), FWD nearest the scoreboard.
// Player half: FWD on top (nearest the scoreboard), DEF at the bottom.
function FormationHalf({
  units, side, pendingAttack, isPlayerTurn,
  onSelectAttacker, onAttackUnit,
}: {
  units: FieldUnit[]
  side: 'player' | 'ai'
  pendingAttack: { attackerUid: string } | null
  isPlayerTurn: boolean
  onSelectAttacker?: (uid: string) => void
  onAttackUnit?: (uid: string) => void
}) {
  const isPlayer = side === 'player'
  const isTarget = !isPlayer && !!pendingAttack

  const sortLateral = (a: FieldUnit, b: FieldUnit) =>
    lateralOrder(a.card.position) - lateralOrder(b.card.position)

  const defUnits = units.filter(u => posRow(u.card.position) === 1).sort(sortLateral)
  const midUnits = units.filter(u => posRow(u.card.position) === 2).sort(sortLateral)
  const fwdUnits = units.filter(u => posRow(u.card.position) === 3).sort(sortLateral)

  type RowDef = { label: string; units: FieldUnit[]; bg: string; border: string }
  // AI half: DEF→MID→FWD top-to-bottom (FWD closest to scoreboard / center)
  // Player half: FWD→MID→DEF top-to-bottom (FWD closest to scoreboard / center)
  const rows: RowDef[] = side === 'ai'
    ? [
        { label: '🛡 DEF', units: defUnits, bg: 'rgba(68,136,255,0.07)',  border: 'rgba(68,136,255,0.22)' },
        { label: '🔄 MID', units: midUnits, bg: 'rgba(185,107,255,0.05)', border: 'rgba(185,107,255,0.18)' },
        { label: '⚔️ FWD', units: fwdUnits, bg: 'rgba(255,71,103,0.07)',  border: 'rgba(255,71,103,0.22)' },
      ]
    : [
        { label: '⚔️ FWD', units: fwdUnits, bg: 'rgba(37,224,255,0.07)',  border: 'rgba(37,224,255,0.22)' },
        { label: '🔄 MID', units: midUnits, bg: 'rgba(185,107,255,0.05)', border: 'rgba(185,107,255,0.18)' },
        { label: '🛡 DEF', units: defUnits, bg: 'rgba(68,136,255,0.07)',  border: 'rgba(68,136,255,0.22)' },
      ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {rows.map(row => (
        <div key={row.label} style={{
          background: row.bg, border: `1px solid ${row.border}`,
          borderRadius: 8, padding: '5px 8px',
          minHeight: 38, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {/* Row label */}
          <div style={{
            fontSize: 7, letterSpacing: '0.1em', fontFamily: 'var(--font-mono)',
            color: 'rgba(255,255,255,0.28)', flexShrink: 0, width: 44,
            textAlign: 'center', lineHeight: 1.35,
          }}>
            {row.label}
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {row.units.length === 0 ? (
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.08)', fontStyle: 'italic', padding: '4px 0' }}>—</div>
            ) : (
              row.units.map(u => (
                <FieldUnitCard
                  key={u.uid}
                  unit={u}
                  selected={isPlayer && pendingAttack?.attackerUid === u.uid}
                  validTarget={isTarget}
                  onClick={
                    isPlayer && isPlayerTurn && !u.exhausted
                      ? () => onSelectAttacker?.(u.uid)
                      : isTarget
                      ? () => onAttackUnit?.(u.uid)
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function TCGBattle({ onExit }: { onExit: () => void }) {
  const [state, setState]           = useState<BattleState>(() => initBattle())
  const [selectedHandIdx, setSelectedHandIdx] = useState<number | null>(null)
  const [showGoalFlash, setShowGoalFlash]     = useState<'player' | 'ai' | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const aiRunRef   = useRef(false)

  // ── Goal flash watcher ────────────────────────────────────────────────────
  // Effect 1: pick up pendingGoalFlash from state and show it, then clear the flag
  useEffect(() => {
    if (!state.pendingGoalFlash) return
    setShowGoalFlash(state.pendingGoalFlash)
    setState(s => ({ ...s, pendingGoalFlash: null }))
  }, [state.pendingGoalFlash])

  // Effect 2: auto-hide the flash after 1.6s (separate so cleanup only fires when flash changes)
  useEffect(() => {
    if (!showGoalFlash) return
    const t = setTimeout(() => setShowGoalFlash(null), 1600)
    return () => clearTimeout(t)
  }, [showGoalFlash])

  // ── AI runner ─────────────────────────────────────────────────────────────
  const runAI = useCallback((cur: BattleState) => {
    if (aiRunRef.current) return
    aiRunRef.current = true
    setAiThinking(true)

    function step(s: BattleState) {
      if (s.phase !== 'ai-turn') {
        setState(s); setAiThinking(false); aiRunRef.current = false; return
      }
      setTimeout(() => {
        const { state: next, done } = runAIStep(s)
        setState(next)
        if (!done && next.phase === 'ai-turn') step(next)
        else { setAiThinking(false); aiRunRef.current = false }
      }, 500)
    }

    setTimeout(() => step(cur), 350)
  }, [])

  useEffect(() => {
    if (state.phase === 'ai-turn' && !aiRunRef.current) runAI(state)
  }, [state.phase, runAI])

  // ── Action handlers ───────────────────────────────────────────────────────
  function handleMulligan(keep: boolean) {
    setState(s => {
      if (!keep) {
        const combined = shuffle([...s.player.hand, ...s.player.deck])
        const newPlayer = { ...s.player, hand: combined.slice(0, 6), deck: combined.slice(6) }
        return startTurn({ ...s, player: newPlayer }, 'player')
      }
      return startTurn(s, 'player')
    })
  }

  function handleSelectHandCard(idx: number) {
    if (state.phase !== 'player-main') return
    setSelectedHandIdx(i => i === idx ? null : idx)
  }

  function handlePlayCard() {
    if (selectedHandIdx === null) return
    const card = state.player.hand[selectedHandIdx]
    if (!card) return
    let cost = card.cost
    if (state.player.managerCard.id === 'mgr-001' &&
        (card.aspects.includes('Precision' as TCGAspect) || card.aspects.includes('Tactical' as TCGAspect))) {
      cost = Math.max(0, cost - 1)
    }
    if (state.player.actionsLeft < cost) return
    if (card.type === 'Player' && state.player.field.length >= 5) return
    setState(s => playCardFromHand(s, 'player', selectedHandIdx))
    setSelectedHandIdx(null)
  }

  function handleSelectAttacker(uid: string) {
    if (state.phase !== 'player-main') return
    const unit = state.player.field.find(u => u.uid === uid)
    if (!unit || unit.exhausted) return
    setSelectedHandIdx(null)
    setState(s => ({ ...s, pendingAttack: s.pendingAttack?.attackerUid === uid ? null : { attackerUid: uid } }))
  }

  function handleAttackUnit(targetUid: string) {
    if (!state.pendingAttack) return
    setState(s => resolveAttack(s, 'player', s.pendingAttack!.attackerUid, 'unit', targetUid))
  }

  function handleAttackStadium() {
    if (!state.pendingAttack) return
    // Blocked if AI has active defenders
    if (hasActiveDefenders(state.ai)) return
    setState(s => resolveAttack(s, 'player', s.pendingAttack!.attackerUid, 'stadium'))
  }

  function handleEndTurn() {
    if (state.phase !== 'player-main') return
    setSelectedHandIdx(null)
    setState(s => endTurn(s))
  }

  function handleRestart() {
    aiRunRef.current = false; setAiThinking(false)
    setSelectedHandIdx(null); setShowGoalFlash(null)
    setState(initBattle())
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const { player, ai, phase, pendingAttack, playerGoals, aiGoals } = state
  const isPlayerTurn   = phase === 'player-main'
  const selectedCard   = selectedHandIdx !== null ? player.hand[selectedHandIdx] : null
  const aiHasDefenders = hasActiveDefenders(ai)
  const canScoreNow    = !!pendingAttack && !aiHasDefenders

  let selectedCost = selectedCard?.cost ?? 0
  if (selectedCard && player.managerCard.id === 'mgr-001' &&
      (selectedCard.aspects.includes('Precision' as TCGAspect) || selectedCard.aspects.includes('Tactical' as TCGAspect))) {
    selectedCost = Math.max(0, selectedCost - 1)
  }
  const canPlaySelected = !!selectedCard
    && player.actionsLeft >= selectedCost
    && (selectedCard.type !== 'Player' || player.field.length < 5)

  // (Formation rows are split inside FormationHalf by posRow())

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
      background: 'var(--bg-0)', fontFamily: 'var(--font-body)',
      position: 'relative',
    }}>

      {/* ── Goal flash ── */}
      {showGoalFlash && <GoalFlash side={showGoalFlash} />}

      {/* ── Mulligan overlay ── */}
      {phase === 'mulligan' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(4,6,13,0.94)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink-0)', letterSpacing: '0.06em' }}>
            OPENING HAND
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-2)', textAlign: 'center', maxWidth: 400 }}>
            Review your starting 6 cards. Mulligan once to redraw, or keep and play!
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {player.hand.map((c, i) => (
              <HandCard key={i} card={c} selected={false} playable affordable onClick={() => {}} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={() => handleMulligan(true)} style={{
              padding: '10px 28px', borderRadius: 10, fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.1em',
              background: 'var(--green-2)', border: '1px solid var(--green-1)', color: '#fff', cursor: 'pointer',
            }}>
              ✓ KEEP HAND
            </button>
            <button onClick={() => handleMulligan(false)} style={{
              padding: '10px 28px', borderRadius: 10, fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.1em',
              background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-2)', cursor: 'pointer',
            }}>
              MULLIGAN ↺
            </button>
          </div>
        </div>
      )}

      {/* ── Game over overlay ── */}
      {phase === 'game-over' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(4,6,13,0.94)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 72, lineHeight: 1 }}>{state.winner === 'player' ? '🏆' : '💀'}</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 42, letterSpacing: '0.06em',
            color: state.winner === 'player' ? 'var(--gold-1)' : 'var(--red-1)',
          }}>
            {state.winner === 'player' ? 'FULL TIME — WIN!' : 'FULL TIME — LOSS'}
          </div>
          {/* Final score */}
          <div style={{
            display: 'flex', gap: 0, alignItems: 'center', marginTop: 4,
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '10px 24px',
          }}>
            <div style={{ textAlign: 'center', width: 80 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--cyan-1)', lineHeight: 1 }}>{playerGoals}</div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>YOU</div>
            </div>
            <div style={{ fontSize: 20, color: 'var(--ink-3)', margin: '0 12px' }}>—</div>
            <div style={{ textAlign: 'center', width: 80 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--red-1)', lineHeight: 1 }}>{aiGoals}</div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>AI</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={handleRestart} style={{
              padding: '10px 28px', borderRadius: 10, fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.1em',
              background: 'var(--bg-2)', border: '1px solid var(--gold-1)', color: 'var(--gold-1)', cursor: 'pointer',
            }}>REMATCH</button>
            <button onClick={onExit} style={{
              padding: '10px 28px', borderRadius: 10, fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.1em',
              background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-2)', cursor: 'pointer',
            }}>EXIT</button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: 'var(--bg-1)', borderBottom: '1px solid var(--line)', flexShrink: 0,
      }}>
        <button onClick={onExit} style={{
          fontSize: 9, letterSpacing: '0.1em', fontFamily: 'var(--font-display)',
          color: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6,
          background: 'transparent', cursor: 'pointer', padding: '4px 10px',
        }}>← STUDIO</button>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink-0)', letterSpacing: '0.1em' }}>
          ⚽ TCG MATCH
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            TURN {state.turn}
          </div>
          <div style={{
            fontSize: 9, fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
            color: isPlayerTurn ? 'var(--cyan-1)' : aiThinking ? 'var(--red-0)' : 'var(--ink-3)',
            padding: '3px 8px', borderRadius: 6,
            background: isPlayerTurn ? 'rgba(37,224,255,0.1)' : aiThinking ? 'rgba(255,128,149,0.1)' : 'transparent',
            border: `1px solid ${isPlayerTurn ? 'rgba(37,224,255,0.3)' : aiThinking ? 'rgba(255,128,149,0.3)' : 'var(--line)'}`,
          }}>
            {isPlayerTurn ? '⚽ YOUR TURN' : aiThinking ? '🤖 AI THINKING…' : phase.replace('-', ' ').toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Main (pitch + log) ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ── PITCH ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '10px 12px', gap: 6 }}>

          {/* AI STADIUM */}
          <StadiumBar card={ai.stadiumCard} hp={ai.stadiumHp} maxHp={ai.stadiumCard.hp} manager={ai.managerCard} />

          {/* AI HAND */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
            <div style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', flexShrink: 0 }}>
              AI HAND
            </div>
            {ai.hand.map((_, i) => (
              <div key={i} style={{
                width: 24, height: 34, borderRadius: 4,
                background: 'linear-gradient(135deg, #1a0535, #0d1020)',
                border: '1px solid rgba(185,107,255,0.25)',
                display: 'grid', placeItems: 'center', fontSize: 10, color: 'rgba(185,107,255,0.25)',
              }}>♟</div>
            ))}
            <div style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
              DECK {ai.deck.length}
            </div>
          </div>

          {/* AI FORMATION */}
          <FormationHalf units={ai.field} side="ai" pendingAttack={pendingAttack} isPlayerTurn={isPlayerTurn} onAttackUnit={handleAttackUnit} />

          {/* ── CENTER SCOREBOARD ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
            borderRadius: 10, overflow: 'hidden', flexShrink: 0,
          }}>
            {/* Score */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 16px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1, color: 'var(--cyan-1)', textShadow: '0 0 16px var(--cyan-glow)' }}>
                  {playerGoals}
                </div>
                <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.12em', marginTop: 2 }}>YOU</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink-3)', margin: '0 4px' }}>—</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1, color: 'var(--red-1)', textShadow: '0 0 16px var(--red-glow)' }}>
                  {aiGoals}
                </div>
                <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.12em', marginTop: 2 }}>AI</div>
              </div>
            </div>

            {/* Center actions */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 12px',
              borderLeft: '1px solid var(--line)',
            }}>
              {/* Attack stadium button */}
              {pendingAttack && (
                <button
                  onClick={handleAttackStadium}
                  disabled={!canScoreNow}
                  title={aiHasDefenders ? 'Eliminate the AI defenders first to score!' : 'Shoot for goal!'}
                  style={{
                    padding: '6px 14px', borderRadius: 7,
                    fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.08em',
                    cursor: canScoreNow ? 'pointer' : 'not-allowed',
                    background: canScoreNow ? 'rgba(255,71,103,0.2)' : 'rgba(255,255,255,0.03)',
                    border: canScoreNow ? '1px solid var(--red-1)' : '1px solid var(--line)',
                    color: canScoreNow ? 'var(--red-0)' : 'var(--ink-3)',
                    animation: canScoreNow ? 'glow-pulse 1s ease-in-out infinite' : 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {canScoreNow ? '⚽ SHOOT FOR GOAL!' : '🛡 CLEAR DEFENCE FIRST'}
                </button>
              )}
              {/* Cancel attack */}
              {pendingAttack && (
                <button
                  onClick={() => setState(s => ({ ...s, pendingAttack: null }))}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 9, letterSpacing: '0.08em',
                    fontFamily: 'var(--font-display)', background: 'transparent',
                    border: '1px solid var(--line)', color: 'var(--ink-3)', cursor: 'pointer',
                  }}
                >
                  CANCEL ✕
                </button>
              )}
              {!pendingAttack && isPlayerTurn && (
                <div style={{ fontSize: 8, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.4, maxWidth: 110 }}>
                  {player.field.length > 0
                    ? 'Click your player to attack'
                    : 'Deploy players to begin'}
                </div>
              )}
            </div>
          </div>

          {/* PLAYER FORMATION */}
          <FormationHalf units={player.field} side="player" pendingAttack={pendingAttack} isPlayerTurn={isPlayerTurn} onSelectAttacker={handleSelectAttacker} onAttackUnit={handleAttackUnit} />

          {/* PLAYER STADIUM */}
          <StadiumBar card={player.stadiumCard} hp={player.stadiumHp} maxHp={player.stadiumCard.hp} manager={player.managerCard} />

          {/* ── PLAYER HAND + CONTROLS ── */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8, flexShrink: 0 }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                HAND ({player.hand.length}/7) · DECK {player.deck.length}
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <ActionTokens left={player.actionsLeft} max={player.maxActions} />
              </div>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'thin', alignItems: 'flex-end' }}>
              {player.hand.length === 0 && (
                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontStyle: 'italic', padding: '20px 4px' }}>No cards — draw next turn</div>
              )}
              {player.hand.map((c, i) => {
                let cost = c.cost
                if (player.managerCard.id === 'mgr-001' &&
                    (c.aspects.includes('Precision' as TCGAspect) || c.aspects.includes('Tactical' as TCGAspect))) {
                  cost = Math.max(0, cost - 1)
                }
                const affordable = player.actionsLeft >= cost
                return (
                  <HandCard
                    key={i} card={c}
                    selected={selectedHandIdx === i}
                    affordable={affordable}
                    playable={isPlayerTurn && affordable && (c.type !== 'Player' || player.field.length < 5)}
                    onClick={() => handleSelectHandCard(i)}
                  />
                )
              })}
            </div>

            {/* Action bar */}
            {isPlayerTurn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                {selectedCard ? (
                  <div style={{
                    flex: 1, padding: '7px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
                    display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{selectedCard.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedCard.name}
                        <span style={{ fontSize: 9, color: 'var(--ink-3)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>
                          COST {selectedCost}
                        </span>
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {selectedCard.ability.slice(0, 70)}{selectedCard.ability.length > 70 ? '…' : ''}
                      </div>
                    </div>
                    <button
                      onClick={handlePlayCard}
                      disabled={!canPlaySelected}
                      style={{
                        flexShrink: 0, padding: '7px 16px', borderRadius: 7,
                        fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.08em',
                        cursor: canPlaySelected ? 'pointer' : 'not-allowed',
                        background: canPlaySelected ? 'var(--green-2)' : 'transparent',
                        border: canPlaySelected ? '1px solid var(--green-1)' : '1px solid var(--line)',
                        color: canPlaySelected ? '#fff' : 'var(--ink-3)',
                      }}
                    >
                      DEPLOY ▶
                    </button>
                  </div>
                ) : (
                  <div style={{
                    flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 10, color: 'var(--ink-3)',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)',
                  }}>
                    {pendingAttack
                      ? '⚔️ Attacker selected — click an enemy player to challenge, or shoot for goal above'
                      : player.field.length > 0
                      ? '💡 Click one of your deployed players to attack'
                      : '💡 Select a card from your hand and hit DEPLOY to put them on the pitch'}
                  </div>
                )}

                <button
                  onClick={handleEndTurn}
                  style={{
                    flexShrink: 0, padding: '8px 20px', borderRadius: 8,
                    fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(245,179,39,0.2), rgba(200,128,27,0.2))',
                    border: '1px solid var(--gold-2)', color: 'var(--gold-1)',
                  }}
                >
                  END TURN →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── LOG SIDEBAR ── */}
        <div style={{
          width: 200, flexShrink: 0, borderLeft: '1px solid var(--line)',
          background: 'var(--bg-1)', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '8px 10px 4px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.14em', fontFamily: 'var(--font-mono)' }}>
              MATCH COMMENTARY
            </div>
          </div>
          <BattleLog entries={state.log} />
        </div>
      </div>
    </div>
  )
}
