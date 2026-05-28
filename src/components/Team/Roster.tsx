import { useState, useRef, useCallback, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { FutCard } from '../CardDisplay/FutCard'
import { getRarityTier } from '../../data/players'
import { STAT_KEYS } from '../../types'
import type { UserCard, StatKey, CardCosmetic } from '../../types'

function computeOverall(stats: Partial<Record<StatKey, number>>): number {
  const vals = Object.values(stats).filter((v): v is number => typeof v === 'number')
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
}

// ── Card Back — Stats Display ─────────────────────────────────────────────────

const CARD_BACK_THEMES: Record<CardCosmetic | 'bronze' | 'silver' | 'gold' | 'icon', {
  bg: string; c1: string; c2: string; glow: string; accent?: string
}> = {
  base:   { bg: 'linear-gradient(155deg,#0e0a04 0%,#060402 100%)', c1: '#ffd66b', c2: '#c8801b', glow: 'rgba(212,175,55,0.55)' },
  bronze: { bg: 'linear-gradient(155deg,#1a0a04 0%,#0a0401 100%)', c1: '#ffb27a', c2: '#7a3f17', glow: 'rgba(209,118,58,0.5)' },
  silver: { bg: 'linear-gradient(155deg,#0c1020 0%,#060a14 100%)', c1: '#e8eef8', c2: '#5c6477', glow: 'rgba(170,180,198,0.5)' },
  gold:   { bg: 'linear-gradient(155deg,#0e0a04 0%,#060402 100%)', c1: '#ffd66b', c2: '#c8801b', glow: 'rgba(212,175,55,0.55)' },
  icon:   { bg: 'linear-gradient(155deg,#141002 0%,#070500 100%)', c1: '#fff7d4', c2: '#b88c14', glow: 'rgba(255,230,100,0.7)' },
  neon:   { bg: 'linear-gradient(155deg,#020610 0%,#020410 100%)', c1: '#25e0ff', c2: '#b96bff', glow: 'rgba(37,224,255,0.5)',   accent: '#44ff9e' },
  fire:   { bg: 'linear-gradient(155deg,#180200 0%,#100100 100%)', c1: '#ff8820', c2: '#cc1800', glow: 'rgba(255,140,40,0.55)',  accent: '#ffd060' },
  ice:    { bg: 'linear-gradient(155deg,#082848 0%,#041828 100%)', c1: '#96ccee', c2: '#3a7eb8', glow: 'rgba(140,200,255,0.5)',  accent: '#dff1ff' },
  chrome: { bg: 'linear-gradient(155deg,#0a0c14 0%,#060810 100%)', c1: '#e8eeff', c2: '#8898b8', glow: 'rgba(200,220,255,0.5)', accent: '#c0ccdc' },
  shadow: { bg: 'linear-gradient(155deg,#0c0018 0%,#040008 100%)', c1: '#b96bff', c2: '#7e2bd9', glow: 'rgba(185,107,255,0.5)', accent: '#d8a6ff' },
}

function getStatBarColor(value: number, c1: string): string {
  if (value >= 90) return c1
  if (value >= 75) return `${c1}cc`
  if (value >= 60) return `${c1}88`
  return `${c1}55`
}

function CardBack({ card }: { card: UserCard }) {
  const ovrVal   = computeOverall(card.stats)
  const rarity   = getRarityTier(ovrVal)
  const cosmetic = card.cosmetic ?? 'base'
  const stats    = card.stats as Partial<Record<StatKey, number>>
  const position = card.position ?? '?'

  const themeKey = (cosmetic !== 'base' ? cosmetic : rarity) as keyof typeof CARD_BACK_THEMES
  const { bg, c1, c2, glow } = CARD_BACK_THEMES[themeKey] ?? CARD_BACK_THEMES.gold

  const serialNum = card.id.replace(/-/g, '').slice(0, 8).toUpperCase()

  return (
    <div style={{
      width: 280, height: 420,
      clipPath: 'polygon(5% 0%, 95% 0%, 100% 3.5%, 100% 96.5%, 95% 100%, 5% 100%, 0% 96.5%, 0% 3.5%)',
      background: bg,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      userSelect: 'none',
      padding: '28px 24px 20px',
    }}>

      {/* Diamond grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: [
          `radial-gradient(circle at 50% 50%, ${c1} 1px, transparent 1px)`,
          `linear-gradient(45deg,  transparent 48%, ${c1} 49%, transparent 50%)`,
          `linear-gradient(-45deg, transparent 48%, ${c1} 49%, transparent 50%)`,
        ].join(','),
        backgroundSize: '18px 18px, 90px 90px, 90px 90px',
        opacity: 0.06,
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 50% at 50% 30%, ${c1}12 0%, transparent 70%)`,
      }} />

      {/* Player name + position header */}
      <div style={{ textAlign: 'center', width: '100%', position: 'relative', zIndex: 2, marginBottom: 16 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 24,
          color: c1, letterSpacing: '0.06em',
          textShadow: `0 0 14px ${glow}`,
          lineHeight: 1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textTransform: 'uppercase',
        }}>
          {card.name || '—'}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 13,
          color: `${c1}70`, letterSpacing: '0.18em',
          marginTop: 4,
        }}>
          {position}
        </div>
      </div>

      {/* Separator line */}
      <div style={{
        width: '60%', height: 1, marginBottom: 16,
        background: `linear-gradient(90deg, transparent, ${c1}40, transparent)`,
      }} />

      {/* Large OVR */}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 72,
        color: c1, lineHeight: 0.9,
        textShadow: `0 0 24px ${glow}, 0 0 48px ${glow}40`,
        position: 'relative', zIndex: 2,
        marginBottom: 4,
      }}>
        {ovrVal || '—'}
      </div>
      <div style={{
        fontFamily: 'var(--font-ui)', fontSize: 9,
        color: `${c1}50`, letterSpacing: '0.25em',
        textTransform: 'uppercase', marginBottom: 20,
      }}>
        OVERALL
      </div>

      {/* Stats grid — 3x2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px 16px',
        width: '100%',
        position: 'relative', zIndex: 2,
      }}>
        {STAT_KEYS.map(stat => {
          const value = stats[stat] ?? 0
          return (
            <div key={stat} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: 9,
                color: `${c1}60`, letterSpacing: '0.12em',
                fontWeight: 700,
              }}>
                {stat}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 28,
                color: c1, lineHeight: 1,
                textShadow: `0 0 8px ${glow}60`,
              }}>
                {value || '—'}
              </div>
              {/* Stat bar */}
              <div style={{
                width: '100%', height: 3, borderRadius: 2,
                background: `${c1}18`,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.min(value, 99)}%`,
                  height: '100%',
                  borderRadius: 2,
                  background: getStatBarColor(value, c1),
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Inner frame */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
        boxShadow: `inset 0 0 0 2px ${c1}30, inset 0 0 0 4px rgba(0,0,0,0.2)`,
      }} />

      {/* Corner accent lines */}
      {[
        { top: 12, left: 12, rotate: '0deg' },
        { top: 12, right: 12, rotate: '90deg' },
        { bottom: 12, right: 12, rotate: '180deg' },
        { bottom: 12, left: 12, rotate: '270deg' },
      ].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', ...pos, pointerEvents: 'none', zIndex: 4,
          width: 14, height: 14,
          borderTop: `1.5px solid ${c1}50`,
          borderLeft: `1.5px solid ${c1}50`,
          transform: `rotate(${pos.rotate})`,
        }} />
      ))}

      {/* Rarity / cosmetic label + serial */}
      <div style={{
        position: 'absolute', bottom: 16, left: 0, right: 0,
        textAlign: 'center', zIndex: 2,
      }}>
        <div style={{
          fontFamily: 'var(--font-ui)', fontSize: 8,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: `${c2}50`,
        }}>
          {cosmetic !== 'base' ? cosmetic : rarity} {serialNum}
        </div>
      </div>
    </div>
  )
}

// ── 3D Card Viewer ────────────────────────────────────────────────────────────

interface DragState {
  active: boolean
  startX: number
  startY: number
  rotX: number
  rotY: number
}

// Width/height for the lg card (must match CSS size-lg vars)
const CARD_W = 280
const CARD_H = 420

function CardViewer({ card, onClose }: { card: UserCard; onClose: () => void }) {
  const [rotX, setRotX] = useState(0)
  const [rotY, setRotY] = useState(0)
  const drag     = useRef<DragState>({ active: false, startX: 0, startY: 0, rotX: 0, rotY: 0 })
  const isDragging = useRef(false)

  // Which face is currently front-facing?
  const normalizedY  = ((rotY % 360) + 360) % 360
  const isFrontFacing = normalizedY < 90 || normalizedY > 270

  // Subtle idle tilt (only before first drag, only on front face)
  const [idleAngle, setIdleAngle] = useState(0)
  const idleRef = useRef<number | null>(null)
  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (!isDragging.current) setIdleAngle(Math.sin(Date.now() / 1800) * 6)
      frame = requestAnimationFrame(tick)
    }
    idleRef.current = requestAnimationFrame(tick)
    return () => {
      if (idleRef.current !== null) cancelAnimationFrame(idleRef.current)
      cancelAnimationFrame(frame)
    }
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, rotX, rotY }
  }, [rotX, rotY])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.startX
    const dy = e.clientY - drag.current.startY
    // Y axis: free rotation — allows full flip
    setRotY(drag.current.rotY + dx * 0.55)
    // X axis: clamped tilt only
    setRotX(Math.max(-20, Math.min(20, drag.current.rotX - dy / 6)))
  }, [])

  const onPointerUp = useCallback(() => {
    drag.current.active = false
    setRotX(0)
    // Snap to nearest face: 0° (front), ±180° (back), ±360° (front again)…
    setRotY(r => Math.round(r / 180) * 180)
  }, [])

  // Tap-to-flip shortcut
  const handleFlipButton = useCallback(() => {
    isDragging.current = true
    setRotY(r => {
      const norm = ((r % 360) + 360) % 360
      const isBack = norm >= 90 && norm <= 270
      return isBack ? Math.round(r / 360) * 360 : Math.round(r / 180) * 180 + (r >= 0 ? 180 : -180)
    })
  }, [])

  // Sheen: moves opposite to tilt (light source simulation), only on front
  const sheenX = 50 - rotY * 0.8
  const sheenY = 50 + rotX * 1.0
  const useIdle = !isDragging.current

  const displayRotX = useIdle ? idleAngle * 0.4 : rotX
  const displayRotY = useIdle ? idleAngle        : rotY

  const isSnapping = !drag.current.active && !useIdle

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(4,6,13,0.96)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 20,
      }}
    >
      {/* Ambient glow behind card */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.06) 0%, transparent 60%)',
      }} />

      {/* Face label */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em',
        color: isFrontFacing ? 'rgba(212,175,55,0.5)' : 'rgba(185,107,255,0.5)',
        transition: 'color 0.3s ease',
        textTransform: 'uppercase',
        userSelect: 'none',
      }}>
        {isFrontFacing ? '— FRONT —' : '— BACK —'}
      </div>

      {/* 3D stage */}
      <div
        onClick={e => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          perspective: '900px',
          cursor: drag.current.active ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        {/* Spinning container — both faces live here */}
        <div style={{
          width: CARD_W,
          height: CARD_H,
          position: 'relative',
          transform: `rotateX(${displayRotX}deg) rotateY(${displayRotY}deg)`,
          transition: isSnapping ? 'transform 0.55s cubic-bezier(0.25, 0.9, 0.3, 1)' : 'none',
          transformStyle: 'preserve-3d',
        }}>

          {/* ── FRONT face ── */}
          <div style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}>
            <FutCard card={card} size="lg" />

            {/* Dynamic sheen — follows the tilt angle */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 38%, transparent 65%)`,
              pointerEvents: 'none',
              transition: drag.current.active ? 'none' : 'background 0.35s ease',
            }} />
          </div>

          {/* ── BACK face ── */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}>
            <CardBack card={card} />
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {/* Hint */}
        <div style={{
          fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em',
          fontFamily: 'var(--font-mono)', textAlign: 'center',
        }}>
          DRAG TO ROTATE · SWIPE TO FLIP
        </div>

        {/* Flip / close row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={e => { e.stopPropagation(); handleFlipButton() }}
            style={{
              padding: '10px 24px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${isFrontFacing ? 'rgba(185,107,255,0.3)' : 'rgba(212,175,55,0.3)'}`,
              color: isFrontFacing ? 'var(--purple-0)' : 'var(--gold-1)',
              fontSize: 12, fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
              transition: 'border-color 0.3s, color 0.3s',
            }}
          >
            {isFrontFacing ? '↩ FLIP TO BACK' : '↩ FLIP TO FRONT'}
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-display)',
              letterSpacing: '0.1em',
            }}
          >
            ✕ CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Roster ────────────────────────────────────────────────────────────────────

export function Roster() {
  const { roster } = useGameStore()
  const [viewing, setViewing] = useState<UserCard | null>(null)

  if (roster.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 24px', color: 'var(--ink-3)' }}>
        <div style={{ fontSize: 60 }}>⚽</div>
        <div className="font-display" style={{ fontSize: 28, color: 'var(--ink-1)' }}>NO PLAYERS YET</div>
        <div style={{ fontSize: 13 }}>Open a pack to build your first legend.</div>
      </div>
    )
  }

  const avgOvr  = Math.round(roster.reduce((a, c) => a + computeOverall(c.stats), 0) / roster.length)
  const icons   = roster.filter(c => computeOverall(c.stats) >= 89).length
  const golds   = roster.filter(c => { const o = computeOverall(c.stats); return o >= 83 && o < 89 }).length
  const cosCards = roster.filter(c => c.cosmetic && c.cosmetic !== 'base').length

  return (
    <>
      {viewing && <CardViewer card={viewing} onClose={() => setViewing(null)} />}

      <div style={{ padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div className="text-center" style={{ padding: '24px 16px 12px' }}>
          <div className="eyebrow" style={{ color: 'var(--gold-1)' }}>MY SQUAD</div>
          <h1 className="font-display" style={{ fontSize: 44, margin: '4px 0 4px', lineHeight: 0.9, color: 'var(--ink-0)' }}>
            {roster.length} LEGENDS
          </h1>
          <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>Tap a card to inspect · swipe to flip</div>
        </div>

        {/* Stats strip */}
        <div style={{
          display: 'flex', gap: 8, padding: '10px 12px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)',
          borderRadius: 12, justifyContent: 'space-around',
        }}>
          <StatStrip label="AVG OVR"   value={avgOvr} />
          <Divider />
          <StatStrip label="ICONS"     value={icons} />
          <Divider />
          <StatStrip label="GOLDS"     value={golds} />
          <Divider />
          <StatStrip label="COSMETICS" value={cosCards} />
        </div>

        {/* Card grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 18,
          placeItems: 'center',
        }}>
          {roster.map(card => (
            <button
              key={card.id}
              onClick={() => setViewing(card)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                display: 'block',
                transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
            >
              <FutCard card={card} size="sm" />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function StatStrip({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center" style={{ flex: 1 }}>
      <div className="eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div className="font-display" style={{ fontSize: 22, color: 'var(--gold-1)', lineHeight: 1, marginTop: 2 }}>{value}</div>
    </div>
  )
}
function Divider() {
  return <div style={{ width: 1, height: 24, background: 'var(--line)' }} />
}
