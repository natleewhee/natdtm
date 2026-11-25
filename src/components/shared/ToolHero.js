// src/components/shared/ToolHero.js
// The dark hero band at the top of a tool's landing page (super-app plan
// U6). Replaces five pasted copies (DriveReady, HouseMuch, RetireWell,
// TaxWise, MyLedger) that differed only in their copy.
//
// Two layouts, so the tools stop reading as one template:
// - 'center' (default): eyebrow, headline, italic lede and badges centred.
// - 'left': left-aligned in the content column, a larger headline and an
//   optional `aside` (a short "what you'll get" list or preview) beside it
//   on wide screens; it stacks under the copy on phones.
//
// `badges` are the tool's own claims; the privacy/price pair every tool
// makes (TRUST_COMMON) is appended once here instead of repeated per page.

import TrustBadges from './TrustBadges'

export const TRUST_COMMON = ['Zero data collected', 'Free, forever']

const eyebrowStyle = {
  fontFamily: 'var(--font-ndtm)', fontSize: 10, fontWeight: 600,
  color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14,
}

export default function ToolHero({ eyebrow, title, lede, badges = [], layout = 'center', aside = null }) {
  const items = [...badges, ...TRUST_COMMON]
  if (layout === 'left') {
    return (
      <div className="tool-hero tool-hero--left">
        <div className="tool-hero-inner">
          <div className="tool-hero-copy">
            <div style={eyebrowStyle}>{eyebrow}</div>
            <h1 className="tool-hero-title">{title}</h1>
            <p className="tool-hero-lede">{lede}</p>
            <TrustBadges tone="dark" align="start" items={items} />
          </div>
          {aside && <div className="tool-hero-aside">{aside}</div>}
        </div>
      </div>
    )
  }
  return (
    <div className="tool-hero">
      <div style={eyebrowStyle}>{eyebrow}</div>
      <h1 className="tool-hero-title">{title}</h1>
      <p className="tool-hero-lede">{lede}</p>
      <TrustBadges tone="dark" items={items} />
    </div>
  )
}
