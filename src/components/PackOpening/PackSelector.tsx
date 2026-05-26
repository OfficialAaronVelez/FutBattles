import { useState } from 'react'
import { useGameStore, PACK_COSTS } from '../../store/gameStore'
import type { PackRarity } from '../../types'

const DEV = import.meta.env.DEV

const PACK_TIERS: { rarity: PackRarity; label: string; sub: string; range: string; crest: string }[] = [
  { rarity: 'bronze', label: 'BRONZE', sub: 'Starter Pack', range: '60–74 OVR', crest: 'B' },
  { rarity: 'silver', label: 'SILVER', sub: 'Pro Pack',     range: '75–82 OVR', crest: 'S' },
  { rarity: 'gold',   label: 'GOLD',   sub: 'Elite Pack',   range: '83–99 OVR', crest: 'G' },
]

const SQUAD_SIZE = 7

export function PackSelector() {
  const { coins, roster, startPackOpening, addCoins } = useGameStore()
  const [name, setName]   = useState('')
  const [picked, setPicked] = useState<PackRarity>('gold')

  const cost      = PACK_COSTS[picked]
  const canAfford = coins >= cost

  // Squad safety check — after buying this pack, can they still afford
  // enough bronze packs to fill a complete 7-card roster?
  const cardsAfterBuy  = roster.length + 1
  const stillNeeded    = Math.max(0, SQUAD_SIZE - cardsAfterBuy)
  const coinsAfterBuy  = coins - cost
  const isStranded     = canAfford && stillNeeded > 0 && coinsAfterBuy < stillNeeded * PACK_COSTS.bronze
  const hasFullSquad   = roster.length >= SQUAD_SIZE

  const canOpen = name.trim().length > 0 && canAfford && !isStranded

  function handleOpen() {
    if (!canOpen) return
    startPackOpening(name.trim(), picked)
  }

  return (
    <div style={{ padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div className="text-center" style={{ padding: '24px 16px 12px' }}>
        <div className="eyebrow" style={{ color: 'var(--gold-1)' }}>New Pack</div>
        <h1 className="font-display" style={{ fontSize: 44, margin: '4px 0 4px', lineHeight: 0.9, color: 'var(--ink-0)', letterSpacing: '0.02em' }}>
          BUILD A LEGEND
        </h1>
        <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>Name your player, pick a pack, forge a card.</div>
      </div>

      {/* Squad status bar */}
      {!hasFullSquad && (
        <div style={{
          background:   'rgba(255,255,255,0.03)',
          border:       '1px solid var(--line)',
          borderRadius: 12,
          padding:      '12px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--ink-2)', letterSpacing: '0.1em' }}>
              SQUAD PROGRESS
            </div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: roster.length >= SQUAD_SIZE ? 'var(--green-1)' : 'var(--gold-1)' }}>
              {roster.length} / {SQUAD_SIZE} PLAYERS
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: SQUAD_SIZE }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 3,
                background: i < roster.length ? 'var(--gold-1)' : 'rgba(255,255,255,0.08)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6 }}>
            {stillNeeded > 0
              ? `${stillNeeded} more card${stillNeeded !== 1 ? 's' : ''} needed to field a full battle squad`
              : 'Squad complete — ready to battle!'}
          </div>
        </div>
      )}

      {/* Name input */}
      <div>
        <div className="eyebrow text-center" style={{ marginBottom: 8 }}>Player Name</div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleOpen()}
          placeholder="Type a name…"
          maxLength={14}
          style={{
            width:        '100%',
            background:   'rgba(255,255,255,0.04)',
            border:       '1px solid var(--line)',
            borderRadius: 12,
            padding:      '14px 16px',
            color:        'var(--ink-0)',
            fontFamily:   'var(--font-display)',
            fontSize:     24,
            letterSpacing:'0.06em',
            textTransform:'uppercase',
            textAlign:    'center',
            outline:      'none',
            transition:   'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--gold-1)')}
          onBlur={e  => (e.target.style.borderColor = 'var(--line)')}
        />
      </div>

      {/* Pack tier picker */}
      <div>
        <div className="eyebrow text-center" style={{ marginBottom: 10 }}>Choose your pack</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {PACK_TIERS.map(t => {
            const c      = PACK_COSTS[t.rarity]
            const broke  = coins < c
            const active = picked === t.rarity

            // Per-card stranded check — would picking THIS tier strand them?
            const afterBuyCoins  = coins - c
            const afterBuyCards  = roster.length + 1
            const perTierNeeded  = Math.max(0, SQUAD_SIZE - afterBuyCards)
            const tierIsRisky    = !broke && perTierNeeded > 0 && afterBuyCoins < perTierNeeded * PACK_COSTS.bronze

            return (
              <div
                key={t.rarity}
                onClick={() => !broke && setPicked(t.rarity)}
                style={{
                  flex: 1, position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: 10, borderRadius: 14,
                  border: active
                    ? `2px solid ${tierIsRisky ? 'rgba(255,175,0,0.8)' : 'var(--gold-1)'}`
                    : '1px solid var(--line)',
                  background: active ? 'rgba(245,179,39,0.06)' : 'rgba(255,255,255,0.02)',
                  cursor:     broke ? 'not-allowed' : 'pointer',
                  opacity:    broke ? 0.5 : 1,
                  boxShadow:  active ? '0 0 24px var(--gold-glow)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {/* Risky badge */}
                {tierIsRisky && !broke && (
                  <div style={{
                    position:     'absolute',
                    top:          -8, right: -8,
                    background:   'rgba(255,160,0,0.9)',
                    borderRadius: '50%',
                    width:        20, height: 20,
                    display:      'grid', placeItems: 'center',
                    fontSize:     12, fontWeight: 900,
                    zIndex:       1,
                  }}>
                    ⚠
                  </div>
                )}

                {/* Mini pack art */}
                <div className={`pack-art ${t.rarity} pack-art--mini`}>
                  <div className="pack-art__bg" />
                  <div className="pack-art__cuts" />
                  <div className="pack-art__shimmer" />
                  <div className="pack-art__crest">{t.crest}</div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="pack-art__label">{t.label}</div>
                    <div className="pack-art__sub">{t.sub}</div>
                  </div>
                  <div className="pack-art__bars">
                    {Array.from({ length: 8 }).map((_, i) => <span key={i} />)}
                  </div>
                  <div className="pack-art__bottom">FUTBATTLES</div>
                </div>

                <div className="font-display" style={{ fontSize: 18, color: 'var(--ink-0)', letterSpacing: '0.1em' }}>
                  {t.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-2)' }}>
                  {t.range}
                </div>

                {/* Cost pill */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 999,
                  background: broke ? 'rgba(255,71,103,0.1)' : 'rgba(245,179,39,0.1)',
                  border: `1px solid ${broke ? 'rgba(255,71,103,0.3)' : 'rgba(245,179,39,0.3)'}`,
                }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 30%, #fff5b5, #ffd66b 50%, #c8801b 90%)',
                    display: 'inline-block',
                  }} />
                  <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: broke ? 'var(--red-1)' : 'var(--gold-1)' }}>
                    {c.toLocaleString()}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stranded warning — shown when selected pack would leave them unable to complete squad */}
      {isStranded && (
        <div style={{
          display:      'flex',
          gap:          10,
          alignItems:   'flex-start',
          background:   'rgba(255,160,0,0.08)',
          border:       '1px solid rgba(255,160,0,0.35)',
          borderRadius: 10,
          padding:      '10px 14px',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,200,80,0.95)', fontWeight: 700, marginBottom: 2 }}>
              Not enough coins left for a full squad
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              After this purchase you'd only have <strong style={{ color: 'var(--ink-1)' }}>{(coinsAfterBuy).toLocaleString()} coins</strong> — not
              enough to build {stillNeeded} more card{stillNeeded !== 1 ? 's' : ''} (need {(stillNeeded * PACK_COSTS.bronze).toLocaleString()} min).
              Switch to <strong style={{ color: 'var(--gold-1)' }}>Bronze packs</strong> to complete your squad first.
            </div>
          </div>
        </div>
      )}

      <button
        disabled={!canOpen}
        onClick={handleOpen}
        className="btn btn-primary"
        style={{ marginTop: 8, fontSize: 16, padding: '16px 24px' }}
      >
        {!name.trim()  ? 'Enter a name to continue'
         : !canAfford  ? `Need ${(cost - coins).toLocaleString()} more coins`
         : isStranded  ? 'Switch to Bronze — squad not complete'
         : `OPEN ${PACK_TIERS.find(p => p.rarity === picked)!.label} PACK`}
      </button>

      <div className="text-center" style={{ color: 'var(--ink-3)', fontSize: 11 }}>
        Pack opens reveal 8 cards · lock 6 stats · 1 position · 1 cosmetic
      </div>

      {DEV && (
        <button
          onClick={() => addCoins(1000)}
          style={{
            background: 'none', border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
            color: 'var(--ink-3)', fontSize: 10, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em', alignSelf: 'center',
          }}
        >
          [DEV] +1000 coins
        </button>
      )}
    </div>
  )
}
