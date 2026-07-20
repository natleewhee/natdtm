// src/lib/theme.js
// Shared design tokens and rate-tier display metadata.
// Pure data — safe to import from both client components and the calc engine.

export const C = {
  coah: '#1C2B3A', coahMid: '#2D3F52', coahLight: '#3D5166',
  primary: '#0F2D6B', accent: '#1D9E75', accentBg: '#E1F5EE', accentText: '#0F6E56',
  bg: '#F7F8FA', surface: '#FFFFFF', border: '#E5E7EB',
  text: '#374151', muted: '#6B7280', faint: '#9CA3AF',
  red: '#E24B4A', redBg: '#FCEBEB', redText: '#A32D2D',
  amber: '#EF9F27', amberBg: '#FAEEDA', amberText: '#854F0B',
  blue: '#378ADD', blueBg: '#E6F1FB', blueText: '#185FA5',
  iceBg: '#F1F5F9', iceText: '#475569',
  fontCoah: "'Clash Display', system-ui, sans-serif",
  fontDisplay: "'DM Serif Display', Georgia, serif",
  fontBody: "'DM Sans', system-ui, sans-serif",
  fontMono: "'DM Mono', 'Courier New', monospace",
  xs: '11px', sm: '13px', base: '15px', lg: '17px', xl: '22px', xxl: '28px', hero: '38px',
  r: '8px', rL: '14px', rXL: '20px',
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
  shadowMd: '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
}

export const RATE_TIERS = [
  { id:'ice',   label:'Standard ICE',       sub:'Petrol & diesel',   rate:0.0260, display:'2.60%', color:C.iceText,   bg:C.iceBg,    icon:'⛽' },
  { id:'green', label:'Green EV / Hybrid',  sub:'Electric & hybrid', rate:0.0208, display:'2.08%', color:C.accentText,bg:C.accentBg, icon:'🌿' },
  { id:'tesla', label:'Tesla Preferential', sub:'Tesla models only', rate:0.0168, display:'1.68%', color:'#6D4AE8',   bg:'#F3F0FF',  icon:'⚡' },
]

export const SGD = n => `S$${Math.round(n).toLocaleString('en-SG')}`
