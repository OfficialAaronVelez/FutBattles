import { useState, useEffect, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore'
import { computeChemBonuses, calcShapeBonus, getCardTrait } from '../../utils/battle'
import type { BattleMatchup, UserCard, FormationSlot, CreateDuel, BattleRound, TacticType, RollBreakdownEntry } from '../../types'

// ─── Narrative helpers ───────────────────────────────────────────────────────

function lastName(name: string): string {
  const p = name.trim().split(' ')
  return p[p.length - 1]
}

function attackNarrative(attack: BattleMatchup, isPlayer: boolean): string {
  const atk     = lastName(attack.attacker.name)
  const def     = lastName(attack.defender.name)
  const lm      = lastName(attack.lastMan.name)
  const beatDef = attack.attackerRoll > attack.defenderRoll
  const margin  = attack.attackerRoll - attack.defenderRoll

  if (attack.scored) {
    if (margin > 15) return `${atk} is unstoppable — blasts past ${def} and beats ${lm}!`
    if (margin > 7)  return `${atk} surges through ${def} and slots it past ${lm}!`
    return `${atk} squeezes past ${def} and finds the corner!`
  }
  if (beatDef) {
    return isPlayer
      ? `${atk} gets past ${def} but ${lm} makes the crucial stop!`
      : `${atk} beats ${def} — your ${lm} is there to deny it!`
  }
  return isPlayer
    ? `${def} reads the run perfectly — ${atk} goes nowhere.`
    : `Your ${def} stands firm — ${atk} can't break through.`
}

function creationNarrative(duel: CreateDuel): string {
  const p = lastName(duel.playerName)
  const a = lastName(duel.aiName)
  return duel.playerWon
    ? `${p} threads it through — your team takes control of the attack.`
    : `${a} wins the ball and releases the counter — AI on the front foot.`
}

function buildMatchStory(rounds: BattleRound[]): string[] {
  const lines: string[] = []
  const pGoals = rounds.filter(r => r.playerScored).map(r => r.roundNum)
  const aGoals = rounds.filter(r => r.aiScored).map(r => r.roundNum)

  if (pGoals.length === 0) {
    lines.push("😶 Couldn't find the net — chances were wasted")
  } else {
    const rStr = pGoals.length === 1
      ? `round ${pGoals[0]}`
      : `rounds ${pGoals.join(' & ')}`
    lines.push(`⚽ Scored in ${rStr}${pGoals.length >= 3 ? ' — clinical finish' : ''}`)
  }

  if (aGoals.length === 0) {
    lines.push('🛡 Clean sheet — defense was airtight all game')
  } else if (aGoals.length === 1) {
    lines.push(`😤 Conceded in round ${aGoals[0]} — one moment cost you`)
  } else {
    lines.push(`😤 Conceded ${aGoals.length} goals — defense needs work`)
  }

  const best = rounds.reduce<{ name: string; roll: number }>(
    (b, r) => r.playerAttack.attackerRoll > b.roll
      ? { name: r.playerAttack.attacker.name, roll: r.playerAttack.attackerRoll }
      : b,
    { name: '', roll: 0 },
  )
  if (best.name) lines.push(`⭐ ${best.name} was your standout performer`)

  return lines
}

// ─── DuelBar ────────────────────────────────────────────────────────────────

function DuelBar({ leftVal, rightVal, leftLabel, rightLabel, leftColor, rightColor }: {
  leftVal: number; rightVal: number
  leftLabel: string; rightLabel: string
  leftColor: string; rightColor: string
}) {
  const [go, setGo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setGo(true), 120); return () => clearTimeout(t) }, [])

  const total    = leftVal + rightVal || 1
  const leftPct  = go ? Math.round((leftVal / total) * 100) : 50
  const rightPct = go ? 100 - leftPct : 50
  const leftWins = leftVal >= rightVal

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: leftWins ? leftColor : 'var(--ink-3)' }}>
          {leftLabel}
        </span>
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: !leftWins ? rightColor : 'var(--ink-3)' }}>
          {rightLabel}
        </span>
      </div>
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
        <div style={{
          width: `${leftPct}%`,
          background: leftColor,
          transition: 'width 0.9s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: leftWins ? `0 0 14px ${leftColor}88` : 'none',
        }} />
        <div style={{
          width: `${rightPct}%`,
          background: rightColor,
          transition: 'width 0.9s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: !leftWins ? `0 0 14px ${rightColor}88` : 'none',
        }} />
      </div>
    </div>
  )
}

// ─── SlideIn ─────────────────────────────────────────────────────────────────

function SlideIn({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ animation: 'slide-up-fade 0.38s cubic-bezier(0.34,1.56,0.64,1) both' }}>
      {children}
    </div>
  )
}

// ─── BreakdownRow ─────────────────────────────────────────────────────────────

function BreakdownRow({ bd, total, sideLabel }: {
  bd: { statBase: number; bonuses: RollBreakdownEntry[]; dice: number }
  total: number
  sideLabel?: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
      fontSize: 9, fontFamily: 'var(--font-mono)', opacity: 0.9,
    }}>
      {sideLabel && (
        <span style={{ color: 'var(--ink-3)', marginRight: 2, flexShrink: 0 }}>{sideLabel}:</span>
      )}
      {/* Base stat chip */}
      <span style={{
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        color: 'var(--ink-2)', padding: '1px 5px', borderRadius: 3,
      }}>
        Base {bd.statBase}
      </span>

      {/* Bonus chips */}
      {bd.bonuses.map((b, i) => (
        <span key={i} style={{
          background: b.value > 0 ? 'rgba(68,255,158,0.08)' : 'rgba(255,71,103,0.08)',
          border: `1px solid ${b.value > 0 ? 'rgba(68,255,158,0.25)' : 'rgba(255,71,103,0.25)'}`,
          color: b.value > 0 ? 'var(--green-1)' : 'var(--red-1)',
          padding: '1px 5px', borderRadius: 3,
        }}>
          {b.label} {b.value > 0 ? '+' : ''}{b.value}
        </span>
      ))}

      {/* Dice chip */}
      <span style={{
        background: 'rgba(185,107,255,0.07)', border: '1px solid rgba(185,107,255,0.2)',
        color: 'var(--purple-1)', padding: '1px 5px', borderRadius: 3,
      }}>
        🎲 {bd.dice >= 0 ? '+' : ''}{bd.dice}
      </span>

      {/* Total */}
      <span style={{ color: 'var(--ink-1)', fontWeight: 800 }}>= {total}</span>
    </div>
  )
}

// ─── GoalFlashOverlay ────────────────────────────────────────────────────────

