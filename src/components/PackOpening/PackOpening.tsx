import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { STAT_KEYS } from '../../types'
import type { StatKey, Position, CardCosmetic, LockedSlot, LockedPosition } from '../../types'
import { FutCard } from '../CardDisplay/FutCard'
import { CardBuilder } from './CardBuilder'
import { PackSelector } from './PackSelector'
import { CardReveal } from './CardReveal'
import { PackIntro } from './PackIntro'
import { CosmeticOfferPreview, buildForgePreviewCard } from './CosmeticOfferPreview'
import { MiniGame } from './MiniGames'
import { applyStatBonus } from '../../utils/forgeStats'

export function PackOpening() {
  const { packSession } = useGameStore()
  if (!packSession)                       return <PackSelector />
  if (packSession.phase === 'intro')      return <PackIntroWrapper />
  if (packSession.phase === 'opening')    return <PackOpeningSession />
  return <PackSelector />
}

function PackIntroWrapper() {
  const { packSession, advanceToOpening, cancelPackOpening } = useGameStore()
  if (!packSession) return null
  return (
    <PackIntro
      rarity={packSession.rarity}
      playerName={packSession.playerName}
      costPaid={packSession.costPaid}
      onOpen={advanceToOpening}
      onCancel={cancelPackOpening}
    />
  )
}

interface BoomState {
  stat:       StatKey
  fromPlayer: string
  original:   number
  boosted:    number
}

