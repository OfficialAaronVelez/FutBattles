import { useState, useEffect } from 'react'
import type { UserCard, RealPlayer, StatKey, CardCosmetic } from '../../types'
import { STAT_KEYS } from '../../types'
import { getRarityTier } from '../../data/players'
import { playerPortrait } from '../../utils/portrait'
import { getWikiImage } from '../../utils/wikiImage'

// Cosmetic → CSS class
const COSMETIC_CLASS: Record<CardCosmetic, string> = {
  base: '', neon: 'cos-neon', fire: 'cos-fire', ice: 'cos-ice', chrome: 'cos-chrome', shadow: 'cos-shadow',
}
const COSMETIC_EMOJI: Record<CardCosmetic, string> = {
  base: '', neon: '⚡', fire: '🔥', ice: '❄️', chrome: '✨', shadow: '🌑',
}
const COSMETIC_NAME: Record<CardCosmetic, string> = {
  base: 'Base', neon: 'Neon', fire: 'Fire', ice: 'Ice', chrome: 'Chrome', shadow: 'Shadow',
}

function getStatColor(value: number): string {
  if (value >= 90) return '#fff7d4'
  if (value >= 80) return '#ffe0a0'
  if (value >= 70) return '#fff'
  if (value >= 60) return '#e2e8f0'
  return '#9aa1b3'
}

function computeOverall(stats: Partial<Record<StatKey, number>>): number {
  const vals = Object.values(stats).filter((v): v is number => typeof v === 'number')
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
}

function isUserCard(c: UserCard | RealPlayer): c is UserCard {
  return 'createdAt' in c
}

interface FutCardProps {
  card: UserCard | RealPlayer
  size?: 'xs' | 'sm' | 'md' | 'lg'
  highlighted?: StatKey[]
  dimmed?: StatKey[]
  onStatClick?: (stat: StatKey, value: number) => void
  onPositionClick?: () => void
  showPositionButton?: boolean
  positionTaken?: boolean
  onCosmeticClick?: () => void
  cosmeticOffer?: CardCosmetic
  cosmeticTaken?: boolean
  isBonus?: boolean
}

export function FutCard({
  card,
  size = 'md',
  highlighted = [],
  dimmed = [],
  onStatClick,
  onPositionClick,
  showPositionButton = false,
  positionTaken = false,
  onCosmeticClick,
  cosmeticOffer,
  cosmeticTaken = false,
  isBonus = false,
}: FutCardProps) {
  const isUser   = isUserCard(card)
  const name     = card.name || '—'
  const position = isUser ? (card.position ?? '?') : card.position
  const club     = isUser ? '' : (card as RealPlayer).club
  const nation   = isUser ? '' : (card as RealPlayer).nation
  const stats    = card.stats as Partial<Record<StatKey, number>>

  const ovrVal  = isUser ? computeOverall(stats) : (card as RealPlayer).overall
  const rarity  = getRarityTier(ovrVal)
  const userCos: CardCosmetic = isUser ? ((card as UserCard).cosmetic ?? 'base') : 'base'
  const cosClass = COSMETIC_CLASS[userCos]

  // Player portrait — custom upload, Wikipedia for real players, initials SVG fallback
  const customImage = isUser ? (card as UserCard).imageUrl : undefined
  const wikiTitle = isUser ? undefined : (card as RealPlayer).wikiTitle
  const fallback  = playerPortrait(name)
  const [photoSrc, setPhotoSrc] = useState(customImage ?? fallback)

  useEffect(() => {
    let cancelled = false
    if (customImage) {
      setPhotoSrc(customImage)
      return () => { cancelled = true }
    }
    if (wikiTitle) {
      getWikiImage(wikiTitle).then(url => {
        if (!cancelled && url) setPhotoSrc(url)
      })
    } else {
      setPhotoSrc(fallback)
    }
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customImage, wikiTitle, name])

  const classes = [
    'futcard',
    `size-${size}`,
    isBonus ? 'is-bonus' : `rarity-${rarity}`,
    cosClass,
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      <div className="futcard__bg" />
      <div className="futcard__sheen" />
      <div className="futcard__stripe" />
      <img
        className="futcard__photo"
        src={photoSrc}
        alt=""
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = fallback
        }}
      />

      {userCos !== 'base' && (
        <div className="futcard__cos-badge" title={COSMETIC_NAME[userCos]}>
          <span>{COSMETIC_EMOJI[userCos]}</span>
        </div>
      )}

      <div className="futcard__inner">
        <div className="futcard__head">
          <div className="futcard__ovr">
            <div className="futcard__ovr-num">{ovrVal || '—'}</div>
            <div className="futcard__pos">{position}</div>
          </div>
          <div className="futcard__meta">
            <div className="club">{club}</div>
            <div className="nation">{nation}</div>
          </div>
        </div>

        <div className="futcard__portrait-spacer" />

        <div className="futcard__name" title={name}>{name}</div>

        <div className="futcard__stats">
          {STAT_KEYS.map(stat => {
            const value     = stats[stat]
            const isDimmed  = dimmed.includes(stat)
            const isHigh    = highlighted.includes(stat)
            const clickable = !!onStatClick && !isDimmed && value !== undefined
            return (
              <div
                key={stat}
                onClick={() => { if (clickable && value !== undefined) onStatClick(stat, value) }}
                className={[
                  'futcard__stat',
                  isDimmed  ? 'dimmed'      : '',
                  isHigh    ? 'highlighted' : '',
                  clickable ? 'clickable'   : '',
                ].filter(Boolean).join(' ')}
              >
                <span
                  className="futcard__stat-val"
                  style={{ color: value !== undefined ? getStatColor(value) : 'inherit' }}
                >
                  {value ?? '—'}
                </span>
                <span className="futcard__stat-key">{stat}</span>
              </div>
            )
          })}
        </div>

        {/* Position button */}
        {showPositionButton && (
          positionTaken ? (
            <div className="futcard__slotbtn futcard__slotbtn--pos" style={{ opacity: 0.6, cursor: 'default' }}>
              <span>✓ Position Taken</span>
              <span>{position}</span>
            </div>
          ) : onPositionClick ? (
            <>
              <button className="futcard__slotbtn futcard__slotbtn--pos" onClick={onPositionClick}>
                <span>+ Take Position</span>
                <span>{position}</span>
              </button>
              {/* Chemistry hint — visible when card is a RealPlayer with club/nation */}
              {!isUserCard(card) && (
                <div style={{
                  marginTop: 4, fontSize: 9, color: 'rgba(68,255,158,0.6)',
                  letterSpacing: '0.06em', textAlign: 'center', lineHeight: 1.3,
                }}>
                  +CHEM · {card.club} · {card.nation}
                </div>
              )}
            </>
          ) : null
        )}

        {/* Cosmetic button */}
        {cosmeticOffer && (
          cosmeticTaken ? (
            <div className="futcard__slotbtn futcard__slotbtn--cos" style={{ opacity: 0.6, cursor: 'default' }}>
              <span>✓ Cosmetic Taken</span>
              <span>{COSMETIC_EMOJI[cosmeticOffer]}</span>
            </div>
          ) : onCosmeticClick ? (
            <button className="futcard__slotbtn futcard__slotbtn--cos" onClick={onCosmeticClick}>
              <span>+ Take {COSMETIC_NAME[cosmeticOffer]}</span>
              <span>{COSMETIC_EMOJI[cosmeticOffer]}</span>
            </button>
          ) : null
        )}
      </div>
    </div>
  )
}
