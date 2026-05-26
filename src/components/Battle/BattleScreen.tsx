import { useState, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { oopPenaltyPct, computeChemBonuses } from '../../utils/battle'
import type { BattleMatchup, BattleRound, UserCard, FormationSlot } from '../../types'

/* ─────────────────────────────────────────────────────────────────────── */
/*  Router                                                                  */
/* ─────────────────────────────────────────────────────────────────────── */

export function BattleScreen({ onGoHome }: { onGoHome?: () => void }) {
  const { battle } = useGameStore()
  if (!battle || battle.phase === 'team-select') return null
  if (battle.phase === 'round-pick') return <RoundPickScreen />
  if (battle.phase === 'battling')   return <BattleAnimation />
  if (battle.phase === 'result' && battle.result) return <ResultWrapper onGoHome={onGoHome} />
  return null
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Round Pick Screen                                                       */
/* ─────────────────────────────────────────────────────────────────────── */

function RoundPickScreen() {
  const { battle, pickBattleAttacker, resetBattle } = useGameStore()
  if (!battle?.playerTeam) return null

  const { currentRound, totalRounds, playerGoals, aiGoals, momentumPlayer, momentumAi } = battle
  const chemBonuses = computeChemBonuses(battle.playerTeam.slots)

  // Attackers: forward + midfield rows (row 2 & 3), with card filled
  const attackerSlots: FormationSlot[] = battle.playerTeam.slots
    .filter(s => s.row >= 2 && s.card)

  // Round commentary
  const diff = playerGoals - aiGoals
  const remaining = totalRounds - currentRound + 1
  const commentary =
    currentRound === 1                               ? 'Kick off — pick your first attacker!'
    : diff >= 2                                      ? `Up ${diff} — keep the pressure on!`
    : diff <= -2                                     ? `Down ${Math.abs(diff)} — time to fight back!`
    : diff === 1 && remaining <= 2                   ? 'Narrow lead — protect it!'
    : diff === -1 && remaining <= 2                  ? 'Last chance to equalise!'
    : currentRound === totalRounds                   ? 'Final round — make it count!'
    : 'Pick your attacker for this round'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100%',
      padding: '16px 16px 40px', gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 8 }}>
        <div className="eyebrow" style={{ color: 'var(--ink-3)' }}>
          ROUND {currentRound} / {totalRounds}
        </div>
        {/* Round progress dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: totalRounds }).map((_, i) => (
            <div key={i} style={{
              width: i === currentRound - 1 ? 18 : 6, height: 6, borderRadius: 3,
              background: i < currentRound - 1
                ? 'var(--gold-3)'
                : i === currentRound - 1 ? 'var(--gold-1)' : 'var(--line)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      </div>

      <ScoreBoard playerScore={playerGoals} aiScore={aiGoals} playerBump={0} aiBump={0} />

      {/* Momentum bars */}
      <MomentumBar playerMom={momentumPlayer} aiMom={momentumAi} />

      {/* Commentary */}
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-2)', fontStyle: 'italic' }}>
        {commentary}
      </div>

      {/* Attacker cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <div className="eyebrow" style={{ fontSize: 9, color: 'var(--gold-1)', marginBottom: 2 }}>
          CHOOSE YOUR ATTACKER
        </div>
        {attackerSlots.map(slot => (
          <AttackerOption
            key={slot.id}
            slot={slot}
            card={slot.card!}
            chemBonus={chemBonuses.get(slot.card!.id) ?? 0}
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
  )
}

function AttackerOption({ slot, card, chemBonus, onPick }: {
  slot: FormationSlot; card: UserCard; chemBonus: number; onPick: () => void
}) {
  const oop    = oopPenaltyPct(card.position, slot.row)
  const hasOop = oop > 0

  const pac = Math.round((card.stats.PAC ?? 70) * (1 - oop / 100)) + chemBonus
  const sho = Math.round((card.stats.SHO ?? 70) * (1 - oop / 100)) + chemBonus
  const dri = Math.round((card.stats.DRI ?? 70) * (1 - oop / 100)) + chemBonus

  return (
    <button
      onClick={onPick}
      style={{
        background:   'rgba(255,214,107,0.04)',
        border:       '1px solid rgba(255,214,107,0.25)',
        borderRadius: 14, padding: '12px 16px',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,214,107,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,214,107,0.04)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 24 }}>🏃</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink-0)' }}>{card.name}</span>
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
              background: 'rgba(255,214,107,0.12)', color: 'var(--gold-2)',
              padding: '1px 6px', borderRadius: 4,
            }}>
              {slot.label}
            </span>
            {hasOop && (
              <span style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(255,160,0,0.85)',
                background: 'rgba(255,160,0,0.12)', padding: '1px 6px', borderRadius: 4,
              }}>
                ⚠ −{oop}% OOP
              </span>
            )}
            {chemBonus > 0 && (
              <span style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--green-1)',
                background: 'rgba(68,255,158,0.10)', padding: '1px 6px', borderRadius: 4,
              }}>
                +{chemBonus} CHEM
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <StatPill label="PAC" value={pac} />
            <StatPill label="SHO" value={sho} />
            <StatPill label="DRI" value={dri} />
          </div>
        </div>
        <div style={{ fontSize: 22, color: 'var(--gold-1)', opacity: 0.7 }}>→</div>
      </div>
    </button>
  )
}

function MomentumBar({ playerMom, aiMom }: { playerMom: number; aiMom: number }) {
  const THRESHOLD = 3
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center',
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)',
      borderRadius: 12, padding: '8px 16px',
    }}>
      {/* Player momentum */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>YOU</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: THRESHOLD }).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < playerMom ? 'var(--gold-1)' : 'rgba(255,255,255,0.1)',
              boxShadow: i < playerMom ? '0 0 6px var(--gold-glow)' : 'none',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
        {playerMom >= THRESHOLD && (
          <span style={{ fontSize: 12, animation: 'glow-pulse 0.8s ease-in-out infinite' }}>⚡</span>
        )}
      </div>

      <div style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
        MOMENTUM
      </div>

      {/* AI momentum */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {aiMom >= THRESHOLD && (
          <span style={{ fontSize: 12, animation: 'glow-pulse 0.8s ease-in-out infinite' }}>⚡</span>
        )}
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: THRESHOLD }).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < aiMom ? 'var(--red-1)' : 'rgba(255,255,255,0.1)',
              boxShadow: i < aiMom ? '0 0 6px rgba(255,71,103,0.5)' : 'none',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>AI</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Battle Animation                                                        */
