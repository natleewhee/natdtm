'use client'

import { useState } from 'react'

// A collapsible drill-in block for the Explore phase of a result screen —
// closed by default so a results page doesn't dump every chart/table open
// at once. Each tool's own Explore modules (Insure's what-if explorer,
// Drive's COE sensitivity, ETF's backtest/stress test) render inside one
// of these instead of each tool inventing its own expand/collapse chrome.
// Styled as a "show the math" terminal toggle — mono label, bracket
// caret, monospace-tinted panel when open — per the Digital Workbench
// design language.
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
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: open ? 'var(--color-accent)' : 'var(--color-primary)',
        }}
      >
        {title}
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: open ? 'var(--color-accent)' : 'var(--color-faint)',
            flexShrink: 0,
          }}
        >
          {open ? '[ − ]' : '[ + ]'}
        </span>
      </button>
      {open && (
        <div
          style={{
            paddingBottom: 20,
            paddingTop: 4,
            borderLeft: '2px solid var(--color-accent)',
            paddingLeft: 16,
            marginLeft: 2,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
