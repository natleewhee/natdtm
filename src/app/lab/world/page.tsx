'use client'

// Internal proof-of-concept — not linked from app nav. A walkable
// alternative home page: the avatar roams a 3D hub and walking into a
// booth's radius lets you Enter into the real tool page it represents.

import WorldHub from '@/components/shared/WorldHub'

export default function WorldLabPage() {
  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>World hub: proof of concept</h1>
      <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>
        Each booth is a real natdtm tool. Walk up and press Enter to go there. Nothing here is a mockup link.
      </p>
      <WorldHub />
    </div>
  )
}
