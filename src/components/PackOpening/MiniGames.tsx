import { useState, useEffect, useRef } from 'react'
import type { RealPlayer, StatKey, MiniGameType } from '../../types'
import { STAT_KEYS } from '../../types'
import { applyMultBoost, applyStatBonus, applyStatDelta, statHeadroom } from '../../utils/forgeStats'

// ─── Accent colours ───────────────────────────────────────────────────────────
const GOLD   = '#f5b327'
const CYAN   = '#25e0ff'
const PURPLE = '#b96bff'
const GREEN  = '#44ff9e'
const RED    = '#ff4767'
const ORANGE = '#ff7a1f'

// ─── Shared interfaces ────────────────────────────────────────────────────────
interface MiniGameProps {
  card:       RealPlayer
  takenStats: StatKey[]
  onComplete: (stat: StatKey, value: number) => void
  compact?:   boolean
}

// ─── Compact player card display ─────────────────────────────────────────────
function PlayerCardMini({ card, compact }: { card: RealPlayer; compact?: boolean }) {
  const c = card.overall >= 88 ? GOLD : card.overall >= 75 ? '#b0b8c8' : '#cd9f6e'
  return (
    <div className={compact ? 'player-card-mini player-card-mini--compact' : 'player-card-mini'}>
      <div className="player-card-mini__glint" />
      <div className="player-card-mini__head">
        <div>
          <div className="player-card-mini__ovr font-display" style={{ color: c }}>{card.overall}</div>
          <div className="player-card-mini__pos" style={{ color: c }}>{card.position}</div>
        </div>
        <div className="player-card-mini__meta">
          {card.nation}<br />{card.club}
        </div>
      </div>
      <div className="player-card-mini__name">{card.name.toUpperCase()}</div>
      <div className="player-card-mini__stats">
        {STAT_KEYS.map(s => (
          <div key={s} className="player-card-mini__stat">
            <span className="player-card-mini__stat-key">{s}</span>
            <span className="player-card-mini__stat-val font-display">{card.stats[s]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Shell / Header wrapper ───────────────────────────────────────────────────
function GameShell({
  icon, title, hint, accent, playerCard, compact, children,
}: {
  icon: string; title: string; hint: string; accent: string
  playerCard?: RealPlayer
  compact?: boolean
  children: React.ReactNode
}) {
  if (compact) {
    return (
      <div className="game-shell game-shell--compact">
        <div className="game-shell__header">
          <div className="game-shell__icon">{icon}</div>
          <div className="game-shell__title" style={{ color: accent }}>{title}</div>
          {hint && <div className="game-shell__hint">{hint}</div>}
        </div>
        {playerCard && (
          <div className="game-shell__pull-card">
            <div className="game-shell__pull-label">PULL FROM</div>
            <PlayerCardMini card={playerCard} compact />
          </div>
        )}
        <div className="game-shell__body">
          <div className="game-shell__play">{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 16px 32px', gap:18, maxWidth:480, margin:'0 auto', width:'100%' }}>
      {playerCard && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase' }}>
            PULL FROM
          </div>
          <PlayerCardMini card={playerCard} />
        </div>
      )}
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:44, lineHeight:1, marginBottom:8 }}>{icon}</div>
        <div className="font-display" style={{ fontSize:26, color:accent, letterSpacing:'0.08em', marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', minHeight:16 }}>{hint}</div>
      </div>
      {children}
    </div>
  )
}

// ─── Shared StatPicker — only available (un-taken) stats ─────────────────────
function StatPicker({
  card, takenStats, onPick, accent, compact,
}: {
  card: RealPlayer; takenStats: StatKey[]; onPick: (s: StatKey, v: number) => void; accent: string; compact?: boolean
}) {
  const [hovered, setHovered] = useState<StatKey | null>(null)
  const available = STAT_KEYS.filter(s => !takenStats.includes(s))
  const gridCols = compact ? 2 : 3
  return (
    <div className={compact ? 'stat-picker stat-picker--compact' : 'stat-picker'}>
      <div className="stat-picker__label" style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textAlign:'center', letterSpacing:'0.1em', marginBottom: compact ? 8 : 10, textTransform:'uppercase' }}>
        Choose your stat
        {takenStats.length > 0 && (
          <span style={{ color:'rgba(255,255,255,0.2)', marginLeft:8 }}>({available.length} remaining)</span>
        )}
      </div>
      <div
        className="stat-picker__grid"
        style={{ display:'grid', gridTemplateColumns:`repeat(${gridCols}, 1fr)`, gap: compact ? 8 : 8 }}
      >
        {available.map(stat => (
          <button
            key={stat}
            className="stat-picker__btn"
            onMouseEnter={() => setHovered(stat)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onPick(stat, card.stats[stat])}
            style={{
              background: hovered === stat ? `rgba(${hexToRgb(accent)},0.18)` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${hovered === stat ? accent : 'rgba(255,255,255,0.1)'}`,
              borderRadius:10, padding: compact ? '6px 4px' : '10px 8px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              transition:'all 0.15s ease',
              boxShadow: hovered === stat ? `0 0 12px rgba(${hexToRgb(accent)},0.3)` : 'none',
            }}
          >
            <span className="stat-picker__btn-key" style={{ fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em' }}>{stat}</span>
            <span className="stat-picker__btn-val font-display" style={{ fontSize: compact ? 17 : 24, color: hovered === stat ? accent : 'rgba(255,255,255,0.9)' }}>{card.stats[stat]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function GameTakeBtn({ stat, value, onClick, prefix }: { stat: StatKey; value: number; onClick: () => void; prefix?: string }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-primary game-action-btn">
      {prefix && <span className="game-action-btn__main">{prefix}</span>}
      <span className={prefix ? 'game-action-btn__sub' : 'game-action-btn__main'}>
        Take {stat} {value} →
      </span>
    </button>
  )
}

function GameCashOutBtn({ stat, value, onClick }: { stat: StatKey; value: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-primary game-action-btn">
      <span className="game-action-btn__main">💰 Cash out</span>
      <span className="game-action-btn__sub">{stat} {value}</span>
    </button>
  )
}

function GameLockInBtn({ value, onClick, disabled }: { value: number; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn btn-primary game-action-btn">
      <span className="game-action-btn__main">🔒 Lock in</span>
      <span className="game-action-btn__sub">{value}</span>
    </button>
  )
}

// ─── 1. Normal ────────────────────────────────────────────────────────────────
function NormalGame({ card, takenStats, onComplete, compact }: MiniGameProps) {
  return (
    <GameShell compact={compact} icon="🎯" title="PICK YOUR STAT" hint="No tricks. Just choose wisely." accent={CYAN} playerCard={card}>
      <StatPicker card={card} takenStats={takenStats} onPick={onComplete} accent={CYAN} compact={compact} />
    </GameShell>
  )
}

// ─── 2. Slots — stat-name reels, match for bonus ──────────────────────────────
const SLOT_MODIFIERS = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 8] as const
type SlotModifier = typeof SLOT_MODIFIERS[number]

function formatModifier(mod: number): string {
  return mod > 0 ? `+${mod}` : `${mod}`
}

function SlotsGame({ card, takenStats, onComplete, compact }: MiniGameProps) {
  const available = STAT_KEYS.filter(s => !takenStats.includes(s))
  const modifierMode = available.length === 1
  const lockedStat = modifierMode ? available[0] : null

  // ── Modifier mode: one stat left — reels spin +/- deltas ──
  if (modifierMode && lockedStat) {
    return (
      <SlotsModifierMode
        card={card}
        stat={lockedStat}
        base={card.stats[lockedStat]}
        onComplete={onComplete}
        compact={compact}
      />
    )
  }

  // ── Stat mode: reels spin stat names ──
  const cycleStats = available.length > 0 ? available : STAT_KEYS

  return (
    <SlotsStatMode
      card={card}
      cycleStats={cycleStats}
      available={available}
      onComplete={onComplete}
      compact={compact}
    />
  )
}

function SlotsModifierMode({
  card, stat, base, onComplete, compact,
}: {
  card: RealPlayer
  stat: StatKey
  base: number
  onComplete: (stat: StatKey, value: number) => void
  compact?: boolean
}) {
  const pool = SLOT_MODIFIERS

  const [reels, setReels] = useState<[SlotModifier, SlotModifier, SlotModifier]>(() => [
    pool[0], pool[Math.floor(pool.length / 3)], pool[Math.floor((2 * pool.length) / 3)],
  ])
  const [stopped, setStopped] = useState<[boolean, boolean, boolean]>([false, false, false])
  const [revealed, setRevealed] = useState(false)
  const stoppedRef = useRef([false, false, false])

  useEffect(() => {
    if (revealed) return
    const speeds = [83, 100, 121]
    const ids = ([0, 1, 2] as const).map(i =>
      setInterval(() => {
        if (stoppedRef.current[i]) return
        setReels(prev => {
          const copy = [...prev] as [SlotModifier, SlotModifier, SlotModifier]
          const idx = pool.indexOf(copy[i])
          copy[i] = pool[(idx + 1) % pool.length]
          return copy
        })
      }, speeds[i])
    )
    return () => ids.forEach(clearInterval)
  }, [revealed, pool])

  function stopReel(i: number) {
    if (stoppedRef.current[i] || revealed) return
    stoppedRef.current[i] = true
    const snap: [boolean, boolean, boolean] = [stoppedRef.current[0], stoppedRef.current[1], stoppedRef.current[2]]
    setStopped(snap)
    if (snap.every(Boolean)) setTimeout(() => setRevealed(true), 500)
  }

  const allStopped = stopped.every(Boolean)
  const matchResult = allStopped ? (() => {
    const counts: Partial<Record<SlotModifier, number>> = {}
    for (const m of reels) counts[m] = (counts[m] ?? 0) + 1
    const triple = (Object.entries(counts) as [string, number][]).find(([, v]) => v === 3)
    const double = (Object.entries(counts) as [string, number][]).find(([, v]) => v === 2)
    if (triple) return { kind: 'triple' as const, mod: Number(triple[0]) as SlotModifier }
    if (double) return { kind: 'double' as const, mod: Number(double[0]) as SlotModifier }
    return { kind: 'miss' as const, mod: reels[1] }
  })() : null

  const finalResult = matchResult ? (() => {
    switch (matchResult.kind) {
      case 'triple': {
        const bonus = 4
        const total = matchResult.mod + bonus
        return {
          value: applyStatDelta(base, total),
          bonus: total,
          label: '🎰 JACKPOT!',
          color: GOLD,
        }
      }
      case 'double': {
        const bonus = 2
        const total = matchResult.mod + bonus
        return {
          value: applyStatDelta(base, total),
          bonus: total,
          label: '✨ MATCH! +2',
          color: GREEN,
        }
      }
      case 'miss': {
        const total = matchResult.mod
        return {
          value: applyStatDelta(base, total),
          bonus: total,
          label: total >= 0 ? 'Middle reel' : '❌ NO MATCH',
          color: total > 0 ? GREEN : total < 0 ? RED : 'rgba(255,255,255,0.5)',
        }
      }
    }
  })() : null

  return (
    <GameShell
      compact={compact}
      icon="🎰"
      title="SLOTS"
      hint={`${stat} · base ${base} · Match modifiers for extra bonus`}
      accent={GOLD}
      playerCard={card}
    >
      <div className="game-slots-row">
        {([0, 1, 2] as const).map(i => {
          const mod = reels[i]
          const isStopped = stopped[i]
          const isWinner = revealed && finalResult && finalResult.bonus > 0 && matchResult?.mod === mod
          return (
            <button
              key={i}
              type="button"
              onClick={() => stopReel(i)}
              disabled={isStopped || revealed}
              className="game-slots-reel"
              style={{
                background: isWinner ? `rgba(${hexToRgb(GOLD)},0.2)` : isStopped ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${isWinner ? GOLD : isStopped ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                filter: isStopped ? 'none' : 'blur(0.4px)',
                boxShadow: isWinner ? `0 0 16px rgba(${hexToRgb(GOLD)},0.4)` : 'none',
              }}
            >
              <span className="game-slots-reel__stat" style={{ color: isStopped ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)', fontSize: 10 }}>
                {stat}
              </span>
              <span
                className="game-slots-reel__val"
                style={{
                  color: mod > 0 ? GREEN : mod < 0 ? RED : isStopped ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                }}
              >
                {formatModifier(mod)}
              </span>
              {!isStopped && !revealed && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>TAP</span>}
              {isStopped && !revealed && <span style={{ fontSize: 9, color: GOLD }}>LOCKED</span>}
            </button>
          )
        })}
      </div>
      {allStopped && !revealed && <div className="game-play-summary">spinning down…</div>}
      {revealed && finalResult && (
        <div className="game-center-stack">
          <div className="game-result-badge" style={{ background: `rgba(${hexToRgb(finalResult.color)},0.15)`, border: `1px solid ${finalResult.color}`, color: finalResult.color }}>
            {finalResult.label}
          </div>
          <div className="game-play-summary">
            {stat} {base}{finalResult.bonus !== 0 && (
              <span style={{ color: finalResult.bonus > 0 ? GREEN : RED }}> {formatModifier(finalResult.bonus)}</span>
            )} = <span className="highlight">{finalResult.value}</span>
          </div>
          <GameTakeBtn stat={stat} value={finalResult.value} onClick={() => onComplete(stat, finalResult.value)} />
        </div>
      )}
    </GameShell>
  )
}

function SlotsStatMode({
  card, cycleStats, available, onComplete, compact,
}: {
  card: RealPlayer
  cycleStats: StatKey[]
  available: StatKey[]
  onComplete: (stat: StatKey, value: number) => void
  compact?: boolean
}) {
  const [reels, setReels] = useState<[StatKey, StatKey, StatKey]>(() => {
    const n = cycleStats.length
    const pick = (i: number) => cycleStats[i % n]
    return [pick(0), pick(Math.max(1, Math.floor(n / 3))), pick(Math.max(2, Math.floor(2 * n / 3)))]
  })
  const [stopped, setStopped] = useState<[boolean, boolean, boolean]>([false, false, false])
  const [revealed, setRevealed] = useState(false)
  const stoppedRef = useRef([false, false, false])

  useEffect(() => {
    if (revealed) return
    const speeds = [83, 100, 121]
    const ids = ([0, 1, 2] as const).map(i =>
      setInterval(() => {
        if (stoppedRef.current[i]) return
        setReels(prev => {
          const copy = [...prev] as [StatKey, StatKey, StatKey]
          const idx = cycleStats.indexOf(copy[i])
          copy[i] = cycleStats[(idx + 1) % cycleStats.length]
          return copy
        })
      }, speeds[i])
    )
    return () => ids.forEach(clearInterval)
  }, [revealed, cycleStats.join(',')])

  function stopReel(i: number) {
    if (stoppedRef.current[i] || revealed) return
    stoppedRef.current[i] = true
    const snap: [boolean, boolean, boolean] = [stoppedRef.current[0], stoppedRef.current[1], stoppedRef.current[2]]
    setStopped(snap)
    if (snap.every(Boolean)) setTimeout(() => setRevealed(true), 500)
  }

  const allStopped = stopped.every(Boolean)
  const matchResult = allStopped ? (() => {
    const pool = available.length > 0 ? available : STAT_KEYS
    const counts: Partial<Record<StatKey, number>> = {}
    for (const s of reels) counts[s] = (counts[s] ?? 0) + 1
    const triple = (Object.entries(counts) as [StatKey, number][]).find(([s, v]) => v === 3 && pool.includes(s))
    const double = (Object.entries(counts) as [StatKey, number][]).find(([s, v]) => v === 2 && pool.includes(s))
    if (triple) return { kind: 'triple' as const, stat: triple[0] }
    if (double) return { kind: 'double' as const, stat: double[0] }
    const missStat = pool.includes(reels[1]) ? reels[1] : pool[0]
    return { kind: 'miss' as const, stat: missStat }
  })() : null

  const finalResult = matchResult ? (() => {
    switch (matchResult.kind) {
      case 'triple': {
        const bonus = Math.min(8, statHeadroom(card.stats[matchResult.stat]))
        return { stat: matchResult.stat, value: applyStatBonus(card.stats[matchResult.stat], bonus), bonus, label: '🎰 JACKPOT! +8', color: GOLD }
      }
      case 'double': {
        const bonus = Math.min(4, statHeadroom(card.stats[matchResult.stat]))
        return { stat: matchResult.stat, value: applyStatBonus(card.stats[matchResult.stat], bonus), bonus, label: '✨ MATCH! +4', color: GREEN }
      }
      case 'miss':   return { stat: matchResult.stat, value: card.stats[matchResult.stat], bonus: 0, label: '❌ NO MATCH', color: RED }
    }
  })() : null

  return (
    <GameShell compact={compact} icon="🎰" title="SLOTS" hint="Stop all 3 on the SAME stat for a bonus. Miss = middle reel, no bonus." accent={GOLD} playerCard={card}>
      <div className="game-slots-row">
        {([0, 1, 2] as const).map(i => {
          const s = reels[i]
          const isStopped = stopped[i]
          const isWinner = revealed && finalResult && finalResult.bonus > 0 && matchResult?.stat === s
          return (
            <button
              key={i}
              type="button"
              onClick={() => stopReel(i)}
              disabled={isStopped || revealed}
              className="game-slots-reel"
              style={{
                background: isWinner ? `rgba(${hexToRgb(GOLD)},0.2)` : isStopped ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${isWinner ? GOLD : isStopped ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                filter: isStopped ? 'none' : 'blur(0.4px)',
                boxShadow: isWinner ? `0 0 16px rgba(${hexToRgb(GOLD)},0.4)` : 'none',
              }}
            >
              <span className="game-slots-reel__stat" style={{ color: isStopped ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)' }}>{s}</span>
              <span className="game-slots-reel__val" style={{ color: isWinner ? GOLD : isStopped ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)' }}>{card.stats[s]}</span>
              {!isStopped && !revealed && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>TAP</span>}
              {isStopped && !revealed && <span style={{ fontSize: 9, color: GOLD }}>LOCKED</span>}
            </button>
          )
        })}
      </div>
      {allStopped && !revealed && <div className="game-play-summary">spinning down…</div>}
      {revealed && finalResult && (
        <div className="game-center-stack">
          <div className="game-result-badge" style={{ background: `rgba(${hexToRgb(finalResult.color)},0.15)`, border: `1px solid ${finalResult.color}`, color: finalResult.color }}>
            {finalResult.label}
          </div>
          <div className="game-play-summary">
            {finalResult.stat} {card.stats[finalResult.stat]}{finalResult.bonus > 0 && <span style={{ color: GREEN }}> +{finalResult.bonus}</span>} = <span className="highlight">{finalResult.value}</span>
          </div>
          <GameTakeBtn stat={finalResult.stat} value={finalResult.value} onClick={() => onComplete(finalResult.stat, finalResult.value)} />
        </div>
      )}
    </GameShell>
  )
}

// ─── 3. Minefield — bonus capped by distance from 99 ─────────────────────────
type MineState = { type:'bonus'; bonus:number } | { type:'mine' }
type TileState = { revealed:boolean; content:MineState }

function MinefieldGame({ card, takenStats, onComplete, compact }: MiniGameProps) {
  const [pickedStat, setPickedStat] = useState<StatKey|null>(null)
  const [tiles, setTiles] = useState<TileState[]>(() => {
    const bonuses = [0,0,0,1,2,3,4,5,6]   // softer values — cap applied on accumulation
    const contents: MineState[] = [
      ...bonuses.map(b => ({ type:'bonus' as const, bonus:b })),
      { type:'mine' as const }, { type:'mine' as const }, { type:'mine' as const },
    ]
    for (let i=contents.length-1; i>0; i--) {
      const j=Math.floor(Math.random()*(i+1));
      [contents[i],contents[j]]=[contents[j],contents[i]]
    }
    return contents.map(content => ({ revealed:false, content }))
  })
  const [bust, setBust]                 = useState(false)
  const [accumulated, setAccumulated]   = useState(0)
  const [done, setDone]                 = useState(false)

  if (!pickedStat) {
    return (
      <GameShell compact={compact} icon="💣" title="MINEFIELD" hint="Pick a stat, dig for bonuses, cash out before a mine!" accent={RED} playerCard={card}>
        <StatPicker card={card} takenStats={takenStats} onPick={s => setPickedStat(s)} accent={RED} compact={compact} />
      </GameShell>
    )
  }

  const base     = card.stats[pickedStat]
  const capBonus = Math.min(20, statHeadroom(base))
  const current  = applyStatBonus(base, accumulated)

  function revealTile(idx: number) {
    if (done || tiles[idx].revealed) return
    const tile = tiles[idx]
    if (tile.content.type === 'mine') {
      setBust(true); setDone(true)
      setTiles(prev => prev.map(t => ({ ...t, revealed:true })))
    } else {
      const bonus = tile.content.bonus
      setAccumulated(prev => Math.min(prev + bonus, capBonus))
      setTiles(prev => prev.map((t,i) => i===idx ? { ...t, revealed:true } : t))
    }
  }

  return (
    <GameShell compact={compact} icon="💣" title="MINEFIELD" hint={`Max bonus: +${capBonus} · Cash out before a mine!`} accent={RED}>
      <div className="game-tile-grid game-tile-grid--4">
        {tiles.map((tile,i) => (
          <button
            key={i}
            type="button"
            className="game-tile-btn"
            onClick={() => revealTile(i)}
            disabled={tile.revealed||done}
            style={{
              background: tile.revealed ? (tile.content.type==='mine' ? `rgba(${hexToRgb(RED)},0.25)` : `rgba(${hexToRgb(GREEN)},0.15)`) : 'rgba(255,255,255,0.06)',
              border: `1px solid ${tile.revealed ? (tile.content.type==='mine' ? RED : GREEN) : 'rgba(255,255,255,0.12)'}`,
              color: tile.revealed && tile.content.type==='bonus' ? GREEN : 'rgba(255,255,255,0.5)',
            }}
          >
            {tile.revealed ? (tile.content.type==='mine' ? '💥' : tile.content.bonus>0 ? `+${tile.content.bonus}` : '·') : '?'}
          </button>
        ))}
      </div>
      {bust ? (
        <div className="game-play-footer">
          <div className="game-bust-title" style={{ color:RED }}>💥 BUSTED!</div>
          <div className="game-play-summary">You get base value only</div>
          <GameTakeBtn stat={pickedStat} value={base} onClick={() => onComplete(pickedStat, base)} />
        </div>
      ) : (
        <div className="game-play-footer">
          <div className="game-play-summary">
            {pickedStat}: {base} + {accumulated} / {capBonus} max = <span className="highlight">{current}</span>
          </div>
          <GameCashOutBtn stat={pickedStat} value={current} onClick={() => onComplete(pickedStat, current)} />
        </div>
      )}
    </GameShell>
  )
}

// ─── 4. The Push — crash-style probabilistic bust ─────────────────────────────
function PushGame({ card, takenStats, onComplete, compact }: MiniGameProps) {
  const [pickedStat, setPickedStat] = useState<StatKey|null>(null)
  const [mult,       setMult]       = useState(1.0)
  const multRef       = useRef(1.0)
  const lockedInRef   = useRef<number|null>(null)
  const [running,    setRunning]    = useState(false)
  const [bust,       setBust]       = useState(false)
  const [lockedIn,   setLockedIn]   = useState<number|null>(null)

  useEffect(() => {
    if (!pickedStat || !running || bust || lockedIn !== null) return
    const id = setInterval(() => {
      if (lockedInRef.current !== null) { clearInterval(id); return }
      const next = parseFloat((multRef.current + 0.04).toFixed(2))
      multRef.current = next
      if (Math.random() < next * 0.015) {
        clearInterval(id); setBust(true); setRunning(false); setMult(next)
      } else { setMult(next) }
    }, 200)
    return () => clearInterval(id)
  }, [pickedStat, running, bust, lockedIn])

  if (!pickedStat) {
    return (
      <GameShell compact={compact} icon="📈" title="THE PUSH" hint="The crash can strike ANY tick. Higher multiplier = more risk per second." accent={ORANGE} playerCard={card}>
        <StatPicker card={card} takenStats={takenStats} onPick={s => { setPickedStat(s); setRunning(true) }} accent={ORANGE} compact={compact} />
      </GameShell>
    )
  }

  const base      = card.stats[pickedStat]
  const displayed = lockedIn !== null ? lockedIn : applyMultBoost(base, mult)
  const bustVal   = Math.max(1, Math.round(base * 0.70))
  const dangerZone = mult > 1.5
  const multColor = bust ? RED : mult > 2.0 ? RED : dangerZone ? ORANGE : mult > 1.2 ? GOLD : GREEN

  return (
    <GameShell compact={compact} icon="📈" title="THE PUSH" hint={bust ? 'You waited too long — penalty applied.' : dangerZone ? '⚠️ HIGH RISK — lock in soon!' : 'Lock in before it crashes!'} accent={ORANGE}>
      <div className="game-center-stack">
        <div className="game-value-label">Multiplier</div>
        <div className="game-value-hero game-value-hero--md" style={{ color:multColor, transition:'color 0.2s' }}>
          {bust ? '💥 BUST' : `${mult.toFixed(2)}×`}
        </div>
      </div>
      <div className="game-value-hero" style={{ color: bust ? RED : lockedIn!==null ? GREEN : ORANGE, textShadow:`0 0 30px rgba(${hexToRgb(bust?RED:ORANGE)},0.4)` }}>
        {bust ? bustVal : displayed}
      </div>
      <div className="game-play-summary">
        {pickedStat} · base {base} · {bust ? `penalty ×0.7 = ${bustVal}` : `+${Math.max(0, displayed - base)} bonus`}
      </div>
      {bust ? (
        <div className="game-play-footer">
          <div className="game-play-summary">You waited too long. You get base × 0.7</div>
          <GameTakeBtn stat={pickedStat} value={bustVal} onClick={() => onComplete(pickedStat, bustVal)} />
        </div>
      ) : lockedIn !== null ? (
        <div className="game-play-footer">
          <div className="game-play-summary" style={{ color:GREEN }}>✓ Locked in at {lockedIn}</div>
          <GameTakeBtn stat={pickedStat} value={lockedIn} onClick={() => onComplete(pickedStat, lockedIn)} prefix="Confirm" />
        </div>
      ) : (
        <GameLockInBtn
          value={displayed}
          onClick={() => {
            const val = applyMultBoost(base, multRef.current)
            lockedInRef.current = val
            setLockedIn(val)
            setRunning(false)
          }}
        />
      )}
    </GameShell>
  )
}

// ─── 5. Double or Nothing — 5 flips max, degrading odds ──────────────────────
// After 5 flips the button disappears and the player must lock in whatever they have.
const MAX_FLIPS = 5
const FLIP_TIERS: ReadonlyArray<{ winMult:number; lossMult:number; winChance:number }> = [
  { winMult:1.65, lossMult:0.52, winChance:0.54 }, // flip 1 — player-friendly, tempting
  { winMult:1.50, lossMult:0.58, winChance:0.50 }, // flip 2 — even
  { winMult:1.38, lossMult:0.64, winChance:0.47 }, // flip 3 — slight house edge
  { winMult:1.25, lossMult:0.70, winChance:0.44 }, // flip 4 — house edge
  { winMult:1.15, lossMult:0.80, winChance:0.40 }, // flip 5 (LAST) — punishing
]

function DoubleOrNothingGame({ card, takenStats, onComplete, compact }: MiniGameProps) {
  const [pickedStat,  setPickedStat]  = useState<StatKey|null>(null)
  const [value,       setValue]       = useState(0)
  const [flipCount,   setFlipCount]   = useState(0)
  const [flipping,    setFlipping]    = useState(false)
  const [flipResult,  setFlipResult]  = useState<'win'|'loss'|null>(null)
  const [flipHistory, setFlipHistory] = useState<('win'|'loss')[]>([])
  const [coinAngle,   setCoinAngle]   = useState(0)
  const coinRef  = useRef<ReturnType<typeof setInterval>|null>(null)
  const lastTier = useRef(FLIP_TIERS[0])

  const flipsLeft  = MAX_FLIPS - flipCount
  const canFlip    = flipsLeft > 0 && !flipping
  const isLastFlip = flipsLeft === 1

  function pickStat(s: StatKey) { setPickedStat(s); setValue(card.stats[s]) }

  function flip() {
    if (!canFlip) return
    setFlipping(true); setFlipResult(null)
    const tier = FLIP_TIERS[Math.min(flipCount, FLIP_TIERS.length - 1)]
    lastTier.current = tier
    let angle = 0
    coinRef.current = setInterval(() => { angle += 30; setCoinAngle(angle) }, 40)
    setTimeout(() => {
      if (coinRef.current) clearInterval(coinRef.current)
      const won = Math.random() < tier.winChance
      const result: 'win'|'loss' = won ? 'win' : 'loss'
      setFlipResult(result)
      setFlipHistory(prev => [...prev, result])
      setValue(prev => won
        ? applyMultBoost(prev, tier.winMult)
        : Math.max(1,  Math.round(prev * tier.lossMult))
      )
      setFlipCount(c => c + 1)
      setCoinAngle(0)
      setFlipping(false)
    }, 700)
  }

  if (!pickedStat) {
    return (
      <GameShell compact={compact} icon="🃏" title="DOUBLE OR NOTHING" hint={`${MAX_FLIPS} flips max. Odds get worse every time. Use them wisely.`} accent={PURPLE} playerCard={card}>
        <StatPicker card={card} takenStats={takenStats} onPick={pickStat} accent={PURPLE} compact={compact} />
      </GameShell>
    )
  }

  const nextTier = FLIP_TIERS[Math.min(flipCount, FLIP_TIERS.length - 1)]
  const winPct   = Math.round(nextTier.winChance * 100)
  const lossPct  = 100 - winPct

  const hintText = flipsLeft === 0
    ? 'No more flips — lock in your result.'
    : isLastFlip
      ? '⚠️ LAST FLIP — worst odds'
      : flipCount >= 2
        ? `House edge building — ${flipsLeft} flips left`
        : `${flipsLeft} flips remaining`

  return (
    <GameShell compact={compact} icon="🃏" title="DOUBLE OR NOTHING" hint={hintText} accent={PURPLE}>
      <div className="game-odds-bar">
        <div style={{ flex:winPct, background:`rgba(${hexToRgb(GREEN)},0.25)`, border:`1px solid rgba(${hexToRgb(GREEN)},0.5)`, borderRadius:'6px 0 0 6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:GREEN, fontWeight:700 }}>WIN {winPct}%</div>
        <div style={{ flex:lossPct, background:`rgba(${hexToRgb(RED)},0.25)`, border:`1px solid rgba(${hexToRgb(RED)},0.5)`, borderRadius:'0 6px 6px 0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:RED, fontWeight:700 }}>LOSE {lossPct}%</div>
      </div>

      <div className="game-center-stack" style={{ flexDirection:'row', justifyContent:'center', flexWrap:'wrap' }}>
        {Array.from({ length: MAX_FLIPS }).map((_, i) => (
          <div key={i} style={{
            width:  i < flipHistory.length ? 11 : 8,
            height: i < flipHistory.length ? 11 : 8,
            borderRadius: '50%',
            background: i < flipHistory.length
              ? (flipHistory[i] === 'win' ? GREEN : RED)
              : 'rgba(255,255,255,0.1)',
            boxShadow: i < flipHistory.length
              ? `0 0 6px rgba(${hexToRgb(flipHistory[i]==='win' ? GREEN : RED)},0.5)`
              : 'none',
            transition: 'all 0.25s',
          }} />
        ))}
        <span className="game-play-summary" style={{ marginLeft:4 }}>
          {flipsLeft > 0 ? `${flipsLeft} flips left` : 'no flips left'}
        </span>
      </div>

      <div
        className="game-coin"
        style={{
          background: flipResult==='loss' ? `rgba(${hexToRgb(RED)},0.3)` : `rgba(${hexToRgb(GOLD)},0.3)`,
          border:`3px solid ${flipResult==='loss' ? RED : GOLD}`,
          transform:`rotateY(${coinAngle}deg)`,
          transition: flipping ? 'none' : 'transform 0.1s',
        }}
      >🪙</div>

      <div className="game-value-hero" style={{ color:PURPLE, textShadow:`0 0 30px rgba(${hexToRgb(PURPLE)},0.5)` }}>{value}</div>

      {flipResult && (
        <div className="game-result-badge" style={{ background: flipResult==='win' ? `rgba(${hexToRgb(GREEN)},0.15)` : `rgba(${hexToRgb(RED)},0.15)`, border:`1px solid ${flipResult==='win' ? GREEN : RED}`, color: flipResult==='win' ? GREEN : RED }}>
          {flipResult==='win' ? `🎉 WIN ×${lastTier.current.winMult}` : `💀 LOSS ×${lastTier.current.lossMult}`}
        </div>
      )}

      <div className="game-btn-row">
        <GameLockInBtn value={value} onClick={() => onComplete(pickedStat, value)} disabled={flipping} />

        {canFlip ? (
          <button
            type="button"
            onClick={flip}
            disabled={flipping}
            className="game-btn-secondary"
            style={{
              background: isLastFlip ? `rgba(${hexToRgb(RED)},0.15)` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isLastFlip ? RED : PURPLE}`,
              color: isLastFlip ? RED : PURPLE,
            }}
          >
            <span className="game-btn-secondary__main">{isLastFlip ? '⚠️ Last flip' : '🎲 Flip'}</span>
            <span className="game-btn-secondary__sub">×{nextTier.winMult} / ×{nextTier.lossMult}</span>
          </button>
        ) : (
          <div className="game-btn-secondary" style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.25)', cursor:'default' }}>
            <span className="game-btn-secondary__main">No more flips</span>
          </div>
        )}
      </div>
    </GameShell>
  )
}

// ─── 6. Pressure Drop — faster cycle (250 ms) ────────────────────────────────
interface PressureStat { stat:StatKey; value:number }

function PressureDropGame({ card, takenStats, onComplete, compact }: MiniGameProps) {
  const pool = STAT_KEYS.filter(s => !takenStats.includes(s))
  const poolOrAll = pool.length > 0 ? pool : STAT_KEYS

  const [sequence] = useState<PressureStat[]>(() => {
    const items: PressureStat[] = []
    for (let pass=0; pass<4; pass++) {
      const shuffled = [...poolOrAll].sort(() => Math.random()-0.5)
      for (const s of shuffled) {
        const delta = Math.floor(Math.random()*13)-6
        items.push({ stat:s, value: applyStatDelta(card.stats[s], delta) })
      }
    }
    return items
  })

  const [idx,      setIdx]      = useState(0)
  const idxRef     = useRef(0)
  const [timeLeft, setTimeLeft] = useState(6000)
  const [done,     setDone]     = useState(false)
  const current = sequence[idx % sequence.length]

  useEffect(() => {
    if (done) return
    const statId  = setInterval(() => {
      setIdx(i => { idxRef.current=i+1; return i+1 })
    }, 250)   // ← was 500 ms
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(timerId); clearInterval(statId)
          setTimeout(() => {
            const cur = sequence[idxRef.current % sequence.length]
            setDone(true); onComplete(cur.stat, cur.value)
          }, 300)
          return 0
        }
        return prev - 100
      })
    }, 100)
    return () => { clearInterval(statId); clearInterval(timerId) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  const progress   = timeLeft / 6000
  const timerColor = progress > 0.5 ? GREEN : progress > 0.25 ? ORANGE : RED

  return (
    <GameShell compact={compact} icon="⏱️" title="PRESSURE DROP" hint="Grab the stat you want before time runs out!" accent={ORANGE} playerCard={card}>
      <div className="game-timer-bar">
        <div style={{ height:'100%', width:`${progress*100}%`, background:timerColor, transition:'width 0.1s, background 0.3s' }} />
      </div>
      <div className="game-center-stack" style={{ flex:1 }}>
        <div className="game-value-label">{current.stat}</div>
        <div className="game-value-hero" style={{ color:ORANGE, textShadow:`0 0 40px rgba(${hexToRgb(ORANGE)},0.6)` }}>{current.value}</div>
      </div>
      {done ? (
        <div className="game-bust-title" style={{ color:GREEN }}>GRABBED!</div>
      ) : (
        <button
          type="button"
          onClick={() => { if (!done) { setDone(true); onComplete(current.stat, current.value) } }}
          className="btn btn-primary game-action-btn"
        >
          <span className="game-action-btn__main">⚡ Grab it</span>
          <span className="game-action-btn__sub">{current.stat} {current.value}</span>
        </button>
      )}
    </GameShell>
  )
}

// ─── 7. Chamber (replaces Heist) — Russian roulette press-your-luck ───────────
// 6 chambers, 1 bullet (hidden). Each safe pull = +4. Hit the bullet = base only.
// Cash out after any safe pull.
function ChamberGame({ card, takenStats, onComplete, compact }: MiniGameProps) {
  const [pickedStat, setPickedStat] = useState<StatKey|null>(null)
  const [bulletIdx]  = useState(() => Math.floor(Math.random()*6))
  const [revealed,   setRevealed]   = useState([false,false,false,false,false,false])
  const [accumulated, setAccumulated] = useState(0)
  const [bust,       setBust]       = useState(false)
  const [done,       setDone]       = useState(false)
  if (!pickedStat) {
    return (
      <GameShell compact={compact} icon="🔫" title="CHAMBER" hint="One bullet in six. Each safe pull is +4. Find the bullet — base value only." accent={RED} playerCard={card}>
        <StatPicker card={card} takenStats={takenStats} onPick={s => setPickedStat(s)} accent={RED} compact={compact} />
      </GameShell>
    )
  }

  const base    = card.stats[pickedStat]
  const capBonus = statHeadroom(base)
  const current = applyStatBonus(base, accumulated)
  // how many unpulled chambers remain (including the bullet)
  const unpulled = revealed.filter(r => !r).length

  function pull(i: number) {
    if (revealed[i] || done) return
    const next = [...revealed]; next[i]=true; setRevealed(next)
    if (i===bulletIdx) {
      setBust(true); setDone(true)
      setRevealed([true,true,true,true,true,true])
    } else {
      setAccumulated(prev => Math.min(prev + 4, capBonus))
    }
  }

  function cashOut() {
    if (done || !pickedStat) return
    setDone(true)
    onComplete(pickedStat, current)
  }

  return (
    <GameShell compact={compact} icon="🔫" title="CHAMBER" hint={bust ? '💥 You found the bullet!' : unpulled>0 ? `${Math.round(1/unpulled*100)}% bullet risk per pull` : ''} accent={RED}>
      <div className="game-tile-grid game-tile-grid--3">
        {[0,1,2,3,4,5].map(i => {
          const isRev   = revealed[i]
          const isBullet = i===bulletIdx
          const isSafe  = isRev && !isBullet
          return (
            <button
              key={i}
              type="button"
              className="game-tile-btn"
              onClick={() => pull(i)}
              disabled={isRev||done}
              style={{
                background: isRev ? (isBullet ? `rgba(${hexToRgb(RED)},0.35)` : `rgba(${hexToRgb(GREEN)},0.2)`) : (done ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)'),
                border: `2px solid ${isRev ? (isBullet ? RED : GREEN) : 'rgba(255,255,255,0.18)'}`,
                color: isSafe ? GREEN : isRev ? RED : 'rgba(255,255,255,0.35)',
                boxShadow: isSafe ? `0 0 10px rgba(${hexToRgb(GREEN)},0.3)` : 'none',
              }}
            >
              {isRev ? (isBullet ? '💥' : '+4') : '○'}
            </button>
          )
        })}
      </div>

      {bust ? (
        <div className="game-play-footer">
          <div className="game-bust-title" style={{ color:RED }}>💥 YOU FOUND THE BULLET</div>
          <div className="game-play-summary">Base value only — bonuses lost.</div>
          <GameTakeBtn stat={pickedStat} value={base} onClick={() => onComplete(pickedStat, base)} />
        </div>
      ) : done ? (
        <div className="game-play-footer">
          <div className="game-play-summary" style={{ color:GREEN }}>Cashed out with +{accumulated}</div>
          <GameTakeBtn stat={pickedStat} value={current} onClick={() => onComplete(pickedStat, current)} />
        </div>
      ) : (
        <div className="game-play-footer">
          <div className="game-play-summary">
            {pickedStat} {base} + {accumulated} = <span className="highlight">{current}</span>
          </div>
          <GameCashOutBtn stat={pickedStat} value={current} onClick={cashOut} />
        </div>
      )}
    </GameShell>
  )
}

// ─── 8. The Gamble (replaces Phantom) — mystery trade vs. safe bonus ──────────
// Pick a stat. Then choose: a mystery box (−8 to +15, hint given 65 % accurate)
// OR a guaranteed +2. After you pick, both values are revealed — FOMO either way.
function GambleGame({ card, takenStats, onComplete, compact }: MiniGameProps) {
  const [pickedStat, setPickedStat] = useState<StatKey|null>(null)
  const [timeLeft,   setTimeLeft]   = useState(5000)
  const [decided,    setDecided]    = useState(false)
  const [choice,     setChoice]     = useState<'mystery'|'safe'|null>(null)

  const [mysteryBonus] = useState<number>(() => {
    const r = Math.random()
    if (r < 0.18) return -(Math.floor(Math.random()*6)+3)    // 18 %: −3 to −8
    if (r < 0.45) return  Math.floor(Math.random()*5)+1      // 27 %: +1 to +5
    if (r < 0.78) return  Math.floor(Math.random()*6)+6      // 33 %: +6 to +11
    return                Math.floor(Math.random()*5)+12      // 22 %: +12 to +16
  })

  const [hint] = useState(() => {
    const isGood = mysteryBonus >= 4
    const accurate = Math.random() < 0.65
    const showsGood = accurate ? isGood : !isGood
    return showsGood
      ? '🔮 Strong energy inside...'
      : '🌑 Something feels wrong about this one.'
  })

  useEffect(() => {
    if (!pickedStat || decided) return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(id)
          setChoice('safe'); setDecided(true)
          return 0
        }
        return prev - 100
      })
    }, 100)
    return () => clearInterval(id)
  }, [pickedStat, decided])

  if (!pickedStat) {
    return (
      <GameShell compact={compact} icon="🎁" title="THE GAMBLE" hint="Mystery bonus vs. a safe +2. The hint is... not always right." accent={PURPLE} playerCard={card}>
        <StatPicker card={card} takenStats={takenStats} onPick={s => setPickedStat(s)} accent={PURPLE} compact={compact} />
      </GameShell>
    )
  }

  const base        = card.stats[pickedStat]
  const safeBonus   = 2
  const safeResult  = applyStatBonus(base, safeBonus)
  const mystResult  = applyStatDelta(base, mysteryBonus)
  const progress    = timeLeft / 5000

  if (decided && choice) {
    const finalVal  = choice === 'mystery' ? mystResult : safeResult
    const otherVal  = choice === 'mystery' ? safeResult : mystResult
    const goodCall  = finalVal >= otherVal

    return (
      <GameShell compact={compact} icon="🎁" title="THE GAMBLE" hint="" accent={PURPLE}>
        <div className="game-center-stack" style={{ flex:1 }}>
          <div className="game-bust-title" style={{ color: goodCall ? GREEN : RED, fontSize: 'clamp(18px, 5vw, 24px)' }}>
            {goodCall ? '✓ GOOD CALL!' : '✗ WRONG CALL'}
          </div>
          <div className="game-value-hero" style={{ color:PURPLE }}>{finalVal}</div>
          <div className="game-play-summary">
            Mystery was {mysteryBonus>0?'+':''}{mysteryBonus} · Other choice: {otherVal}
          </div>
        </div>
        <GameTakeBtn stat={pickedStat} value={finalVal} onClick={() => onComplete(pickedStat, finalVal)} />
      </GameShell>
    )
  }

  return (
    <GameShell compact={compact} icon="🎁" title="THE GAMBLE" hint="Hint is ~65% accurate. Timer runs out → auto-safe." accent={PURPLE}>
      <div className="game-timer-bar">
        <div style={{ height:'100%', width:`${progress*100}%`, background: progress>0.4 ? PURPLE : RED, transition:'width 0.1s, background 0.3s' }} />
      </div>

      <div className="game-gamble-choices">
        <button
          type="button"
          onClick={() => { setChoice('mystery'); setDecided(true) }}
          className="game-gamble-choice"
          style={{ background:`rgba(${hexToRgb(PURPLE)},0.1)`, border:`2px solid ${PURPLE}` }}
        >
          <div className="game-gamble-choice__emoji">🎁</div>
          <div className="game-gamble-choice__title" style={{ color:PURPLE }}>MYSTERY</div>
          <div className="game-gamble-choice__hint">{hint}</div>
          <div className="game-gamble-choice__hint" style={{ opacity:0.5 }}>could be anything</div>
        </button>

        <button
          type="button"
          onClick={() => { setChoice('safe'); setDecided(true) }}
          className="game-gamble-choice"
          style={{ background:`rgba(${hexToRgb(GREEN)},0.08)`, border:`2px solid ${GREEN}` }}
        >
          <div className="game-gamble-choice__val font-display" style={{ color:GREEN, fontSize:'clamp(28px, 8vw, 36px)', lineHeight:1 }}>{safeResult}</div>
          <div className="game-gamble-choice__title" style={{ color:GREEN }}>SAFE +{safeBonus}</div>
          <div className="game-gamble-choice__hint">Guaranteed. No surprises.</div>
        </button>
      </div>
    </GameShell>
  )
}

