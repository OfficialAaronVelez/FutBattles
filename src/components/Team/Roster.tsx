import { useGameStore } from '../../store/gameStore'
import { FutCard } from '../CardDisplay/FutCard'
import type { StatKey } from '../../types'

function computeOverall(stats: Partial<Record<StatKey, number>>): number {
  const vals = Object.values(stats).filter((v): v is number => typeof v === 'number')
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
}

export function Roster() {
  const { roster } = useGameStore()

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
  const icons   = roster.filter(c => computeOverall(c.stats) >= 86).length
  const golds   = roster.filter(c => { const o = computeOverall(c.stats); return o >= 83 && o < 86 }).length
  const cosCards = roster.filter(c => c.cosmetic && c.cosmetic !== 'base').length

  return (
    <div style={{ padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="text-center" style={{ padding: '24px 16px 12px' }}>
        <div className="eyebrow" style={{ color: 'var(--gold-1)' }}>MY SQUAD</div>
        <h1 className="font-display" style={{ fontSize: 44, margin: '4px 0 4px', lineHeight: 0.9, color: 'var(--ink-0)' }}>
          {roster.length} LEGENDS
        </h1>
        <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>Tap a card for details · drag to formation in Battle</div>
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
          <FutCard key={card.id} card={card} size="sm" />
        ))}
      </div>
    </div>
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
