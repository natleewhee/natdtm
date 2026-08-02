// src/lib/child/theme.js
// Literal-hex mirror of the shared --color-*/--l-* palette in
// src/app/globals.css — same reasoning as src/lib/house/theme.js: this
// vertical builds alpha-transparent variants by string-concatenating a
// hex suffix onto these values (e.g. `${C.accent}44`), which only works
// with real hex. Kept in sync by hand with globals.css.
export const C = {
  coah: '#05070c', coahMid: '#05070c', coahLight: '#141b2e',
  primary: '#f8fafc', accent: '#eab308', accentBg: '#332b0e', accentText: '#fde68a', accentInk: '#1b1400',
  green: '#10b981', greenBg: '#0f2e23', greenText: '#6ee7b7',
  bg: '#0b1120', surface: '#1e293b', surface2: '#172033', border: '#334155',
  text: '#f8fafc', muted: '#94a3b8', faint: '#64748b',
  red: '#ef4444', redBg: '#3a1414', redText: '#fca5a5',
  amber: '#ff5722', amberBg: '#3a1f12', amberText: '#fdba74',
  blue: '#38bdf8', blueBg: '#0f2a38', blueText: '#93d9fb',
  fontCoah: "'Space Grotesk', 'Inter', -apple-system, sans-serif",
  fontDisplay: "'Space Grotesk', 'Inter', -apple-system, sans-serif",
  fontBody: "'Inter', -apple-system, 'Segoe UI', sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace",
  xs: '11px', sm: '13px', base: '15px', lg: '17px', xl: '22px', xxl: '28px', hero: '38px',
  r: '5px', rL: '9px', rXL: '13px',
  shadow: '0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.25)',
  shadowMd: '0 2px 8px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.3)',
}

export const SGD = n => `S$${Math.round(n || 0).toLocaleString('en-SG')}`

// Money input parser that understands "k" (thousand) and "m" (million)
// suffixes on top of plain numbers — e.g. "800k" → 800000, "1.2m" → 1200000.
export function parseMoney(raw) {
  if (raw == null) return 0
  let s = String(raw).trim().toLowerCase().replace(/,/g, '')
  if (!s) return 0
  let mult = 1
  if (s.endsWith('k')) { mult = 1_000; s = s.slice(0, -1) }
  else if (s.endsWith('m')) { mult = 1_000_000; s = s.slice(0, -1) }
  // Strip anything that isn't a digit or decimal point — a pasted "$1,500,000"
  // (comma already stripped above, but the leading $ survives) or a
  // space-separated "1 500 000" would otherwise make parseFloat choke on
  // the first non-numeric character and silently return 0 or a truncated
  // value, with no visible sign anything went wrong.
  s = s.replace(/[^0-9.]/g, '')
  if (!s) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n * mult : 0
}