function GoalFlashOverlay({ side, scorerName }: { side: 'player' | 'ai'; scorerName: string }) {
  const isGoal = side === 'player'
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: isGoal ? 'rgba(4,6,13,0.94)' : 'rgba(18,2,6,0.96)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, animation: 'boom-overlay-in 0.2s ease-out',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: isGoal
          ? 'radial-gradient(ellipse at 50% 50%, rgba(255,214,107,0.18) 0%, transparent 60%)'
          : 'radial-gradient(ellipse at 50% 50%, rgba(255,71,103,0.22) 0%, transparent 60%)',
      }} />
      <div style={{ fontSize: 80, position: 'relative', zIndex: 1,
        animation: 'score-bump 0.55s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        {isGoal ? '⚽' : '😤'}
      </div>
      <div className="font-display" style={{
        fontSize: isGoal ? 100 : 72, lineHeight: 0.88, letterSpacing: '0.04em',
        color: isGoal ? 'var(--gold-1)' : 'var(--red-1)',
        textShadow: isGoal ? '0 0 80px var(--gold-glow)' : '0 0 60px var(--red-glow)',
        animation: 'boom-badge-pop 0.45s 0.08s cubic-bezier(0.34,1.56,0.64,1) both',
        position: 'relative', zIndex: 1,
      }}>
        {isGoal ? 'GOAL!' : 'CONCEDED'}
      </div>
      <div style={{
        fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', marginTop: 6,
        animation: 'boom-plus-pop 0.4s 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        position: 'relative', zIndex: 1,
      }}>
        {scorerName}
      </div>
    </div>
  )
}

// ─── PitchStrip ──────────────────────────────────────────────────────────────

