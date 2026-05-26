import { useState, useEffect, useRef } from 'react'
import type { RealPlayer, StatKey, MiniGameType } from '../../types'
import { STAT_KEYS } from '../../types'

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
}

// ─── Compact player card display ─────────────────────────────────────────────
function PlayerCardMini({ card }: { card: RealPlayer }) {
  const c = card.overall >= 88 ? GOLD : card.overall >= 75 ? '#b0b8c8' : '#cd9f6e'
  return (
    <div style={{
      width: 148, flexShrink: 0,
      background: 'linear-gradient(160deg,#0d1526 0%,#1a2545 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14, padding: '12px 11px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
      boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* diagonal glint */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'linear-gradient(135deg,transparent 38%,rgba(255,255,255,0.025) 50%,transparent 62%)' }} />
      {/* overall + position */}
      <div style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div className="font-display" style={{ fontSize:26, color:c, lineHeight:1 }}>{card.overall}</div>
          <div style={{ fontSize:9, color:c, opacity:0.85, letterSpacing:'0.06em', marginTop:1 }}>{card.position}</div>
        </div>
        <div style={{ fontSize:8, color:'rgba(255,255,255,0.25)', textAlign:'right', lineHeight:1.3 }}>
          {card.nation}<br/>{card.club.slice(0,10)}
        </div>
      </div>
      {/* name */}
      <div style={{
        fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.92)',
        letterSpacing:'0.05em', textAlign:'center',
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%',
      }}>
        {card.name.split(' ').slice(-1)[0].toUpperCase()}
      </div>
      {/* stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'3px 14px', width:'100%' }}>
        {STAT_KEYS.map(s => (
          <div key={s} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:8, color:'rgba(255,255,255,0.38)', letterSpacing:'0.06em' }}>{s}</span>
            <span className="font-display" style={{ fontSize:11, color:'rgba(255,255,255,0.88)' }}>{card.stats[s]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Shell / Header wrapper ───────────────────────────────────────────────────
function GameShell({
  icon, title, hint, accent, playerCard, children,
}: {
  icon: string; title: string; hint: string; accent: string
  playerCard?: RealPlayer
  children: React.ReactNode
}) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 16px 32px', gap:18, maxWidth:480, margin:'0 auto', width:'100%' }}>
      {/* Player card context */}
      {playerCard && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase' }}>
            PULL FROM
          </div>
          <PlayerCardMini card={playerCard} />
        </div>
      )}
      {/* Game header */}
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
  card, takenStats, onPick, accent,
}: {
  card: RealPlayer; takenStats: StatKey[]; onPick: (s: StatKey, v: number) => void; accent: string
}) {
  const [hovered, setHovered] = useState<StatKey | null>(null)
  const available = STAT_KEYS.filter(s => !takenStats.includes(s))
  return (
    <div style={{ width:'100%' }}>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textAlign:'center', letterSpacing:'0.1em', marginBottom:10, textTransform:'uppercase' }}>
        Choose your stat
        {takenStats.length > 0 && (
          <span style={{ color:'rgba(255,255,255,0.2)', marginLeft:8 }}>({available.length} remaining)</span>
        )}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {available.map(stat => (
          <button
            key={stat}
            onMouseEnter={() => setHovered(stat)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onPick(stat, card.stats[stat])}
            style={{
              background: hovered === stat ? `rgba(${hexToRgb(accent)},0.18)` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${hovered === stat ? accent : 'rgba(255,255,255,0.1)'}`,
              borderRadius:10, padding:'10px 8px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              transition:'all 0.15s ease',
              boxShadow: hovered === stat ? `0 0 12px rgba(${hexToRgb(accent)},0.3)` : 'none',
            }}
          >
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em' }}>{stat}</span>
            <span className="font-display" style={{ fontSize:24, color: hovered === stat ? accent : 'rgba(255,255,255,0.9)' }}>{card.stats[stat]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

// ─── 1. Normal ────────────────────────────────────────────────────────────────
function NormalGame({ card, takenStats, onComplete }: MiniGameProps) {
  return (
    <GameShell icon="🎯" title="PICK YOUR STAT" hint="No tricks. Just choose wisely." accent={CYAN} playerCard={card}>
      <StatPicker card={card} takenStats={takenStats} onPick={onComplete} accent={CYAN} />
    </GameShell>
  )
}

// ─── 2. Slots — stat-name reels, match for bonus ──────────────────────────────
function SlotsGame({ card, takenStats, onComplete }: MiniGameProps) {
  const available  = STAT_KEYS.filter(s => !takenStats.includes(s))
  const cycleStats = available.length >= 2 ? available : STAT_KEYS

  const [reels, setReels] = useState<[StatKey, StatKey, StatKey]>(() => {
    const n = cycleStats.length
    return [cycleStats[0], cycleStats[Math.floor(n/3)%n], cycleStats[Math.floor(2*n/3)%n]]
  })
  const [stopped,  setStopped]  = useState<[boolean,boolean,boolean]>([false,false,false])
  const [revealed, setRevealed] = useState(false)
  const stoppedRef = useRef([false,false,false])

  useEffect(() => {
    if (revealed) return
    const speeds = [83,100,121]
    const ids = ([0,1,2] as const).map(i =>
      setInterval(() => {
        if (stoppedRef.current[i]) return
        setReels(prev => {
          const copy = [...prev] as [StatKey,StatKey,StatKey]
          copy[i] = cycleStats[(cycleStats.indexOf(copy[i]) + 1) % cycleStats.length]
          return copy
        })
      }, speeds[i])
    )
    return () => ids.forEach(clearInterval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed])

  function stopReel(i: number) {
    if (stoppedRef.current[i] || revealed) return
    stoppedRef.current[i] = true
    const snap: [boolean,boolean,boolean] = [stoppedRef.current[0],stoppedRef.current[1],stoppedRef.current[2]]
    setStopped(snap)
    if (snap.every(Boolean)) setTimeout(() => setRevealed(true), 500)
  }

  const allStopped = stopped.every(Boolean)
  const matchResult = allStopped ? (() => {
    const counts: Partial<Record<StatKey,number>> = {}
    for (const s of reels) counts[s] = (counts[s]??0) + 1
    const triple = (Object.entries(counts) as [StatKey,number][]).find(([,v]) => v===3)
    const double = (Object.entries(counts) as [StatKey,number][]).find(([,v]) => v===2)
    if (triple) return { kind:'triple' as const, stat:triple[0] }
    if (double) return { kind:'double' as const, stat:double[0] }
    return { kind:'miss' as const, stat:reels[1] }
  })() : null

  const finalResult = matchResult ? (() => {
    switch (matchResult.kind) {
      case 'triple': return { stat:matchResult.stat, value:Math.min(99,card.stats[matchResult.stat]+8),  bonus:8,  label:'🎰 JACKPOT! +8',   color:GOLD  }
      case 'double': return { stat:matchResult.stat, value:Math.min(99,card.stats[matchResult.stat]+4),  bonus:4,  label:'✨ MATCH! +4',      color:GREEN }
      case 'miss':   return { stat:matchResult.stat, value:card.stats[matchResult.stat],                  bonus:0,  label:'❌ NO MATCH',       color:RED   }
    }
  })() : null

  return (
    <GameShell icon="🎰" title="SLOTS" hint="Stop all 3 on the SAME stat for a bonus. Miss = middle reel, no bonus." accent={GOLD} playerCard={card}>
      <div style={{ display:'flex', gap:10, width:'100%' }}>
        {([0,1,2] as const).map(i => {
          const s = reels[i]; const isStopped = stopped[i]
          const isWinner = revealed && finalResult && finalResult.bonus>0 && matchResult?.stat===s
          return (
            <button key={i} onClick={() => stopReel(i)} disabled={isStopped||revealed} style={{
              flex:1,
              background: isWinner ? `rgba(${hexToRgb(GOLD)},0.2)` : isStopped ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${isWinner ? GOLD : isStopped ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius:12, padding:'14px 8px', cursor: isStopped||revealed ? 'default' : 'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:5,
              filter: isStopped ? 'none' : 'blur(0.4px)',
              boxShadow: isWinner ? `0 0 16px rgba(${hexToRgb(GOLD)},0.4)` : 'none',
              transition:'all 0.2s',
            }}>
              <span style={{ fontSize:11, letterSpacing:'0.12em', fontWeight:700, color: isStopped ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)' }}>{s}</span>
              <span className="font-display" style={{ fontSize:30, color: isWinner ? GOLD : isStopped ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)' }}>{card.stats[s]}</span>
              {!isStopped && !revealed && <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)' }}>TAP</span>}
              {isStopped && !revealed && <span style={{ fontSize:9, color:GOLD }}>LOCKED</span>}
            </button>
          )
        })}
      </div>
      {allStopped && !revealed && <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em' }}>spinning down…</div>}
      {revealed && finalResult && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, width:'100%' }}>
          <div style={{ padding:'8px 24px', borderRadius:10, background:`rgba(${hexToRgb(finalResult.color)},0.15)`, border:`1px solid ${finalResult.color}`, color:finalResult.color, fontSize:14, fontWeight:700 }}>
            {finalResult.label}
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center' }}>
            {finalResult.stat} {card.stats[finalResult.stat]}{finalResult.bonus>0 && <span style={{ color:GREEN }}> +{finalResult.bonus}</span>} = <span style={{ color: finalResult.bonus>0 ? GREEN : 'rgba(255,255,255,0.7)', fontWeight:700 }}>{finalResult.value}</span>
          </div>
          <button onClick={() => onComplete(finalResult.stat, finalResult.value)} className="btn btn-primary" style={{ width:'100%' }}>
            Take {finalResult.stat} {finalResult.value} →
          </button>
        </div>
      )}
    </GameShell>
  )
}

// ─── 3. Minefield — bonus capped by distance from 99 ─────────────────────────
type MineState = { type:'bonus'; bonus:number } | { type:'mine' }
type TileState = { revealed:boolean; content:MineState }

function MinefieldGame({ card, takenStats, onComplete }: MiniGameProps) {
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
      <GameShell icon="💣" title="MINEFIELD" hint="Pick a stat, dig for bonuses, cash out before a mine!" accent={RED} playerCard={card}>
        <StatPicker card={card} takenStats={takenStats} onPick={s => setPickedStat(s)} accent={RED} />
      </GameShell>
    )
  }

  const base     = card.stats[pickedStat]
  const capBonus = Math.min(20, Math.max(0, 99 - base))   // hard cap — no trivial 99s
  const current  = Math.min(99, base + accumulated)

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
    <GameShell icon="💣" title="MINEFIELD" hint={`Max bonus: +${capBonus} · Cash out before a mine!`} accent={RED}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, width:'100%' }}>
        {tiles.map((tile,i) => (
          <button key={i} onClick={() => revealTile(i)} disabled={tile.revealed||done} style={{
            aspectRatio:'1',
            background: tile.revealed ? (tile.content.type==='mine' ? `rgba(${hexToRgb(RED)},0.25)` : `rgba(${hexToRgb(GREEN)},0.15)`) : 'rgba(255,255,255,0.06)',
            border: `1px solid ${tile.revealed ? (tile.content.type==='mine' ? RED : GREEN) : 'rgba(255,255,255,0.12)'}`,
            borderRadius:10, cursor: tile.revealed||done ? 'default' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize: tile.revealed ? 20 : 18,
            color: tile.revealed && tile.content.type==='bonus' ? GREEN : 'rgba(255,255,255,0.5)',
            fontWeight:700,
          }}>
            {tile.revealed ? (tile.content.type==='mine' ? '💥' : tile.content.bonus>0 ? `+${tile.content.bonus}` : '·') : '?'}
          </button>
        ))}
      </div>
      {bust ? (
        <div style={{ textAlign:'center' }}>
          <div className="font-display" style={{ fontSize:32, color:RED, marginBottom:8 }}>💥 BUSTED!</div>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:13, marginBottom:16 }}>You get base value only</div>
          <button onClick={() => onComplete(pickedStat, base)} className="btn btn-primary">
            Take {pickedStat} {base} →
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, width:'100%' }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>
            {pickedStat}: {base} + {accumulated} / {capBonus} max = <span style={{ color:GREEN, fontWeight:700 }}>{current}</span>
          </div>
          <button onClick={() => onComplete(pickedStat, current)} className="btn btn-primary" style={{ width:'100%' }}>
            💰 CASH OUT — Take {pickedStat} {current}
          </button>
        </div>
      )}
    </GameShell>
  )
}

// ─── 4. The Push — crash-style probabilistic bust ─────────────────────────────
function PushGame({ card, takenStats, onComplete }: MiniGameProps) {
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
      <GameShell icon="📈" title="THE PUSH" hint="The crash can strike ANY tick. Higher multiplier = more risk per second." accent={ORANGE} playerCard={card}>
        <StatPicker card={card} takenStats={takenStats} onPick={s => { setPickedStat(s); setRunning(true) }} accent={ORANGE} />
      </GameShell>
    )
  }

  const base      = card.stats[pickedStat]
  const displayed = lockedIn !== null ? lockedIn : Math.min(99, Math.round(base * mult))
  const bustVal   = Math.max(1, Math.round(base * 0.70))
  const dangerZone = mult > 1.5
  const multColor = bust ? RED : mult > 2.0 ? RED : dangerZone ? ORANGE : mult > 1.2 ? GOLD : GREEN

  return (
    <GameShell icon="📈" title="THE PUSH" hint={bust ? 'You waited too long — penalty applied.' : dangerZone ? '⚠️ HIGH RISK — lock in soon!' : 'Lock in before it crashes!'} accent={ORANGE}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', letterSpacing:'0.12em', marginBottom:4 }}>MULTIPLIER</div>
        <div className="font-display" style={{ fontSize:52, color:multColor, lineHeight:1, transition:'color 0.2s' }}>
          {bust ? '💥 BUST' : `${mult.toFixed(2)}×`}
        </div>
      </div>
      <div className="font-display" style={{ fontSize:96, lineHeight:1, textAlign:'center', color: bust ? RED : lockedIn!==null ? GREEN : ORANGE, textShadow:`0 0 30px rgba(${hexToRgb(bust?RED:ORANGE)},0.4)` }}>
        {bust ? bustVal : displayed}
      </div>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', textAlign:'center' }}>
        {pickedStat} · base {base} · {bust ? `penalty ×0.7 = ${bustVal}` : `current +${Math.max(0,displayed-base)}`}
      </div>
      {bust ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center' }}>You waited too long. You get base × 0.7</div>
          <button onClick={() => onComplete(pickedStat, bustVal)} className="btn btn-primary">Take {pickedStat} {bustVal} →</button>
        </div>
      ) : lockedIn !== null ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <div style={{ fontSize:13, color:GREEN }}>✓ Locked in at {lockedIn}</div>
          <button onClick={() => onComplete(pickedStat, lockedIn)} className="btn btn-primary">Confirm {pickedStat} {lockedIn} →</button>
        </div>
      ) : (
        <button onClick={() => { const val=Math.min(99,Math.round(base*multRef.current)); lockedInRef.current=val; setLockedIn(val); setRunning(false) }}
          className="btn btn-primary" style={{ width:'100%', fontSize:16, padding:'14px 0' }}>
          🔒 LOCK IN {displayed}
        </button>
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

function DoubleOrNothingGame({ card, takenStats, onComplete }: MiniGameProps) {
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
        ? Math.min(99, Math.round(prev * tier.winMult))
        : Math.max(1,  Math.round(prev * tier.lossMult))
      )
      setFlipCount(c => c + 1)
      setCoinAngle(0)
      setFlipping(false)
    }, 700)
  }

  if (!pickedStat) {
    return (
      <GameShell icon="🃏" title="DOUBLE OR NOTHING" hint={`${MAX_FLIPS} flips max. Odds get worse every time. Use them wisely.`} accent={PURPLE} playerCard={card}>
        <StatPicker card={card} takenStats={takenStats} onPick={pickStat} accent={PURPLE} />
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
    <GameShell icon="🃏" title="DOUBLE OR NOTHING" hint={hintText} accent={PURPLE}>
      {/* Odds split bar */}
      <div style={{ width:'100%', height:26, display:'flex', gap:2 }}>
        <div style={{ flex:winPct, background:`rgba(${hexToRgb(GREEN)},0.25)`, border:`1px solid rgba(${hexToRgb(GREEN)},0.5)`, borderRadius:'6px 0 0 6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:GREEN, fontWeight:700 }}>WIN {winPct}%</div>
        <div style={{ flex:lossPct, background:`rgba(${hexToRgb(RED)},0.25)`, border:`1px solid rgba(${hexToRgb(RED)},0.5)`, borderRadius:'0 6px 6px 0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:RED, fontWeight:700 }}>LOSE {lossPct}%</div>
      </div>

      {/* Flip history dots */}
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
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
        <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginLeft:4 }}>
          {flipsLeft > 0 ? `${flipsLeft} left` : 'used up'}
        </span>
      </div>

      {/* Coin */}
      <div style={{ width:80, height:80, borderRadius:'50%', background: flipResult==='loss' ? `rgba(${hexToRgb(RED)},0.3)` : `rgba(${hexToRgb(GOLD)},0.3)`, border:`3px solid ${flipResult==='loss' ? RED : GOLD}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, transform:`rotateY(${coinAngle}deg)`, transition: flipping ? 'none' : 'transform 0.1s' }}>🪙</div>

      {/* Current value */}
      <div className="font-display" style={{ fontSize:88, color:PURPLE, lineHeight:1, textShadow:`0 0 30px rgba(${hexToRgb(PURPLE)},0.5)` }}>{value}</div>

      {/* Last flip result badge */}
      {flipResult && (
        <div style={{ background: flipResult==='win' ? `rgba(${hexToRgb(GREEN)},0.15)` : `rgba(${hexToRgb(RED)},0.15)`, border:`1px solid ${flipResult==='win' ? GREEN : RED}`, borderRadius:10, padding:'6px 20px', color: flipResult==='win' ? GREEN : RED, fontSize:13, fontWeight:700 }}>
          {flipResult==='win' ? `🎉 WIN ×${lastTier.current.winMult}` : `💀 LOSS ×${lastTier.current.lossMult}`}
        </div>
      )}

      {/* Action row */}
      <div style={{ display:'flex', gap:10, width:'100%' }}>
        <button
          onClick={() => onComplete(pickedStat, value)}
          className="btn btn-primary"
          style={{ flex: canFlip ? 2 : 1 }}
          disabled={flipping}
        >
          🔒 LOCK IN {value}
        </button>

        {canFlip ? (
          <button
            onClick={flip}
            disabled={flipping}
            style={{
              flex: 1,
              background: isLastFlip ? `rgba(${hexToRgb(RED)},0.15)` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isLastFlip ? RED : PURPLE}`,
              borderRadius: 10,
              color: isLastFlip ? RED : PURPLE,
              padding: '10px 0',
              cursor: flipping ? 'not-allowed' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize:13, fontWeight:700 }}>{isLastFlip ? '⚠️ LAST' : '🎲 FLIP'}</span>
            <span style={{ fontSize:9, color:'rgba(255,255,255,0.35)' }}>×{nextTier.winMult} / ×{nextTier.lossMult}</span>
          </button>
        ) : (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', fontSize:10, color:'rgba(255,255,255,0.25)', letterSpacing:'0.06em', lineHeight:1.5 }}>
            NO MORE<br/>FLIPS
          </div>
        )}
      </div>
    </GameShell>
  )
}

// ─── 6. Pressure Drop — faster cycle (250 ms) ────────────────────────────────
interface PressureStat { stat:StatKey; value:number }

function PressureDropGame({ card, takenStats, onComplete }: MiniGameProps) {
  const pool = STAT_KEYS.filter(s => !takenStats.includes(s))
  const poolOrAll = pool.length > 0 ? pool : STAT_KEYS

  const [sequence] = useState<PressureStat[]>(() => {
    const items: PressureStat[] = []
    for (let pass=0; pass<4; pass++) {
      const shuffled = [...poolOrAll].sort(() => Math.random()-0.5)
      for (const s of shuffled) {
        const delta = Math.floor(Math.random()*13)-6
        items.push({ stat:s, value:Math.max(40,Math.min(99,card.stats[s]+delta)) })
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
    <GameShell icon="⏱️" title="PRESSURE DROP" hint="Grab the stat you want before time runs out!" accent={ORANGE} playerCard={card}>
      <div style={{ width:'100%', height:6, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progress*100}%`, background:timerColor, transition:'width 0.1s, background 0.3s' }} />
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:14, color:'rgba(255,255,255,0.4)', letterSpacing:'0.2em', marginBottom:4 }}>{current.stat}</div>
        <div className="font-display" style={{ fontSize:120, lineHeight:0.9, color:ORANGE, textShadow:`0 0 40px rgba(${hexToRgb(ORANGE)},0.6)` }}>{current.value}</div>
      </div>
      {done ? (
        <div className="font-display" style={{ fontSize:24, color:GREEN }}>GRABBED!</div>
      ) : (
        <button onClick={() => { if (!done) { setDone(true); onComplete(current.stat, current.value) } }} className="btn btn-primary" style={{ width:'100%', fontSize:18, padding:'16px 0' }}>
          ⚡ GRAB IT
        </button>
      )}
    </GameShell>
  )
}

