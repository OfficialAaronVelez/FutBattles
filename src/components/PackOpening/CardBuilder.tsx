import type { StatKey, CardCosmetic } from '../../types'
import { FutCard } from '../CardDisplay/FutCard'
import { PLAYERS } from '../../data/players'

interface CardBuilderProps {
  playerName: string
  lockedStats: Partial<Record<StatKey, { stat: StatKey; value: number; fromPlayer: string }>>
  lockedPosition: { position: string; fromPlayer: string } | null
  lockedCosmetic: CardCosmetic | null
  onFinalize: () => void
}

export function CardBuilder({
  playerName, lockedStats, lockedPosition, lockedCosmetic, onFinalize,
}: CardBuilderProps) {
  const stats: Partial<Record<StatKey, number>> = {}
  for (const [key, slot] of Object.entries(lockedStats ?? {})) {
    stats[key as StatKey] = slot.value
  }

  const finalCard = {
    id: 'final',
    name: playerName,
    position: lockedPosition?.position ?? null,
    cosmetic: lockedCosmetic ?? ('base' as CardCosmetic),
    stats,
    createdAt: Date.now(),
  }

  const hasPosition = !!lockedPosition

  // Look up club/nation of the player who donated the position
  const sourcePlayer = lockedPosition
    ? PLAYERS.find(p => p.name === lockedPosition.fromPlayer) ?? null
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
      <FutCard card={finalCard} size="lg" />

      {/* Chemistry affinity badge — shown when a position was locked */}
      {hasPosition && sourcePlayer && (
        <div style={{
          width: '100%', maxWidth: 300,
          background: 'rgba(68,255,158,0.06)',
          border: '1px solid rgba(68,255,158,0.3)',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>⚗️</span>
          <div>
            <div style={{ fontSize: 12, color: 'var(--green-1)', fontWeight: 700, marginBottom: 2 }}>
              Chemistry inherited from {lockedPosition.fromPlayer}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              Your card bonds with <strong style={{ color: 'var(--ink-1)' }}>{sourcePlayer.club}</strong> teammates
              and <strong style={{ color: 'var(--ink-1)' }}>{sourcePlayer.nation}</strong> nationals in your squad.
            </div>
          </div>
        </div>
      )}

      {/* No-position advisory — informational only, saving still allowed */}
      {!hasPosition && (
        <div style={{
          width: '100%', maxWidth: 300,
          background: 'rgba(255,175,0,0.08)',
          border: '1px solid rgba(255,175,0,0.3)',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,200,80,0.9)', fontWeight: 700, marginBottom: 2 }}>
              No position selected
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              Tap a position badge on any player card next time to assign one.
              You can still save — this card just won't count for squad chemistry.
            </div>
          </div>
        </div>
      )}

      <button
        onClick={hasPosition ? onFinalize : undefined}
        disabled={!hasPosition}
        className="btn btn-primary"
        style={{
          width: '100%', maxWidth: 300, fontSize: 16, padding: '18px',
          opacity: hasPosition ? 1 : 0.35,
          cursor: hasPosition ? 'pointer' : 'not-allowed',
        }}
      >
        💾 Save to Roster
      </button>
    </div>
  )
}