function PitchStrip({ playerGoals, aiGoals, round, total }: {
  playerGoals: number; aiGoals: number; round: number; total: number
}) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #1b4b28 0%, #132d19 100%)',
      padding: '16px 24px 20px', position: 'sticky', top: 0, zIndex: 20,
      overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Grass stripes */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 52px, rgba(0,0,0,0.12) 52px, rgba(0,0,0,0.12) 104px)',
      }} />
      {/* Center line */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 1, height: '75%', background: 'rgba(255,255,255,0.18)',
      }} />
      {/* Center circle (peeking from bottom) */}
      <div style={{
        position: 'absolute', bottom: '-44px', left: '50%', transform: 'translateX(-50%)',
        width: 80, height: 80, borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.18)',
      }} />

      {/* Score row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        position: 'relative', zIndex: 1,
      }}>
        <div className="text-center">
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.18em', fontFamily: 'var(--font-display)' }}>YOU</div>
          <div className="font-display" style={{ fontSize: 54, lineHeight: 1, color: '#ffd66b', textShadow: '0 0 24px rgba(255,214,107,0.65)' }}>
            {playerGoals}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 22, fontWeight: 800 }}>—</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{
                width: i === round - 1 ? 18 : 6, height: 6, borderRadius: 3,
                background: i < round - 1 ? 'rgba(255,214,107,0.65)' : i === round - 1 ? '#ffd66b' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-display)', letterSpacing: '0.12em' }}>
            ROUND {round}/{total}
          </div>
        </div>

        <div className="text-center">
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.18em', fontFamily: 'var(--font-display)' }}>AI</div>
          <div className="font-display" style={{ fontSize: 54, lineHeight: 1, color: '#ff4767', textShadow: '0 0 24px rgba(255,71,103,0.6)' }}>
            {aiGoals}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MomentumPips ─────────────────────────────────────────────────────────────

function MomentumPips({ value, side }: { value: number; side: 'player' | 'ai' }) {
  const isPlayer  = side === 'player'
  const onFire    = value >= 3
  const color     = isPlayer ? 'var(--gold-1)' : 'var(--red-1)'
  const glowColor = isPlayer ? 'rgba(255,214,107,0.7)' : 'rgba(255,71,103,0.7)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isPlayer ? 'flex-start' : 'flex-end', gap: 3 }}>
      <div style={{
        fontSize: 8, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
        color: onFire ? color : 'var(--ink-3)',
        fontWeight: onFire ? 800 : 400,
      }}>
        {onFire ? (isPlayer ? '🔥 ON FIRE' : 'ON FIRE 🔥') : (isPlayer ? 'MOMENTUM' : 'MOMENTUM')}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3].map(pip => (
          <div key={pip} style={{
            width: pip <= value ? 14 : 8, height: 6, borderRadius: 3,
            background: pip <= value ? color : 'rgba(255,255,255,0.1)',
            boxShadow: pip <= value && onFire ? `0 0 8px ${glowColor}` : 'none',
            transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── PlayerPickRow ────────────────────────────────────────────────────────────
// Compact card row used in the attack/defend picker sections

function atkPower(card: UserCard, chem: number): number {
  return Math.round((card.stats.PAC ?? 70) * 0.30 + (card.stats.SHO ?? 70) * 0.45 + (card.stats.DRI ?? 70) * 0.25) + chem
}
function defPower(card: UserCard, chem: number): number {
  return Math.round((card.stats.DEF ?? 70) * 0.60 + (card.stats.PHY ?? 70) * 0.40) + chem
}
function cardOverall(card: UserCard): number {
  const vals = Object.values(card.stats).filter((v): v is number => typeof v === 'number')
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 70
}

function PlayerPickRow({
  card, row, role, power, chem, selected, disabled, isMarked, onClick,
}: {
  card: UserCard; row: number; role: 'attack' | 'defend'
  power: number; chem: number; selected: boolean; disabled: boolean
  isMarked?: boolean
  onClick: () => void
}) {
  const rowColors: Record<number, { bg: string; border: string; text: string }> = {
    3: { bg: 'rgba(255,214,107,0.08)', border: 'rgba(255,214,107,0.25)', text: 'var(--gold-1)' },
    2: { bg: 'rgba(185,107,255,0.08)', border: 'rgba(185,107,255,0.22)', text: 'var(--purple-1)' },
    1: { bg: 'rgba(37,224,255,0.08)',  border: 'rgba(37,224,255,0.22)',  text: 'var(--cyan-1)' },
  }
  const rc = rowColors[row] ?? rowColors[2]

  const selBg  = role === 'attack' ? 'rgba(255,214,107,0.12)' : 'rgba(37,224,255,0.12)'
  const selBdr = role === 'attack' ? 'rgba(255,214,107,0.5)'  : 'rgba(37,224,255,0.5)'
  const selClr = role === 'attack' ? 'var(--gold-1)' : 'var(--cyan-1)'

  const powerPct = Math.round(Math.min(100, ((power - 40) / 59) * 100))
  const powerBg  = role === 'attack'
    ? 'linear-gradient(90deg, var(--gold-2), var(--gold-1))'
    : 'linear-gradient(90deg, var(--cyan-2,#0099bb), var(--cyan-1))'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12,
        background: selected ? selBg : disabled ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${selected ? selBdr : disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.3 : 1,
        transition: 'all 0.15s', textAlign: 'left', width: '100%',
      }}
    >
      {/* Position badge */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: selected ? selBg : rc.bg, border: `1.5px solid ${selected ? selBdr : rc.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
        color: selected ? selClr : rc.text,
      }}>
        {card.position ?? '?'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 14, fontWeight: 700, color: selected ? selClr : isMarked ? 'var(--red-1)' : 'var(--ink-0)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {card.name}
          </span>
          <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--ink-1)', flexShrink: 0 }}>
            {cardOverall(card)}
          </span>
        </div>

        {/* Badges row: man-marked + trait */}
        {(isMarked || getCardTrait(card)) && (
          <div style={{ display: 'flex', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
            {isMarked && (
              <span style={{
                fontSize: 8, fontWeight: 800, letterSpacing: '0.08em',
                color: '#ff7a7a', background: 'rgba(255,71,103,0.12)',
                border: '1px solid rgba(255,71,103,0.3)', padding: '2px 6px', borderRadius: 4,
              }}>
                🎯 MAN-MARKED +12%
              </span>
            )}
            {(() => {
              const t = getCardTrait(card)
              if (!t) return null
              const traitColors: Record<string, { color: string; bg: string; border: string }> = {
                clinical:    { color: 'var(--gold-1)',    bg: 'rgba(255,214,107,0.10)', border: 'rgba(255,214,107,0.3)' },
                engine:      { color: 'var(--purple-1)',  bg: 'rgba(185,107,255,0.10)', border: 'rgba(185,107,255,0.3)' },
                'brick-wall':{ color: 'var(--cyan-1)',    bg: 'rgba(37,224,255,0.10)',  border: 'rgba(37,224,255,0.3)' },
                speedster:   { color: 'var(--green-1)',   bg: 'rgba(68,255,158,0.10)',  border: 'rgba(68,255,158,0.3)' },
                enforcer:    { color: '#ff9a3c',          bg: 'rgba(255,154,60,0.10)',  border: 'rgba(255,154,60,0.3)' },
              }
              const tc = traitColors[t.type] ?? traitColors.engine
              return (
                <span style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
                  color: tc.color, background: tc.bg,
                  border: `1px solid ${tc.border}`, padding: '2px 6px', borderRadius: 4,
                }}>
                  ⚡ {t.label.toUpperCase()}
                </span>
              )
            })()}
          </div>
        )}

        {/* Power bar */}
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 4 }}>
          <div style={{
            height: '100%', borderRadius: 3, width: `${powerPct}%`,
            background: selected ? powerBg : (role === 'attack' ? 'rgba(255,214,107,0.45)' : 'rgba(37,224,255,0.45)'),
            transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            {role === 'attack' ? 'ATK' : 'DEF'} {power}
          </span>
          {chem > 0 && (
            <span style={{ fontSize: 9, color: 'var(--green-1)', background: 'rgba(68,255,158,0.10)', padding: '1px 5px', borderRadius: 3 }}>
              ⚗ +{chem}
            </span>
          )}
        </div>
      </div>

      {/* Selection icon */}
      <div style={{ fontSize: 18, flexShrink: 0, color: selected ? selClr : 'rgba(255,255,255,0.12)' }}>
        {selected ? (role === 'attack' ? '⚔️' : '🛡') : '○'}
      </div>
    </button>
  )
}

// ─── CreationDuelCard ────────────────────────────────────────────────────────

function CreationDuelCard({ duel }: { duel: CreateDuel }) {
  const [showOutcome, setShowOutcome] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShowOutcome(true), 1050); return () => clearTimeout(t) }, [])
  const narrative = useMemo(() => creationNarrative(duel), [duel])

  return (
    <SlideIn>
      <div style={{
        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div className="eyebrow" style={{ fontSize: 9, color: 'var(--ink-3)' }}>⚽ CREATION DUEL</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold-1)' }}>{lastName(duel.playerName)}</span>
          <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>vs</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--red-1)' }}>{lastName(duel.aiName)}</span>
        </div>
        <DuelBar
          leftVal={duel.playerRoll} rightVal={duel.aiRoll}
          leftLabel={`YOU · PAS ${duel.playerPas} → ${duel.playerRoll}`}
          rightLabel={`AI · PAS ${duel.aiPas} → ${duel.aiRoll}`}
          leftColor="var(--gold-1)" rightColor="var(--red-1)"
        />
        <div style={{
          opacity: showOutcome ? 1 : 0,
          transform: showOutcome ? 'translateY(0)' : 'translateY(6px)',
          transition: 'all 0.4s ease',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textAlign: 'center',
              color: duel.playerWon ? 'var(--green-1)' : 'rgba(255,110,110,0.9)',
            }}>
              {duel.playerWon
                ? '✓ YOU WIN CREATION — +10 added to your attack roll'
                : '✗ AI WINS CREATION — +10 added to AI attack roll'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center' }}>
              {duel.playerWon
                ? 'You keep the ball — your attacker gets a running start'
                : 'Your attack still happens — just without the bonus'}
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center', fontStyle: 'italic' }}>
            {narrative}
          </div>
        </div>
      </div>
    </SlideIn>
  )
}

// ─── AttackNarrativeCard ─────────────────────────────────────────────────────

function AttackNarrativeCard({ attack, isPlayer }: { attack: BattleMatchup; isPlayer: boolean }) {
  const [showDefResult,   setShowDefResult]   = useState(false)
  const [showLastMan,     setShowLastMan]     = useState(false)
  const [showFinal,       setShowFinal]       = useState(false)

  const beatDef   = attack.attackerRoll > attack.defenderRoll
  const narrative = useMemo(() => attackNarrative(attack, isPlayer), [attack, isPlayer])

  useEffect(() => {
    const t1 = setTimeout(() => setShowDefResult(true), 1000)
    const t2 = beatDef ? setTimeout(() => setShowLastMan(true), 1750) : null
    const t3 = setTimeout(() => setShowFinal(true), beatDef ? 2700 : 1700)
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2); clearTimeout(t3) }
  }, [beatDef])

  const accent    = isPlayer ? 'var(--gold-1)' : 'var(--red-1)'
  const accentBg  = isPlayer ? 'rgba(255,214,107,0.03)' : 'rgba(255,71,103,0.03)'
  const accentBdr = isPlayer ? 'rgba(255,214,107,0.18)' : 'rgba(255,71,103,0.18)'
  const atkColor  = accent

  const outcomeText = attack.scored
    ? (isPlayer ? 'GOAL!' : 'CONCEDED')
    : beatDef
    ? (isPlayer ? '🧱 Chance saved' : '🧱 Your keeper holds')
    : (isPlayer ? '🛡 Blocked' : '🛡 Your defense holds')

  const outcomeColor = attack.scored ? accent
    : beatDef ? 'var(--purple-1)' : 'var(--cyan-1)'

  return (
    <SlideIn>
      <div style={{
        background: accentBg, border: `1px solid ${accentBdr}`,
        borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {/* Header */}
        <div className="eyebrow" style={{ fontSize: 9, color: accent }}>
          {isPlayer ? '⚔ YOUR ATTACK' : '🤖 AI ATTACK'}
        </div>

        {/* Attacker vs Defender names + stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-0)', lineHeight: 1.2 }}>
              {lastName(attack.attacker.name)}
            </div>
            {/* Attacker stat chips — always show so AI attack is readable */}
            <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
              {[
                { key: 'PAC', val: attack.attacker.pac },
                { key: 'SHO', val: attack.attacker.sho },
                { key: 'DRI', val: attack.attacker.dri },
              ].map(({ key, val }) => (
                <span key={key} style={{
                  fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
                  color: 'var(--ink-2)', background: 'rgba(255,255,255,0.06)',
                  padding: '2px 5px', borderRadius: 4,
                }}>
                  {key} {val}
                </span>
              ))}
              {attack.attacker.chemBonus > 0 && (
                <span style={{ fontSize: 9, color: 'var(--green-1)', background: 'rgba(68,255,158,0.10)', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>
                  ⚗ +{attack.attacker.chemBonus}
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: 2 }}>vs</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)' }}>{lastName(attack.defender.name)}</div>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              DEF {attack.defender.def} · PHY {attack.defender.phy}
            </div>
          </div>
        </div>

        {/* ATK vs DEF bar — shows actual roll numbers */}
        <DuelBar
          leftVal={attack.attackerRoll} rightVal={attack.defenderRoll}
          leftLabel={`${isPlayer ? 'YOUR' : 'AI'} ROLL → ${attack.attackerRoll}`}
          rightLabel={`${isPlayer ? 'DEF' : 'YOUR DEF'} → ${attack.defenderRoll}`}
          leftColor={atkColor} rightColor="var(--cyan-1)"
        />

        {/* ATK + DEF breakdown rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <BreakdownRow bd={attack.atkBreakdown} total={attack.attackerRoll} sideLabel={isPlayer ? '⚔' : '🤖'} />
          <BreakdownRow bd={attack.defBreakdown} total={attack.defenderRoll} sideLabel="🛡" />
        </div>

        {/* Defender result badge */}
        {showDefResult && (
          <div style={{
            fontSize: 11, fontWeight: 700, textAlign: 'center',
            color: beatDef ? 'var(--green-1)' : 'var(--red-1)',
            animation: 'pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            {beatDef ? '↗ DEFENDER BEATEN!' : '✗ Stopped by the defense'}
          </div>
        )}

        {/* Last man duel */}
        {beatDef && showLastMan && (
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10,
            display: 'flex', flexDirection: 'column', gap: 8,
            animation: 'slide-up-fade 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>Shot on goal →</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>{lastName(attack.lastMan.name)}</div>
                <div style={{ fontSize: 8, color: 'var(--ink-3)' }}>DEF {attack.lastMan.def} · PHY {attack.lastMan.phy} · LAST MAN</div>
              </div>
            </div>
            <DuelBar
              leftVal={attack.shotRoll} rightVal={attack.lastManRoll}
              leftLabel={`SHOT → ${attack.shotRoll}`}
              rightLabel={`LAST MAN → ${attack.lastManRoll}`}
              leftColor={atkColor} rightColor="var(--purple-1)"
            />
            {/* Shot + last-man breakdowns */}
            {(attack.shotBreakdown || attack.lmBreakdown) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {attack.shotBreakdown && (
                  <BreakdownRow bd={attack.shotBreakdown} total={attack.shotRoll} sideLabel={isPlayer ? '⚔' : '🤖'} />
                )}
                {attack.lmBreakdown && (
                  <BreakdownRow bd={attack.lmBreakdown} total={attack.lastManRoll} sideLabel="🛡" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Final outcome */}
        {showFinal && (
          <div style={{
            animation: 'pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            padding: attack.scored ? '8px 0 2px' : '2px 0',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              fontSize: attack.scored ? 30 : 15, fontWeight: 800, textAlign: 'center',
              fontFamily: attack.scored ? 'var(--font-display)' : 'inherit',
              letterSpacing: attack.scored ? '0.06em' : 'normal',
              color: outcomeColor,
              textShadow: attack.scored ? `0 0 28px ${isPlayer ? 'var(--gold-glow)' : 'var(--red-glow)'}` : 'none',
            }}>
              {attack.scored && isPlayer ? '⚽ ' : ''}{outcomeText}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.4 }}>
              {narrative}
            </div>
          </div>
        )}
      </div>
    </SlideIn>
  )
}

// ─── Router ──────────────────────────────────────────────────────────────────

export function BattleScreen({ onGoHome }: { onGoHome?: () => void }) {
  const { battle } = useGameStore()
  if (!battle || battle.phase === 'team-select') return null
  if (battle.phase === 'round-pick') return <RoundPickScreen />
  if (battle.phase === 'battling')   return <BattleAnimation />
  if (battle.phase === 'result' && battle.result) return <ResultWrapper onGoHome={onGoHome} />
  return null
}

// ─── TacticPicker ─────────────────────────────────────────────────────────────

const TACTICS: Array<{ id: TacticType; label: string; icon: string; desc: string }> = [
  { id: 'balanced', icon: '⚖️', label: 'Balanced',    desc: 'No modifiers' },
  { id: 'press',    icon: '📣', label: 'Press High',   desc: 'PAS +5 / DEF −5 if AI attacks' },
  { id: 'counter',  icon: '⚡', label: 'Counter',      desc: 'Win possession → ATK +8; lose → −5' },
  { id: 'park',     icon: '🚌', label: 'Park the Bus', desc: 'DEF +8 / ATK −10' },
]

function TacticPicker({ selected, onSelect }: {
  selected: TacticType | null
  onSelect: (t: TacticType) => void
}) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', marginBottom: 8 }}>
        🧠 TACTICAL INSTRUCTION
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {TACTICS.map(t => {
          const isSel = selected === t.id
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              style={{
                padding: '8px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: isSel ? 'rgba(255,214,107,0.10)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isSel ? 'rgba(255,214,107,0.45)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 16, marginBottom: 2 }}>{t.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: isSel ? 'var(--gold-1)' : 'var(--ink-1)', marginBottom: 2 }}>
                {t.label}
              </div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', lineHeight: 1.3 }}>{t.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── SubPanel ─────────────────────────────────────────────────────────────────

function SubPanel({ onClose }: { onClose: () => void }) {
  const { battle, roster, confirmSub } = useGameStore()
  const [incoming, setIncoming] = useState<string | null>(null)
  const [targetSlot, setTargetSlot] = useState<string | null>(null)

  if (!battle?.playerTeam) return null

  const formationCardIds = new Set(battle.playerTeam.slots.map(s => s.card?.id).filter(Boolean))
  const available = roster.filter(c => !formationCardIds.has(c.id))

  const canConfirm = incoming !== null && targetSlot !== null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(4,6,13,0.92)',
      display: 'flex', flexDirection: 'column', padding: '20px 16px 40px',
      gap: 16, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="font-display" style={{ fontSize: 22, color: 'var(--ink-0)', letterSpacing: '0.06em' }}>
          SUBSTITUTE
        </div>
        <button onClick={onClose} style={{ fontSize: 18, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
      </div>

      {available.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: 32 }}>
          No cards available to sub in.<br />All your cards are already in the formation.
        </div>
      ) : (
        <>
          {/* Step 1: Pick incoming card */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', fontFamily: 'var(--font-mono)', color: 'var(--green-1)', marginBottom: 8 }}>
              1 · BRING ON
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {available.map(card => {
                const isSel = incoming === card.id
                const vals  = Object.values(card.stats).filter((v): v is number => typeof v === 'number')
                const ovr   = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 70
                return (
                  <button key={card.id} onClick={() => setIncoming(isSel ? null : card.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      background: isSel ? 'rgba(68,255,158,0.10)' : 'rgba(255,255,255,0.025)',
                      border: `1px solid ${isSel ? 'rgba(68,255,158,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      textAlign: 'left', width: '100%', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: isSel ? 'rgba(68,255,158,0.15)' : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, color: isSel ? 'var(--green-1)' : 'var(--ink-2)',
                    }}>
                      {card.position ?? '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isSel ? 'var(--green-1)' : 'var(--ink-0)' }}>{card.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>OVR {ovr}</div>
                    </div>
                    {isSel && <div style={{ fontSize: 16, color: 'var(--green-1)' }}>✓</div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 2: Pick slot to replace */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', fontFamily: 'var(--font-mono)', color: 'var(--red-1)', marginBottom: 8 }}>
              2 · REPLACE SLOT
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {battle.playerTeam.slots.filter(s => s.card).map(slot => {
                const isSel = targetSlot === slot.id
                const card = slot.card!
                return (
                  <button key={slot.id} onClick={() => setTargetSlot(isSel ? null : slot.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      background: isSel ? 'rgba(255,71,103,0.10)' : 'rgba(255,255,255,0.025)',
                      border: `1px solid ${isSel ? 'rgba(255,71,103,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      textAlign: 'left', width: '100%', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: isSel ? 'rgba(255,71,103,0.15)' : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, color: isSel ? 'var(--red-1)' : 'var(--ink-2)',
                    }}>
                      {slot.label}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isSel ? 'var(--red-1)' : 'var(--ink-0)' }}>{card.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                        {['DEF', 'MID', 'FWD'][3 - slot.row] ?? 'ROW'} slot · {slot.label}
                      </div>
                    </div>
                    {isSel && <div style={{ fontSize: 16, color: 'var(--red-1)' }}>→</div>}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={() => { if (canConfirm) { confirmSub(incoming!, targetSlot!); onClose() } }}
            disabled={!canConfirm}
            style={{
              padding: '14px 0', borderRadius: 12, cursor: canConfirm ? 'pointer' : 'default',
              fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.1em',
              background: canConfirm ? 'linear-gradient(135deg, rgba(68,255,158,0.18), rgba(0,160,80,0.12))' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${canConfirm ? 'rgba(68,255,158,0.45)' : 'var(--line)'}`,
              color: canConfirm ? 'var(--green-1)' : 'var(--ink-3)',
              transition: 'all 0.2s',
            }}
          >
            ✓ CONFIRM SUB
          </button>
        </>
      )}
    </div>
  )
}

// ─── Round Pick Screen ────────────────────────────────────────────────────────

function RoundPickScreen() {
  const { battle, confirmBattleRound, resetBattle } = useGameStore()
  const [atkId,      setAtkId]      = useState<string | null>(null)
  const [defId,      setDefId]      = useState<string | null>(null)
  const [tactic,     setTactic]     = useState<TacticType>('balanced')
  const [showSub,    setShowSub]    = useState(false)

  if (!battle?.playerTeam) return null

  const { currentRound, totalRounds, playerGoals, aiGoals, momentumPlayer, momentumAi, lastAttackerId, subUsed } = battle
  const chemBonuses = computeChemBonuses(battle.playerTeam.slots)
  const shapeScore  = calcShapeBonus(battle.playerTeam.slots)

  // All slots that have a card
  type FilledSlot = FormationSlot & { card: UserCard }
  const allSlots = battle.playerTeam.slots.filter((s): s is FilledSlot => s.card !== null)

  // Sort helpers
  const atkSorted = [...allSlots].sort((a, b) => {
    if (b.row !== a.row) return b.row - a.row   // ATK row first
    return atkPower(b.card, chemBonuses.get(b.card.id) ?? 0)
         - atkPower(a.card, chemBonuses.get(a.card.id) ?? 0)
  })
  const defSorted = [...allSlots].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row   // DEF row first
    return defPower(b.card, chemBonuses.get(b.card.id) ?? 0)
         - defPower(a.card, chemBonuses.get(a.card.id) ?? 0)
  })

  // Best midfielder who isn't the chosen attacker or defender — for possession preview
  const possessionMid = allSlots
    .filter(s => s.row === 2 && s.card.id !== atkId && s.card.id !== defId)
    .sort((a, b) => (b.card.stats.PAS ?? 0) - (a.card.stats.PAS ?? 0))[0]
    ?? allSlots
    .filter(s => s.card.id !== atkId && s.card.id !== defId)
    .sort((a, b) => (b.card.stats.PAS ?? 0) - (a.card.stats.PAS ?? 0))[0]

  const canKickOff = atkId !== null && defId !== null

  const diff      = playerGoals - aiGoals
  const remaining = totalRounds - currentRound + 1
  const commentary =
    currentRound === 1             ? 'Kick off — pick your attacker and your defender!'
    : diff >= 2                    ? `Up ${diff} — pick smart and seal it!`
    : diff <= -2                   ? `Down ${Math.abs(diff)} — attack hard, defend tight!`
    : diff === 1 && remaining <= 2 ? 'Narrow lead — protect it!'
    : diff === -1 && remaining <= 2? 'Last chance — go all in!'
    : currentRound === totalRounds ? 'Final round — pick your best!'
    : 'Choose your tactic, attacker and defender this round'

  const shapeColor = shapeScore > 0 ? 'var(--green-1)' : shapeScore < 0 ? 'var(--red-1)' : 'var(--ink-3)'
  const shapeArrow = shapeScore > 0 ? '⬆' : shapeScore < 0 ? '⬇' : '↔'

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {showSub && <SubPanel onClose={() => setShowSub(false)} />}

      <PitchStrip playerGoals={playerGoals} aiGoals={aiGoals} round={currentRound} total={totalRounds} />

      <div style={{ padding: '14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 540, width: '100%', alignSelf: 'center' }}>

        {/* Momentum bars */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)' }}>
          <MomentumPips value={momentumPlayer} side="player" />
          <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>MOMENTUM</div>
          <MomentumPips value={momentumAi} side="ai" />
        </div>

        {/* Sub button */}
        {!subUsed && (
          <button
            onClick={() => setShowSub(true)}
            style={{
              padding: '9px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              background: 'rgba(68,255,158,0.04)', border: '1px solid rgba(68,255,158,0.2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>🔄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-1)' }}>SUBSTITUTE AVAILABLE</div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)' }}>Swap a card for anyone in your collection</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--green-1)' }}>→</span>
          </button>
        )}

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-2)', fontStyle: 'italic' }}>
          {commentary}
        </div>

        {/* Possession mid preview */}
        {possessionMid && (
          <div style={{
            padding: '8px 12px', borderRadius: 10, fontSize: 11, color: 'var(--ink-2)',
            background: 'rgba(185,107,255,0.06)', border: '1px solid rgba(185,107,255,0.2)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔄</span>
            <span>
              <strong style={{ color: 'var(--purple-1)' }}>{possessionMid.card.name}</strong>
              {' '}(PAS {possessionMid.card.stats.PAS ?? '?'}) will battle for possession
            </span>
          </div>
        )}

        {/* ── TACTIC SECTION ── */}
        <TacticPicker selected={tactic} onSelect={setTactic} />

        {/* ── ATTACK SECTION ── */}
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.14em', fontFamily: 'var(--font-mono)', color: 'var(--gold-1)', marginBottom: 8 }}>
            ⚔️ CHOOSE YOUR ATTACKER
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {atkSorted.map(slot => (
              <PlayerPickRow
                key={slot.card.id}
                card={slot.card} row={slot.row} role="attack"
                power={atkPower(slot.card, chemBonuses.get(slot.card.id) ?? 0)}
                chem={chemBonuses.get(slot.card.id) ?? 0}
                selected={atkId === slot.card.id}
                disabled={defId === slot.card.id}
                isMarked={lastAttackerId === slot.card.id && currentRound > 1}
                onClick={() => {
                  if (atkId === slot.card.id) { setAtkId(null); return }
                  setAtkId(slot.card.id)
                }}
              />
            ))}
          </div>
        </div>

        {/* ── DEFEND SECTION ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', fontFamily: 'var(--font-mono)', color: 'var(--cyan-1)' }}>
              🛡 CHOOSE YOUR DEFENDER
            </div>
            {/* Shape score */}
            <div style={{
              fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
              color: shapeColor,
              background: shapeScore > 0
                ? 'rgba(68,255,158,0.08)' : shapeScore < 0
                ? 'rgba(255,71,103,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${shapeScore > 0 ? 'rgba(68,255,158,0.25)' : shapeScore < 0 ? 'rgba(255,71,103,0.25)' : 'rgba(255,255,255,0.08)'}`,
              padding: '3px 8px', borderRadius: 5,
            }}>
              {shapeArrow} SHAPE {shapeScore > 0 ? `+${shapeScore}` : shapeScore}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {defSorted.map(slot => (
              <PlayerPickRow
                key={slot.card.id}
                card={slot.card} row={slot.row} role="defend"
                power={defPower(slot.card, chemBonuses.get(slot.card.id) ?? 0)}
                chem={chemBonuses.get(slot.card.id) ?? 0}
                selected={defId === slot.card.id}
                disabled={atkId === slot.card.id}
                onClick={() => {
                  if (defId === slot.card.id) { setDefId(null); return }
                  setDefId(slot.card.id)
                }}
              />
            ))}
          </div>
          {shapeScore !== 0 && (
            <div style={{ fontSize: 9, color: shapeColor, marginTop: 5, paddingLeft: 2, fontStyle: 'italic' }}>
              {shapeScore > 0
                ? `Solid back line — +${shapeScore} flat bonus to your defender's roll`
                : `Weak back line — ${shapeScore} penalty on your defender's roll`}
            </div>
          )}
        </div>

        {/* Kick Off */}
        <button
          onClick={() => { if (canKickOff) confirmBattleRound(atkId!, defId!, tactic) }}
          disabled={!canKickOff}
          style={{
            padding: '15px 0', borderRadius: 12, cursor: canKickOff ? 'pointer' : 'default',
            fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.1em',
            background: canKickOff
              ? 'linear-gradient(135deg, rgba(255,214,107,0.22), rgba(200,128,27,0.18))'
              : 'rgba(255,255,255,0.02)',
            border: `1px solid ${canKickOff ? 'var(--gold-2)' : 'var(--line)'}`,
            color: canKickOff ? 'var(--gold-1)' : 'var(--ink-3)',
            transition: 'all 0.2s',
          }}
        >
          {canKickOff ? '⚽ KICK OFF ROUND →' : 'Select an attacker & defender to continue'}
        </button>

        <button onClick={resetBattle} className="btn-link" style={{ fontSize: 11, color: 'var(--ink-3)', alignSelf: 'center' }}>
          ✕ Forfeit match
        </button>
      </div>
    </div>
  )
}

// ─── TraitToast ───────────────────────────────────────────────────────────────

function TraitToast({ message }: { message: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '6px 14px', borderRadius: 8,
      background: 'rgba(185,107,255,0.10)', border: '1px solid rgba(185,107,255,0.35)',
      fontSize: 11, fontWeight: 700, color: 'var(--purple-1)',
      animation: 'pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
    }}>
      {message}
    </div>
  )
}