// ─── 7. Chamber (replaces Heist) — Russian roulette press-your-luck ───────────
// 6 chambers, 1 bullet (hidden). Each safe pull = +4. Hit the bullet = base only.
// Cash out after any safe pull.
function ChamberGame({ card, takenStats, onComplete }: MiniGameProps) {
  const [pickedStat, setPickedStat] = useState<StatKey|null>(null)
  const [bulletIdx]  = useState(() => Math.floor(Math.random()*6))
  const [revealed,   setRevealed]   = useState([false,false,false,false,false,false])
  const [accumulated, setAccumulated] = useState(0)
  const [bust,       setBust]       = useState(false)
  const [done,       setDone]       = useState(false)
  const safePulls = revealed.filter((r,i) => r && i!==bulletIdx).length

  if (!pickedStat) {
    return (
      <GameShell icon="🔫" title="CHAMBER" hint="One bullet in six. Each safe pull is +4. Find the bullet — base value only." accent={RED} playerCard={card}>
        <StatPicker card={card} takenStats={takenStats} onPick={s => setPickedStat(s)} accent={RED} />
      </GameShell>
    )
  }

  const base    = card.stats[pickedStat]
  const current = Math.min(99, base + accumulated)
  const remaining = 6 - safePulls - (bust ? 1 : 0)
  const bulletRisk = bust ? 0 : Math.round((1/Math.max(1, remaining - (bust?0:0)))*100)
  // how many unpulled chambers remain (including the bullet)
  const unpulled = revealed.filter(r => !r).length

  function pull(i: number) {
    if (revealed[i] || done) return
    const next = [...revealed]; next[i]=true; setRevealed(next)
    if (i===bulletIdx) {
      setBust(true); setDone(true)
      setRevealed([true,true,true,true,true,true])
    } else {
      setAccumulated(prev => prev+4)
    }
  }

  function cashOut() {
    if (done || !pickedStat) return
    setDone(true)
    onComplete(pickedStat, current)
  }

  return (
    <GameShell icon="🔫" title="CHAMBER" hint={bust ? '💥 You found the bullet!' : unpulled>0 ? `${Math.round(1/unpulled*100)}% bullet risk per pull` : ''} accent={RED}>
      {/* 2×3 grid of chambers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, width:'100%' }}>
        {[0,1,2,3,4,5].map(i => {
          const isRev   = revealed[i]
          const isBullet = i===bulletIdx
          const isSafe  = isRev && !isBullet
          return (
            <button key={i} onClick={() => pull(i)} disabled={isRev||done} style={{
              aspectRatio:'1',
              background: isRev ? (isBullet ? `rgba(${hexToRgb(RED)},0.35)` : `rgba(${hexToRgb(GREEN)},0.2)`) : (done ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)'),
              border: `2px solid ${isRev ? (isBullet ? RED : GREEN) : 'rgba(255,255,255,0.18)'}`,
              borderRadius:14, cursor: isRev||done ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:24, fontWeight:700,
              color: isSafe ? GREEN : isRev ? RED : 'rgba(255,255,255,0.35)',
              transition:'all 0.2s',
              boxShadow: isSafe ? `0 0 10px rgba(${hexToRgb(GREEN)},0.3)` : 'none',
            }}>
              {isRev ? (isBullet ? '💥' : '+4') : '○'}
            </button>
          )
        })}
      </div>

      {bust ? (
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div className="font-display" style={{ fontSize:28, color:RED }}>💥 YOU FOUND THE BULLET</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Base value only — accumulated bonuses lost.</div>
          <button onClick={() => onComplete(pickedStat, base)} className="btn btn-primary">Take {pickedStat} {base} →</button>
        </div>
      ) : done ? (
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <div style={{ fontSize:13, color:GREEN }}>Cashed out with +{accumulated}</div>
          <button onClick={() => onComplete(pickedStat, current)} className="btn btn-primary">Take {pickedStat} {current} →</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, width:'100%' }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>
            {pickedStat} {base} + {accumulated} = <span style={{ color:GREEN, fontWeight:700 }}>{current}</span>
          </div>
          <button onClick={cashOut} className="btn btn-primary" style={{ width:'100%' }}>
            💰 CASH OUT — Take {pickedStat} {current}
          </button>
        </div>
      )}
    </GameShell>
  )
}

// ─── 8. The Gamble (replaces Phantom) — mystery trade vs. safe bonus ──────────
// Pick a stat. Then choose: a mystery box (−8 to +15, hint given 65 % accurate)
// OR a guaranteed +2. After you pick, both values are revealed — FOMO either way.
function GambleGame({ card, takenStats, onComplete }: MiniGameProps) {
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
      <GameShell icon="🎁" title="THE GAMBLE" hint="Mystery bonus vs. a safe +2. The hint is... not always right." accent={PURPLE} playerCard={card}>
        <StatPicker card={card} takenStats={takenStats} onPick={s => setPickedStat(s)} accent={PURPLE} />
      </GameShell>
    )
  }

  const base        = card.stats[pickedStat]
  const safeBonus   = 2
  const safeResult  = Math.min(99, base + safeBonus)
  const mystResult  = Math.min(99, Math.max(1, base + mysteryBonus))
  const progress    = timeLeft / 5000

  if (decided && choice) {
    const finalVal  = choice === 'mystery' ? mystResult : safeResult
    const otherVal  = choice === 'mystery' ? safeResult : mystResult
    const goodCall  = finalVal >= otherVal

    return (
      <GameShell icon="🎁" title="THE GAMBLE" hint="" accent={PURPLE}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
          <div className="font-display" style={{ fontSize:24, color: goodCall ? GREEN : RED }}>
            {goodCall ? '✓ GOOD CALL!' : '✗ WRONG CALL'}
          </div>
          <div className="font-display" style={{ fontSize:72, color:PURPLE, lineHeight:1 }}>{finalVal}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center' }}>
            Mystery was {mysteryBonus>0?'+':''}{mysteryBonus} · The other choice was {otherVal}
          </div>
          <button onClick={() => onComplete(pickedStat, finalVal)} className="btn btn-primary">
            Take {pickedStat} {finalVal} →
          </button>
        </div>
      </GameShell>
    )
  }

  return (
    <GameShell icon="🎁" title="THE GAMBLE" hint="Hint is ~65% accurate. Timer runs out → auto-safe." accent={PURPLE}>
      {/* Timer */}
      <div style={{ width:'100%', height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progress*100}%`, background: progress>0.4 ? PURPLE : RED, transition:'width 0.1s, background 0.3s' }} />
      </div>

      {/* Two choices */}
      <div style={{ display:'flex', gap:12, width:'100%' }}>
        {/* Mystery */}
        <button onClick={() => { setChoice('mystery'); setDecided(true) }} style={{
          flex:1, background:`rgba(${hexToRgb(PURPLE)},0.1)`, border:`2px solid ${PURPLE}`,
          borderRadius:14, padding:'18px 12px', cursor:'pointer',
          display:'flex', flexDirection:'column', alignItems:'center', gap:8,
        }}>
          <div style={{ fontSize:36 }}>🎁</div>
          <div style={{ fontSize:11, color:PURPLE, fontWeight:700, letterSpacing:'0.08em' }}>MYSTERY</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', textAlign:'center', lineHeight:1.4 }}>{hint}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>could be anything</div>
        </button>

        {/* Safe */}
        <button onClick={() => { setChoice('safe'); setDecided(true) }} style={{
          flex:1, background:`rgba(${hexToRgb(GREEN)},0.08)`, border:`2px solid ${GREEN}`,
          borderRadius:14, padding:'18px 12px', cursor:'pointer',
          display:'flex', flexDirection:'column', alignItems:'center', gap:8,
        }}>
          <div className="font-display" style={{ fontSize:36, color:GREEN }}>{safeResult}</div>
          <div style={{ fontSize:11, color:GREEN, fontWeight:700, letterSpacing:'0.08em' }}>SAFE +{safeBonus}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', textAlign:'center', lineHeight:1.4 }}>
            Guaranteed. No surprises.
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>boring but safe</div>
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
export function MiniGame({ type, card, takenStats, onComplete }: MiniGameProps & { type:MiniGameType }) {
  const [phase, setPhase] = useState<'intro'|'game'>('intro')
  if (phase === 'intro') return <GameIntro type={type} onDone={() => setPhase('game')} />

  const props = { card, takenStats, onComplete }
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
