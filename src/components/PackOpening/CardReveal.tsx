import type { PackRarity } from '../../types'

interface CardRevealProps {
  isRevealed: boolean
  onReveal: () => void
  rarity: PackRarity
  children: React.ReactNode
  cardIndex: number
  totalCards: number
}

const FLIP_DUR = 750
const SWAP_DELAY = FLIP_DUR / 2

const SIZE = { w: 280, h: 420 }

export function CardReveal({ isRevealed, onReveal, rarity, children, cardIndex, totalCards }: CardRevealProps) {
  const isBonus = cardIndex >= totalCards - 1
  const cbClass = isBonus ? 'bonus' : rarity
  const crestLetter = isBonus ? '⚡' : rarity === 'icon' ? '★' : rarity === 'gold' ? 'G' : rarity === 'silver' ? 'S' : 'B'
  const label = isBonus ? 'BONUS' : rarity.toUpperCase()
  const opacityTransition = `opacity 0s ${SWAP_DELAY}ms`

  return (
    <div style={{ perspective: '1400px', width: SIZE.w, height: SIZE.h }}>
      <div
        style={{
          transformStyle: 'preserve-3d',
          transition: `transform ${FLIP_DUR}ms cubic-bezier(0.4, 0.2, 0.2, 1)`,
          transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
          width: SIZE.w,
          height: SIZE.h,
        }}
      >
        {/* Card back */}
        <div
          onClick={!isRevealed ? onReveal : undefined}
          style={{
            position: 'absolute', inset: 0,
            opacity: isRevealed ? 0 : 1,
            transition: opacityTransition,
            pointerEvents: isRevealed ? 'none' : 'auto',
            cursor: 'pointer',
          }}
        >
          <div className={`cardback ${cbClass}`}>
            <div className="cardback__pattern" />
            <div className="cardback__shimmer" />
            <div className="cardback__crest">
              <div className="cardback__crest-letter">{crestLetter}</div>
            </div>
            <div className="cardback__label">{label}</div>
            <div className="cardback__sublabel">Tap to reveal</div>
            <div className="cardback__count">
              {isBonus ? 'BONUS · LAST PICK' : `Card ${cardIndex + 1} of ${totalCards}`}
            </div>
          </div>
        </div>

        {/* Card front */}
        <div
          style={{
            transform: 'rotateY(180deg)',
            position: 'absolute', inset: 0,
            opacity: isRevealed ? 1 : 0,
            transition: opacityTransition,
            pointerEvents: isRevealed ? 'auto' : 'none',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
