// ─────────────────────────────────────────────────────────────────────────────
//  FutBattles  ·  Soccer TCG  ·  Studio  ·  Card gallery + set browser
//  Access restricted to: aaronvelezcoronado@gmail.com
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import type { TCGCard, TCGAspect, TCGCardType } from '../../types/tcg'
import { TCG_ASPECTS, TCG_CARD_TYPES, ASPECT_COLORS } from '../../types/tcg'
import { TCG_CARDS } from '../../data/tcgCards'
import { TCGCard as TCGCardView, TCGCardModal } from './TCGCard'
import { TCGBattle } from './TCGBattle'

// ── Filter state ──────────────────────────────────────────────────────────────
interface Filters {
  search: string
  type: TCGCardType | 'All'
  aspect: TCGAspect | 'All'
  rarity: string
  maxCost: number
}

const RARITIES = ['All', 'Common', 'Uncommon', 'Rare', 'Legendary']

function FilterPill({ active, label, color, onClick }: { active: boolean; label: string; color?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 20, fontSize: 10,
        fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
        border: active ? `1px solid ${color ?? 'var(--gold-1)'}` : '1px solid var(--line)',
        background: active ? `${color ?? 'var(--gold-1)'}22` : 'transparent',
        color: active ? (color ?? 'var(--gold-1)') : 'var(--ink-3)',
        cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
      }}
    >
      {label}
    </button>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ cards }: { cards: TCGCard[] }) {
  const counts = useMemo(() => {
    const byType: Record<string, number> = {}
    const byAspect: Record<string, number> = {}
    for (const c of cards) {
      byType[c.type] = (byType[c.type] ?? 0) + 1
      for (const a of c.aspects) byAspect[a] = (byAspect[a] ?? 0) + 1
    }
    return { byType, byAspect }
  }, [cards])

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {Object.entries(counts.byType).map(([type, n]) => (
        <div key={type} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)',
          borderRadius: 8, padding: '3px 8px', fontSize: 10, color: 'var(--ink-1)',
        }}>
          <span>{n}</span>
          <span style={{ color: 'var(--ink-3)' }}>{type}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main Studio component ─────────────────────────────────────────────────────
export function TCGStudio() {
  const [mode, setMode] = useState<'gallery' | 'battle'>('gallery')
  const [filters, setFilters] = useState<Filters>({
    search: '', type: 'All', aspect: 'All', rarity: 'All', maxCost: 10,
  })
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  if (mode === 'battle') {
    return <TCGBattle onExit={() => setMode('gallery')} />
  }

  const filtered = useMemo(() => {
    return TCG_CARDS.filter(c => {
      if (filters.type !== 'All' && c.type !== filters.type) return false
      if (filters.aspect !== 'All' && !c.aspects.includes(filters.aspect as TCGAspect)) return false
      if (filters.rarity !== 'All' && c.rarity !== filters.rarity) return false
      if (c.cost > filters.maxCost) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!c.name.toLowerCase().includes(q) && !c.ability.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [filters])

  const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters(f => ({ ...f, [key]: val }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* ── Header ── */}
      <div style={{
        padding: '20px 20px 0',
        background: 'linear-gradient(180deg, rgba(100,20,200,0.12), transparent)',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #6020b8, #b96bff)',
                display: 'grid', placeItems: 'center',
                boxShadow: '0 0 14px rgba(185,107,255,0.5)',
                fontSize: 18,
              }}>
                ♟️
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink-0)', letterSpacing: '0.06em', lineHeight: 1 }}>
                  TCG STUDIO
                </div>
                <div style={{ fontSize: 9, color: 'var(--purple-1)', letterSpacing: '0.14em', marginTop: 2 }}>
                  FB-01 · KICK OFF · {TCG_CARDS.length} CARDS
                </div>
              </div>
            </div>
          </div>

          {/* View toggle + Battle button */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => setMode('battle')}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 11,
                fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
                border: '1px solid rgba(255,71,103,0.6)',
                background: 'rgba(255,71,103,0.12)',
                color: 'var(--red-0)', cursor: 'pointer',
                boxShadow: '0 0 10px rgba(255,71,103,0.2)',
              }}
            >
              ⚔️ BATTLE
            </button>
            {(['grid', 'list'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                padding: '6px 10px', borderRadius: 6, fontSize: 11,
                border: viewMode === m ? '1px solid var(--purple-1)' : '1px solid var(--line)',
                background: viewMode === m ? 'rgba(185,107,255,0.15)' : 'transparent',
                color: viewMode === m ? 'var(--purple-1)' : 'var(--ink-3)',
                cursor: 'pointer',
              }}>
                {m === 'grid' ? '⊞' : '☰'}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 14, pointerEvents: 'none' }}>
            🔍
          </div>
          <input
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            placeholder="Search cards by name or ability..."
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 12px 9px 36px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)',
              borderRadius: 10, color: 'var(--ink-0)', fontSize: 12,
              outline: 'none', fontFamily: 'var(--font-body)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--purple-1)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--line)')}
          />
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
          <FilterPill active={filters.type === 'All'} label="ALL" onClick={() => setFilter('type', 'All')} />
          {TCG_CARD_TYPES.map(t => (
            <FilterPill key={t} active={filters.type === t} label={t.toUpperCase()}
              onClick={() => setFilter('type', filters.type === t ? 'All' : t)} />
          ))}
        </div>

        {/* Aspect filter */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          <FilterPill active={filters.aspect === 'All'} label="ALL STYLES" onClick={() => setFilter('aspect', 'All')} />
          {TCG_ASPECTS.map(a => (
            <FilterPill
              key={a} active={filters.aspect === a} label={a.toUpperCase()}
              color={ASPECT_COLORS[a].text}
              onClick={() => setFilter('aspect', filters.aspect === a ? 'All' : a)}
            />
          ))}
        </div>

        {/* Rarity + Cost row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {RARITIES.map(r => (
              <FilterPill
                key={r} active={filters.rarity === r} label={r.toUpperCase()}
                color={r === 'Legendary' ? '#ffd66b' : r === 'Rare' ? '#4488ff' : r === 'Uncommon' ? '#44ff9e' : undefined}
                onClick={() => setFilter('rarity', filters.rarity === r ? 'All' : r)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>MAX COST</span>
            <input
              type="range" min={0} max={10} value={filters.maxCost}
              onChange={e => setFilter('maxCost', Number(e.target.value))}
              style={{ width: 80, accentColor: 'var(--purple-1)' }}
            />
            <span style={{ width: 14, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-0)', textAlign: 'right', flexShrink: 0 }}>
              {filters.maxCost}
            </span>
          </div>
        </div>
      </div>

      {/* ── Results bar ── */}
      <div style={{
        padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ fontSize: 10, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--purple-1)', fontWeight: 700 }}>{filtered.length}</span>
          <span style={{ color: 'var(--ink-3)' }}> / {TCG_CARDS.length} cards</span>
        </div>
        <StatsBar cards={filtered} />
      </div>

      {/* ── Card grid / list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-3)', fontSize: 12 }}>
            No cards match your filters
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 16,
            justifyContent: 'flex-start',
          }}>
            {filtered.map(card => (
              <TCGCardView
                key={card.id} card={card} size="md"
                onClick={() => setSelectedCard(card)}
                selected={selectedCard?.id === card.id}
              />
            ))}
          </div>
        ) : (
          /* List view */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(card => {
              const accent = ASPECT_COLORS[card.aspects[0]]
              const isPlayer = card.type === 'Player'
              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = accent.text + '66'
                    e.currentTarget.style.background = `${accent.bg}18`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--line)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }}
                >
                  {/* Cost */}
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: accent.bg, border: `1px solid ${accent.text}66`,
                    display: 'grid', placeItems: 'center',
                    fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--ink-0)',
                  }}>
                    {card.type === 'Manager' || card.type === 'Stadium' ? '—' : card.cost}
                  </div>

                  {/* Emoji */}
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0 }}>{card.emoji}</div>

                  {/* Name + type */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {card.name}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2, letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {card.type}{isPlayer ? ` · ${(card as import('../../types/tcg').TCGPlayerCard).position}` : ''} · {card.rarity}
                    </div>
                  </div>

                  {/* Player stats */}
                  {isPlayer && (() => {
                    const p = card as import('../../types/tcg').TCGPlayerCard
                    return (
                      <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: accent.text }}>{p.atk}</div>
                          <div style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>ATK</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#4488ff' }}>{p.def}</div>
                          <div style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>DEF</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#ff4767' }}>{p.hp}</div>
                          <div style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>HP</div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Aspects */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {card.aspects.map(a => (
                      <div key={a} style={{
                        width: 16, height: 16, borderRadius: '50%',
                        background: ASPECT_COLORS[a].bg,
                        boxShadow: `0 0 6px ${ASPECT_COLORS[a].glow}`,
                        display: 'grid', placeItems: 'center', fontSize: 9,
                      }}>
                        {{'Pressing':'⚡','Precision':'🎯','Physical':'💪','Tactical':'♟️','Star Power':'⭐','Pace':'🏃'}[a]}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Expanded card modal ── */}
      {selectedCard && (
        <TCGCardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  )
}
