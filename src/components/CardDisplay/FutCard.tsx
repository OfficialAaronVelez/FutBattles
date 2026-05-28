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

function getStatColor(value: number, isChrome = false): string {
  if (isChrome) {
    if (value >= 90) return '#7a4f00'
    if (value >= 80) return '#4a3400'
    if (value >= 70) return '#1a2030'
    if (value >= 60) return '#3a3a3a'
    return '#5a5a6a'
  }
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
  showStats?: boolean
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
  showStats = false,
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

  // Stats mode: explicit prop OR when battle-context props are provided
  const effectiveShowStats = showStats || highlighted.length > 0 || dimmed.length > 0 || !!onStatClick

  // Player portrait
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
    effectiveShowStats ? 'futcard--stats' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      <div className="futcard__bg" />
      <div className="futcard__frame" />
      <div className="futcard__sheen" />
      <div className="futcard__stripe" />

      {/* Large OVR watermark behind the photo (Panini mode only) */}
      {!effectiveShowStats && (
        <div className="futcard__ovr-bg">{ovrVal || ''}</div>
      )}

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

      {effectiveShowStats ? (
        /* ── Stats layout (battle / team-selection) ── */
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
                    style={{ color: value !== undefined ? getStatColor(value, userCos === 'chrome') : 'inherit' }}
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
                <span>Position Taken</span>
                <span>{position}</span>
              </div>
            ) : onPositionClick ? (
              <>
                <button className="futcard__slotbtn futcard__slotbtn--pos" onClick={onPositionClick}>
                  <span>+ Take Position</span>
                  <span>{position}</span>
                </button>
                {!isUserCard(card) && (
                  <div style={{
                    marginTop: 4, fontSize: 9, color: 'rgba(68,255,158,0.6)',
                    letterSpacing: '0.06em', textAlign: 'center', lineHeight: 1.3,
                  }}>
                    +CHEM {card.club} {card.nation}
                  </div>
                )}
              </>
            ) : null
          )}

          {/* Cosmetic button */}
          {cosmeticOffer && (
            cosmeticTaken ? (
              <div className="futcard__slotbtn futcard__slotbtn--cos" style={{ opacity: 0.6, cursor: 'default' }}>
                <span>Cosmetic Taken</span>
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
      ) : (
        /* ── Panini sticker layout (collection / default) ── */
        <>
          {/* OVR + Position badge (top-left) */}
          <div className="futcard__badge">
            <div className="futcard__badge-ovr">{ovrVal || '—'}</div>
            <div className="futcard__badge-pos">{position}</div>
          </div>

          {/* Bottom info band */}
          <div className="futcard__band">
            <div className="futcard__band-name" title={name}>{name}</div>
            {(club || nation) && (
              <div className="futcard__band-sub">
                {club && <span className="futcard__band-item">{club}</span>}
                {club && nation && <span className="futcard__band-dot" />}
                {nation && <span className="futcard__band-item">{nation}</span>}
              </div>
            )}

            {/* Slot buttons inside band area */}
            {showPositionButton && (
              positionTaken ? (
                <div className="futcard__slotbtn futcard__slotbtn--pos" style={{ opacity: 0.6, cursor: 'default' }}>
                  <span>Position Taken</span>
                  <span>{position}</span>
                </div>
              ) : onPositionClick ? (
                <button className="futcard__slotbtn futcard__slotbtn--pos" onClick={onPositionClick}>
                  <span>+ Take Position</span>
                  <span>{position}</span>
                </button>
              ) : null
            )}

            {cosmeticOffer && (
              cosmeticTaken ? (
                <div className="futcard__slotbtn futcard__slotbtn--cos" style={{ opacity: 0.6, cursor: 'default' }}>
                  <span>Cosmetic Taken</span>
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
        </>
      )}
    </div>
  )
}
