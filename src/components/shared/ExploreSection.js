'use client'

import { useState } from 'react'

// A collapsible drill-in block for the Explore phase of a result screen —
// closed by default so a results page doesn't dump every chart/table open
// at once. Each tool's own Explore modules (Insure's what-if explorer,
// Drive's COE sensitivity, ETF's backtest/stress test) render inside one
// of these instead of each tool inventing its own expand/collapse chrome.
export default function ExploreSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderTop: '1px solid var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '16px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--color-primary)',
        }}
      >
        {title}
        <span
          aria-hidden="true"
          style={{
            fontSize: 12,
            color: 'var(--color-faint)',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}
        >
          ▾
        </span>
      </button>
      {open && <div style={{ paddingBottom: 20 }}>{children}</div>}
    </div>
  )
}
