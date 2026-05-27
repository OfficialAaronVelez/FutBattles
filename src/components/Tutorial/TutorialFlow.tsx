import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import type { UserCard, FormationSlot, Team7v7, Position, PlayerStats } from '../../types'

// ── Demo squad builder ────────────────────────────────────────────────────────

function makeDemo(
  name: string,
  position: Position,
  stats: Partial<PlayerStats>,
  club: string,
  nation: string,
): UserCard {
  return {
    id:             `demo-${crypto.randomUUID()}`,
    name,
    position,
    stats,
    cosmetic:       'base',
    createdAt:      0,
    clubAffinity:   club,
    nationAffinity: nation,
  }
}

function buildTutorialTeam(userCard: UserCard): Team7v7 {
  const slots: FormationSlot[] = [
    { id: 'lst', label: 'ST', row: 3, col: 0, card: userCard },
    { id: 'rst', label: 'ST', row: 3, col: 2, card: makeDemo('Haaland',     'ST', { PAC:89, SHO:93, PAS:66, DRI:80, DEF:45, PHY:88 }, 'Man City',    'Norway')   },
    { id: 'lm',  label: 'LM', row: 2, col: 0, card: makeDemo('Vinícius Jr', 'LW', { PAC:95, SHO:80, PAS:78, DRI:93, DEF:28, PHY:68 }, 'Real Madrid', 'Brazil')   },
    { id: 'rm',  label: 'RM', row: 2, col: 2, card: makeDemo('Salah',       'RW', { PAC:93, SHO:87, PAS:80, DRI:91, DEF:45, PHY:75 }, 'Liverpool',   'Egypt')    },
    { id: 'lb',  label: 'LB', row: 1, col: 0, card: makeDemo('Robertson',   'LB', { PAC:83, SHO:57, PAS:81, DRI:76, DEF:81, PHY:73 }, 'Liverpool',   'Scotland') },
    { id: 'cb',  label: 'CB', row: 1, col: 1, card: makeDemo('Van Dijk',    'CB', { PAC:78, SHO:42, PAS:71, DRI:66, DEF:91, PHY:88 }, 'Liverpool',   'Netherlands') },
    { id: 'rb',  label: 'RB', row: 1, col: 2, card: makeDemo('Trent A-A',   'RB', { PAC:80, SHO:72, PAS:88, DRI:79, DEF:73, PHY:66 }, 'Liverpool',   'England')  },
  ]
  return { formation: '3-2-2', slots }
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position:       'fixed',
  inset:          0,
  zIndex:         999,
  background:     'linear-gradient(180deg, rgba(4,6,13,0.98) 0%, rgba(8,12,22,0.98) 100%)',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  padding:        '24px 16px',
  overflowY:      'auto',
}

// ── Step 0 — Welcome ──────────────────────────────────────────────────────────

function WelcomeScreen({ username, onStart }: { username: string; onStart: () => void }) {
  return (
    <div style={overlay}>
      <div style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>

        {/* Logo */}
        <div style={{ marginBottom: 40 }}>
          <div className="font-display" style={{ fontSize: 11, color: 'var(--gold-2)', letterSpacing: '0.25em', marginBottom: 8 }}>
            WELCOME TO
          </div>
          <div
            className="font-display"
            style={{
              fontSize: 70, lineHeight: 0.85, color: 'var(--gold-1)',
              textShadow: '0 0 60px var(--gold-glow), 0 0 120px rgba(212,175,55,0.25)',
              animation: 'tut-pulse 3s ease-in-out infinite',
            }}
          >
            FUT<br />BATTLES
          </div>
          <div style={{
            fontSize: 15, marginTop: 16,
            fontFamily: 'var(--font-display)', letterSpacing: '0.2em',
            color: 'var(--gold-1)',
          }}>
            {username}
          </div>
        </div>

        {/* 3-step preview */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 48 }}>
          {[
            { icon: '🎴', num: '01', label: 'BUILD A CARD' },
            { icon: '⚽', num: '02', label: 'BATTLE' },
            { icon: '🎁', num: '03', label: 'GOLD PACK' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 58, height: 58, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
                border: '1px solid rgba(212,175,55,0.3)',
                display: 'grid', placeItems: 'center', fontSize: 26,
                boxShadow: '0 0 20px rgba(212,175,55,0.08)',
              }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 8, fontFamily: 'var(--font-display)', color: 'var(--gold-3)', letterSpacing: '0.1em' }}>{s.num}</div>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--ink-3)', letterSpacing: '0.08em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={onStart}
          style={{ fontSize: 15, padding: '16px 40px', width: '100%' }}
        >
          BUILD YOUR FIRST CARD →
        </button>

        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 14 }}>
          Takes ~2 minutes · Free Gold Pack reward at the end
        </div>
      </div>
    </div>
  )
}