/* ─────────────────────────────────────────────────────────────────────── */

function BattleAnimation() {
  const { battle, advanceBattleRound } = useGameStore()

  // phase: 0=intro, 1=createDuel, 2=playerAtk, 3=aiAtk, 4=done
  const [phase, setPhase] = useState(0)
  const [playerBump, setPlayerBump] = useState(0)
  const [aiBump,     setAiBump]     = useState(0)
  const [rewarded,   setRewarded]   = useState(false)

  const currentRound = battle?.completedRounds[battle.completedRounds.length - 1]
  const prevGoals    = { p: battle?.playerGoals ?? 0, a: battle?.aiGoals ?? 0 }

  // Running score for the animation (adds goals as phases complete)
  const [dispP, setDispP] = useState(prevGoals.p)
  const [dispA, setDispA] = useState(prevGoals.a)

  useEffect(() => {
    setDispP(prevGoals.p)
    setDispA(prevGoals.a)
    setPhase(0)
    setRewarded(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.currentRound])

  // Durations (ms) before each new card appears:
  //  [0] brief pause before create duel shows
  //  [1] time to read the create duel rolls
  //  [2] time to read your attack matchup
  //  [3] time to read the AI attack matchup
  const DURATIONS = [900, 2800, 3500, 3500]

  useEffect(() => {
    if (phase < 4) {
      const t = setTimeout(() => setPhase(p => p + 1), DURATIONS[phase] ?? 2000)
      return () => clearTimeout(t)
    }
    // phase 4 = done; add goals to display score
    if (currentRound?.playerScored) { setDispP(p => p + 1); setPlayerBump(k => k + 1) }
    if (currentRound?.aiScored)     { setDispA(a => a + 1); setAiBump(k => k + 1) }
    if (!rewarded) {
      setRewarded(true)
      const t = setTimeout(() => advanceBattleRound(), 2800)  // linger on the result
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (!currentRound) return null

  const totalR = battle?.totalRounds ?? 5
  const curR   = battle?.currentRound ?? 1
  const cd     = currentRound.playerAttack.createDuel

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      minHeight:'100%', padding:'12px 16px 24px', gap:10,
    }}>

      {/* ── Compact header: round dots + score + skip ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
          <div className="eyebrow" style={{ fontSize:8, color:'var(--ink-3)' }}>
            ROUND {curR}/{totalR}
          </div>
          <div style={{ display:'flex', gap:3 }}>
            {Array.from({ length: totalR }).map((_,i) => (
              <div key={i} style={{
                width: i === curR-1 ? 14 : 5, height:5, borderRadius:2.5,
                background: i < curR-1 ? 'var(--gold-3)'
                          : i === curR-1 ? 'var(--gold-1)' : 'var(--line)',
                transition: 'all 0.3s ease',
              }}/>
            ))}
          </div>
        </div>

        {/* Inline score */}
        <div style={{
          flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:12,
          background:'rgba(255,255,255,0.03)', border:'1px solid var(--line)',
          borderRadius:10, padding:'6px 16px',
        }}>
          <div className="text-center">
            <div style={{ fontSize:7, color:'var(--ink-3)', fontFamily:'var(--font-display)', letterSpacing:'0.1em' }}>YOU</div>
            <div key={`p-${playerBump}`} className="font-display" style={{
              fontSize:32, lineHeight:1, color:'var(--gold-1)',
              textShadow:'0 0 16px var(--gold-glow)',
              animation: playerBump > 0 ? 'score-bump 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
            }}>{dispP}</div>
          </div>
          <div style={{ color:'var(--ink-3)', fontSize:18, fontWeight:800 }}>—</div>
          <div className="text-center">
            <div style={{ fontSize:7, color:'var(--ink-3)', fontFamily:'var(--font-display)', letterSpacing:'0.1em' }}>AI</div>
            <div key={`a-${aiBump}`} className="font-display" style={{
              fontSize:32, lineHeight:1, color:'var(--red-1)',
              textShadow:'0 0 16px rgba(255,71,103,0.5)',
              animation: aiBump > 0 ? 'score-bump 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
            }}>{dispA}</div>
          </div>
        </div>

        <button
          onClick={() => setPhase(p => Math.min(p + 1, 4))}
          style={{ fontSize:10, color:'var(--ink-3)', background:'none', border:'none', cursor:'pointer', flexShrink:0 }}
        >
          skip →
        </button>
      </div>

      {/* ── Content cards ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {cd && (
          <RoundedReveal show={phase >= 1}>
            <CompactCreateDuel duel={cd} />
          </RoundedReveal>
        )}
        <RoundedReveal show={phase >= 2}>
          <CompactAttack attack={currentRound.playerAttack} isPlayerSide={true} />
        </RoundedReveal>
        <RoundedReveal show={phase >= 3}>
          <CompactAttack attack={currentRound.aiAttack} isPlayerSide={false} />
        </RoundedReveal>
      </div>
    </div>
  )
}

function RoundedReveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      opacity:    show ? 1 : 0,
      transform:  show ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
    }}>
      {children}
    </div>
  )
}

/* ── Compact creation duel — single slim strip ── */
function CompactCreateDuel({ duel }: { duel: NonNullable<BattleMatchup['createDuel']> }) {
  const wColor = duel.playerWon ? 'var(--gold-1)' : 'var(--red-1)'
  return (
    <div style={{
      display:'flex', alignItems:'center', flexWrap:'wrap', gap:'4px 10px',
      padding:'8px 12px',
      border:'1px solid rgba(255,255,255,0.08)', borderRadius:10,
      background:'rgba(255,255,255,0.02)',
    }}>
      <span style={{ fontSize:9, color:'var(--ink-3)', fontFamily:'var(--font-display)', letterSpacing:'0.08em' }}>
        ⚽ CREATION
      </span>
      <span style={{ fontSize:11, fontWeight:800, color:'var(--gold-1)' }}>{duel.playerName}</span>
      <span style={{ fontSize:9, color:'var(--ink-3)' }}>PAS {duel.playerPas}</span>
      <span className="font-display" style={{ fontSize:18, color:'var(--gold-1)', lineHeight:1 }}>{duel.playerRoll}</span>
      <span style={{ fontSize:10, color:'var(--ink-3)' }}>vs</span>
      <span style={{ fontSize:11, fontWeight:800, color:'var(--red-1)' }}>{duel.aiName}</span>
      <span style={{ fontSize:9, color:'var(--ink-3)' }}>PAS {duel.aiPas}</span>
      <span className="font-display" style={{ fontSize:18, color:'var(--red-1)', lineHeight:1 }}>{duel.aiRoll}</span>
      <span style={{ marginLeft:'auto', fontSize:10, fontWeight:800, fontFamily:'var(--font-display)', color:wColor }}>
        {duel.playerWon ? '✓ YOU +10 ATK' : '✗ AI +10 ATK'}
      </span>
    </div>
  )
}

/* ── Compact attack card — everything in one card, no separate boxes ── */
function CompactAttack({ attack, isPlayerSide }: {
  attack: BattleMatchup; isPlayerSide: boolean
}) {
  const accent    = isPlayerSide ? 'var(--gold-1)'           : 'var(--red-1)'
  const accentBg  = isPlayerSide ? 'rgba(255,214,107,0.05)'  : 'rgba(255,71,103,0.05)'
  const accentBdr = isPlayerSide ? 'rgba(255,214,107,0.22)'  : 'rgba(255,71,103,0.22)'
  const accentGlow= isPlayerSide ? 'var(--gold-glow)'        : 'rgba(255,71,103,0.4)'
  const sideLabel = isPlayerSide ? '⚔️ YOUR ATTACK'          : '🤖 AI ATTACK'
  const atkIcon   = isPlayerSide ? '🏃'                      : '🤖'
  const beatDef   = attack.attackerRoll > attack.defenderRoll

  const outcomeLabel = attack.scored ? '⚽  GOAL!'
                     : beatDef       ? '🧱  STOPPED'
                     :                 '🛡  BLOCKED'
  const outcomeColor = attack.scored ? accent
                     : beatDef       ? 'var(--purple-1)'
                     :                 'var(--cyan-1)'

  return (
    <div style={{
      borderRadius:12, overflow:'hidden',
      border:`1px solid ${accentBdr}`,
      background: accentBg,
    }}>
      {/* Header: side label + outcome */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'7px 12px',
        borderBottom:`1px solid ${accentBdr}`,
      }}>
        <span style={{ fontSize:9, fontFamily:'var(--font-display)', color:accent, letterSpacing:'0.1em' }}>
          {sideLabel}
        </span>
        <span style={{
          fontSize:13, fontWeight:800, fontFamily:'var(--font-display)',
          color: outcomeColor, letterSpacing:'0.06em',
          textShadow: attack.scored ? `0 0 10px ${accentGlow}` : 'none',
        }}>
          {outcomeLabel}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>

        {/* Attacker row */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20, flexShrink:0 }}>{atkIcon}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap', marginBottom:3 }}>
              <span style={{ fontSize:13, fontWeight:800, color:'var(--ink-0)' }}>{attack.attacker.name}</span>
              {attack.attacker.oopPenalty > 0 && (
                <span style={{ fontSize:8, color:'rgba(255,160,0,0.85)', background:'rgba(255,160,0,0.12)', padding:'1px 4px', borderRadius:3 }}>
                  −{attack.attacker.oopPenalty}%
                </span>
              )}
              {attack.attacker.chemBonus > 0 && (
                <span style={{ fontSize:8, color:'var(--green-1)', background:'rgba(68,255,158,0.1)', padding:'1px 4px', borderRadius:3 }}>
                  +{attack.attacker.chemBonus}⚗
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:4 }}>
              <MiniStat label="PAC" value={attack.attacker.pac} />
              <MiniStat label="SHO" value={attack.attacker.sho} />
              <MiniStat label="DRI" value={attack.attacker.dri} />
            </div>
          </div>
          <div className="font-display" style={{ fontSize:38, color:accent, lineHeight:1, flexShrink:0 }}>
            {attack.attackerRoll}
          </div>
        </div>

        <div style={{ height:1, background:'rgba(255,255,255,0.06)' }} />

        {/* Defender row */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16, flexShrink:0 }}>🛡</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-1)', marginBottom:3 }}>{attack.defender.name}</div>
            <div style={{ display:'flex', gap:4 }}>
              <MiniStat label="DEF" value={attack.defender.def} />
              <MiniStat label="PHY" value={attack.defender.phy} />
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div className="font-display" style={{ fontSize:28, color:'var(--cyan-1)', lineHeight:1 }}>
              {attack.defenderRoll}
            </div>
            <div style={{ fontSize:8, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'0.05em',
              color: beatDef ? 'var(--green-1)' : 'var(--red-1)' }}>
              {beatDef ? 'BEAT' : 'TACKLED'}
            </div>
          </div>
        </div>

        {/* Last man row — only shown when beat defender */}
        {beatDef && (
          <>
            <div style={{ height:1, background:'rgba(255,255,255,0.06)' }} />
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:16, flexShrink:0 }}>🧱</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-1)', marginBottom:3 }}>{attack.lastMan.name}</div>
                <div style={{ display:'flex', gap:4 }}>
                  <MiniStat label="DEF" value={attack.lastMan.def} />
                  <MiniStat label="PHY" value={attack.lastMan.phy} />
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div className="font-display" style={{ fontSize:28, color:'var(--purple-1)', lineHeight:1 }}>
                  {attack.lastManRoll}
                </div>
                <div style={{ fontSize:8, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'0.05em',
                  color: attack.scored ? 'var(--green-1)' : 'var(--red-1)' }}>
                  {attack.scored ? 'BEAT' : 'SAVED'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      display:'flex', gap:2, alignItems:'baseline',
      background:'rgba(255,255,255,0.06)', borderRadius:4, padding:'1px 5px',
    }}>
      <span style={{ fontSize:7, color:'var(--ink-3)', fontFamily:'var(--font-display)', letterSpacing:'0.05em' }}>{label}</span>
      <span style={{ fontSize:11, fontWeight:800, color:'var(--ink-0)' }}>{value}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Result wrapper + screen                                                 */
