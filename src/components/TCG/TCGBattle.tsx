// ─────────────────────────────────────────────────────────────────────────────
//  FutBattles  ·  Soccer TCG  ·  Battle Screen
//  Player vs CPU  (Andfield Press  vs  Galacticos)
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
  const newHand = [...side.hand, ...drawn].slice(0, 7)  // max 7 in hand
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
    const aspects = u.card.aspects
    // Klöpff: bonus applied dynamically on survive
    // Conté: wide players +1/+1
    if (manager.id === 'mgr-004') {
      const widePositions = ['LW','RW','LB','RB','LWB','RWB']
      if (widePositions.includes(u.card.position)) { atkB += 1; defB += 1 }
    }
    // Guardián: cost reduction (not ATK/DEF)
    // Sarreta: defensive +2 DEF
    if (manager.id === 'mgr-006') {
      const defPositions = ['CB','LB','RB','CDM','LWB','RWB']
      if (defPositions.includes(u.card.position)) defB += 2
    }
    // Zydán: Star Power players +1 ATK per Legendary in play — applied separately
    if (manager.id === 'mgr-005' && aspects.includes('Star Power' as TCGAspect)) atkB += 1
    return { ...u, atkBonus: u.atkBonus + atkB, defBonus: u.defBonus + defB }
  })
}

function effectiveAtk(u: FieldUnit): number { return u.card.atk + u.atkBonus }
function effectiveDef(u: FieldUnit): number { return u.card.def + u.defBonus }

function makeSide(
  manager: TCGManagerCard,
  stadium: TCGStadiumCard,
  mainDeck: TCGCard[],
  initialHandSize = 6,
): BattleSide {
  const shuffled = shuffle(mainDeck)
  const baseSide: BattleSide = {
    deck: shuffled.slice(initialHandSize),
    hand: shuffled.slice(0, initialHandSize),
    field: [],
    stadiumHp: stadium.hp,
    stadiumCard: stadium,
    managerCard: manager,
    actionsLeft: 3,
    maxActions: 3,
    epicUsed: false,
  }
  return baseSide
}

function addLog(state: BattleState, text: string, accent: LogEntry['accent'] = 'neutral'): BattleState {
  const entry: LogEntry = { id: state.logSeq + 1, text, accent }
  return {
    ...state,
    logSeq: state.logSeq + 1,
    log: [entry, ...state.log].slice(0, 50),
  }
}

function checkWinner(state: BattleState): 'player' | 'ai' | null {
  if (state.ai.stadiumHp <= 0) return 'player'
  if (state.player.stadiumHp <= 0) return 'ai'
  return null
}

// ── Init ─────────────────────────────────────────────────────────────────────
function initBattle(): BattleState {
  _uid = 0
  const playerSide = makeSide(PLAYER_MANAGER, PLAYER_STADIUM, PLAYER_MAIN_DECK)
  const aiSide     = makeSide(AI_MANAGER, AI_STADIUM, AI_MAIN_DECK)

  return {
    phase: 'mulligan',
    turn: 1,
    activePlayer: 'player',
    player: playerSide,
    ai: aiSide,
    pendingAttack: null,
    log: [{ id: 1, text: 'Match begins! Klöpff vs Ancellión.', accent: 'neutral' }],
    winner: null,
    logSeq: 1,
  }
}

// ── Play a card from hand ─────────────────────────────────────────────────────
function playCardFromHand(state: BattleState, side: 'player' | 'ai', handIndex: number): BattleState {
  const sideData = state[side]
  const card = sideData.hand[handIndex]
  if (!card) return state

  // Cost reduction from manager
  let cost = card.cost
  if (sideData.managerCard.id === 'mgr-001') {
    // Guardián: Precision or Tactical -1
    if (card.aspects.includes('Precision' as TCGAspect) || card.aspects.includes('Tactical' as TCGAspect)) {
      cost = Math.max(0, cost - 1)
    }
  }

  if (sideData.actionsLeft < cost) return state

  const newHand = sideData.hand.filter((_, i) => i !== handIndex)
  let newSide: BattleSide = { ...sideData, hand: newHand, actionsLeft: sideData.actionsLeft - cost }

  let logText = ''

  if (card.type === 'Player') {
    const pc = card as TCGPlayerCard
    if (newSide.field.length >= 4) return state  // field full
    const unit: FieldUnit = {
      uid: nextUid(card.id),
      card: pc,
      hp: pc.hp,
      exhausted: true,   // can't attack turn it's played
      justPlayed: true,
      atkBonus: 0, defBonus: 0,
    }
    const units = applyManagerBonus([...newSide.field, unit], newSide.managerCard)
    newSide = { ...newSide, field: units }
    logText = `${side === 'player' ? '👤' : '🤖'} played ${pc.name} (${pc.position}, ${effectiveAtk({...unit, atkBonus: unit.atkBonus})}/${effectiveDef({...unit, defBonus: unit.defBonus})})`

  } else if (card.type === 'Tactic') {
    // Resolve tactic effects
    const result = resolveTactic(state, side, card, newSide)
    newSide = result.side
    logText = result.log
    state = result.state

  } else if (card.type === 'Upgrade') {
    // Attach to first friendly Player on field (or pick randomly)
    if (newSide.field.length === 0) {
      // No target — refund
      newSide = { ...newSide, hand: [...newHand, card], actionsLeft: newSide.actionsLeft + cost }
      return state
    }
    const target = newSide.field[0]
    let atkB = 0, defB = 0
    if (card.id === 'upg-001') atkB = 2         // Golden Boot
    if (card.id === 'upg-002') {}                // Armband (captain passive — skip for now)
    if (card.id === 'upg-003') atkB = 1         // Sprint Boots
    if (card.id === 'upg-004') defB = 2         // Iron Shin Pads
    if (card.id === 'upg-005') {}                // Playmaker Band — skip
    if (card.id === 'upg-006') defB = 1         // Press High Kit (tracked as DEF for simplicity)
    const updated = { ...target, atkBonus: target.atkBonus + atkB, defBonus: target.defBonus + defB }
    newSide = { ...newSide, field: newSide.field.map(u => u.uid === target.uid ? updated : u) }
    logText = `${side === 'player' ? '👤' : '🤖'} attached ${card.name} to ${target.card.name}`
  }

  const newState: BattleState = { ...state, [side]: newSide }
  const withLog = addLog(newState, logText, side === 'player' ? 'player' : 'ai')
  const w = checkWinner(withLog)
  return w ? { ...withLog, winner: w, phase: 'game-over' } : withLog
}