// ── Steps 1 & 3 — Floating hint banner ───────────────────────────────────────

function TutorialBanner({ step }: { step: 1 | 3 }) {
  const progressAt = step === 1 ? 0 : 1

  return (
    <div style={{
      position:       'fixed',
      top:            16,
      left:           '50%',
      transform:      'translateX(-50%)',
      zIndex:         900,
      width:          'calc(100% - 32px)',
      maxWidth:       480,
      background:     'linear-gradient(135deg, rgba(8,12,22,0.97), rgba(16,24,44,0.97))',
      border:         '1px solid rgba(212,175,55,0.4)',
      borderRadius:   16,
      padding:        '14px 20px',
      boxShadow:      '0 8px 40px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.08)',
      backdropFilter: 'blur(12px)',
      pointerEvents:  'none',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>
          {step === 1 ? '🎴' : '⚔️'}
        </div>
        <div>
          <div className="font-display" style={{ fontSize: 11, color: 'var(--gold-1)', letterSpacing: '0.1em', marginBottom: 4 }}>
            {step === 1 ? 'BUILD YOUR CARD — STEP 1 OF 3' : 'BATTLE IN PROGRESS — STEP 2 OF 3'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {step === 1
              ? "Pick stats from each player — they become your card's attributes. Lock a position to set your role!"
              : 'Your squad is fighting! Win, draw, or lose — a Gold Welcome Pack is yours regardless 🎁'}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, justifyContent: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width:      i === progressAt ? 22 : 6,
            height:     6,
            borderRadius: 3,
            background: i === progressAt ? 'var(--gold-1)' : 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Step 2 — Team ready ───────────────────────────────────────────────────────

function TeamReadyScreen({ userCard, onBattle }: { userCard: UserCard; onBattle: () => void }) {
  const statCount = Object.keys(userCard.stats).length

  const demoCast = [
    { name: 'Haaland',     pos: 'ST', club: 'Man City'    },
    { name: 'Vinícius Jr', pos: 'LM', club: 'Real Madrid' },
    { name: 'Salah',       pos: 'RM', club: 'Liverpool'   },
    { name: 'Robertson',   pos: 'LB', club: 'Liverpool'   },
    { name: 'Van Dijk',    pos: 'CB', club: 'Liverpool'   },
    { name: 'Trent A-A',   pos: 'RB', club: 'Liverpool'   },
  ]

  return (
    <div style={overlay}>
      <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
        <div className="font-display" style={{ fontSize: 10, color: 'var(--gold-2)', letterSpacing: '0.25em', marginBottom: 8 }}>
          STEP 2 OF 3
        </div>
        <div className="font-display" style={{ fontSize: 38, color: 'var(--ink-0)', marginBottom: 4, lineHeight: 1 }}>
          YOUR SQUAD<br /><span style={{ color: 'var(--gold-1)' }}>IS READY</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 32 }}>
          Your card leads the attack · 6 legends have your back
        </div>

        {/* User card highlight */}
        <div style={{
          background:  'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.05))',
          border:      '1px solid rgba(212,175,55,0.5)',
          borderRadius: 14,
          padding:     '14px 20px',
          marginBottom: 12,
          display:     'flex',
          alignItems:  'center',
          gap:         14,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--gold-1), var(--gold-3))',
            display: 'grid', placeItems: 'center',
            fontSize: 20, color: '#1a1006', fontFamily: 'var(--font-display)', fontWeight: 900,
            boxShadow: '0 0 20px var(--gold-glow)',
          }}>★</div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--gold-1)', letterSpacing: '0.12em', marginBottom: 3 }}>
              YOUR CARD
            </div>
            <div style={{ fontSize: 17, fontFamily: 'var(--font-display)', color: 'var(--ink-0)', letterSpacing: '0.05em' }}>
              {userCard.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
              {userCard.position ?? 'ANY'} · {statCount} stat{statCount !== 1 ? 's' : ''} built
            </div>
          </div>
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-display)',
            color: 'var(--green-1)', letterSpacing: '0.08em',
            background: 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.2)',
            borderRadius: 6, padding: '4px 8px', flexShrink: 0,
          }}>CAPTAIN</div>
        </div>

        {/* Demo players grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 32 }}>
          {demoCast.map((p) => (
            <div key={p.name} style={{
              background:   'rgba(255,255,255,0.04)',
              border:       '1px solid var(--line)',
              borderRadius: 10,
              padding:      '10px 8px',
              textAlign:    'center',
            }}>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--ink-3)', letterSpacing: '0.1em', marginBottom: 3 }}>
                {p.pos}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-1)', fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2 }}>{p.club}</div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={onBattle}
          style={{ fontSize: 15, padding: '16px 40px', width: '100%' }}
        >
          ⚽ KICK OFF →
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>FORMATION</div>
          <div style={{
            fontSize: 11, color: 'var(--gold-1)', fontFamily: 'var(--font-display)',
            background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 6, padding: '3px 10px',
          }}>3-2-2</div>
        </div>
      </div>
    </div>
  )
}

// ── Step 4 — Reward ───────────────────────────────────────────────────────────

function RewardScreen({
  winner, playerGoals, aiGoals, onOpenPack,
}: {
  winner?:     'player' | 'ai' | 'draw'
  playerGoals: number
  aiGoals:     number
  onOpenPack:  () => void
}) {
  const won  = winner === 'player'
  const drew = winner === 'draw'

  return (
    <div style={overlay}>
      <div style={{ textAlign: 'center', maxWidth: 380, width: '100%' }}>

        {/* Score badge */}
        <div style={{
          display:      'inline-flex',
          alignItems:   'center',
          gap:          16,
          background:   'rgba(255,255,255,0.04)',
          border:       '1px solid var(--line)',
          borderRadius: 16,
          padding:      '14px 28px',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--ink-3)', letterSpacing: '0.12em' }}>YOU</div>
          <div className="font-display" style={{ fontSize: 40, color: 'var(--ink-0)', letterSpacing: '0.04em' }}>
            {playerGoals} – {aiGoals}
          </div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--ink-3)', letterSpacing: '0.12em' }}>CPU</div>
        </div>

        {/* Result headline */}
        <div className="font-display" style={{
          fontSize:   30,
          letterSpacing: '0.06em',
          marginBottom: 6,
          color: won ? 'var(--green-1)' : drew ? 'var(--gold-1)' : 'var(--red-1)',
        }}>
          {won ? '🏆 VICTORY!' : drew ? '🤝 DRAW!' : '💪 GOOD FIGHT!'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 36, lineHeight: 1.5 }}>
          {won
            ? 'What a debut — your squad dominated! The future is bright.'
            : drew
            ? 'Tight match! Chemistry will make the difference next time.'
            : 'Every legend has a bad day. Learn. Adapt. Come back stronger.'}
        </div>

        {/* Gold pack reward box */}
        <div style={{
          position:     'relative',
          background:   'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
          border:       '1px solid rgba(212,175,55,0.45)',
          borderRadius: 20,
          padding:      '28px 24px',
          marginBottom: 28,
          overflow:     'hidden',
        }}>
          {/* Background glow */}
          <div style={{
            position:       'absolute',
            inset:          0,
            background:     'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.18) 0%, transparent 65%)',
            pointerEvents:  'none',
          }} />

          <div style={{ fontSize: 58, marginBottom: 12, display: 'block', animation: 'pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            🎁
          </div>
          <div className="font-display" style={{ fontSize: 10, color: 'var(--gold-2)', letterSpacing: '0.25em', marginBottom: 6 }}>
            TUTORIAL REWARD
          </div>
          <div className="font-display" style={{
            fontSize:   34,
            color:      'var(--gold-1)',
            letterSpacing: '0.05em',
            marginBottom: 6,
            textShadow: '0 0 30px var(--gold-glow)',
          }}>
            GOLD PACK
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            8 elite players · 1 guaranteed 85+ rated
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={onOpenPack}
          style={{ fontSize: 15, padding: '16px 40px', width: '100%' }}
        >
          🎁 OPEN YOUR GOLD PACK →
        </button>
      </div>
    </div>
  )
}

