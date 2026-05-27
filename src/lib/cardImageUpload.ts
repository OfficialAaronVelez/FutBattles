import { supabase } from './supabase'
import { isSupabaseConfigured } from './gameSync'

export const CARD_IMAGE_MAX_BYTES = 512 * 1024
export const CARD_IMAGE_MAX_DIMENSION = 800
export const CARD_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image file.'))
    }
    img.src = url
  })
}

/** Resize + compress so uploads stay under the free-tier limit. */
export async function prepareCardImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a JPEG, PNG, or WebP image.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image is too large. Pick a file under 5 MB.')
  }

  const img = await loadImage(file)
  const scale = Math.min(1, CARD_IMAGE_MAX_DIMENSION / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process image.')

  ctx.drawImage(img, 0, 0, width, height)

  let quality = 0.88
  let blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not compress image.')

  while (blob.size > CARD_IMAGE_MAX_BYTES && quality > 0.45) {
    quality -= 0.08
    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('Could not compress image.')
  }

  if (blob.size > CARD_IMAGE_MAX_BYTES) {
    throw new Error('Image is still too large after compression. Try a smaller photo.')
  }

  return blob
}

export async function uploadCardImage(userId: string, cardId: string, file: File): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Image upload requires Supabase to be configured.')
  }

  const blob = await prepareCardImage(file)
  const path = `${userId}/${cardId}.jpg`

  const { error } = await supabase.storage
    .from('card-images')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '3600',
    })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('card-images').getPublicUrl(path)
  return data.publicUrl
}
