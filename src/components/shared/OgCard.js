// The 1200×630 share-preview card for a tool (or the home page), drawn
// with next/og's ImageResponse. Same visual language as InsureCheck's
// original card. Satori only supports flexbox layouts, hence the explicit
// display: 'flex' on every element.
import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 }

/** First sentence of a description, trimmed to fit the card. */
export function tagline(desc, max = 72) {
  const first = String(desc || '').split(/(?<=[.?!])\s/)[0]
  if (first.length <= max) return first
  return first.slice(0, first.lastIndexOf(' ', max)).replace(/[,;:—-]\s*$/, '') + '…'
}

export function renderOgCard({ title, line, footer = 'Free · No sign-up · Built for Singapore' }) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#17120f', color: '#fff', fontFamily: 'sans-serif', padding: '0 80px' }}>
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, opacity: 0.55, textTransform: 'uppercase', marginBottom: 16 }}>
          nat does the math
        </div>
        <div style={{ display: 'flex', fontSize: 104, fontWeight: 700 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 34, opacity: 0.85, marginTop: 24, textAlign: 'center' }}>{line}</div>
        <div style={{ display: 'flex', fontSize: 24, opacity: 0.55, marginTop: 44 }}>{footer}</div>
      </div>
    ),
    { ...OG_SIZE },
  )
}