// ── Tactic resolution ─────────────────────────────────────────────────────────
function resolveTactic(
  state: BattleState, side: 'player' | 'ai',
  card: TCGCard, currentSide: BattleSide
): { state: BattleState; side: BattleSide; log: string } {
  const opponentKey = side === 'player' ? 'ai' : 'player'
  let opponent = state[opponentKey]
  let updatedCurrentSide = currentSide
  let log = `${side === 'player' ? '👤' : '🤖'} played ${card.name}`

  if (card.id === 'tac-001') {
    // El Clásico Press: +2 ATK to all your players this turn (as temp bonus)
    updatedCurrentSide = {
      ...currentSide,
      field: currentSide.field.map(u => ({ ...u, atkBonus: u.atkBonus + 2 })),
    }
    log = `⚡ ${card.name}: all your players gain +2 ATK this turn!`

  } else if (card.id === 'tac-002') {
    // Tiki-Taka: draw 2
    const { side: drawn } = drawN(currentSide, 2)
    updatedCurrentSide = drawn
    log = `🔄 ${card.name}: drew 2 cards!`

  } else if (card.id === 'tac-003') {
    // Route One: 3 direct damage to opponent stadium
    opponent = { ...opponent, stadiumHp: opponent.stadiumHp - 3 }
    log = `🎯 ${card.name}: dealt 3 direct damage to opponent's ${opponent.stadiumCard.name}!`

  } else if (card.id === 'tac-004') {
    // False Nine: first Player on field +3 ATK
    if (currentSide.field.length > 0) {
      const target = currentSide.field[0]
      updatedCurrentSide = {
        ...currentSide,
        field: currentSide.field.map(u => u.uid === target.uid ? { ...u, atkBonus: u.atkBonus + 3 } : u),
      }
      log = `🎭 ${card.name}: ${currentSide.field[0].card.name} gains +3 ATK!`
    }

  } else if (card.id === 'tac-005') {
    // Turbo Sprint: first Pace player +4 ATK
    const paceUnit = currentSide.field.find(u => u.card.aspects.includes('Pace' as TCGAspect))
    if (paceUnit) {
      updatedCurrentSide = {
        ...currentSide,
        field: currentSide.field.map(u => u.uid === paceUnit.uid ? { ...u, atkBonus: u.atkBonus + 4 } : u),
      }
      log = `💨 ${card.name}: ${paceUnit.card.name} blasts with +4 ATK!`
    }

  } else if (card.id === 'tac-007') {
    // Set Piece Special: deal 4 to stadium
    opponent = { ...opponent, stadiumHp: opponent.stadiumHp - 4 }
    log = `🏋️ ${card.name}: GOAL! Dealt 4 damage to the stadium!`

  } else if (card.id === 'tac-008') {
    // GEGENPRESS: exhaust all enemy players
    opponent = { ...opponent, field: opponent.field.map(u => ({ ...u, exhausted: true })) }
    log = `🔴 ${card.name}: ALL enemy players are exhausted! They can't block!`

  } else if (card.id === 'tac-009') {
    // Counter-Strike: free attack with first ready unit
    const ready = currentSide.field.find(u => !u.exhausted)
    if (ready && opponent.stadiumHp > 0) {
      const dmg = effectiveAtk(ready)
      opponent = { ...opponent, stadiumHp: Math.max(0, opponent.stadiumHp - dmg) }
      updatedCurrentSide = {
        ...currentSide,
        field: currentSide.field.map(u => u.uid === ready.uid ? { ...u, exhausted: true } : u),
      }
      log = `🏹 ${card.name}: ${ready.card.name} launched a free attack for ${dmg} damage!`
    }

  } else if (card.id === 'tac-010') {
    // Offside Trap: draw 1 + negate next attack (simplified: just draw 1)
    const { side: drawn } = drawN(currentSide, 1)
    updatedCurrentSide = drawn
    log = `🚩 ${card.name}: perfect timing — drew 1 card!`
  }

  const newState = { ...state, [opponentKey]: opponent }
  return { state: newState, side: updatedCurrentSide, log }
}