// ─── Intro screen ─────────────────────────────────────────────────────────────
const GAME_META: Record<MiniGameType, { icon:string; title:string; tagline:string; accent:string }> = {
  'normal':            { icon:'🎯', title:'PICK YOUR STAT',    tagline:'No tricks. Just choose wisely.',                  accent:CYAN   },
  'slots':             { icon:'🎰', title:'SLOT MACHINE',      tagline:'Match all 3 for a bonus. Miss = middle reel.',     accent:GOLD   },
  'minefield':         { icon:'💣', title:'MINEFIELD',         tagline:'Dig deep — cash out before the boom.',             accent:RED    },
  'push':              { icon:'📈', title:'THE PUSH',          tagline:'Lock in before the crash. It will crash.',         accent:ORANGE },
  'double-or-nothing': { icon:'🃏', title:'DOUBLE OR NOTHING', tagline:'Flip to win. But the odds get worse every time.',  accent:PURPLE },
  'pressure-drop':     { icon:'⏱️', title:'PRESSURE DROP',     tagline:"The clock doesn't wait.",                          accent:ORANGE },
  'heist':             { icon:'🔫', title:'CHAMBER',           tagline:'One bullet. Six chambers. How far do you go?',     accent:RED    },
  'phantom':           { icon:'🎁', title:'THE GAMBLE',        tagline:'Mystery or safety. The hint lies... sometimes.',   accent:PURPLE },
}

