import type { CardCosmetic } from '../types'

export const COSMETIC_STYLES: Record<
  CardCosmetic,
  { name: string; emoji: string; bg: string; border: string; glow: string; textAccent: string; rarity: string }
> = {
  base:   { name: 'Base',    emoji: '⭐', bg: 'from-yellow-900 via-yellow-800 to-gray-900', border: 'border-yellow-500',  glow: '',                          textAccent: '#ffd700', rarity: 'Common' },
  neon:   { name: 'Neon',    emoji: '⚡', bg: 'from-cyan-950 via-purple-900 to-black',      border: 'border-cyan-400',    glow: 'shadow-[0_0_24px_#22d3ee]', textAccent: '#22d3ee', rarity: 'Rare' },
  fire:   { name: 'Fire',    emoji: '🔥', bg: 'from-red-950 via-orange-800 to-gray-900',    border: 'border-orange-500',  glow: 'shadow-[0_0_24px_#f97316]', textAccent: '#f97316', rarity: 'Rare' },
  ice:    { name: 'Ice',     emoji: '❄️', bg: 'from-blue-950 via-cyan-800 to-gray-900',     border: 'border-cyan-300',    glow: 'shadow-[0_0_24px_#67e8f9]', textAccent: '#67e8f9', rarity: 'Rare' },
  chrome: { name: 'Chrome',  emoji: '✨', bg: 'from-slate-300 via-slate-500 to-slate-800',  border: 'border-white',       glow: 'shadow-[0_0_24px_#ffffff]', textAccent: '#ffffff', rarity: 'Epic' },
  shadow: { name: 'Shadow',  emoji: '🌑', bg: 'from-zinc-950 via-purple-950 to-black',      border: 'border-purple-600',  glow: 'shadow-[0_0_24px_#9333ea]', textAccent: '#9333ea', rarity: 'Epic' },
}

export const EARNABLE_COSMETICS: CardCosmetic[] = ['neon', 'fire', 'ice', 'chrome', 'shadow']

export function randomCosmetic(): CardCosmetic {
  return EARNABLE_COSMETICS[Math.floor(Math.random() * EARNABLE_COSMETICS.length)]
}