function PackOpeningSession() {
  const [isRevealed, setIsRevealed]   = useState(false)
  const [boom, setBoom]               = useState<BoomState | null>(null)
  const [pendingStat, setPendingStat] = useState<{ stat: StatKey; value: number } | null>(null)
  const {
    packSession,
    selectStat, selectPosition, selectCosmetic,
    replaceStat, finalizeCard,
  } = useGameStore()

  if (!packSession) return null

  const {
    packCards, currentCardIndex, lockedStats,
    lockedPosition, lockedCosmetic, playerName, rarity,
  } = packSession

  const isDone = currentCardIndex >= packCards.length

  if (isDone) {
    return (
      <div className="pack-forge-final">
        <div className="pack-forge-final__header">
          <div className="eyebrow" style={{ color: 'var(--gold-1)', fontSize: 8 }}>PACK COMPLETE</div>
          <h1 className="font-display pack-forge-final__title">MEET YOUR LEGEND</h1>
        </div>
        <CardBuilder
          playerName={playerName}
          lockedStats={lockedStats}
          lockedPosition={lockedPosition}
          lockedCosmetic={lockedCosmetic}
          onFinalize={finalizeCard}
        />
      </div>
    )
  }

  const { realPlayer, isBonus, cosmeticOffer } = packCards[currentCardIndex]

  const lockedStatKeys  = Object.keys(lockedStats) as StatKey[]
  const allStatsFilled  = STAT_KEYS.every(s => lockedStatKeys.includes(s))
  const positionFilled  = !!lockedPosition
  const cosmeticFilled  = !!lockedCosmetic
  const progress        = lockedStatKeys.length + (positionFilled ? 1 : 0)

  const dimmedStats: StatKey[] = isBonus ? [] : lockedStatKeys
  const canSelectPosition      = !positionFilled && !isBonus
  const canSelectCosmetic      = !cosmeticFilled && !!cosmeticOffer && !isBonus

  // True when this is the last card that CAN offer a position and none has been taken yet.
  const isLastPositionChance = !positionFilled && !isBonus
    && packCards.slice(currentCardIndex + 1).every(c => c.isBonus)

  // Preview stats for left sidebar
  const yourCardPreview = (
    <ForgeCardPreview
      playerName={playerName}
      lockedStats={lockedStats}
      lockedPosition={lockedPosition}
      lockedCosmetic={lockedCosmetic}
      progress={progress}
    />
  )

  const forgeTopBar = (
    <div className="pack-forge-topbar">
      <div className="pack-forge-topbar__row">
        <div>
          <div className="eyebrow" style={{ color: 'var(--ink-3)', fontSize: 8 }}>FORGING</div>
          <div className="pack-forge-topbar__name">{playerName}</div>
        </div>
        <div className="pack-forge-topbar__meta">
          <div><strong>{progress}/7</strong> slots · card {currentCardIndex + 1}/{packCards.length}</div>
          {lockedCosmetic && <div>Cosmetic ✓</div>}
        </div>
      </div>
      <div className="progress" style={{ height: 6 }}>
        <div className="progress__fill" style={{ width: `${(progress / 7) * 100}%` }} />
      </div>
    </div>
  )

  // When all 6 stats are already filled (overflow non-bonus rounds), treat as replace
  const shouldReplace = isBonus || allStatsFilled

  function handleSelectStat(stat: StatKey, value: number) {
    if (!shouldReplace && lockedStatKeys.includes(stat)) return

    // BOOM: 15% chance of a +4 boost (non-bonus / non-overflow cards only)
    const isBoom   = !shouldReplace && Math.random() < 0.15
    const finalVal = isBoom ? applyStatBonus(value, 4) : value

    if (isBoom) {
      setBoom({ stat, fromPlayer: realPlayer.name, original: value, boosted: finalVal })
      setTimeout(() => {
        setBoom(null)
        setIsRevealed(false)
        setPendingStat(null)
        selectStat(stat, finalVal, realPlayer.name)
      }, 1900)
    } else {
      setIsRevealed(false)
      setPendingStat(null)
      if (shouldReplace) replaceStat(stat, finalVal, realPlayer.name)
      else               selectStat(stat, finalVal, realPlayer.name)
    }
  }

  function handleSelectPosition() {
    selectPosition(realPlayer.position as Position, realPlayer.name)
  }

  function handleSelectCosmetic(cosmetic: CardCosmetic) {
    selectCosmetic(cosmetic)
  }



  // ── MINI-GAME phase (revealed but no pending stat yet) ───────────────────
  if (isRevealed && !pendingStat) {
    const gameType = packSession.miniGames[currentCardIndex] ?? 'normal'
    return (
      <div className="pack-forge-session">
        {forgeTopBar}
        <div className="pack-forge-layout">
          {yourCardPreview}
          <div className="pack-forge-game">
            <MiniGame
              type={gameType}
              card={realPlayer}
              takenStats={shouldReplace ? [] : lockedStatKeys}
              onComplete={(stat, value) => setPendingStat({ stat, value })}
              compact
            />
          </div>
        </div>
      </div>
    )
  }

  // ── RESULT phase (mini-game done, pendingStat set) ────────────────────────
  if (isRevealed && pendingStat) {
    const pendingCardPreview = (
      <ForgeCardPreview
        playerName={playerName}
        lockedStats={lockedStats}
        lockedPosition={lockedPosition}
        lockedCosmetic={lockedCosmetic}
        progress={progress}
        pendingStat={pendingStat}
      />
    )

    return (
      <div className="pack-forge-session">
        {forgeTopBar}
        <div className="pack-forge-layout">
          {pendingCardPreview}
          <div className="pack-forge-game">
            <div className="pack-forge-result">
              <div style={{ textAlign: 'center' }}>
                <div className="eyebrow" style={{ color: 'var(--gold-1)', marginBottom: 4, fontSize: 9 }}>STAT EARNED</div>
                <div className="pack-forge-result__stat">⚡ {pendingStat.stat} {pendingStat.value}</div>
                <div className="pack-forge-result__from">from {realPlayer.name}</div>
              </div>

              <div className="pack-forge-result__actions">
                {canSelectPosition && !positionFilled && (
                  <button
                    onClick={handleSelectPosition}
                    style={{
                      width: '100%', padding: '8px 0',
                      background: 'rgba(37,224,255,0.1)', border: '1px solid #25e0ff',
                      borderRadius: 10, color: '#25e0ff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    }}
                  >
                    + Take {realPlayer.position} position
                  </button>
                )}
                {canSelectCosmetic && cosmeticOffer && (
                  <CosmeticOfferPreview
                    cosmetic={cosmeticOffer}
                    previewCard={buildForgePreviewCard(
                      playerName,
                      lockedStats,
                      lockedPosition,
                      lockedCosmetic,
                      pendingStat,
                    )}
                    taken={cosmeticFilled}
                    onTake={() => handleSelectCosmetic(cosmeticOffer)}
                  />
                )}

                {isLastPositionChance && !positionFilled ? (
                  <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,200,80,0.9)', fontWeight: 700 }}>
                    ⚠️ Last chance for a position — take it above to continue
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelectStat(pendingStat.stat, pendingStat.value)}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: 14, padding: '10px 0' }}
                  >
                    Continue →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── PRE-REVEAL phase (face-down card) ────────────────────────────────────
  return (
    <div className="pack-forge-session">
      {forgeTopBar}
      <div className="pack-forge-layout">
        {yourCardPreview}
        <div className="pack-forge-game">
          {isBonus && (
            <div className="pack-forge-bonus">⚡ BONUS — Replace any stat or skip</div>
          )}
          <div className="pack-forge-reveal">
            <div className="pack-forge-reveal__label pack-forge-reveal__label--cyan">FROM PACK</div>
            <div className="pack-forge-reveal__scaler">
              <CardReveal
                key={currentCardIndex}
                isRevealed={isRevealed}
                onReveal={() => setIsRevealed(true)}
                rarity={rarity}
                cardIndex={currentCardIndex}
                totalCards={packCards.length}
              >
                <FutCard
                  card={realPlayer}
                  size="lg"
                  dimmed={dimmedStats}
                  isBonus={isBonus}
                  showPositionButton={false}
                  onPositionClick={undefined}
                  positionTaken={positionFilled}
                  cosmeticOffer={undefined}
                  onCosmeticClick={undefined}
                  cosmeticTaken={cosmeticFilled}
                />
              </CardReveal>
            </div>
            <div className="pack-forge-reveal__hint">Tap the card to reveal</div>
          </div>
        </div>
      </div>

      {/* BOOM overlay */}
      {boom && (
        <div style={{
          position:   'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.92)',
          display:    'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          animation:  'boom-overlay-in 0.12s ease-out',
        }}>
          <div style={{
            position: 'absolute', width: 480, height: 480, pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(245,179,39,0.22) 0%, transparent 65%)',
          }} />
          <div className="font-display" style={{
            fontSize:   56, color: 'var(--gold-1)', letterSpacing: '0.1em',
            textShadow: '0 0 40px var(--gold-glow), 0 0 80px rgba(212,175,55,0.4)',
            animation:  'boom-badge-pop 0.35s 0.05s both ease-out',
            position:   'relative', zIndex: 1,
          }}>
            ⚡ BOOM ⚡
          </div>
          <div style={{
            fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            animation: 'boom-badge-pop 0.35s 0.15s both ease-out',
            position: 'relative', zIndex: 1,
          }}>
            {boom.fromPlayer} · {boom.stat}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20,
            animation: 'boom-badge-pop 0.4s 0.25s both ease-out',
            position: 'relative', zIndex: 1,
          }}>
            <div className="font-display" style={{
              fontSize: 72, color: 'var(--ink-3)', opacity: 0.45,
              textDecoration: 'line-through',
            }}>
              {boom.original}
            </div>
            <div style={{ fontSize: 32, color: 'var(--ink-3)', opacity: 0.5 }}>→</div>
            <div className="font-display" style={{
              fontSize: 96, color: 'var(--gold-1)',
              textShadow: '0 0 24px var(--gold-glow)',
              animation: 'boom-badge-pop 0.35s 0.5s both ease-out',
            }}>
              {boom.boosted}
            </div>
          </div>
          <div style={{
            background:   'linear-gradient(135deg, #f5b327, #ff9a00)',
            color:        '#000',
            fontFamily:   'var(--font-display)',
            fontSize:     20, letterSpacing: '0.12em',
            padding:      '8px 22px', borderRadius: 999,
            boxShadow:    '0 4px 24px rgba(245,179,39,0.5)',
            animation:    'boom-plus-pop 0.4s 0.65s both ease-out',
            position:     'relative', zIndex: 1,
          }}>
            +4 STAT BOOST
          </div>
        </div>
      )}
    </div>
  )
}

