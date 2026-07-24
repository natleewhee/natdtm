// src/lib/house/theme.js
// Literal-hex mirror of the shared --color-*/--l-* palette in
// src/app/globals.css — same reasoning as src/lib/drive/theme.js: this
// vertical builds alpha-transparent variants by string-concatenating a
// hex suffix onto these values (e.g. `${C.accent}44`), which only works
// with real hex. Kept in sync by hand with globals.css.
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

export const SGD = n => `S$${Math.round(n || 0).toLocaleString('en-SG')}`
