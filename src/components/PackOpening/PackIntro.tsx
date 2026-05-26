import { useState } from 'react'
import type { PackRarity } from '../../types'

interface PackIntroProps {
  rarity: PackRarity
  playerName: string
  costPaid: number
  onOpen: () => void
  onCancel?: () => void
}

const PACK_TIERS: Record<PackRarity, { label: string; crest: string }> = {
  bronze: { label: 'BRONZE', crest: 'B' },
  silver: { label: 'SILVER', crest: 'S' },
  gold:   { label: 'GOLD',   crest: 'G' },
}

export function PackIntro({ rarity, playerName, costPaid, onOpen, onCancel }: PackIntroProps) {
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'flying' | 'flash'>('idle')
  const tier = PACK_TIERS[rarity]

  function handleOpen() {
    if (phase !== 'idle') return
    setPhase('shaking')
    setTimeout(() => setPhase('flying'), 500)
    setTimeout(() => setPhase('flash'), 850)
    setTimeout(() => onOpen(), 1100)
  }

  const transform =
    phase === 'shaking' ? 'rotate(-3deg) scale(1.06)' :
    phase === 'flying'  ? 'scale(0.3) translateY(-500px) rotate(20deg)' :
    'scale(1) rotate(0)'
  const opacity = phase === 'flying' || phase === 'flash' ? 0 : 1
  const transition =
    phase === 'shaking' ? 'transform 0.12s ease-in-out' :
    phase === 'flying'  ? 'transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.3s' :
    'transform 0.15s ease-out'

  const ringColor =
    rarity === 'gold'   ? 'var(--gold-1)'   :
    rarity === 'silver' ? 'var(--silver-1)' :
    'var(--bronze-1)'

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 24,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Flash */}
      <div style={{
        position: 'fixed', inset: 0, background: '#fff', pointerEvents: 'none',
        opacity: phase === 'flash' ? 1 : 0, transition: 'opacity 0.15s', zIndex: 50,
      }} />

      {/* Ambient ring */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 400, height: 400, transform: 'translate(-50%, -50%)',
        background: `radial-gradient(circle, ${
          rarity === 'gold'   ? 'rgba(255,215,100,0.15)' :
          rarity === 'silver' ? 'rgba(220,230,245,0.10)' :
                                'rgba(255,150,80,0.12)'
        } 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div className="text-center" style={{ marginTop: 32, position: 'relative', zIndex: 2 }}>
        <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>Forging</div>
        <div className="font-display" style={{ fontSize: 36, letterSpacing: '0.04em', color: 'var(--ink-0)' }}>
          {playerName}
        </div>
      </div>

      {/* Pack art */}
      <div
        onClick={handleOpen}
        style={{ transform, opacity, transition, cursor: 'pointer', position: 'relative', zIndex: 2, marginTop: 8 }}
      >
        <div className={`pack-art ${rarity}`}>
          <div className="pack-art__bg" />
          <div className="pack-art__cuts" />
          <div className="pack-art__shimmer" />
          <div className="pack-art__crest">{tier.crest}</div>
          <div style={{ textAlign: 'center' }}>
            <div className="pack-art__label">{tier.label}</div>
            <div className="pack-art__sub">Pack</div>
          </div>
          <div className="pack-art__bars">
            {Array.from({ length: 8 }).map((_, i) => <span key={i} />)}
          </div>
          <div className="pack-art__bottom">FUTBATTLES · 8 PLAYERS</div>
        </div>

        {/* Pulsing ring behind */}
        <div style={{
          position: 'absolute', inset: -20,
          border: `2px solid ${ringColor}`,
          borderRadius: 30,
          animation: 'pulse-ring 1.8s ease-out infinite',
          pointerEvents: 'none',
        }} />
      </div>

      {/* CTA */}
      <div style={{
        opacity: phase === 'idle' ? 1 : 0, transition: 'opacity 0.3s',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        position: 'relative', zIndex: 2,
      }}>
        <button onClick={handleOpen} className="btn btn-primary" style={{ fontSize: 18, padding: '18px 36px' }}>
          ⚡ Open Pack
        </button>
        <div style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          {costPaid === 0
            ? <span style={{ color: 'var(--green-1)' }}>FREE PACK</span>
            : <>COST · {costPaid.toLocaleString()} COINS</>
          }
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="btn-link"
            style={{ marginTop: 8, color: 'var(--ink-3)', fontSize: 12 }}
          >
            {costPaid > 0 ? `← Cancel (refund ${costPaid.toLocaleString()} coins)` : '← Cancel'}
          </button>
        )}
      </div>
    </div>
  )
}
