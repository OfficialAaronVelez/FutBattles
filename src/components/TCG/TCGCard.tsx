// ─────────────────────────────────────────────────────────────────────────────
//  FutBattles  ·  Soccer TCG  ·  Card Renderer
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import type {
  TCGCard, TCGPlayerCard, TCGManagerCard, TCGStadiumCard, TCGAspect,
} from '../../types/tcg'
import { ASPECT_COLORS } from '../../types/tcg'

// ── Aspect Pip ────────────────────────────────────────────────────────────────
function AspectPip({ aspect, size = 16 }: { aspect: TCGAspect; size?: number }) {
  const c = ASPECT_COLORS[aspect]
  const ICONS: Record<TCGAspect, string> = {
    'Pressing':   '⚡',
    'Precision':  '🎯',
    'Physical':   '💪',
    'Tactical':   '♟️',
    'Star Power': '⭐',
    'Pace':       '🏃',
  }
  return (
    <div title={aspect} style={{
      width: size, height: size, borderRadius: '50%',
      background: c.bg,
      boxShadow: `0 0 ${size * 0.5}px ${c.glow}`,
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.55, lineHeight: 1,
      flexShrink: 0,
    }}>
      {ICONS[aspect]}
    </div>
  )
}

// ── Cost Orb ─────────────────────────────────────────────────────────────────
function CostOrb({ cost, primaryAspect }: { cost: number; primaryAspect: TCGAspect }) {
  const c = ASPECT_COLORS[primaryAspect]
  return (
    <div style={{
      position: 'absolute', top: 8, left: 8, zIndex: 4,
      width: 28, height: 28, borderRadius: '50%',
      background: `radial-gradient(circle at 35% 35%, ${c.text}, ${c.bg})`,
      boxShadow: `0 0 10px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--font-display)', fontSize: 14,
      color: '#fff', fontWeight: 900,
      border: `2px solid ${c.text}`,
    }}>
      {cost}
    </div>
  )
}

// ── Rarity bar accent ─────────────────────────────────────────────────────────
const RARITY_COLORS: Record<string, string> = {
  Common:    '#7d87a3',
  Uncommon:  '#44ff9e',
  Rare:      '#4488ff',
  Legendary: '#ffd66b',
}

// ── Stat Bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, value, max = 12, color }: { label: string; value: number; max?: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9 }}>
      <div style={{ width: 24, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textAlign: 'right', flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: `${(value / max) * 100}%`, height: '100%',
          background: color, borderRadius: 2,
          boxShadow: `0 0 4px ${color}`,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <div style={{ width: 16, textAlign: 'right', color: 'var(--ink-0)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>
        {value}
      </div>
    </div>
  )
}

// ── HP Pips ───────────────────────────────────────────────────────────────────
function HpPips({ hp, max }: { hp: number; max: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: 1,
          background: i < hp ? '#ff4767' : 'rgba(255,255,255,0.10)',
          boxShadow: i < hp ? '0 0 3px rgba(255,71,103,0.6)' : 'none',
        }} />
      ))}
    </div>
  )
}

// ── Card-type badge line ──────────────────────────────────────────────────────
function typeLine(card: TCGCard): string {
  if (card.type === 'Player') {
    const p = card as TCGPlayerCard
    return `Player · ${p.position} · ${p.nationality}`
  }
  if (card.type === 'Manager') return `Manager · ${(card as TCGManagerCard).nationality}`
  if (card.type === 'Stadium') return `Stadium · Cap ${(card as TCGStadiumCard).capacity}`
  return card.type
}

// ── Art area background gradient ──────────────────────────────────────────────
function artGradient(card: TCGCard): string {
  const [a1, a2] = card.aspects
  const c1 = ASPECT_COLORS[a1]
  const c2 = a2 ? ASPECT_COLORS[a2] : null
  if (c2) return `linear-gradient(145deg, ${c1.bg}cc 0%, ${c2.bg}cc 100%)`
  return `linear-gradient(145deg, ${c1.bg}dd 0%, rgba(0,0,0,0.6) 100%)`
}

// ── Card frame gradient ───────────────────────────────────────────────────────
function frameGradient(card: TCGCard): string {
  const [a1, a2] = card.aspects
  const c1 = ASPECT_COLORS[a1]
  const c2 = a2 ? ASPECT_COLORS[a2] : null
  if (c2) return `linear-gradient(160deg, ${c1.bg}55 0%, #0a0f1c 50%, ${c2.bg}55 100%)`
  return `linear-gradient(160deg, ${c1.bg}44 0%, #0a0f1c 100%)`
}

// ── Shine overlay ─────────────────────────────────────────────────────────────
function ShineOverlay({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 12, zIndex: 3,
      background: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0) 55%, rgba(255,255,255,0.06) 100%)',
      opacity: visible ? 1 : 0, transition: 'opacity 0.2s',
      pointerEvents: 'none',
    }} />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main TCGCard component
// ─────────────────────────────────────────────────────────────────────────────

interface TCGCardProps {
  card: TCGCard
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  selected?: boolean
}

const SIZES = {
  sm: { w: 140, h: 196, artH: 72, nameSz: 11, subSz: 8, bodySz: 8 },
  md: { w: 180, h: 252, artH: 96, nameSz: 13, subSz: 9, bodySz: 9 },
  lg: { w: 240, h: 336, artH: 128, nameSz: 16, subSz: 10, bodySz: 10 },
}

export function TCGCard({ card, size = 'md', onClick, selected }: TCGCardProps) {
  const [hovered, setHovered] = useState(false)
  const s = SIZES[size]
  const primaryAspect = card.aspects[0]
  const accent = ASPECT_COLORS[primaryAspect]
  const rarityColor = RARITY_COLORS[card.rarity]

  const isPlayer  = card.type === 'Player'
  const isManager = card.type === 'Manager'
  const isStadium = card.type === 'Stadium'

  const p  = isPlayer  ? (card as TCGPlayerCard)  : null
  const st = isStadium ? (card as TCGStadiumCard) : null

  const elevated = hovered || !!selected

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: s.w, height: s.h,
        borderRadius: 12,
        background: frameGradient(card),
        border: selected
          ? `2px solid ${accent.text}`
          : `1px solid ${elevated ? accent.text + '88' : 'rgba(255,255,255,0.12)'}`,
        boxShadow: elevated
          ? `0 8px 32px ${accent.glow}, 0 0 0 1px ${accent.text}44`
          : '0 4px 12px rgba(0,0,0,0.5)',
        cursor: onClick ? 'pointer' : 'default',
        transform: elevated ? 'translateY(-3px) scale(1.02)' : 'none',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <ShineOverlay visible={elevated} />

      {/* Cost orb (not shown for Manager/Stadium) */}
      {card.type !== 'Manager' && card.type !== 'Stadium' && (
        <CostOrb cost={card.cost} primaryAspect={primaryAspect} />
      )}

      {/* Rarity indicator (top-right) */}
      <div style={{
        position: 'absolute', top: 8, right: 8, zIndex: 4,
        width: 8, height: 8, borderRadius: '50%',
        background: rarityColor,
        boxShadow: `0 0 6px ${rarityColor}`,
      }} />

      {/* ── Art Area ── */}
      <div style={{
        height: s.artH, flexShrink: 0,
        background: artGradient(card),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Stadium HP badge */}
        {isStadium && st && (
          <div style={{
            position: 'absolute', bottom: 6, left: 8,
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6, padding: '2px 6px',
            fontSize: 9, fontFamily: 'var(--font-mono)', color: '#ff4767',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ❤️ {st.hp}
          </div>
        )}
        {/* Manager badge */}
        {isManager && (
          <div style={{
            position: 'absolute', top: 4, left: 0, right: 0,
            textAlign: 'center', fontSize: 8, letterSpacing: '0.15em',
            fontFamily: 'var(--font-display)', color: accent.text,
            opacity: 0.9, textTransform: 'uppercase',
          }}>
            ⬡ MANAGER ⬡
          </div>
        )}

        {/* Central emoji art */}
        <div style={{ fontSize: s.artH * 0.45, lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>
          {card.emoji}
        </div>

        {/* HP pips for Player */}
        {isPlayer && p && (
          <div style={{ position: 'absolute', bottom: 5, right: 5 }}>
            <HpPips hp={p.hp} max={p.hp} />
          </div>
        )}

        {/* Aspect gradient shine at bottom of art */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Name band ── */}
      <div style={{
        padding: '6px 8px 4px',
        background: `linear-gradient(90deg, ${accent.bg}44, transparent)`,
        borderTop: `1px solid ${accent.text}33`,
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: s.nameSz,
          color: 'var(--ink-0)', letterSpacing: '0.04em',
          lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {card.name}
        </div>
        <div style={{ fontSize: s.subSz - 1, color: 'var(--ink-3)', marginTop: 2, letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {typeLine(card)}
        </div>
      </div>

      {/* ── Stats (Player only) ── */}
      {isPlayer && p && (
        <div style={{ padding: '5px 8px 3px', display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
          <StatBar label="ATK" value={p.atk} color={accent.text} />
          <StatBar label="DEF" value={p.def} color="#4488ff" />
        </div>
      )}

      {/* ── Body (ability text) ── */}
      <div style={{
        flex: 1, padding: '4px 8px 6px',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize: s.bodySz, color: 'var(--ink-1)', lineHeight: 1.4,
          overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: isManager ? 3 : 4, WebkitBoxOrient: 'vertical',
        }}>
          {/* Bolded keyword */}
          {(() => {
            const text = card.ability
            const colonIdx = text.indexOf('—')
            if (colonIdx > 0 && colonIdx < 30) {
              return (
                <>
                  <span style={{ fontWeight: 800, color: accent.text }}>{text.slice(0, colonIdx + 1)}</span>
                  <span>{text.slice(colonIdx + 1)}</span>
                </>
              )
            }
            return text
          })()}
        </div>

        {card.flavorText && size !== 'sm' && (
          <div style={{ fontSize: s.bodySz - 1, color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.3, marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {card.flavorText}
          </div>
        )}
      </div>

      {/* ── Footer (aspects + set info) ── */}
      <div style={{
        padding: '4px 8px 6px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {card.aspects.map(a => <AspectPip key={a} aspect={a} size={size === 'sm' ? 13 : 16} />)}
        </div>
        <div style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
          {card.setCode} · {String(card.cardNumber).padStart(3, '0')} · {card.rarity[0]}
        </div>
      </div>
    </div>
  )
}

// ── TCGCard Expanded Modal ────────────────────────────────────────────────────

export function TCGCardModal({ card, onClose }: { card: TCGCard; onClose: () => void }) {
  const accent = ASPECT_COLORS[card.aspects[0]]
  const isPlayer  = card.type === 'Player'
  const isManager = card.type === 'Manager'
  const isStadium = card.type === 'Stadium'
  const p  = isPlayer  ? (card as TCGPlayerCard)  : null
  const m  = isManager ? (card as TCGManagerCard)  : null
  const st = isStadium ? (card as TCGStadiumCard)  : null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, backdropFilter: 'blur(6px)',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', maxWidth: 640, width: '100%' }}>
        {/* Large card */}
        <div style={{ flexShrink: 0 }}>
          <TCGCard card={card} size="lg" />
        </div>

        {/* Detail panel */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: 16,
          background: 'var(--bg-1)', border: `1px solid ${accent.text}44`,
          borderRadius: 16, padding: 20, minWidth: 0,
        }}>
          {/* Header */}
          <div>
            <div style={{ fontSize: 8, letterSpacing: '0.15em', color: accent.text, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              {card.setCode} · CARD {String(card.cardNumber).padStart(3, '0')}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink-0)', letterSpacing: '0.04em', lineHeight: 1 }}>
              {card.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 4 }}>{typeLine(card)}</div>
          </div>

          {/* Aspects */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {card.aspects.map(a => (
              <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: `1px solid ${ASPECT_COLORS[a].text}44`, borderRadius: 8, padding: '4px 10px' }}>
                <AspectPip aspect={a} size={14} />
                <span style={{ fontSize: 10, color: ASPECT_COLORS[a].text, fontWeight: 700, letterSpacing: '0.06em' }}>{a}</span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: RARITY_COLORS[card.rarity], letterSpacing: '0.08em' }}>
              {card.rarity.toUpperCase()}
            </div>
          </div>

          {/* Stats (Player) */}
          {p && (
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'ATK', val: p.atk, color: accent.text },
                { label: 'DEF', val: p.def, color: '#4488ff' },
                { label: 'HP',  val: p.hp,  color: '#ff4767' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.1em', marginTop: 2 }}>{label}</div>
                </div>
              ))}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--ink-0)', lineHeight: 1 }}>{card.cost}</div>
                <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.1em', marginTop: 2 }}>COST</div>
              </div>
            </div>
          )}

          {/* Stadium HP */}
          {st && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#ff4767', lineHeight: 1 }}>{st.hp}</div>
                <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.1em', marginTop: 2 }}>STADIUM HP</div>
              </div>
            </div>
          )}

          {/* Ability */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.12em', color: 'var(--ink-3)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
              {isManager ? 'LEADER ABILITY' : isStadium ? 'PASSIVE' : 'ABILITY'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-0)', lineHeight: 1.55 }}>
              {isManager ? m!.leaderAbility : isStadium ? st!.passiveAbility : card.ability}
            </div>
          </div>

          {/* Epic Action (Manager only) */}
          {m && (
            <div style={{ background: `${accent.bg}22`, border: `1px solid ${accent.text}44`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 8, letterSpacing: '0.12em', color: accent.text, marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
                ✦ EPIC ACTION (once per game)
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-0)', lineHeight: 1.55 }}>
                {m.epicAction}
              </div>
            </div>
          )}

          {/* Flavor text */}
          {card.flavorText && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.5, borderLeft: `2px solid ${accent.text}44`, paddingLeft: 10 }}>
              {card.flavorText}
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              marginTop: 4, padding: '8px 0',
              border: '1px solid var(--line)', borderRadius: 8,
              background: 'transparent', color: 'var(--ink-3)',
              fontSize: 10, letterSpacing: '0.12em', fontFamily: 'var(--font-display)',
              cursor: 'pointer',
            }}
          >
            CLOSE ✕
          </button>
        </div>
      </div>
    </div>
  )
}