/* ─────────────────────────────────────────────────────────────────────── */

function ResultWrapper({ onGoHome }: { onGoHome?: () => void }) {
  const { battle, completeBattle, resetBattle } = useGameStore()
  const [rewarded, setRewarded] = useState(false)

  useEffect(() => {
    if (!rewarded) {
      setRewarded(true)
      completeBattle()
    }
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

  // Build performance breakdown
  const goals        = playerGoals * 18
  const cleanSheet   = aiGoals === 0 ? 35 : 0
  const base         = isWin ? 80 : isDraw ? 25 : 10
  const beforeMult   = base + goals + cleanSheet

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', minHeight:'100%', gap:20, padding:24,
      position:'relative', overflow:'hidden',
    }}>
      {isWin && (
        <div style={{
          position:'absolute', top:'50%', left:'50%', width:600, height:600,
          transform:'translate(-50%, -50%)',
          background:'conic-gradient(from 0deg, transparent 0deg, rgba(255,214,107,0.06) 10deg, transparent 20deg)',
          animation:'spin-slow 8s linear infinite', pointerEvents:'none',
        }}/>
      )}

      <div style={{ fontSize:64, animation:'float-slow 3s ease-in-out infinite', position:'relative', zIndex:2 }}>
        {resultEmoji}
      </div>

      <div className="text-center" style={{ position:'relative', zIndex:2 }}>
        <div className="font-display" style={{
          fontSize:80, lineHeight:0.85, letterSpacing:'0.04em',
          color:resultColor, textShadow:`0 0 40px ${resultGlow}`,
        }}>
          {resultLabel}
        </div>
      </div>

      {/* Score */}
      <div style={{
        display:'flex', alignItems:'center', gap:28,
        background:'rgba(255,255,255,0.03)', border:'1px solid var(--line)',
        borderRadius:20, padding:'14px 40px', position:'relative', zIndex:2,
      }}>
        <div className="text-center">
          <div className="eyebrow" style={{ fontSize:9, color:'var(--ink-3)' }}>YOU</div>
          <div className="font-display" style={{
            fontSize:64, lineHeight:1,
            color: isWin ? 'var(--gold-1)' : 'var(--ink-1)',
            textShadow: isWin ? '0 0 30px var(--gold-glow)' : 'none',
          }}>{playerGoals}</div>
        </div>
        <div style={{ color:'var(--ink-3)', fontSize:28, fontWeight:800 }}>—</div>
        <div className="text-center">
          <div className="eyebrow" style={{ fontSize:9, color:'var(--ink-3)' }}>AI</div>
          <div className="font-display" style={{
            fontSize:64, lineHeight:1,
            color: winner === 'ai' ? 'var(--red-1)' : 'var(--ink-1)',
            textShadow: winner === 'ai' ? '0 0 30px rgba(255,71,103,0.5)' : 'none',
          }}>{aiGoals}</div>
        </div>
      </div>

      {/* Man of the match */}
      {manOfMatch && (
        <div style={{
          background:'rgba(68,255,158,0.07)', border:'1px solid rgba(68,255,158,0.3)',
          borderRadius:12, padding:'10px 24px', textAlign:'center',
          position:'relative', zIndex:2,
          animation:'pop-in 0.4s 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <div className="eyebrow" style={{ fontSize:9, color:'var(--green-1)' }}>⭐ MAN OF THE MATCH</div>
          <div className="font-display" style={{ fontSize:22, color:'var(--ink-0)', letterSpacing:'0.06em', marginTop:2 }}>
            {manOfMatch}
          </div>
        </div>
      )}

      {/* Coin breakdown */}
      <div style={{
        background:'rgba(255,214,107,0.06)', border:'1px solid rgba(255,214,107,0.25)',
        borderRadius:16, padding:'14px 24px', position:'relative', zIndex:2,
        animation:'coin-bump 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
        minWidth: 220,
      }}>
        <div className="eyebrow" style={{ fontSize:9, color:'var(--ink-3)', marginBottom:8, textAlign:'center' }}>COINS EARNED</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <CoinLine label={isWin ? 'Win bonus' : isDraw ? 'Draw bonus' : 'Loss'} value={base} />
          {goals > 0 && <CoinLine label={`${playerGoals} goal${playerGoals>1?'s':''} ×18`} value={goals} />}
          {cleanSheet > 0 && <CoinLine label="Clean sheet" value={cleanSheet} />}
          {streakMultiplier > 1 && (
            <CoinLine label={`${streakMultiplier}× streak bonus`} value={Math.round(beforeMult * (streakMultiplier - 1))} accent="var(--gold-1)" />
          )}
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', marginTop:8, paddingTop:8, textAlign:'center' }}>
          <div className="font-display" style={{ fontSize:36, color:'var(--gold-1)', lineHeight:1 }}>
            +{coinsEarned.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:12, position:'relative', zIndex:2 }}>
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="btn"
            style={{
              fontSize:14, padding:'12px 24px',
              background:'rgba(255,255,255,0.04)',
              border:'1px solid var(--line)',
              borderRadius:12, color:'var(--ink-2)', cursor:'pointer',
            }}
          >
            🏠 Home
          </button>
        )}
        <button onClick={onReset} className="btn btn-primary" style={{ fontSize:16, padding:'14px 36px' }}>
          ⚔️ Battle Again
        </button>
      </div>
    </div>
  )
}