const COSMETIC_LABEL: Record<CardCosmetic, string> = {
  base: 'Base', neon: 'Neon', fire: 'Fire', ice: 'Ice', chrome: 'Chrome', shadow: 'Shadow',
}

function ForgeCardPreview({
  playerName,
  lockedStats,
  lockedPosition,
  lockedCosmetic,
  progress,
  pendingStat,
}: {
  playerName: string
  lockedStats: Partial<Record<StatKey, LockedSlot>>
  lockedPosition: LockedPosition | null
  lockedCosmetic: CardCosmetic | null
  progress: number
  pendingStat?: { stat: StatKey; value: number }
}) {
  const statValues = STAT_KEYS.map(stat => {
    if (pendingStat?.stat === stat) return pendingStat.value
    return lockedStats[stat]?.value
  }).filter((v): v is number => v !== undefined)

  const ovr = statValues.length
    ? Math.round(statValues.reduce((a, b) => a + b, 0) / statValues.length)
    : null

  return (
    <div className="pack-forge-preview">
      <div className="eyebrow pack-forge-preview__label">YOUR CARD</div>

      <div className="forge-preview">
        <div className="forge-preview__head">
          <div className="forge-preview__ovr">{ovr ?? '—'}</div>
          <div className="forge-preview__identity">
            <div className="forge-preview__name">{playerName}</div>
            <div className={`forge-preview__pos ${lockedPosition ? 'filled' : ''}`}>
              {lockedPosition?.position ?? 'No position'}
            </div>
          </div>
        </div>

        <div className="forge-preview__section">
          <div className="forge-preview__section-title">Stats</div>
          <div className="forge-preview__stats">
            {STAT_KEYS.map(stat => {
              const locked = lockedStats[stat]
              const isPending = pendingStat?.stat === stat
              const value = isPending ? pendingStat.value : locked?.value
              const filled = value !== undefined

              return (
                <div
                  key={stat}
                  className={[
                    'forge-preview__stat',
                    filled ? 'filled' : '',
                    isPending ? 'pending' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <span className="forge-preview__stat-key">{stat}</span>
                  <span className="forge-preview__stat-val">{filled ? value : '—'}</span>
                  {locked && !isPending && (
                    <span className="forge-preview__stat-from">{locked.fromPlayer.split(' ').slice(-1)[0]}</span>
                  )}
                  {isPending && (
                    <span className="forge-preview__stat-from">new</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="forge-preview__extras">
          <div className={`forge-preview__extra ${lockedPosition ? 'filled' : ''}`}>
            <span className="forge-preview__extra-label">Position</span>
            <span className="forge-preview__extra-val">{lockedPosition?.position ?? '—'}</span>
          </div>
          <div className={`forge-preview__extra ${lockedCosmetic && lockedCosmetic !== 'base' ? 'filled' : ''}`}>
            <span className="forge-preview__extra-label">Cosmetic</span>
            <span className="forge-preview__extra-val">
              {lockedCosmetic && lockedCosmetic !== 'base' ? COSMETIC_LABEL[lockedCosmetic] : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="pack-forge-preview__meta">{progress}/7 slots</div>
    </div>
  )
}
