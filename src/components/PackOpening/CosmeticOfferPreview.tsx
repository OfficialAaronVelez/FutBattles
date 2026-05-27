import type { CardCosmetic, StatKey, UserCard } from '../../types'
import { COSMETIC_STYLES } from '../../data/cosmetics'
import { FutCard } from '../CardDisplay/FutCard'

interface CosmeticOfferPreviewProps {
  cosmetic: CardCosmetic
  previewCard: UserCard
  taken: boolean
  onTake: () => void
}

export function CosmeticOfferPreview({ cosmetic, previewCard, taken, onTake }: CosmeticOfferPreviewProps) {
  const style = COSMETIC_STYLES[cosmetic]

  return (
    <div className={`cos-offer ${taken ? 'cos-offer--taken' : ''}`}>
      <div className="cos-offer__header">
        <span className="cos-offer__emoji">{style.emoji}</span>
        <div>
          <div className="cos-offer__title">{style.name} cosmetic</div>
          <div className="cos-offer__rarity">{style.rarity}</div>
        </div>
      </div>

      <div className="cos-offer__preview">
        <div className="cos-offer__preview-label">Preview on your card</div>
        <div className="cos-offer__preview-scaler">
          <FutCard card={{ ...previewCard, cosmetic }} size="sm" />
        </div>
      </div>

      {taken ? (
        <div className="cos-offer__taken">✓ Cosmetic applied</div>
      ) : (
        <button type="button" className="cos-offer__btn" onClick={onTake}>
          + Take {style.name} cosmetic
        </button>
      )}
    </div>
  )
}

/** Build a partial UserCard for cosmetic preview from forge state. */
export function buildForgePreviewCard(
  playerName: string,
  lockedStats: Partial<Record<StatKey, { stat: StatKey; value: number; fromPlayer: string }>>,
  lockedPosition: { position: string; fromPlayer: string } | null,
  lockedCosmetic: CardCosmetic | null,
  pendingStat?: { stat: StatKey; value: number },
): UserCard {
  const stats: UserCard['stats'] = {}
  for (const [key, slot] of Object.entries(lockedStats)) {
    stats[key as StatKey] = slot.value
  }
  if (pendingStat) stats[pendingStat.stat] = pendingStat.value

  return {
    id:        'preview',
    name:      playerName,
    position:  (lockedPosition?.position ?? null) as UserCard['position'],
    stats,
    cosmetic:  lockedCosmetic ?? 'base',
    createdAt: Date.now(),
  }
}