function CoinLine({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
      <span style={{ fontSize:11, color:'var(--ink-3)' }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:800, color: accent ?? 'var(--ink-1)', fontFamily:'var(--font-mono)' }}>
        +{value}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Shared sub-components                                                   */
/* ─────────────────────────────────────────────────────────────────────── */

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      display:'flex', gap:3, alignItems:'baseline',
      background:'rgba(255,255,255,0.06)', borderRadius:6, padding:'2px 6px',
    }}>
      <span className="eyebrow" style={{ fontSize:8, color:'var(--ink-3)' }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:800, color:'var(--ink-0)' }}>{value}</span>
    </div>
  )
}

function ScoreBoard({
  playerScore, aiScore, playerBump, aiBump,
}: {
  playerScore: number; aiScore: number; playerBump: number; aiBump: number
}) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:24,
      background:'rgba(255,255,255,0.03)', border:'1px solid var(--line)',
      borderRadius:16, padding:'12px 32px',
    }}>
      <div className="text-center">
        <div className="eyebrow" style={{ fontSize:9, color:'var(--ink-3)' }}>YOU</div>
        <div
          key={`p-${playerBump}`}
          className="font-display"
          style={{
            fontSize:56, lineHeight:1, color:'var(--gold-1)',
            textShadow:'0 0 24px var(--gold-glow)',
            animation: playerBump > 0 ? 'score-bump 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
          }}
        >{playerScore}</div>
      </div>
      <div style={{ color:'var(--ink-3)', fontSize:28, fontWeight:800 }}>—</div>
      <div className="text-center">
        <div className="eyebrow" style={{ fontSize:9, color:'var(--ink-3)' }}>AI</div>
        <div
          key={`a-${aiBump}`}
          className="font-display"
          style={{
            fontSize:56, lineHeight:1, color:'var(--red-1)',
            textShadow:'0 0 24px rgba(255,71,103,0.5)',
            animation: aiBump > 0 ? 'score-bump 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
          }}
        >{aiScore}</div>
      </div>
    </div>
  )
}