// ── Attack ────────────────────────────────────────────────────────────────────
function resolveAttack(
  state: BattleState,
  attackerSide: 'player' | 'ai',
  attackerUid: string,
  targetType: 'unit' | 'stadium',
  targetUid?: string,
): BattleState {
  const defenderSide = attackerSide === 'player' ? 'ai' : 'player'
  let atkSide = state[attackerSide]
  let defSide = state[defenderSide]

  const attacker = atkSide.field.find(u => u.uid === attackerUid)
  if (!attacker || attacker.exhausted) return state

  const atk = effectiveAtk(attacker)

  let s: BattleState = { ...state, pendingAttack: null }

  if (targetType === 'stadium') {
    // Deal ATK damage to opponent stadium directly
    const dmg = atk
    defSide = { ...defSide, stadiumHp: Math.max(0, defSide.stadiumHp - dmg) }
    atkSide = { ...atkSide, field: atkSide.field.map(u => u.uid === attackerUid ? { ...u, exhausted: true } : u) }
    s = { ...s, [attackerSide]: atkSide, [defenderSide]: defSide }
    s = addLog(s, `⚽ ${attacker.card.name} drives forward — ${dmg} damage to ${defSide.stadiumCard.name}!`,
      attackerSide === 'player' ? 'player' : 'ai')

  } else if (targetType === 'unit' && targetUid) {
    // Combat between units
    const target = defSide.field.find(u => u.uid === targetUid)
    if (!target) return state

    const targetDef = effectiveDef(target)
    const damage = Math.max(1, atk - targetDef)
    const newTargetHp = target.hp - damage

    // Counterattack: if target not exhausted, it strikes back
    const counterAtk = effectiveAtk(target)
    const attackerDef = effectiveDef(attacker)
    const counterDmg = Math.max(0, counterAtk - attackerDef)
    const newAtkHp = attacker.hp - counterDmg

    // Klöpff bonus: if defender survives and is on player's side, gain +1 ATK
    let atkSideUpdated = atkSide.field.map(u => {
      if (u.uid !== attackerUid) return u
      return { ...u, hp: newAtkHp, exhausted: true }
    })

    let defSideUnits = defSide.field.map(u => {
      if (u.uid !== targetUid) return u
      return { ...u, hp: newTargetHp }
    })

    // Klöpff passive: if this is defender's side and they survived, they get +1 ATK
    if (defenderSide === 'player' && state.player.managerCard.id === 'mgr-002') {
      const survived = defSideUnits.find(u => u.uid === targetUid && u.hp > 0)
      if (survived) {
        defSideUnits = defSideUnits.map(u => u.uid === targetUid ? { ...u, atkBonus: u.atkBonus + 1 } : u)
      }
    }

    // Remove defeated units
    const attackerDefeated = newAtkHp <= 0
    const targetDefeated   = newTargetHp <= 0
    if (attackerDefeated) atkSideUpdated = atkSideUpdated.filter(u => u.uid !== attackerUid)
    if (targetDefeated)   defSideUnits   = defSideUnits.filter(u => u.uid !== targetUid)

    atkSide = { ...atkSide, field: atkSideUpdated }
    defSide = { ...defSide, field: defSideUnits }
    s = { ...s, [attackerSide]: atkSide, [defenderSide]: defSide }

    const logParts: string[] = []
    logParts.push(`⚔️ ${attacker.card.name} (${atk} ATK) vs ${target.card.name} (${targetDef} DEF) — ${damage} dmg`)
    if (counterDmg > 0) logParts.push(`${target.card.name} strikes back for ${counterDmg}!`)
    if (targetDefeated)   logParts.push(`💀 ${target.card.name} is DEFEATED!`)
    if (attackerDefeated) logParts.push(`💀 ${attacker.card.name} is DEFEATED!`)

    s = addLog(s, logParts.join(' '), damage >= target.hp * 0.7 ? 'crit' : attackerSide === 'player' ? 'player' : 'ai')
    if (targetDefeated) s = addLog(s, `💀 ${target.card.name} has been eliminated!`, 'death')
  }

  const w = checkWinner(s)
  return w ? { ...s, winner: w, phase: 'game-over' } : s
}

// ── Start of turn ─────────────────────────────────────────────────────────────
function startTurn(state: BattleState, side: 'player' | 'ai'): BattleState {
  const turn = state.turn
  const maxAct = actionsForTurn(turn)
  const oldSide = state[side]

  // Draw 1 card
  const { side: afterDraw } = drawN(oldSide, 1)

  // Refresh exhausted units, clear justPlayed
  const refreshed: BattleSide = {
    ...afterDraw,
    actionsLeft: maxAct,
    maxActions: maxAct,
    field: afterDraw.field.map(u => ({ ...u, exhausted: false, justPlayed: false })),
  }

  let s = addLog(
    { ...state, [side]: refreshed, activePlayer: side, pendingAttack: null },
    `── Turn ${turn} · ${side === 'player' ? '👤 YOUR TURN' : '🤖 AI TURN'} · ${maxAct} actions ──`,
    'neutral',
  )

  if (side === 'player') {
    s = { ...s, phase: 'player-main' }
  }
  return s
}

