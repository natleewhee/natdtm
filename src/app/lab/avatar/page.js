'use client'

// Internal proof-of-concept — not linked from the app nav. Demonstrates
// swapping a chart/number for a Three.js character whose animation state
// reacts to a live score, as a candidate pattern for a real tool page.

import { useState } from 'react'
import DataAvatar from '@/components/lab/DataAvatar'

export default function AvatarLabPage() {
  const [score, setScore] = useState(50)

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Data Avatar — proof of concept</h1>
      <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>
        Drag the slider to see the character shift between idle (0-33), walk (34-66), and celebrate (67-100).
        In a real tool this score would come from a computed value instead of a slider.
      </p>
      <DataAvatar score={score} label="Demo score" />
      <input
        type="range"
        min={0}
        max={100}
        value={score}
        onChange={(e) => setScore(Number(e.target.value))}
        style={{ width: '100%', marginTop: 16 }}
      />
    </div>
  )
}
