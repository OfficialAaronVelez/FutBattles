// Dark, premium portrait backgrounds — muted so they don't fight the card design
const PALETTES: [string, string, string][] = [
  ['#1a2540', '#0d1529', '#060c1a'],   // deep navy
  ['#1e1a30', '#110f22', '#090815'],   // dark indigo
  ['#1f2a1f', '#111a12', '#080d08'],   // dark forest
  ['#2a1f1a', '#1a120d', '#0d0806'],   // dark umber
  ['#1a2530', '#0e1620', '#070d14'],   // slate blue
  ['#251a20', '#160e14', '#0c070a'],   // dark wine
  ['#1c2228', '#0f1418', '#070a0d'],   // charcoal
  ['#221f2a', '#13111a', '#08070d'],   // dark plum
  ['#1a2420', '#0d1612', '#070d09'],   // dark teal
  ['#262018', '#16120e', '#0d0b07'],   // dark bronze
]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initialsOf(name: string): string {
  const cleaned = (name || '').replace(/[^a-zA-Z. ]/g, '').trim()
  if (!cleaned) return 'F'
  const parts = cleaned.split(/[. ]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

export function playerPortrait(seed: string, size = 400): string {
  const initials = initialsOf(seed)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="${size}" height="${size}">` +
      `<rect width="400" height="400" fill="transparent"/>` +
      `<text x="200" y="300" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-weight="700" font-size="260" letter-spacing="-6" fill="rgba(255,255,255,0.85)">${initials}</text>` +
    `</svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

export function circleAvatar(seed: string, size = 100): string {
  const h = hashStr(seed || 'X')
  const [c1, c2] = PALETTES[h % PALETTES.length]
  const initials = initialsOf(seed)
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='${size}' height='${size}'>` +
      `<defs>` +
        `<linearGradient id='av' x1='0' y1='0' x2='1' y2='1'>` +
          `<stop offset='0%' stop-color='${c1}'/>` +
          `<stop offset='100%' stop-color='${c2}'/>` +
        `</linearGradient>` +
      `</defs>` +
      `<rect width='100' height='100' fill='url(#av)'/>` +
      `<text x='50' y='65' text-anchor='middle' font-family='Arial Black, Impact, sans-serif' font-weight='900' font-size='42' fill='rgba(255,255,255,0.95)'>${initials}</text>` +
    `</svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}