// ─── Battle Animation ────────────────────────────────────────────────────────

function BattleAnimation() {
  const { battle, advanceBattleRound } = useGameStore()
  const [phase,         setPhase]       = useState(0)
  const [playerBump,    setPlayerBump]  = useState(0)
  const [aiBump,        setAiBump]      = useState(0)
  const [dispP,         setDispP]       = useState(0)
  const [dispA,         setDispA]       = useState(0)
  const [scoreBumped,   setScoreBumped] = useState(false)
  const [goalFlash,     setGoalFlash]   = useState<'player' | 'ai' | null>(null)
  // When true, we show the "NEXT ROUND / SEE RESULTS" button instead of auto-advancing
  const [showContinue,  setShowContinue] = useState(false)

  const currentRound = battle?.completedRounds[battle.completedRounds.length - 1]
  const prevGoals    = { p: battle?.playerGoals ?? 0, a: battle?.aiGoals ?? 0 }
  const isLastRound  = battle ? battle.currentRound >= battle.totalRounds : false

  // Reset on each new round
  useEffect(() => {
    setDispP(prevGoals.p)
    setDispA(prevGoals.a)
    setPhase(0)
    setScoreBumped(false)
    setGoalFlash(null)
    setShowContinue(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.currentRound])

  // Phase auto-advance (phases 0-3 only — phase 4 waits for user tap)
  const DURATIONS = [400, 1800, 4200, 4200]
  useEffect(() => {
    if (phase < 4) {
      const t = setTimeout(() => setPhase(p => p + 1), DURATIONS[phase] ?? 2000)
      return () => clearTimeout(t)
    }
    // Phase 4: bump score display once, then reveal the continue button
    if (!scoreBumped) {
      setScoreBumped(true)
      if (currentRound?.playerScored) { setDispP(p => p + 1); setPlayerBump(k => k + 1) }
      if (currentRound?.aiScored)     { setDispA(a => a + 1); setAiBump(k => k + 1) }
    }
    // Show the continue button after a short delay so score animation can finish
    const t = setTimeout(() => setShowContinue(true), 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, scoreBumped])

  // Goal flash: trigger mid-phase after outcome reveals (~2.2s into phase)
  useEffect(() => {
    if (phase === 2 && currentRound?.playerScored) {
      const t1 = setTimeout(() => setGoalFlash('player'), 2300)
      const t2 = setTimeout(() => setGoalFlash(null),     3700)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase === 3 && currentRound?.aiScored) {
      const t1 = setTimeout(() => setGoalFlash('ai'), 2300)
      const t2 = setTimeout(() => setGoalFlash(null), 3700)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (!currentRound) return null

  const totalR = battle?.totalRounds ?? 5
  const curR   = battle?.currentRound ?? 1
  const cd     = currentRound.playerAttack.createDuel

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px 32px', gap: 10 }}>

      {goalFlash && (
        <GoalFlashOverlay
          side={goalFlash}
          scorerName={goalFlash === 'player'
            ? currentRound.playerAttack.attacker.name
            : currentRound.aiAttack.attacker.name}
        />
      )}

      {/* Compact header — round dots + score + skip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Round dots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
          <div className="eyebrow" style={{ fontSize: 8, color: 'var(--ink-3)' }}>RND {curR}/{totalR}</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: totalR }).map((_, i) => (
              <div key={i} style={{
                width: i === curR - 1 ? 14 : 5, height: 5, borderRadius: 2.5,
                background: i < curR - 1 ? 'var(--gold-3)' : i === curR - 1 ? 'var(--gold-1)' : 'var(--line)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>

        {/* Inline score */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '6px 18px',
        }}>
          <div className="text-center">
            <div style={{ fontSize: 7, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.12em' }}>YOU</div>
            <div key={`p-${playerBump}`} className="font-display" style={{
              fontSize: 34, lineHeight: 1, color: 'var(--gold-1)',
              textShadow: '0 0 16px var(--gold-glow)',
              animation: playerBump > 0 ? 'score-bump 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
            }}>{dispP}</div>
          </div>
          <div style={{ color: 'var(--ink-3)', fontSize: 18, fontWeight: 800 }}>—</div>
          <div className="text-center">
            <div style={{ fontSize: 7, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.12em' }}>AI</div>
            <div key={`a-${aiBump}`} className="font-display" style={{
              fontSize: 34, lineHeight: 1, color: 'var(--red-1)',
              textShadow: '0 0 16px rgba(255,71,103,0.5)',
              animation: aiBump > 0 ? 'score-bump 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
            }}>{dispA}</div>
          </div>
        </div>

        {/* Skip — only visible while animation is still running */}
        {phase < 4 && (
          <button
            onClick={() => setPhase(4)}
            style={{ fontSize: 10, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            skip all →
          </button>
        )}
      </div>

      {/* Momentum pip bars */}
      {battle && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)',
        }}>
          <MomentumPips value={battle.momentumPlayer} side="player" />
          <div style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>MOMENTUM</div>
          <MomentumPips value={battle.momentumAi} side="ai" />
        </div>
      )}

      {/* Sequential card reveals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {phase >= 1 && cd && <CreationDuelCard key={`cd-${curR}`} duel={cd} />}
        {phase >= 2 && (
          <>
            <AttackNarrativeCard key={`pa-${curR}`} attack={currentRound.playerAttack} isPlayer={true} />
            {currentRound.playerAttack.traitFired && (
              <TraitToast message={currentRound.playerAttack.traitFired} />
            )}
            {currentRound.playerAttack.tacticNote && (
              <TraitToast message={currentRound.playerAttack.tacticNote} />
            )}
          </>
        )}
        {phase >= 3 && (
          <>
            <AttackNarrativeCard key={`aa-${curR}`} attack={currentRound.aiAttack} isPlayer={false} />
            {currentRound.aiAttack.traitFired && (
              <TraitToast message={currentRound.aiAttack.traitFired} />
            )}
            {currentRound.aiAttack.tacticNote && (
              <TraitToast message={currentRound.aiAttack.tacticNote} />
            )}
          </>
        )}
      </div>

      {/* Continue button — only appears after all animations finish */}
      {showContinue && (
        <div style={{ animation: 'slide-up-fade 0.3s cubic-bezier(0.34,1.56,0.64,1) both', marginTop: 8 }}>
          <button
            onClick={advanceBattleRound}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.1em',
              background: isLastRound
                ? 'linear-gradient(135deg, rgba(255,214,107,0.2), rgba(200,128,27,0.2))'
                : 'linear-gradient(135deg, rgba(37,224,255,0.12), rgba(0,160,200,0.12))',
              border: `1px solid ${isLastRound ? 'var(--gold-2)' : 'rgba(37,224,255,0.4)'}`,
              color: isLastRound ? 'var(--gold-1)' : 'var(--cyan-1)',
            }}
          >
            {isLastRound ? '🏁 FULL TIME — SEE RESULTS' : '▶ NEXT ROUND'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Result wrapper + screen ─────────────────────────────────────────────────

function ResultWrapper({ onGoHome }: { onGoHome?: () => void }) {
  const { battle, completeBattle, resetBattle } = useGameStore()
  const [rewarded, setRewarded] = useState(false)

  useEffect(() => {
    if (!rewarded) { setRewarded(true); completeBattle() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!battle?.result) return null
  return (
    <ResultScreen
      playerGoals={battle.result.playerGoals}
      aiGoals={battle.result.aiGoals}
      winner={battle.result.winner}
      coinsEarned={battle.result.performanceCoins}
      streakMultiplier={battle.result.streakMultiplier}
      manOfMatch={battle.result.manOfMatch}
      rounds={battle.result.rounds}
      onReset={resetBattle}
      onGoHome={onGoHome ? () => { resetBattle(); onGoHome() } : undefined}
    />
  )
}

function ResultScreen({
  playerGoals, aiGoals, winner, coinsEarned, streakMultiplier, manOfMatch, rounds, onReset, onGoHome,
}: {
  playerGoals: number; aiGoals: number; winner: string
  coinsEarned: number; streakMultiplier: number
  manOfMatch: string | null; rounds: BattleRound[]; onReset: () => void; onGoHome?: () => void
}) {
  const isWin  = winner === 'player'
  const isDraw = winner === 'draw'

  const resultColor = isWin ? 'var(--gold-1)' : isDraw ? 'var(--ink-1)' : 'var(--red-1)'
  const resultGlow  = isWin ? 'var(--gold-glow)' : isDraw ? 'none' : 'rgba(255,71,103,0.5)'
  const resultLabel = isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'
  const resultEmoji = isWin ? '🏆' : isDraw ? '🤝' : '😤'

  const story      = useMemo(() => buildMatchStory(rounds), [rounds])
  const base       = isWin ? 80 : isDraw ? 25 : 10
  const goals      = playerGoals * 18
  const cleanSheet = aiGoals === 0 ? 35 : 0
  const beforeMult = base + goals + cleanSheet

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '80vh', gap: 20, padding: 24,
      position: 'relative', overflow: 'hidden',
    }}>
      {isWin && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 600, height: 600,
          transform: 'translate(-50%, -50%)',
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,214,107,0.06) 10deg, transparent 20deg)',
          animation: 'spin-slow 8s linear infinite', pointerEvents: 'none',
        }} />
      )}

      <div style={{ fontSize: 64, animation: 'float-slow 3s ease-in-out infinite', position: 'relative', zIndex: 2 }}>
        {resultEmoji}
      </div>

      <div className="font-display text-center" style={{
        fontSize: 80, lineHeight: 0.85, letterSpacing: '0.04em',
        color: resultColor, textShadow: `0 0 40px ${resultGlow}`,
        position: 'relative', zIndex: 2,
      }}>
        {resultLabel}
      </div>

      {/* Score */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 28,
        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
        borderRadius: 20, padding: '14px 40px', position: 'relative', zIndex: 2,
      }}>
        <div className="text-center">
          <div className="eyebrow" style={{ fontSize: 9, color: 'var(--ink-3)' }}>YOU</div>
          <div className="font-display" style={{
            fontSize: 64, lineHeight: 1,
            color: isWin ? 'var(--gold-1)' : 'var(--ink-1)',
            textShadow: isWin ? '0 0 30px var(--gold-glow)' : 'none',
          }}>{playerGoals}</div>
        </div>
        <div style={{ color: 'var(--ink-3)', fontSize: 28, fontWeight: 800 }}>—</div>
        <div className="text-center">
          <div className="eyebrow" style={{ fontSize: 9, color: 'var(--ink-3)' }}>AI</div>
          <div className="font-display" style={{
            fontSize: 64, lineHeight: 1,
            color: winner === 'ai' ? 'var(--red-1)' : 'var(--ink-1)',
            textShadow: winner === 'ai' ? '0 0 30px rgba(255,71,103,0.5)' : 'none',
          }}>{aiGoals}</div>
        </div>
      </div>

      {/* Match story */}
      <div style={{
        width: '100%', maxWidth: 320,
        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, padding: '14px 18px',
        position: 'relative', zIndex: 2,
        animation: 'pop-in 0.4s 0.15s cubic-bezier(0.34,1.56,0.64,1) both',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div className="eyebrow" style={{ fontSize: 9, color: 'var(--ink-3)', marginBottom: 2 }}>MATCH STORY</div>
        {story.map((line, i) => (
          <div key={i} style={{ fontSize: 12, color: 'var(--ink-1)', lineHeight: 1.5 }}>{line}</div>
        ))}
      </div>

      {/* Man of the match */}
      {manOfMatch && (
        <div style={{
          background: 'rgba(68,255,158,0.07)', border: '1px solid rgba(68,255,158,0.3)',
          borderRadius: 12, padding: '10px 24px', textAlign: 'center',
          position: 'relative', zIndex: 2,
          animation: 'pop-in 0.4s 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <div className="eyebrow" style={{ fontSize: 9, color: 'var(--green-1)' }}>⭐ MAN OF THE MATCH</div>
          <div className="font-display" style={{ fontSize: 22, color: 'var(--ink-0)', letterSpacing: '0.06em', marginTop: 2 }}>
            {manOfMatch}
          </div>
        </div>
      )}

      {/* Coins */}
      <div style={{
        background: 'rgba(255,214,107,0.06)', border: '1px solid rgba(255,214,107,0.25)',
        borderRadius: 16, padding: '14px 24px', position: 'relative', zIndex: 2,
        animation: 'coin-bump 0.6s 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        minWidth: 220,
      }}>
        <div className="eyebrow" style={{ fontSize: 9, color: 'var(--ink-3)', marginBottom: 8, textAlign: 'center' }}>COINS EARNED</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <CoinLine label={isWin ? 'Win bonus' : isDraw ? 'Draw bonus' : 'Participation'} value={base} />
          {goals > 0 && <CoinLine label={`${playerGoals} goal${playerGoals > 1 ? 's' : ''} ×18`} value={goals} />}
          {cleanSheet > 0 && <CoinLine label="Clean sheet" value={cleanSheet} />}
          {streakMultiplier > 1 && (
            <CoinLine label={`${streakMultiplier}× streak`} value={Math.round(beforeMult * (streakMultiplier - 1))} accent="var(--gold-1)" />
          )}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 8, textAlign: 'center' }}>
          <div className="font-display" style={{ fontSize: 36, color: 'var(--gold-1)', lineHeight: 1 }}>
            +{coinsEarned.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 2 }}>
        {onGoHome && (
          <button onClick={onGoHome} className="btn" style={{
            fontSize: 14, padding: '12px 24px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)',
            borderRadius: 12, color: 'var(--ink-2)', cursor: 'pointer',
          }}>🏠 Home</button>
        )}
        <button onClick={onReset} className="btn btn-primary" style={{ fontSize: 16, padding: '14px 36px' }}>
          ⚔️ Battle Again
        </button>
      </div>
    </div>
  )
}

function CoinLine({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: accent ?? 'var(--ink-1)', fontFamily: 'var(--font-mono)' }}>
        +{value}
      </span>
    </div>
  )
}
