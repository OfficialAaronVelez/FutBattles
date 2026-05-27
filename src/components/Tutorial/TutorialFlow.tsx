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

// ── Steps 1 & 4 — Floating hint banner ───────────────────────────────────────

function TutorialBanner({ step }: { step: 1 | 4 }) {
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
              : 'Pick your attacker, defender and tactic each round. Win, draw, or lose — a Gold Pack is yours regardless 🎁'}
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

function TeamReadyScreen({ userCard, onNext }: { userCard: UserCard; onNext: () => void }) {
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
          onClick={onNext}
          style={{ fontSize: 15, padding: '16px 40px', width: '100%' }}
        >
          SEE HOW BATTLES WORK →
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

// ── Step 3 — Battle explainer visuals ────────────────────────────────────────

function StagesVisual() {
  const stages = [
    { icon: '⚽', label: 'WIN THE BALL', color: 'var(--purple-1)', bg: 'rgba(185,107,255,0.08)', border: 'rgba(185,107,255,0.25)' },
    { icon: '🛡', label: 'BEAT THE DEFENDER', color: 'var(--cyan-1)', bg: 'rgba(37,224,255,0.08)', border: 'rgba(37,224,255,0.25)' },
    { icon: '🥅', label: 'SCORE', color: 'var(--gold-1)', bg: 'rgba(255,214,107,0.08)', border: 'rgba(255,214,107,0.25)' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
      {stages.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 14,
              background: s.bg, border: `1px solid ${s.border}`,
              display: 'grid', placeItems: 'center', fontSize: 24,
            }}>
              {s.icon}
            </div>
            <div style={{
              fontSize: 7, fontFamily: 'var(--font-mono)', color: s.color,
              letterSpacing: '0.08em', textAlign: 'center', maxWidth: 64, lineHeight: 1.3,
            }}>
              {s.label}
            </div>
          </div>
          {i < stages.length - 1 && (
            <div style={{ fontSize: 18, color: 'var(--ink-3)', marginBottom: 18 }}>→</div>
          )}
        </div>
      ))}
    </div>
  )
}

function StatsVisual() {
  return (
    <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 320 }}>
      {/* Attack */}
      <div style={{
        flex: 1, background: 'rgba(255,214,107,0.05)', border: '1px solid rgba(255,214,107,0.2)',
        borderRadius: 12, padding: '12px 14px',
      }}>
        <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--gold-1)', marginBottom: 10, letterSpacing: '0.12em' }}>
          ⚔️ ATTACK
        </div>
        {[{ k: 'PAC', v: 88, hint: 'Speed' }, { k: 'SHO', v: 93, hint: 'Shooting' }, { k: 'DRI', v: 82, hint: 'Dribbling' }].map(s => (
          <div key={s.k} style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{s.k}</span>
              <span style={{ fontSize: 8, color: 'var(--gold-2)', fontFamily: 'var(--font-mono)' }}>{s.v}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${s.v}%`, background: 'var(--gold-1)', opacity: 0.85 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Defense */}
      <div style={{
        flex: 1, background: 'rgba(37,224,255,0.05)', border: '1px solid rgba(37,224,255,0.2)',
        borderRadius: 12, padding: '12px 14px',
      }}>
        <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--cyan-1)', marginBottom: 10, letterSpacing: '0.12em' }}>
          🛡 DEFENSE
        </div>
        {[{ k: 'DEF', v: 91, hint: 'Defending' }, { k: 'PHY', v: 87, hint: 'Physical' }].map(s => (
          <div key={s.k} style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{s.k}</span>
              <span style={{ fontSize: 8, color: 'var(--cyan-2, #0099bb)', fontFamily: 'var(--font-mono)' }}>{s.v}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${s.v}%`, background: 'var(--cyan-1)', opacity: 0.85 }} />
            </div>
          </div>
        ))}
        <div style={{
          marginTop: 10, fontSize: 8, color: 'var(--red-1)', textAlign: 'center',
          background: 'rgba(255,71,103,0.07)', border: '1px solid rgba(255,71,103,0.2)',
          borderRadius: 5, padding: '4px 6px', lineHeight: 1.4,
        }}>
          ⚠️ Play out of position<br />and stats get reduced
        </div>
      </div>
    </div>
  )
}

function PicksVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 300 }}>
      {/* Good pick */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
        background: 'rgba(255,214,107,0.07)', border: '1px solid rgba(255,214,107,0.3)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: 'rgba(255,214,107,0.12)', display: 'grid', placeItems: 'center',
          fontSize: 10, fontWeight: 800, color: 'var(--gold-1)', fontFamily: 'var(--font-display)',
        }}>ST</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-1)' }}>Haaland</div>
          <div style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>⚔️ ATTACKER — ROUND 1</div>
        </div>
        <div style={{ fontSize: 16 }}>⚔️</div>
      </div>

      {/* Man-marked warning */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
        background: 'rgba(255,71,103,0.06)', border: '1px solid rgba(255,71,103,0.2)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: 'rgba(255,71,103,0.10)', display: 'grid', placeItems: 'center',
          fontSize: 10, fontWeight: 800, color: 'var(--red-1)', fontFamily: 'var(--font-display)',
        }}>ST</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red-1)' }}>Haaland again?</div>
          <div style={{
            display: 'inline-block', marginTop: 3,
            fontSize: 8, fontWeight: 800, letterSpacing: '0.06em',
            color: '#ff7a7a', background: 'rgba(255,71,103,0.10)',
            border: '1px solid rgba(255,71,103,0.28)', padding: '2px 6px', borderRadius: 4,
          }}>
            🎯 MAN-MARKED — reduced effectiveness
          </div>
        </div>
      </div>

      <div style={{ fontSize: 9, color: 'var(--ink-3)', textAlign: 'center', fontStyle: 'italic' }}>
        Rotate your attackers to avoid the mark
      </div>
    </div>
  )
}

function TacticsVisual() {
  const tactics = [
    { icon: '📣', label: 'Press High',     color: 'var(--purple-1)', bg: 'rgba(185,107,255,0.08)', border: 'rgba(185,107,255,0.2)',  hint: 'Win more balls — risky if exposed' },
    { icon: '⚡', label: 'Counter',        color: 'var(--gold-1)',   bg: 'rgba(255,214,107,0.07)', border: 'rgba(255,214,107,0.2)', hint: 'Big bonus on the break' },
    { icon: '🚌', label: 'Park the Bus',   color: 'var(--cyan-1)',   bg: 'rgba(37,224,255,0.07)',  border: 'rgba(37,224,255,0.2)',  hint: 'Fortress defense, weaker attack' },
    { icon: '⚖️', label: 'Balanced',       color: 'var(--ink-2)',    bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', hint: 'No modifiers, no risk' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, width: '100%', maxWidth: 310 }}>
      {tactics.map(t => (
        <div key={t.label} style={{
          padding: '11px 10px', borderRadius: 10,
          background: t.bg, border: `1px solid ${t.border}`,
        }}>
          <div style={{ fontSize: 20, marginBottom: 5 }}>{t.icon}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.color, marginBottom: 3 }}>{t.label}</div>
          <div style={{ fontSize: 8, color: 'var(--ink-3)', lineHeight: 1.4 }}>{t.hint}</div>
        </div>
      ))}
    </div>
  )
}

function MomentumVisual() {
  const [pip, setPip] = useState(0)

  useEffect(() => {
    // Count up 0→1→2→3, hold a beat, reset, repeat
    const schedule = [0, 700, 1400, 2100, 3200]
    const timers = schedule.map((delay, i) =>
      setTimeout(() => setPip(i < 4 ? i : 0), delay)
    )
    const loop = setInterval(() => {
      schedule.forEach((delay, i) => {
        setTimeout(() => setPip(i < 4 ? i : 0), delay)
      })
    }, 3800)
    return () => { timers.forEach(clearTimeout); clearInterval(loop) }
  }, [])

  const onFire = pip >= 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <div style={{
        padding: '16px 32px', borderRadius: 14, textAlign: 'center',
        background: onFire ? 'rgba(255,214,107,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${onFire ? 'rgba(255,214,107,0.4)' : 'rgba(255,255,255,0.08)'}`,
        transition: 'all 0.4s ease',
        boxShadow: onFire ? '0 0 24px rgba(255,214,107,0.12)' : 'none',
      }}>
        <div style={{
          fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', marginBottom: 10,
          color: onFire ? 'var(--gold-1)' : 'var(--ink-3)',
          fontWeight: onFire ? 800 : 400,
          transition: 'color 0.3s',
        }}>
          {onFire ? '🔥 ON FIRE! ATTACK BONUS ACTIVE' : 'YOUR MOMENTUM'}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {[1, 2, 3].map(p => (
            <div key={p} style={{
              height: 10, borderRadius: 5,
              width: p <= pip ? 28 : 14,
              background: p <= pip ? 'var(--gold-1)' : 'rgba(255,255,255,0.1)',
              boxShadow: p <= pip && onFire ? '0 0 12px var(--gold-glow)' : 'none',
              transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
          ))}
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.5, maxWidth: 260 }}>
        {onFire
          ? 'Three goals in a row → your whole team feels it'
          : `${3 - pip} consecutive goal${3 - pip !== 1 ? 's' : ''} until the bonus fires`}
      </div>
    </div>
  )
}

