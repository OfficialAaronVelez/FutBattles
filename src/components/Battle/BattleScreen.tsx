import { useState, useEffect, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore'
import { oopPenaltyPct, computeChemBonuses } from '../../utils/battle'
import type { BattleMatchup, UserCard, FormationSlot, CreateDuel, BattleRound } from '../../types'

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
      padding: '16px 24px 20px', position: 'relative', overflow: 'hidden', flexShrink: 0,
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

// ─── AttackerPickCard ────────────────────────────────────────────────────────

function AttackerPickCard({ slot, card, chemBonus, useCount, onPick }: {
  slot: FormationSlot; card: UserCard; chemBonus: number; useCount: number; onPick: () => void
}) {
  const oop      = oopPenaltyPct(card.position, slot.row)
  const pac      = Math.round((card.stats.PAC ?? 70) * (1 - oop / 100)) + chemBonus
  const sho      = Math.round((card.stats.SHO ?? 70) * (1 - oop / 100)) + chemBonus
  const dri      = Math.round((card.stats.DRI ?? 70) * (1 - oop / 100)) + chemBonus
  const basePower = Math.round(pac * 0.30 + sho * 0.45 + dri * 0.25)
  // Mirror the fatigue formula from battle.ts (FATIGUE_PER_USE=10, max 3 stacks)
  const fatiguePenalty = Math.min(useCount, 3) * 10
  const power    = Math.max(40, basePower - fatiguePenalty)
  const powerPct = Math.round(Math.min(100, ((power - 40) / 59) * 100))

  const rawStats = Object.values(card.stats).filter((v): v is number => typeof v === 'number')
  const overall  = rawStats.length ? Math.round(rawStats.reduce((a, b) => a + b) / rawStats.length) : 70

  const [barFilled, setBarFilled] = useState(false)
  useEffect(() => { const t = setTimeout(() => setBarFilled(true), 120); return () => clearTimeout(t) }, [])

  const rowColor   = slot.row === 3 ? 'var(--gold-1)' : slot.row === 2 ? 'var(--cyan-1)' : 'var(--green-1)'
  const rowColorBg = slot.row === 3 ? 'rgba(255,214,107,0.10)' : slot.row === 2 ? 'rgba(37,224,255,0.10)' : 'rgba(68,255,158,0.10)'

  return (
    <button
      onClick={onPick}
      style={{
        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, padding: '16px 18px',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'all 0.18s',
        display: 'flex', alignItems: 'center', gap: 14,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,214,107,0.07)'
        e.currentTarget.style.borderColor = 'rgba(255,214,107,0.28)'
        e.currentTarget.style.transform = 'scale(1.015)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {/* Position badge */}
      <div style={{
        width: 44, height: 44, borderRadius: 11, flexShrink: 0,
        background: rowColorBg, border: `1.5px solid ${rowColor}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 900, color: rowColor,
        fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
      }}>
        {slot.label}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
          <span style={{
            fontSize: 17, fontWeight: 800, color: 'var(--ink-0)',
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{card.name}</span>
          <span style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--ink-0)', flexShrink: 0, lineHeight: 1 }}>
            {overall}
          </span>
        </div>

        {/* Attack power bar */}
        <div style={{ marginBottom: 7 }}>
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: barFilled ? `${powerPct}%` : '0%',
              background: 'linear-gradient(90deg, var(--gold-2), var(--gold-1))',
              transition: 'width 0.75s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: '0 0 10px var(--gold-glow)',
            }} />
          </div>
          <div style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
            ATK POWER · {power}
          </div>
        </div>

        {/* Badges */}
        {(oop > 0 || chemBonus > 0 || useCount > 0) && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {oop > 0 && (
              <span style={{ fontSize: 9, color: 'rgba(255,160,0,0.9)', background: 'rgba(255,160,0,0.12)', padding: '2px 6px', borderRadius: 4 }}>
                ⚠ -{oop}% OOP
              </span>
            )}
            {chemBonus > 0 && (
              <span style={{ fontSize: 9, color: 'var(--green-1)', background: 'rgba(68,255,158,0.10)', padding: '2px 6px', borderRadius: 4 }}>
                ⚗ +{chemBonus} CHEM
              </span>
            )}
            {useCount > 0 && (
              <span style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 4,
                color: useCount >= 3 ? 'rgba(255,80,80,0.95)' : 'rgba(255,160,80,0.95)',
                background: useCount >= 3 ? 'rgba(255,80,80,0.12)' : 'rgba(255,160,80,0.12)',
              }}>
                😤 -{fatiguePenalty} FATIGUE
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: 22, color: 'var(--gold-1)', opacity: 0.45, flexShrink: 0 }}>›</div>
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
          leftLabel={`YOU · PAS ${duel.playerPas}`}
          rightLabel={`AI · PAS ${duel.aiPas}`}
          leftColor="var(--gold-1)" rightColor="var(--red-1)"
        />
        <div style={{
          opacity: showOutcome ? 1 : 0,
          transform: showOutcome ? 'translateY(0)' : 'translateY(6px)',
          transition: 'all 0.4s ease',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textAlign: 'center',
            color: duel.playerWon ? 'var(--green-1)' : 'rgba(255,110,110,0.9)',
          }}>
            {duel.playerWon ? '✓ YOU WIN CREATION — +10 attack advantage' : '✗ AI WINS CREATION — AI gets +10 attack'}
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

        {/* Attacker vs Defender names */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-0)', lineHeight: 1.2 }}>
              {lastName(attack.attacker.name)}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
              {attack.attacker.oopPenalty > 0 && (
                <span style={{ fontSize: 8, color: 'rgba(255,160,0,0.85)', background: 'rgba(255,160,0,0.12)', padding: '1px 4px', borderRadius: 3 }}>
                  ⚠ -{attack.attacker.oopPenalty}% OOP
                </span>
              )}
              {attack.attacker.chemBonus > 0 && (
                <span style={{ fontSize: 8, color: 'var(--green-1)', background: 'rgba(68,255,158,0.10)', padding: '1px 4px', borderRadius: 3 }}>
                  ⚗ +{attack.attacker.chemBonus}
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: 2 }}>vs</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)' }}>{lastName(attack.defender.name)}</div>
            <div style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>DEF {attack.defender.def}</div>
          </div>
        </div>

        {/* ATK vs DEF bar */}
        <DuelBar
          leftVal={attack.attackerRoll} rightVal={attack.defenderRoll}
          leftLabel={isPlayer ? 'YOUR ATTACK' : 'AI ATTACK'}
          rightLabel="DEFENSE"
          leftColor={atkColor} rightColor="var(--cyan-1)"
        />

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
                <div style={{ fontSize: 8, color: 'var(--ink-3)' }}>LAST MAN</div>
              </div>
            </div>
            <DuelBar
              leftVal={attack.attackerRoll} rightVal={attack.lastManRoll}
              leftLabel="SHOT" rightLabel="LAST MAN"
              leftColor={atkColor} rightColor="var(--purple-1)"
            />
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

// ─── Round Pick Screen ───────────────────────────────────────────────────────

function RoundPickScreen() {
  const { battle, pickBattleAttacker, resetBattle } = useGameStore()
  if (!battle?.playerTeam) return null

  const { currentRound, totalRounds, playerGoals, aiGoals, momentumPlayer, momentumAi, attackerUseCounts } = battle
  const chemBonuses    = computeChemBonuses(battle.playerTeam.slots)
  const attackerSlots  = battle.playerTeam.slots.filter(s => s.row >= 2 && s.card)

  const diff      = playerGoals - aiGoals
  const remaining = totalRounds - currentRound + 1
  const commentary =
    currentRound === 1              ? 'Kick off — pick your first attacker!'
    : diff >= 2                     ? `Up ${diff} — keep the pressure on!`
    : diff <= -2                    ? `Down ${Math.abs(diff)} — fight back now!`
    : diff === 1 && remaining <= 2  ? 'Narrow lead — hold on!'
    : diff === -1 && remaining <= 2 ? "Last chance — it's now or never!"
    : currentRound === totalRounds  ? 'Final round — make it count!'
    : 'Pick your attacker for this round'

  const hasMomPlayer = momentumPlayer >= 3
  const hasMomAi     = momentumAi >= 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <PitchStrip playerGoals={playerGoals} aiGoals={aiGoals} round={currentRound} total={totalRounds} />

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Momentum alert */}
        {(hasMomPlayer || hasMomAi) && (
          <div style={{
            textAlign: 'center', fontSize: 12, fontWeight: 700, padding: '8px 16px',
            borderRadius: 10,
            color: hasMomPlayer ? 'var(--gold-1)' : 'var(--red-1)',
            background: hasMomPlayer ? 'rgba(255,214,107,0.06)' : 'rgba(255,71,103,0.06)',
            border: `1px solid ${hasMomPlayer ? 'rgba(255,214,107,0.2)' : 'rgba(255,71,103,0.2)'}`,
            animation: 'glow-pulse 0.9s ease-in-out infinite',
          }}>
            {hasMomPlayer ? '⚡ You have momentum — attackers get +12!' : '⚡ AI has momentum — their attacks get +12!'}
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-2)', fontStyle: 'italic' }}>
          {commentary}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          <div className="eyebrow" style={{ fontSize: 9, color: 'var(--gold-1)' }}>CHOOSE YOUR ATTACKER</div>
          {attackerSlots.map(slot => (
            <AttackerPickCard
              key={slot.id}
              slot={slot}
              card={slot.card!}
              chemBonus={chemBonuses.get(slot.card!.id) ?? 0}
              useCount={attackerUseCounts?.[slot.card!.id] ?? 0}
              onPick={() => pickBattleAttacker(slot.card!.id)}
            />
          ))}
        </div>

        <button
          onClick={resetBattle}
          className="btn-link"
          style={{ fontSize: 11, color: 'var(--ink-3)', alignSelf: 'center', marginTop: 4 }}
        >
          ✕ Forfeit match
        </button>
      </div>
    </div>
  )
}

// ─── Battle Animation ────────────────────────────────────────────────────────

function BattleAnimation() {
  const { battle, advanceBattleRound } = useGameStore()
  const [phase,       setPhase]       = useState(0)
  const [playerBump,  setPlayerBump]  = useState(0)
  const [aiBump,      setAiBump]      = useState(0)
  const [dispP,       setDispP]       = useState(0)
  const [dispA,       setDispA]       = useState(0)
  const [rewarded,    setRewarded]    = useState(false)
  const [goalFlash,   setGoalFlash]   = useState<'player' | 'ai' | null>(null)

  const currentRound = battle?.completedRounds[battle.completedRounds.length - 1]
  const prevGoals    = { p: battle?.playerGoals ?? 0, a: battle?.aiGoals ?? 0 }

  // Reset on each new round
  useEffect(() => {
    setDispP(prevGoals.p)
    setDispA(prevGoals.a)
    setPhase(0)
    setRewarded(false)
    setGoalFlash(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.currentRound])

  // Phase auto-advance
  const DURATIONS = [400, 1800, 4200, 4200]
  useEffect(() => {
    if (phase < 4) {
      const t = setTimeout(() => setPhase(p => p + 1), DURATIONS[phase] ?? 2000)
      return () => clearTimeout(t)
    }
    if (currentRound?.playerScored) { setDispP(p => p + 1); setPlayerBump(k => k + 1) }
    if (currentRound?.aiScored)     { setDispA(a => a + 1); setAiBump(k => k + 1) }
    if (!rewarded) {
      setRewarded(true)
      const t = setTimeout(() => advanceBattleRound(), 2200)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: '12px 16px 32px', gap: 10 }}>

      {goalFlash && (
        <GoalFlashOverlay
          side={goalFlash}
          scorerName={goalFlash === 'player'
            ? currentRound.playerAttack.attacker.name
            : currentRound.aiAttack.attacker.name}
        />
      )}

      {/* Compact header */}
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

        <button
          onClick={() => setPhase(p => Math.min(p + 1, 4))}
          style={{ fontSize: 10, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
        >
          skip →
        </button>
      </div>

      {/* Sequential card reveals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {phase >= 1 && cd && <CreationDuelCard key={`cd-${curR}`} duel={cd} />}
        {phase >= 2 && <AttackNarrativeCard key={`pa-${curR}`} attack={currentRound.playerAttack} isPlayer={true} />}
        {phase >= 3 && <AttackNarrativeCard key={`aa-${curR}`} attack={currentRound.aiAttack} isPlayer={false} />}
      </div>
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
      justifyContent: 'center', minHeight: '100%', gap: 20, padding: 24,
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
