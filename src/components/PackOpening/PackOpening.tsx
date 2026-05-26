import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { STAT_KEYS } from '../../types'
import type { StatKey, Position, CardCosmetic } from '../../types'
import { FutCard } from '../CardDisplay/FutCard'
import { CardBuilder } from './CardBuilder'
import { PackSelector } from './PackSelector'
import { CardReveal } from './CardReveal'
import { PackIntro } from './PackIntro'
import { MiniGame } from './MiniGames'

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
    replaceStat, skipCard, finalizeCard,
  } = useGameStore()

  if (!packSession) return null

  const {
    packCards, currentCardIndex, lockedStats,
    lockedPosition, lockedCosmetic, playerName, rarity,
  } = packSession

  const isDone = currentCardIndex >= packCards.length

  if (isDone) {
    return (
      <div style={{ padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, position: 'relative' }}>
        {/* Confetti */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {Array.from({ length: 26 }).map((_, i) => {
            const colors = ['#ffd66b', '#25e0ff', '#b96bff', '#44ff9e', '#ff4767']
            const x = (i / 26) * 100
            const delay = (i * 137) % 800
            return (
              <div key={i} style={{
                position: 'absolute', left: `${x}%`, top: -20,
                width: 6, height: 12, background: colors[i % colors.length],
                borderRadius: 2, transform: 'translate3d(0,0,0)',
                animation: `confetti-fall 2.2s ${delay}ms ease-in forwards`,
                ['--dx' as string]: `${(i % 5 - 2) * 30}px`,
                ['--rot' as string]: `${(i % 2 ? 1 : -1) * 720}deg`,
              }} />
            )
          })}
        </div>

        {/* Header */}
        <div className="text-center" style={{ padding: '24px 16px 12px', position: 'relative', zIndex: 2 }}>
          <div className="eyebrow" style={{ color: 'var(--gold-1)' }}>PACK COMPLETE</div>
          <h1 className="font-display" style={{ fontSize: 44, margin: '4px 0 4px', lineHeight: 0.9, color: 'var(--ink-0)' }}>
            MEET YOUR LEGEND
          </h1>
          <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>Final card ready to join your squad</div>
        </div>

        <div className="futcard-wrap" style={{ position: 'relative', zIndex: 2 }}>
          <CardBuilder
            playerName={playerName}
            lockedStats={lockedStats}
            lockedPosition={lockedPosition}
            lockedCosmetic={lockedCosmetic}
            onFinalize={finalizeCard}
          />
        </div>
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

  // Preview card for "YOUR CARD" side
  const statsObj: Partial<Record<StatKey, number>> = {}
  for (const [key, slot] of Object.entries(lockedStats ?? {})) {
    statsObj[key as StatKey] = slot.value
  }
  const previewCard = {
    id: 'preview', name: playerName,
    position: lockedPosition?.position ?? null,
    cosmetic: lockedCosmetic ?? ('base' as CardCosmetic),
    stats: statsObj, createdAt: 0,
  }

  // When all 6 stats are already filled (overflow non-bonus rounds), treat as replace
  const shouldReplace = isBonus || allStatsFilled

  function handleSelectStat(stat: StatKey, value: number) {
    // BOOM: 15% chance of a +4 boost (non-bonus / non-overflow cards only)
    const isBoom   = !shouldReplace && Math.random() < 0.15
    const finalVal = isBoom ? Math.min(99, value + 4) : value

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

  function handleSkip() {
    setIsRevealed(false)
    setPendingStat(null)
    skipCard()
  }

  // ── Top progress bar (shared across all states) ──────────────────────────
  const topBar = (
    <div style={{
      padding: '16px 32px 12px',
      borderBottom: '1px solid var(--line)',
      background: 'rgba(6,9,18,0.8)',
      backdropFilter: 'blur(8px)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--ink-3)' }}>FORGING</div>
          <div className="font-display" style={{ fontSize: 32, color: 'var(--ink-0)', letterSpacing: '0.04em', lineHeight: 1 }}>
            {playerName}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="eyebrow" style={{ color: 'var(--gold-1)', fontSize: 10 }}>
            {progress}/7 SLOTS {lockedCosmetic ? '· COSMETIC ✓' : ''}
          </div>
          <div className="eyebrow" style={{ color: 'var(--ink-3)', marginTop: 2 }}>
            CARD {currentCardIndex + 1} / {packCards.length}
          </div>
        </div>
      </div>
      <div className="progress">
        <div className="progress__fill" style={{ width: `${(progress / 7) * 100}%` }} />
      </div>
    </div>
  )

  // ── MINI-GAME phase (revealed but no pending stat yet) ───────────────────
  if (isRevealed && !pendingStat) {
    const gameType = packSession.miniGames[currentCardIndex] ?? 'normal'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {topBar}
        <MiniGame
          type={gameType}
          card={realPlayer}
          takenStats={shouldReplace ? [] : lockedStatKeys}
          onComplete={(stat, value) => setPendingStat({ stat, value })}
        />
      </div>
    )
  }

  // ── RESULT phase (mini-game done, pendingStat set) ────────────────────────
  if (isRevealed && pendingStat) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {topBar}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 24 }}>
          {/* Earned stat display */}
          <div style={{ textAlign: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--gold-1)', marginBottom: 8 }}>STAT EARNED</div>
            <div className="font-display" style={{ fontSize: 64, color: '#f5b327', letterSpacing: '0.04em', lineHeight: 0.9, textShadow: '0 0 30px rgba(245,179,39,0.4)' }}>
              ⚡ {pendingStat.stat} {pendingStat.value}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>from {realPlayer.name}</div>
          </div>

          {/* YOUR CARD preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="eyebrow" style={{ color: 'var(--gold-1)', fontSize: 10 }}>YOUR CARD</div>
            <FutCard card={previewCard} size="lg" />
          </div>

          {/* Side picks (position / cosmetic) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: 360 }}>
            {canSelectPosition && !positionFilled && (
              <button
                onClick={handleSelectPosition}
                style={{
                  width: '100%', padding: '10px 0',
                  background: 'rgba(37,224,255,0.1)', border: '1px solid #25e0ff',
                  borderRadius: 10, color: '#25e0ff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                }}
              >
                + Take {realPlayer.position} position
              </button>
            )}
            {canSelectCosmetic && !cosmeticFilled && cosmeticOffer && (
              <button
                onClick={() => handleSelectCosmetic(cosmeticOffer)}
                style={{
                  width: '100%', padding: '10px 0',
                  background: 'rgba(185,107,255,0.1)', border: '1px solid #b96bff',
                  borderRadius: 10, color: '#b96bff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                }}
              >
                + Take {cosmeticOffer} cosmetic
              </button>
            )}
          </div>

          {/* Last-position-chance gate */}
          {isLastPositionChance && !positionFilled ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,200,80,0.9)', fontWeight: 700 }}>
                ⚠️ Last chance for a position — take it above to continue
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleSelectStat(pendingStat.stat, pendingStat.value)}
              className="btn btn-primary"
              style={{ width: '100%', maxWidth: 360, fontSize: 16, padding: '14px 0' }}
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── PRE-REVEAL phase (face-down card) ────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {topBar}

      {/* Main area: two cards side by side */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        padding: '32px 40px',
        flexWrap: 'wrap',
      }}>
        {/* Bonus banner (full width above cards) */}
        {isBonus && (
          <div style={{
            width: '100%', maxWidth: 700,
            background: 'linear-gradient(90deg, rgba(185,107,255,0.15), rgba(185,107,255,0.05))',
            border: '1px solid var(--purple-1)',
            borderRadius: 12, padding: '10px 20px', textAlign: 'center',
            boxShadow: '0 0 20px rgba(185,107,255,0.2)',
          }}>
            <div className="font-display" style={{ fontSize: 22, color: 'var(--purple-0)', letterSpacing: '0.1em' }}>
              ⚡ BONUS CARD — Replace any locked stat · or skip
            </div>
          </div>
        )}

        {/* FROM PACK */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="eyebrow" style={{ color: 'var(--cyan-1)', fontSize: 10 }}>FROM PACK</div>
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
          <div style={{ minHeight: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>Tap the card to reveal</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: 1, alignSelf: 'stretch', minHeight: 200,
          background: 'linear-gradient(180deg, transparent, var(--line) 20%, var(--line) 80%, transparent)',
        }} />

        {/* YOUR CARD */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="eyebrow" style={{ color: 'var(--gold-1)', fontSize: 10 }}>YOUR CARD</div>
          <FutCard card={previewCard} size="lg" />
          <div style={{ minHeight: 28 }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 32px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          Reveal cards and lock your best stats
        </span>
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