// ── Step 3 — Battle explainer screen ─────────────────────────────────────────

type SlideVisual = 'stages' | 'stats' | 'picks' | 'tactics' | 'momentum'

interface ExplainerSlide {
  eyebrow: string
  titleLine1: string
  titleLine2: string
  body: string
  visual: SlideVisual
}

const SLIDES: ExplainerSlide[] = [
  {
    eyebrow:    'HOW BATTLES WORK',
    titleLine1: 'THREE STAGES,',
    titleLine2: 'EVERY ATTACK',
    body:       'Both teams attack every round — 5 rounds total. To score, your attacker must win the ball, beat the first defender, then beat the last man. Fail any stage and the chance is gone.',
    visual:     'stages',
  },
  {
    eyebrow:    'YOUR CARDS',
    titleLine1: 'THE RIGHT CARD',
    titleLine2: 'IN THE RIGHT SPOT',
    body:       'Attackers use PAC (speed), SHO (shooting) and DRI (dribbling). Defenders use DEF and PHY. Play a card out of its natural position and those stats get scaled down — so keep your defenders defending.',
    visual:     'stats',
  },
  {
    eyebrow:    'EACH ROUND',
    titleLine1: 'YOU DECIDE',
    titleLine2: 'WHO FIGHTS',
    body:       'Before each round you pick your attacker and your defender. Mix up your attackers — send the same card twice in a row and the AI marks them, reducing their effectiveness.',
    visual:     'picks',
  },
  {
    eyebrow:    'PRE-ROUND STRATEGY',
    titleLine1: 'CHOOSE YOUR',
    titleLine2: 'TACTIC',
    body:       'Pick a tactic before choosing your players. Press High wins more possession but leaves gaps. Counter Attack punishes turnovers. Park the Bus is a fortress at the cost of attack power. Balanced plays it safe.',
    visual:     'tactics',
  },
  {
    eyebrow:    'THE X-FACTOR',
    titleLine1: 'MOMENTUM',
    titleLine2: 'CHANGES GAMES',
    body:       "Score three in a row and your team goes 🔥 ON FIRE — a hidden bonus that makes attacks significantly harder to stop. The AI can catch fire too. Rotate attackers and switch tactics to break their rhythm.",
    visual:     'momentum',
  },
]