// ── End of turn ───────────────────────────────────────────────────────────────
function endTurn(state: BattleState): BattleState {
  const nextSide = state.activePlayer === 'player' ? 'ai' : 'player'
  const nextTurn = nextSide === 'player' ? state.turn + 1 : state.turn
  const s: BattleState = { ...state, turn: nextTurn, phase: nextSide === 'ai' ? 'ai-turn' : 'player-main' }
  return startTurn(s, nextSide)
}

// ── AI turn logic ─────────────────────────────────────────────────────────────
function runAIStep(state: BattleState): { state: BattleState; done: boolean } {
  let s = state
  const ai = s.ai

  // 1. Try to play the most expensive affordable Player that fits
  if (ai.field.length < 4 && ai.actionsLeft > 0) {
    const playable = ai.hand
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.type === 'Player' && c.cost <= ai.actionsLeft)
      .sort((a, b) => b.c.cost - a.c.cost)

    if (playable.length > 0) {
      s = playCardFromHand(s, 'ai', playable[0].i)
      return { state: s, done: false }
    }
  }

  // 2. Try to play cheapest affordable Tactic
  if (s.ai.actionsLeft > 0) {
    const tacticIdx = s.ai.hand.findIndex(c =>
      (c.type === 'Tactic' || c.type === 'Upgrade') && c.cost <= s.ai.actionsLeft
    )
    if (tacticIdx >= 0) {
      s = playCardFromHand(s, 'ai', tacticIdx)
      return { state: s, done: false }
    }
  }

  // 3. Attack with all ready units
  const readyUnit = s.ai.field.find(u => !u.exhausted)
  if (readyUnit) {
    const playerField = s.player.field
    if (playerField.length > 0) {
      // Attack weakest enemy player
      const weakest = [...playerField].sort((a, b) => a.hp - b.hp)[0]
      s = resolveAttack(s, 'ai', readyUnit.uid, 'unit', weakest.uid)
    } else {
      // No defenders — attack stadium
      s = resolveAttack(s, 'ai', readyUnit.uid, 'stadium')
    }
    return { state: s, done: false }
  }

  // 4. Nothing more to do — end turn
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

// ── Field Unit Card ───────────────────────────────────────────────────────────
interface FieldUnitCardProps {
  unit: FieldUnit
  side: 'player' | 'ai'
  selected?: boolean
  validTarget?: boolean
  onClick?: () => void
}