function GameIntro({ type, onDone }: { type:MiniGameType; onDone:()=>void }) {
  const meta = GAME_META[type]
  const [barFull, setBarFull] = useState(false)

  useEffect(() => {
    const fill = setTimeout(() => setBarFull(true), 60)
    const next = setTimeout(onDone, 1800)
    return () => { clearTimeout(fill); clearTimeout(next) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div onClick={onDone} style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:18, minHeight:'60vh', padding:'48px 24px', cursor:'pointer', userSelect:'none', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:320, height:320, borderRadius:'50%', background:`radial-gradient(circle,rgba(${hexToRgb(meta.accent)},0.18) 0%,transparent 70%)`, pointerEvents:'none' }} />
      <div style={{ fontSize:88, lineHeight:1, position:'relative', zIndex:1, animation:'pop-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}>{meta.icon}</div>
      <div className="font-display" style={{ fontSize:34, color:meta.accent, letterSpacing:'0.1em', textAlign:'center', textShadow:`0 0 32px rgba(${hexToRgb(meta.accent)},0.55)`, position:'relative', zIndex:1, animation:'pop-in 0.4s 0.12s cubic-bezier(0.34,1.56,0.64,1) both' }}>{meta.title}</div>
      <div style={{ fontSize:15, color:'rgba(255,255,255,0.55)', textAlign:'center', maxWidth:260, lineHeight:1.5, position:'relative', zIndex:1, animation:'pop-in 0.4s 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}>{meta.tagline}</div>
      <div style={{ width:'100%', maxWidth:260, height:3, background:'rgba(255,255,255,0.1)', borderRadius:2, overflow:'hidden', position:'relative', zIndex:1, animation:'pop-in 0.4s 0.35s both' }}>
        <div style={{ height:'100%', borderRadius:2, background:meta.accent, boxShadow:`0 0 8px rgba(${hexToRgb(meta.accent)},0.6)`, width: barFull ? '100%' : '0%', transition:'width 1.65s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', letterSpacing:'0.12em', textTransform:'uppercase', position:'relative', zIndex:1, animation:'pop-in 0.4s 0.4s both' }}>tap to skip</div>
    </div>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────
export function MiniGame({ type, card, takenStats, onComplete, compact = false }: MiniGameProps & { type:MiniGameType }) {
  const [phase, setPhase] = useState<'intro'|'game'>(compact ? 'game' : 'intro')
  if (phase === 'intro') return <GameIntro type={type} onDone={() => setPhase('game')} />

  const props = { card, takenStats, onComplete, compact }
  switch (type) {
    case 'normal':            return <NormalGame            {...props} />
    case 'slots':             return <SlotsGame             {...props} />
    case 'minefield':         return <MinefieldGame         {...props} />
    case 'push':              return <PushGame              {...props} />
    case 'double-or-nothing': return <DoubleOrNothingGame   {...props} />
    case 'pressure-drop':     return <PressureDropGame      {...props} />
    case 'heist':             return <ChamberGame           {...props} />
    case 'phantom':           return <GambleGame            {...props} />
    default:                  return <NormalGame            {...props} />
  }
}
