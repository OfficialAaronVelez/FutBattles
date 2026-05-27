import { useRef, useState } from 'react'
import type { StatKey, CardCosmetic, Position } from '../../types'
import { FutCard } from '../CardDisplay/FutCard'
import { PLAYERS } from '../../data/players'
import { supabase } from '../../lib/supabase'
import {
  uploadCardImage,
  CARD_IMAGE_ACCEPT,
  CARD_IMAGE_MAX_BYTES,
} from '../../lib/cardImageUpload'
import { isSupabaseConfigured } from '../../lib/gameSync'

interface CardBuilderProps {
  playerName: string
  lockedStats: Partial<Record<StatKey, { stat: StatKey; value: number; fromPlayer: string }>>
  lockedPosition: { position: string; fromPlayer: string } | null
  lockedCosmetic: CardCosmetic | null
  onFinalize: (imageUrl?: string, cardId?: string) => void
}

export function CardBuilder({
  playerName, lockedStats, lockedPosition, lockedCosmetic, onFinalize,
}: CardBuilderProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const stats: Partial<Record<StatKey, number>> = {}
  for (const [key, slot] of Object.entries(lockedStats ?? {})) {
    stats[key as StatKey] = slot.value
  }

  const finalCard = {
    id: 'final',
    name: playerName,
    position: (lockedPosition?.position ?? null) as Position | null,
    cosmetic: lockedCosmetic ?? ('base' as CardCosmetic),
    stats,
    createdAt: Date.now(),
    imageUrl: imagePreview ?? undefined,
  }

  const hasPosition = !!lockedPosition
  const canUpload = isSupabaseConfigured()

  const sourcePlayer = lockedPosition
    ? PLAYERS.find(p => p.name === lockedPosition.fromPlayer) ?? null
    : null

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setUploadError(null)
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5 MB before compression.')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    setUploadError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave() {
    if (!hasPosition || saving) return
    setSaving(true)
    setUploadError(null)

    try {
      let imageUrl: string | undefined

      if (imageFile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('You must be logged in to upload a card image.')
        const cardId = crypto.randomUUID()
        imageUrl = await uploadCardImage(user.id, cardId, imageFile)
        onFinalize(imageUrl, cardId)
      } else {
        onFinalize()
      }
    } catch (err) {
      setUploadError((err as Error).message ?? 'Could not save card.')
      setSaving(false)
    }
  }

  return (
    <div className="pack-forge-final__body">
      <div className="pack-forge-final__card">
        <div className="pack-forge-final__card-scaler">
          <FutCard card={finalCard} size="lg" />
        </div>
      </div>

      <div className="pack-forge-final__footer">
        {hasPosition && sourcePlayer && (
          <div className="pack-forge-final__chem">
            ⚗️ Chem from {lockedPosition.fromPlayer.split(' ').slice(-1)[0]} · {sourcePlayer.club} · {sourcePlayer.nation}
          </div>
        )}

        {!hasPosition && (
          <div className="pack-forge-final__warn">
            ⚠️ No position — pick one next pack for squad chemistry
          </div>
        )}

        <div className="card-image-upload card-image-upload--compact">
          <input
            ref={fileRef}
            type="file"
            accept={CARD_IMAGE_ACCEPT}
            onChange={handleFileChange}
            className="card-image-upload__input"
            disabled={saving || !canUpload}
          />
          <div className="card-image-upload__row">
            <button
              type="button"
              className="card-image-upload__pick"
              onClick={() => fileRef.current?.click()}
              disabled={saving || !canUpload}
            >
              {imagePreview ? '📷 Change photo' : '📷 Add photo (optional)'}
            </button>
            {imagePreview && (
              <button type="button" className="card-image-upload__clear" onClick={clearImage} disabled={saving}>
                Remove
              </button>
            )}
          </div>
          {canUpload && (
            <div className="card-image-upload__sub">
              Max {Math.round(CARD_IMAGE_MAX_BYTES / 1024)} KB · JPEG/PNG/WebP
            </div>
          )}
          {uploadError && <div className="card-image-upload__error">{uploadError}</div>}
        </div>

        <button
          onClick={handleSave}
          disabled={!hasPosition || saving}
          className="btn btn-primary pack-forge-final__save"
        >
          {saving ? 'Saving…' : '💾 Save to Roster'}
        </button>
      </div>
    </div>
  )
}