function FieldUnitCard({ unit, selected, validTarget, onClick }: FieldUnitCardProps) {
  const accent = ASPECT_COLORS[unit.card.aspects[0]]
  const atk = effectiveAtk(unit)
  const def = effectiveDef(unit)
  const hpPct = (unit.hp / unit.card.hp) * 100

  return (
    <div
      onClick={onClick}
      style={{
        width: 72, flexShrink: 0,
        borderRadius: 8,
        background: selected
          ? `linear-gradient(160deg, ${accent.bg}88, var(--bg-2))`
          : validTarget
          ? 'linear-gradient(160deg, rgba(255,71,103,0.25), var(--bg-2))'
          : `linear-gradient(160deg, ${accent.bg}44, var(--bg-2))`,
        border: selected
          ? `2px solid ${accent.text}`
          : validTarget
          ? '2px solid var(--red-1)'
          : unit.exhausted
          ? '1px solid rgba(255,255,255,0.08)'
          : `1px solid ${accent.text}55`,
        opacity: unit.exhausted ? 0.55 : 1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        overflow: 'hidden',
        position: 'relative',
        transform: selected ? 'translateY(-4px)' : validTarget ? 'translateY(-2px)' : 'none',
        boxShadow: selected
          ? `0 6px 20px ${accent.glow}`
          : validTarget
          ? '0 4px 12px rgba(255,71,103,0.4)'
          : 'none',
      }}
    >
      {/* Exhausted overlay */}
      {unit.exhausted && (
        <div style={{
          position: 'absolute', top: 2, right: 3, fontSize: 10, opacity: 0.7,
          fontFamily: 'var(--font-mono)', color: 'var(--ink-3)',
        }}>⟳</div>
      )}

      {/* Art */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${accent.bg}88, rgba(0,0,0,0.3))`,
        fontSize: 26, position: 'relative',
      }}>
        {unit.card.emoji}
        {/* Position badge */}
        <div style={{
          position: 'absolute', bottom: 2, left: 3,
          fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700,
          color: accent.text, background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '1px 3px',
        }}>
          {unit.card.position}
        </div>
      </div>

      {/* Name */}
      <div style={{
        fontSize: 8, fontWeight: 700, color: 'var(--ink-0)',
        padding: '3px 4px 1px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}>
        {unit.card.name.split(' ')[0]}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px 3px', fontSize: 9 }}>
        <span style={{ color: accent.text, fontWeight: 800 }}>{atk}⚔</span>
        <span style={{ color: '#4488ff', fontWeight: 800 }}>{def}🛡</span>
      </div>

      {/* HP Bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
        <div style={{
          width: `${hpPct}%`, height: '100%',
          background: hpPct > 50 ? '#44ff9e' : hpPct > 25 ? '#ffd66b' : '#ff4767',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ fontSize: 7, textAlign: 'center', color: 'var(--ink-3)', padding: '1px 0 2px', fontFamily: 'var(--font-mono)' }}>
        {unit.hp}/{unit.card.hp}
      </div>
    </div>
  )
}

// ── Hand Card ─────────────────────────────────────────────────────────────────
function HandCard({
  card, selected, playable, onClick,
}: { card: TCGCard; selected: boolean; playable: boolean; onClick: () => void }) {
  const accent = ASPECT_COLORS[card.aspects[0]]
  const isPlayer = card.type === 'Player'
  const pc = isPlayer ? card as TCGPlayerCard : null

  return (
    <div
      onClick={onClick}
      style={{
        width: 68, flexShrink: 0,
        borderRadius: 8,
        background: selected
          ? `linear-gradient(160deg, ${accent.bg}99, var(--bg-1))`
          : `linear-gradient(160deg, ${accent.bg}44, var(--bg-2))`,
        border: selected
          ? `2px solid ${accent.text}`
          : playable
          ? `1px solid ${accent.text}66`
          : '1px solid rgba(255,255,255,0.08)',
        opacity: playable ? 1 : 0.4,
        cursor: playable ? 'pointer' : 'not-allowed',
        transform: selected ? 'translateY(-8px)' : 'none',
        transition: 'all 0.15s',
        overflow: 'hidden',
        boxShadow: selected ? `0 8px 24px ${accent.glow}` : 'none',
      }}
    >
      {/* Art */}
      <div style={{
        height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${accent.bg}88, rgba(0,0,0,0.3))`,
        fontSize: 22, position: 'relative',
      }}>
        {card.emoji}
        {/* Cost orb */}
        <div style={{
          position: 'absolute', bottom: 2, right: 3,
          width: 16, height: 16, borderRadius: '50%',
          background: accent.bg, border: `1px solid ${accent.text}88`,
          display: 'grid', placeItems: 'center',
          fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--ink-0)',
        }}>
          {card.cost}
        </div>
      </div>

      {/* Name */}
      <div style={{
        fontSize: 8, fontWeight: 700, color: 'var(--ink-0)',
        padding: '3px 4px 1px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {card.name.split(' ')[0]}
      </div>

      {/* Type / Stats */}
      <div style={{ padding: '0 4px 4px', fontSize: 8 }}>
        {isPlayer && pc ? (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: accent.text }}>{pc.atk}⚔</span>
            <span style={{ color: '#4488ff' }}>{pc.def}🛡</span>
          </div>
        ) : (
          <div style={{ color: 'var(--ink-3)', fontSize: 7, letterSpacing: '0.05em' }}>
            {card.type.toUpperCase()}
          </div>
        )}
      </div>

      {/* Aspect dots */}
      <div style={{ display: 'flex', gap: 2, padding: '0 4px 4px' }}>
        {card.aspects.map(a => <AspectDot key={a} aspect={a} size={10} />)}
      </div>
    </div>
  )
}