// ── Main tutorial orchestrator ────────────────────────────────────────────────

type TStep = 0 | 1 | 2 | 3 | 4

export function TutorialFlow({ username }: { username: string }) {
  const [step, setStep] = useState<TStep>(0)

  const {
    roster, battle,
    startFreePackOpening, startBattle, setPlayerTeam, runBattle,
    setTutorialDone, addCoins, resetBattle,
  } = useGameStore()

  // Capture battle result at kick-off (runBattle computes synchronously)
  const savedResult = useRef<{
    winner?:     'player' | 'ai' | 'draw'
    playerGoals: number
    aiGoals:     number
  }>({ playerGoals: 0, aiGoals: 0 })

  // Step 1 → 2: card created (pack session cleared, roster gained an entry)
  useEffect(() => {
    if (step !== 1 || roster.length === 0) return
    const t = setTimeout(() => setStep(2), 700)
    return () => clearTimeout(t)
  }, [roster.length, step])

  // Step 3 → 4: battle result is in
  useEffect(() => {
    if (step !== 3) return
    if (battle?.phase === 'result') {
      // Save result before it can be cleared
      if (battle.result) {
        savedResult.current = {
          winner:      battle.result.winner,
          playerGoals: battle.result.playerGoals,
          aiGoals:     battle.result.aiGoals,
        }
      }
      const t = setTimeout(() => setStep(4), 1800)
      return () => clearTimeout(t)
    }
    // User dismissed battle before tutorial caught it — still advance
    if (battle === null) {
      const t = setTimeout(() => setStep(4), 0)
      return () => clearTimeout(t)
    }
  }, [battle, battle?.phase, step])

  // ── Step renders ──

  if (step === 0) {
    return (
      <WelcomeScreen
        username={username}
        onStart={() => {
          startFreePackOpening(username, 'gold')
          setStep(1)
        }}
      />
    )
  }

  if (step === 2) {
    const userCard = roster[roster.length - 1]
    return (
      <TeamReadyScreen
        userCard={userCard}
        onBattle={() => {
          const team = buildTutorialTeam(userCard)
          startBattle()
          setPlayerTeam(team)
          runBattle()
          // Capture result right away (runBattle is synchronous)
          const st = useGameStore.getState()
          if (st.battle?.result) {
            savedResult.current = {
              winner:      st.battle.result.winner,
              playerGoals: st.battle.result.playerGoals,
              aiGoals:     st.battle.result.aiGoals,
            }
          }
          setStep(3)
        }}
      />
    )
  }

  if (step === 4) {
    return (
      <RewardScreen
        winner={savedResult.current.winner}
        playerGoals={savedResult.current.playerGoals}
        aiGoals={savedResult.current.aiGoals}
        onOpenPack={() => {
          resetBattle()              // clear tutorial battle so layout exits immersive mode
          setTutorialDone()
          addCoins(600)              // welcome gold pack is free
          startFreePackOpening(username, 'gold')
        }}
      />
    )
  }

  // Steps 1 & 3: floating banner while pack/battle runs underneath
  return <TutorialBanner step={step as 1 | 3} />
}