function BattleExplainerScreen({ onReady }: { onReady: () => void }) {
  const [slide, setSlide] = useState(0)
  const s      = SLIDES[slide]
  const isLast = slide === SLIDES.length - 1

  return (
    <div style={overlay}>
      <div style={{ maxWidth: 400, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div className="font-display" style={{ fontSize: 9, color: 'var(--gold-2)', letterSpacing: '0.22em', marginBottom: 4 }}>
            STEP 2 OF 3 — BEFORE YOU PLAY
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            Quick walkthrough · 5 slides · then straight into the battle
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => setSlide(i)}
              style={{
                width: i === slide ? 24 : 7, height: 7, borderRadius: 4, cursor: 'pointer',
                background: i === slide
                  ? 'var(--gold-1)'
                  : i < slide
                  ? 'rgba(212,175,55,0.35)'
                  : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        {/* Slide card */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20, padding: '22px 20px',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          {/* Eyebrow + title */}
          <div>
            <div style={{
              fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--gold-2)',
              letterSpacing: '0.2em', marginBottom: 7,
            }}>
              {s.eyebrow}
            </div>
            <div className="font-display" style={{ fontSize: 28, lineHeight: 1.0, color: 'var(--ink-0)', letterSpacing: '0.04em' }}>
              {s.titleLine1}<br />
              <span style={{ color: 'var(--gold-1)' }}>{s.titleLine2}</span>
            </div>
          </div>

          {/* Visual */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {s.visual === 'stages'   && <StagesVisual />}
            {s.visual === 'stats'    && <StatsVisual />}
            {s.visual === 'picks'    && <PicksVisual />}
            {s.visual === 'tactics'  && <TacticsVisual />}
            {s.visual === 'momentum' && <MomentumVisual />}
          </div>

          {/* Body text */}
          <div style={{
            fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65,
            borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14,
          }}>
            {s.body}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10 }}>
          {slide > 0 && (
            <button
              onClick={() => setSlide(i => i - 1)}
              style={{
                padding: '13px 18px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--ink-3)', fontSize: 12,
                fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
              }}
            >
              ← BACK
            </button>
          )}
          <button
            onClick={() => isLast ? onReady() : setSlide(i => i + 1)}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.1em',
              background: isLast
                ? 'linear-gradient(135deg, rgba(255,214,107,0.22), rgba(200,128,27,0.18))'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isLast ? 'var(--gold-2)' : 'rgba(255,255,255,0.12)'}`,
              color: isLast ? 'var(--gold-1)' : 'var(--ink-1)',
              transition: 'all 0.2s',
            }}
          >
            {isLast ? "⚽ GOT IT — LET'S PLAY" : 'NEXT →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-3)' }}>
          {slide + 1} / {SLIDES.length}
        </div>
      </div>
    </div>
  )
}

// ── Step 5 — Reward ───────────────────────────────────────────────────────────

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

// Step map:
//  0 — Welcome
//  1 — Pack opening banner (user forges card)
//  2 — Team Ready screen
//  3 — Battle Explainer (5 slides)
//  4 — Battle banner (user plays interactively)
//  5 — Reward screen
type TStep = 0 | 1 | 2 | 3 | 4 | 5

export function TutorialFlow({ username }: { username: string }) {
  const [step, setStep] = useState<TStep>(0)

  const {
    roster, battle,
    startFreePackOpening, startBattle, setPlayerTeam, runBattle,
    setTutorialDone, addCoins, resetBattle,
  } = useGameStore()

  // Keep the userCard alive between step 2 (team ready) and step 3 (explainer)
  const userCardRef = useRef<UserCard | null>(null)

  // Capture battle result when it lands (runBattle is interactive — waits for all rounds)
  const savedResult = useRef<{
    winner?:     'player' | 'ai' | 'draw'
    playerGoals: number
    aiGoals:     number
  }>({ playerGoals: 0, aiGoals: 0 })

  // Step 1 → 2: card created (roster gained an entry)
  useEffect(() => {
    if (step !== 1 || roster.length === 0) return
    const t = setTimeout(() => setStep(2), 700)
    return () => clearTimeout(t)
  }, [roster.length, step])

  // Step 4 → 5: battle result is in
  useEffect(() => {
    if (step !== 4) return
    if (battle?.phase === 'result') {
      if (battle.result) {
        savedResult.current = {
          winner:      battle.result.winner,
          playerGoals: battle.result.playerGoals,
          aiGoals:     battle.result.aiGoals,
        }
      }
      const t = setTimeout(() => setStep(5), 1800)
      return () => clearTimeout(t)
    }
    // User dismissed battle before tutorial caught it — still advance
    if (battle === null) {
      const t = setTimeout(() => setStep(5), 0)
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
        onNext={() => {
          userCardRef.current = userCard
          setStep(3)
        }}
      />
    )
  }

  if (step === 3) {
    return (
      <BattleExplainerScreen
        onReady={() => {
          const userCard = userCardRef.current ?? roster[roster.length - 1]
          const team = buildTutorialTeam(userCard)
          startBattle()
          setPlayerTeam(team)
          runBattle()
          setStep(4)
        }}
      />
    )
  }

  if (step === 5) {
    return (
      <RewardScreen
        winner={savedResult.current.winner}
        playerGoals={savedResult.current.playerGoals}
        aiGoals={savedResult.current.aiGoals}
        onOpenPack={() => {
          resetBattle()
          setTutorialDone()
          addCoins(600)
          startFreePackOpening(username, 'gold')
        }}
      />
    )
  }

  // Steps 1 & 4: floating banner while pack/battle runs underneath
  return <TutorialBanner step={step as 1 | 4} />
}