// ── Stadium HP Bar ────────────────────────────────────────────────────────────
function StadiumBar({
  card, hp, maxHp, manager,
}: {
  card: TCGStadiumCard; hp: number; maxHp: number
  manager: TCGManagerCard
}) {
  const pct = Math.max(0, (hp / maxHp) * 100)
  const accent = ASPECT_COLORS[card.aspects[0]]

  return (
    <div style={{
      padding: '10px 14px',
      background: `linear-gradient(90deg, ${accent.bg}33, transparent)`,
      border: `1px solid ${accent.text}33`,
      borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* Manager emoji */}
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: accent.bg, display: 'grid', placeItems: 'center',
        fontSize: 20, boxShadow: `0 0 10px ${accent.glow}`,
        border: `1px solid ${accent.text}55`,
      }}>
        {manager.emoji}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {card.name}
            </div>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
              MGR: {manager.name.split(' ')[0]}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: pct > 40 ? '#44ff9e' : '#ff4767', lineHeight: 1 }}>
              {hp}
            </div>
            <div style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>/ {maxHp} HP</div>
          </div>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 3,
            background: pct > 60 ? '#44ff9e' : pct > 30 ? '#ffd66b' : '#ff4767',
            boxShadow: pct <= 30 ? '0 0 6px rgba(255,71,103,0.6)' : 'none',
            transition: 'width 0.4s ease, background 0.4s ease',
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
    neutral: 'var(--ink-2)',
    player:  'var(--cyan-1)',
    ai:      'var(--red-0)',
    crit:    'var(--gold-1)',
    death:   'var(--red-1)',
    draw:    'var(--purple-1)',
  }

  return (
    <div ref={ref} style={{
      height: '100%', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 3,
      padding: 8, scrollbarWidth: 'thin',
    }}>
      {entries.map(e => (
        <div key={e.id} style={{
          fontSize: 10, lineHeight: 1.4, color: colors[e.accent],
          padding: '3px 6px',
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

// ── Action tokens ─────────────────────────────────────────────────────────────
function ActionTokens({ left, max }: { left: number; max: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 14, height: 14, borderRadius: '50%',
          background: i < left ? 'var(--gold-1)' : 'rgba(255,255,255,0.08)',
          boxShadow: i < left ? '0 0 6px var(--gold-glow)' : 'none',
          transition: 'all 0.2s',
          border: `1px solid ${i < left ? 'var(--gold-2)' : 'rgba(255,255,255,0.1)'}`,
        }} />
      ))}
      <span style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginLeft: 2 }}>
        {left}/{max}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Battle Component
// ─────────────────────────────────────────────────────────────────────────────

interface TCGBattleProps {
  onExit: () => void
}

export function TCGBattle({ onExit }: TCGBattleProps) {
  const [state, setState]           = useState<BattleState>(() => initBattle())
  const [selectedHandIdx, setSelectedHandIdx] = useState<number | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const aiRunRef = useRef(false)

  // ── AI turn runner ─────────────────────────────────────────────────────────
  const runAI = useCallback((currentState: BattleState) => {
    if (aiRunRef.current) return
    aiRunRef.current = true
    setAiThinking(true)

    function step(s: BattleState) {
      if (s.phase === 'game-over') {
        setState(s)
        setAiThinking(false)
        aiRunRef.current = false
        return
      }
      if (s.phase !== 'ai-turn') {
        setState(s)
        setAiThinking(false)
        aiRunRef.current = false
        return
      }

      setTimeout(() => {
        const { state: next, done } = runAIStep(s)
        if (done || next.phase !== 'ai-turn') {
          setState(next)
          setAiThinking(false)
          aiRunRef.current = false
        } else {
          setState(next)
          step(next)
        }
      }, 600)
    }

    setTimeout(() => step(currentState), 400)
  }, [])

  useEffect(() => {
    if (state.phase === 'ai-turn' && !aiRunRef.current) {
      runAI(state)
    }
  }, [state.phase, runAI])

  // ── Actions ────────────────────────────────────────────────────────────────
  function handleMulligan(keep: boolean) {
    if (keep) {
      setState(s => startTurn(s, 'player'))
    } else {
      setState(s => {
        // Shuffle hand back, draw new 6
        const combined = [...s.player.hand, ...s.player.deck]
        const reshuffled = shuffle(combined)
        const newPlayer: BattleSide = {
          ...s.player, hand: reshuffled.slice(0, 6), deck: reshuffled.slice(6),
        }
        return startTurn({ ...s, player: newPlayer }, 'player')
      })
    }
  }

  function handleSelectHandCard(idx: number) {
    if (state.phase !== 'player-main') return
    setSelectedHandIdx(prev => prev === idx ? null : idx)
  }

  function handlePlayCard() {
    if (selectedHandIdx === null) return
    const card = state.player.hand[selectedHandIdx]
    if (!card) return

    // Cost check with manager bonus
    let cost = card.cost
    if (state.player.managerCard.id === 'mgr-001' &&
        (card.aspects.includes('Precision' as TCGAspect) || card.aspects.includes('Tactical' as TCGAspect))) {
      cost = Math.max(0, cost - 1)
    }
    if (state.player.actionsLeft < cost) return
    if (card.type === 'Player' && state.player.field.length >= 4) return

    setState(s => playCardFromHand(s, 'player', selectedHandIdx))
    setSelectedHandIdx(null)
  }

  function handleSelectAttacker(uid: string) {
    if (state.phase !== 'player-main') return
    const unit = state.player.field.find(u => u.uid === uid)
    if (!unit || unit.exhausted) return
    setSelectedHandIdx(null)
    setState(s => ({
      ...s,
      pendingAttack: s.pendingAttack?.attackerUid === uid ? null : { attackerUid: uid },
    }))
  }

  function handleAttackUnit(targetUid: string) {
    if (!state.pendingAttack) return
    setState(s => resolveAttack(s, 'player', s.pendingAttack!.attackerUid, 'unit', targetUid))
  }

  function handleAttackStadium() {
    if (!state.pendingAttack) return
    setState(s => resolveAttack(s, 'player', s.pendingAttack!.attackerUid, 'stadium'))
  }

  function handleEndTurn() {
    if (state.phase !== 'player-main') return
    setSelectedHandIdx(null)
    setState(s => endTurn(s))
  }

  function handleRestart() {
    aiRunRef.current = false
    setAiThinking(false)
    setSelectedHandIdx(null)
    setState(initBattle())
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const { player, ai, phase, pendingAttack } = state
  const isPlayerTurn   = phase === 'player-main'
  const selectedCard   = selectedHandIdx !== null ? player.hand[selectedHandIdx] : null

  // Can we play the selected card?
  let selectedCost = selectedCard?.cost ?? 0
  if (selectedCard && player.managerCard.id === 'mgr-001' &&
      (selectedCard.aspects.includes('Precision' as TCGAspect) || selectedCard.aspects.includes('Tactical' as TCGAspect))) {
    selectedCost = Math.max(0, selectedCost - 1)
  }
  const canPlaySelected = selectedCard
    ? player.actionsLeft >= selectedCost &&
      (selectedCard.type !== 'Player' || player.field.length < 4)
    : false

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
      background: 'var(--bg-0)',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ── Mulligan overlay ── */}
      {phase === 'mulligan' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(4,6,13,0.92)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 24, padding: 24,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink-0)', letterSpacing: '0.06em' }}>
            OPENING HAND
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-2)', textAlign: 'center', maxWidth: 360 }}>
            Review your starting hand. You can mulligan once — shuffle back and redraw 6.
          </div>
          {/* Show hand */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {player.hand.map((c, i) => (
              <HandCard key={i} card={c} selected={false} playable onClick={() => {}} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => handleMulligan(true)}
              style={{
                padding: '10px 28px', borderRadius: 10, fontFamily: 'var(--font-display)',
                fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer',
                background: 'var(--green-2)', border: '1px solid var(--green-1)',
                color: 'var(--ink-0)',
              }}
            >
              KEEP HAND
            </button>
            <button
              onClick={() => handleMulligan(false)}
              style={{
                padding: '10px 28px', borderRadius: 10, fontFamily: 'var(--font-display)',
                fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer',
                background: 'transparent', border: '1px solid var(--line)',
                color: 'var(--ink-2)',
              }}
            >
              MULLIGAN
            </button>
          </div>
        </div>
      )}

      {/* ── Game Over overlay ── */}
      {phase === 'game-over' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(4,6,13,0.92)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
        }}>
          <div style={{ fontSize: 64, lineHeight: 1 }}>
            {state.winner === 'player' ? '🏆' : '💀'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, letterSpacing: '0.08em', color: state.winner === 'player' ? 'var(--gold-1)' : 'var(--red-1)' }}>
            {state.winner === 'player' ? 'VICTORY!' : 'DEFEAT'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'center' }}>
            {state.winner === 'player'
              ? `${ai.stadiumCard.name} has fallen! Final HP: ${Math.max(0, ai.stadiumHp)}`
              : `${player.stadiumCard.name} couldn't hold out. Final HP: ${Math.max(0, player.stadiumHp)}`}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={handleRestart} style={{
              padding: '10px 28px', borderRadius: 10, fontFamily: 'var(--font-display)',
              fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer',
              background: 'var(--bg-2)', border: '1px solid var(--gold-1)', color: 'var(--gold-1)',
            }}>
              REMATCH
            </button>
            <button onClick={onExit} style={{
              padding: '10px 28px', borderRadius: 10, fontFamily: 'var(--font-display)',
              fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-2)',
            }}>
              EXIT
            </button>
          </div>
        </div>
      )}

      {/* ── Header Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'var(--bg-1)', borderBottom: '1px solid var(--line)',
        flexShrink: 0,
      }}>
        <button onClick={onExit} style={{
          fontSize: 9, letterSpacing: '0.1em', fontFamily: 'var(--font-display)',
          color: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6,
          background: 'transparent', cursor: 'pointer', padding: '4px 10px',
        }}>
          ← STUDIO
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink-0)', letterSpacing: '0.08em' }}>
          ⚽ TCG BATTLE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>TURN {state.turn}</div>
          <div style={{
            fontSize: 9, fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
            color: isPlayerTurn ? 'var(--cyan-1)' : aiThinking ? 'var(--red-0)' : 'var(--ink-3)',
            padding: '3px 8px', borderRadius: 6,
            background: isPlayerTurn ? 'rgba(37,224,255,0.1)' : aiThinking ? 'rgba(255,128,149,0.1)' : 'transparent',
            border: `1px solid ${isPlayerTurn ? 'rgba(37,224,255,0.3)' : aiThinking ? 'rgba(255,128,149,0.3)' : 'var(--line)'}`,
          }}>
            {isPlayerTurn ? 'YOUR TURN' : aiThinking ? 'AI THINKING…' : phase.toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Main playmat + log ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ── Playmat ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '10px 12px', gap: 8 }}>

          {/* AI SIDE */}
          {/* AI Stadium */}
          <StadiumBar card={ai.stadiumCard} hp={ai.stadiumHp} maxHp={ai.stadiumCard.hp} manager={ai.managerCard} />

          {/* AI Hand (face down) */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', width: 50, flexShrink: 0 }}>
              HAND {ai.hand.length}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {ai.hand.map((_, i) => (
                <div key={i} style={{
                  width: 28, height: 38, borderRadius: 5,
                  background: 'linear-gradient(135deg, #1a0535, #0d1020)',
                  border: '1px solid rgba(185,107,255,0.3)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  fontSize: 12, display: 'grid', placeItems: 'center', color: 'rgba(185,107,255,0.3)',
                }}>
                  ♟
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginLeft: 8 }}>
              DECK {ai.deck.length}
            </div>
          </div>

          {/* AI Field */}
          <div style={{
            minHeight: 100, flex: 1,
            background: 'linear-gradient(180deg, rgba(220,40,60,0.04), rgba(10,15,28,0.8))',
            border: '1px solid rgba(220,40,60,0.15)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            flexWrap: 'wrap',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 5, left: 8, fontSize: 8, color: 'rgba(220,40,60,0.5)', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>
              AI FIELD
            </div>

            {/* Attack stadium button */}
            {pendingAttack && (
              <div
                onClick={handleAttackStadium}
                style={{
                  position: 'absolute', top: 4, right: 8,
                  padding: '4px 10px', borderRadius: 6, fontSize: 9, fontFamily: 'var(--font-display)',
                  letterSpacing: '0.08em', cursor: 'pointer',
                  background: 'rgba(255,71,103,0.2)', border: '1px solid var(--red-1)',
                  color: 'var(--red-1)', animation: 'glow-pulse 1s ease-in-out infinite',
                }}
              >
                ⚽ ATTACK STADIUM
              </div>
            )}

            {ai.field.length === 0 ? (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', width: '100%', textAlign: 'center' }}>
                — no units deployed —
              </div>
            ) : (
              ai.field.map(unit => (
                <FieldUnitCard
                  key={unit.uid} unit={unit} side="ai"
                  validTarget={!!pendingAttack}
                  onClick={pendingAttack ? () => handleAttackUnit(unit.uid) : undefined}
                />
              ))
            )}
          </div>

          {/* ── Divider ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>
              ⚽ PITCH
            </div>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          {/* Player Field */}
          <div style={{
            minHeight: 100, flex: 1,
            background: 'linear-gradient(0deg, rgba(37,224,255,0.04), rgba(10,15,28,0.8))',
            border: '1px solid rgba(37,224,255,0.15)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            flexWrap: 'wrap',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 5, left: 8, fontSize: 8, color: 'rgba(37,224,255,0.5)', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>
              YOUR FIELD
            </div>
            {player.field.length === 0 ? (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', width: '100%', textAlign: 'center' }}>
                — play a Player card to deploy —
              </div>
            ) : (
              player.field.map(unit => (
                <FieldUnitCard
                  key={unit.uid} unit={unit} side="player"
                  selected={pendingAttack?.attackerUid === unit.uid}
                  onClick={isPlayerTurn && !unit.exhausted ? () => handleSelectAttacker(unit.uid) : undefined}
                />
              ))
            )}
          </div>

          {/* Player Stadium */}
          <StadiumBar card={player.stadiumCard} hp={player.stadiumHp} maxHp={player.stadiumCard.hp} manager={player.managerCard} />

          {/* Player Hand + Controls */}
          <div style={{
            borderTop: '1px solid var(--line)', paddingTop: 8, flexShrink: 0,
          }}>
            {/* Hand header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                HAND ({player.hand.length}) · DECK {player.deck.length}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ActionTokens left={player.actionsLeft} max={player.maxActions} />
              </div>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'thin', alignItems: 'flex-end' }}>
              {player.hand.map((c, i) => {
                let cost = c.cost
                if (player.managerCard.id === 'mgr-001' &&
                    (c.aspects.includes('Precision' as TCGAspect) || c.aspects.includes('Tactical' as TCGAspect))) {
                  cost = Math.max(0, cost - 1)
                }
                return (
                  <HandCard
                    key={i} card={c}
                    selected={selectedHandIdx === i}
                    playable={isPlayerTurn && player.actionsLeft >= cost && (c.type !== 'Player' || player.field.length < 4)}
                    onClick={() => handleSelectHandCard(i)}
                  />
                )
              })}
              {player.hand.length === 0 && (
                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontStyle: 'italic', padding: '20px 0' }}>
                  No cards in hand — your deck will refresh each turn.
                </div>
              )}
            </div>

            {/* Selected card preview + actions */}
            {isPlayerTurn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                {selectedCard && (
                  <div style={{
                    flex: 1, padding: '6px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
                    fontSize: 10, color: 'var(--ink-1)',
                    display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
                  }}>
                    <span style={{ fontSize: 16 }}>{selectedCard.emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedCard.name}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Cost: {selectedCost} · {selectedCard.ability.slice(0, 60)}…
                      </div>
                    </div>
                    <button
                      onClick={handlePlayCard}
                      disabled={!canPlaySelected}
                      style={{
                        flexShrink: 0, padding: '6px 14px', borderRadius: 7,
                        fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.08em',
                        cursor: canPlaySelected ? 'pointer' : 'not-allowed',
                        background: canPlaySelected ? 'var(--green-2)' : 'transparent',
                        border: canPlaySelected ? '1px solid var(--green-1)' : '1px solid var(--line)',
                        color: canPlaySelected ? 'var(--ink-0)' : 'var(--ink-3)',
                      }}
                    >
                      PLAY
                    </button>
                  </div>
                )}

                {pendingAttack && !selectedCard && (
                  <div style={{
                    flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 10,
                    color: 'var(--red-1)',
                    background: 'rgba(255,71,103,0.06)', border: '1px solid rgba(255,71,103,0.3)',
                  }}>
                    ⚔️ Attacker selected — click an enemy Player or use <strong>ATTACK STADIUM</strong> above
                  </div>
                )}

                {!selectedCard && !pendingAttack && (
                  <div style={{
                    flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 10, color: 'var(--ink-3)',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)',
                  }}>
                    {player.field.length > 0
                      ? 'Click a card to play, or click one of your deployed Players to attack'
                      : 'Click a card from your hand to play it on the field'}
                  </div>
                )}

                <button
                  onClick={handleEndTurn}
                  style={{
                    flexShrink: 0, padding: '8px 18px', borderRadius: 8,
                    fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.1em',
                    cursor: 'pointer',
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

        {/* ── Battle Log sidebar ── */}
        <div style={{
          width: 200, flexShrink: 0,
          borderLeft: '1px solid var(--line)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-1)',
        }}>
          <div style={{ padding: '8px 10px 4px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.14em', fontFamily: 'var(--font-mono)' }}>
              MATCH LOG
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <BattleLog entries={state.log} />
          </div>
        </div>
      </div>
    </div>
  )
}
