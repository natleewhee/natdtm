// src/lib/shared/theme.js
// The design-token object and money helpers that every vertical's own
// theme.js used to carry a verbatim copy of.
//
// Literal hex, deliberately — NOT `var(--color-*)` strings. Components
// build alpha-transparent variants by string-concatenating a hex suffix
// straight onto these values (e.g. `${C.accent}44`), which only works
// with real hex. Kept in sync by hand with the `--color-*` / `--l-*`
// custom properties in src/app/globals.css.
//
// `accent` (caution yellow) is the BRAND/chrome color — CTAs, focus
// rings, active states. `green` is a separate SEMANTIC color for
// positive financial outcomes — keep the two apart. A vertical that
// needs extra keys spreads this object: `{ ...C, surface2: '#172033' }`.
export const C = {
  coah: '#05070c', coahMid: '#05070c', coahLight: '#141b2e',
  primary: '#f8fafc', accent: '#eab308', accentBg: '#332b0e', accentText: '#fde68a', accentInk: '#1b1400',
  green: '#10b981', greenBg: '#0f2e23', greenText: '#6ee7b7',
  bg: '#0b1120', surface: '#1e293b', border: '#334155',
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

/** Format a number as Singapore dollars, rounded, with thousands separators. */
export const SGD = (n) => `S$${Math.round(n || 0).toLocaleString('en-SG')}`

/**
 * Parse a money input string, honoring `k` (thousand) and `m` (million)
 * suffixes: `"800k"` → 800000, `"1.2m"` → 1200000. Strips currency
 * symbols, commas, and stray characters. Returns 0 for empty or
 * unparseable input.
 * @param {string|number|null|undefined} raw
 * @returns {number}
 */
export function parseMoney(raw) {
  if (raw == null) return 0
  let s = String(raw).trim().toLowerCase().replace(/,/g, '')
  if (!s) return 0
  let mult = 1
  if (s.endsWith('k')) { mult = 1_000; s = s.slice(0, -1) }
  else if (s.endsWith('m')) { mult = 1_000_000; s = s.slice(0, -1) }
  // Strip anything that isn't a digit or decimal point — a pasted
  // "$1,500,000" (leading $ survives the comma strip) or a
  // space-separated "1 500 000" would otherwise make parseFloat choke on
  // the first non-numeric character and silently truncate.
  s = s.replace(/[^0-9.]/g, '')
  if (!s) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n * mult : 0
}
