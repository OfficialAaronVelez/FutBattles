import { useGameStore } from '../../store/gameStore'
import type { BattleRecord } from '../../types'

export function BattleHistory() {
  const { battleHistory } = useGameStore()

  if (battleHistory.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 24px', color: 'var(--ink-3)' }}>
        <div style={{ fontSize: 56 }}>⚔️</div>
        <div className="font-display" style={{ fontSize: 28, color: 'var(--ink-1)' }}>NO BATTLES YET</div>
        <div style={{ fontSize: 13 }}>Win battles to earn coins and build your streak.</div>
      </div>
    )
  }

  let streak = 0
  for (const r of [...battleHistory].reverse()) {
    if (r.result === 'win') streak++
    else break
  }

  const wins       = battleHistory.filter(r => r.result === 'win').length
  const losses     = battleHistory.filter(r => r.result === 'loss').length
  const draws      = battleHistory.filter(r => r.result === 'draw').length
  const totalCoins = battleHistory.reduce((sum, r) => sum + r.coinsEarned, 0)

  return (
    <div style={{ padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div className="text-center" style={{ padding: '16px 16px 4px' }}>
        <div className="eyebrow" style={{ color: 'var(--gold-1)' }}>BATTLE HISTORY</div>
        <h1 className="font-display" style={{ fontSize: 40, margin: '4px 0', lineHeight: 0.9, color: 'var(--ink-0)' }}>
          {battleHistory.length} MATCHES
        </h1>
      </div>

      {/* Streak banner */}
      {streak >= 3 && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(255,100,0,0.15), rgba(255,100,0,0.05))',
          border: '1px solid rgba(255,100,0,0.4)',
          borderRadius: 12, padding: '10px 16px', textAlign: 'center',
          boxShadow: '0 0 20px rgba(255,100,0,0.15)',
        }}>
          <div className="font-display" style={{ fontSize: 22, color: '#ff6400', letterSpacing: '0.1em' }}>
            🔥 {streak} WIN STREAK
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 12px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)',
        borderRadius: 12, justifyContent: 'space-around',
      }}>
        <StatStrip label="STREAK"  value={streak > 0 ? `🔥 ${streak}` : '—'} accent="var(--gold-1)" />
        <Divider />
        <StatStrip label="WINS"    value={wins}    accent="var(--green-1)" />
        <Divider />
        <StatStrip label="LOSSES"  value={losses}  accent="var(--red-1)" />
        <Divider />
        <StatStrip label="DRAWS"   value={draws}   accent="var(--ink-2)" />
        <Divider />
        <StatStrip label="COINS"   value={totalCoins.toLocaleString()} accent="var(--gold-1)" />
      </div>

      {/* History list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="eyebrow" style={{ fontSize: 9, color: 'var(--ink-3)', paddingLeft: 4 }}>RECENT BATTLES</div>
        {[...battleHistory].reverse().map(record => (
          <HistoryRow key={record.id} record={record} />
        ))}
      </div>
    </div>
  )
}

function StatStrip({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="text-center" style={{ flex: 1 }}>
      <div className="eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div className="font-display" style={{ fontSize: 20, color: accent, lineHeight: 1, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 24, background: 'var(--line)', alignSelf: 'center' }} />
}

function HistoryRow({ record }: { record: BattleRecord }) {
  const isWin  = record.result === 'win'
  const isDraw = record.result === 'draw'

  const accentColor  = isWin ? 'var(--green-1)' : isDraw ? 'var(--ink-2)' : 'var(--red-1)'
  const resultLabel  = isWin ? 'W' : isDraw ? 'D' : 'L'
  const borderColor  = isWin ? 'rgba(68,255,158,0.2)' : isDraw ? 'var(--line)' : 'rgba(255,71,103,0.2)'
  const bgColor      = isWin ? 'rgba(68,255,158,0.04)' : isDraw ? 'rgba(255,255,255,0.02)' : 'rgba(255,71,103,0.04)'

  const timeAgo = formatTimeAgo(record.date)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 14px', borderRadius: 12,
      border: `1px solid ${borderColor}`, background: bgColor,
    }}>
      {/* Result badge */}
      <div className="font-display" style={{
        fontSize: 26, color: accentColor, width: 28, textAlign: 'center', lineHeight: 1,
      }}>{resultLabel}</div>

      {/* Score + formation */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink-0)' }}>
            {record.playerGoals} – {record.aiGoals}
          </span>
          <span className="eyebrow" style={{ fontSize: 8, color: 'var(--ink-3)' }}>{record.formation}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{timeAgo}</div>
      </div>

      {/* Coins */}
      <div style={{
        fontSize: 13, fontWeight: 800, color: 'var(--gold-1)',
        fontFamily: 'var(--font-mono)',
      }}>
        +{record.coinsEarned}
        <span style={{ fontSize: 10, marginLeft: 2, color: 'var(--gold-2)' }}>¢</span>
      </div>
    </div>
  )
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'Just now'
}
