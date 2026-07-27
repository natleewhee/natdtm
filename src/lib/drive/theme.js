// src/lib/theme.js
// Shared design tokens and rate-tier display metadata.
// Pure data — safe to import from both client components and the calc engine.
//
// Literal hex, deliberately — NOT `var(--color-*)` strings. Components
// across this vertical build alpha-transparent variants by string-
// concatenating a hex suffix straight onto these values (e.g.
// `${C.accent}44`), which only works with real hex; `var(--color-accent)44`
// is invalid CSS. These values are kept in sync by hand with the
// `--color-*` custom properties in src/app/globals.css, which Insure and
// Invest's own theme objects also mirror — same palette, three copies,
// because only one of the three (this one) needs literal values.
//
// `accent` (caution yellow) is the BRAND/chrome color — CTAs, focus
// rings, active states. `green` is a separate SEMANTIC color for
// positive financial outcomes (affordable, eco rate tier, savings) —
// keep these two apart; don't reach for `accent` when you mean "this is
// good news."
export const C = {
  coah: '#05070c', coahMid: '#05070c', coahLight: '#141b2e',
  primary: '#f8fafc', accent: '#eab308', accentBg: '#332b0e', accentText: '#fde68a', accentInk: '#1b1400',
  green: '#10b981', greenBg: '#0f2e23', greenText: '#6ee7b7',
  bg: '#0b1120', surface: '#1e293b', border: '#334155',
  text: '#f8fafc', muted: '#94a3b8', faint: '#64748b',
  red: '#ef4444', redBg: '#3a1414', redText: '#fca5a5',
  amber: '#ff5722', amberBg: '#3a1f12', amberText: '#fdba74',
  blue: '#38bdf8', blueBg: '#0f2a38', blueText: '#93d9fb',
  iceBg: '#27303f', iceText: '#94a3b8',
  fontCoah: "'Space Grotesk', 'Inter', -apple-system, sans-serif",
  fontDisplay: "'Space Grotesk', 'Inter', -apple-system, sans-serif",
  fontBody: "'Inter', -apple-system, 'Segoe UI', sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace",
  xs: '11px', sm: '13px', base: '15px', lg: '17px', xl: '22px', xxl: '28px', hero: '38px',
  r: '5px', rL: '9px', rXL: '13px',
  shadow: '0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.25)',
  shadowMd: '0 2px 8px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.3)',
}

export const RATE_TIERS = [
  { id:'ice',   label:'Standard ICE',       sub:'Petrol & diesel',   rate:0.0260, display:'2.60%', color:C.iceText,   bg:C.iceBg },
  { id:'green', label:'Green EV / Hybrid',  sub:'Electric & hybrid', rate:0.0208, display:'2.08%', color:C.greenText, bg:C.greenBg },
  { id:'tesla', label:'Tesla Preferential', sub:'Tesla models only', rate:0.0168, display:'1.68%', color:'#c4b5fd',   bg:'#241c33' },
]

export const SGD = n => `S$${Math.round(n).toLocaleString('en-SG')}`

// Money input parser that understands "k" (thousand) and "m" (million)
// suffixes on top of plain digits — "80k" → 80000, "1.2m" → 1200000 —
// same convention as house/theme.js's parseMoney. Returns null (not 0)
// for empty/unparseable input so callers can tell "nothing typed yet"
// apart from "typed zero".
export function parseMoneyKM(raw) {
  if (raw == null) return null
  const s = String(raw).trim().toLowerCase().replace(/,/g, '')
  if (!s) return null
  let mult = 1
  let digits = s
  if (digits.endsWith('k')) { mult = 1_000; digits = digits.slice(0, -1) }
  else if (digits.endsWith('m')) { mult = 1_000_000; digits = digits.slice(0, -1) }
  digits = digits.replace(/[^0-9.]/g, '')
  if (!digits) return null
  const n = parseFloat(digits)
  return Number.isFinite(n) ? Math.round(n * mult) : null
}

// Coarse Singapore-market popularity by brand — a transparent heuristic for
// ordering the long tail of search results, NOT sourced registration/sales
// figures (we only have real rank data for the 5 tagged best-sellers). Lower
// number = more common on SG roads. Used only to keep search results from
// falling back to raw/alphabetical order; the 5 ranked best-sellers still
// lead. Revisit if per-model sales data is ever added to cars.json.
const BRAND_TIER = {
  Toyota: 1, Honda: 1, BYD: 1, Hyundai: 1, Kia: 1, Mazda: 1,
  Tesla: 2, Nissan: 2, Mitsubishi: 2, Subaru: 2, Suzuki: 2,
  Volkswagen: 2, Skoda: 2, MG: 2, MG4: 2,
  BMW: 3, 'Mercedes-Benz': 3, Audi: 3, Volvo: 3, Lexus: 3, MINI: 3, Polestar: 3,
}
export function brandTier(name) {
  return BRAND_TIER[name.split(' ')[0]] ?? 4
}
