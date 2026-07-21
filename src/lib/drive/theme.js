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
export const C = {
  coah: '#1b2320', coahMid: '#1b2320', coahLight: '#33403a',
  primary: '#1b2320', accent: '#1f6f54', accentBg: '#e4efe9', accentText: '#145c43',
  bg: '#f3f5f2', surface: '#ffffff', border: '#d8ded9',
  text: '#1b2320', muted: '#5f6b64', faint: '#8a948d',
  red: '#c1443f', redBg: '#f7e9e8', redText: '#8f2f2b',
  amber: '#b8863b', amberBg: '#f5ecd9', amberText: '#7a5a26',
  blue: '#3d6fa8', blueBg: '#e8eef5', blueText: '#2c5079',
  iceBg: '#f1f0ec', iceText: '#5f6b64',
  fontCoah: "'Fraunces', Georgia, serif",
  fontDisplay: "'Fraunces', Georgia, serif",
  fontBody: "'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif",
  fontMono: "'IBM Plex Mono', ui-monospace, 'SF Mono', Consolas, monospace",
  xs: '11px', sm: '13px', base: '15px', lg: '17px', xl: '22px', xxl: '28px', hero: '38px',
  r: '5px', rL: '9px', rXL: '13px',
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
  shadowMd: '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
}

export const RATE_TIERS = [
  { id:'ice',   label:'Standard ICE',       sub:'Petrol & diesel',   rate:0.0260, display:'2.60%', color:C.iceText,   bg:C.iceBg,    icon:'⛽' },
  { id:'green', label:'Green EV / Hybrid',  sub:'Electric & hybrid', rate:0.0208, display:'2.08%', color:C.accentText,bg:C.accentBg, icon:'🌿' },
  { id:'tesla', label:'Tesla Preferential', sub:'Tesla models only', rate:0.0168, display:'1.68%', color:'#6b5a9e',   bg:'#efedf5',  icon:'⚡' },
]

export const SGD = n => `S$${Math.round(n).toLocaleString('en-SG')}`
