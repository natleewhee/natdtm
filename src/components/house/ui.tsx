'use client'

import { useState } from 'react'
import { C } from '@/lib/shared/theme'

// An agent-fee field: a 1% / 2% / Manual toggle. At 1% or 2%, the dollar
// amount is auto-computed against a base (purchase price, sale price) and
// shown read-only. In Manual mode, a free-form dollar input appears
// instead — for anything that doesn't fit the two standard rates.
export function FeeInput({ id, label, hint, base, mode, onModeChange, value, onChange }: { id?: any; label?: any; hint?: any; base?: any; mode?: any; onModeChange?: any; value?: any; onChange?: any; }) {
  const [focused, setFocused] = useState(false)
  const pct = mode === '1pct' ? 1 : mode === '2pct' ? 2 : null
  const computed = pct != null ? Math.round((Number(base) || 0) * pct / 100) : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7, flexWrap: 'wrap', gap: 6 }}>
        <label htmlFor={id} style={{ fontSize: C.sm, fontWeight: 600, color: C.primary }}>{label}</label>
        <div style={{ display: 'inline-flex', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: 2, gap: 1 }}>
          {[{ v: '1pct', l: '1%' }, { v: '2pct', l: '2%' }, { v: 'manual', l: 'Manual' }].map(opt => (
            <button
              key={opt.v} type="button" onClick={() => onModeChange(opt.v)} aria-pressed={mode === opt.v}
              style={{
                padding: '3px 9px', fontSize: 10, fontWeight: 700, borderRadius: 100, border: 'none',
                fontFamily: C.fontMono, cursor: 'pointer', transition: 'all 0.15s',
                background: mode === opt.v ? C.accent : 'transparent',
                color: mode === opt.v ? C.accentInk : C.faint,
              }}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>
      {mode === 'manual' ? (
        <div style={{ position: 'relative' }}>
          <span aria-hidden="true" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: C.sm, fontWeight: 600, color: focused || value ? C.accent : C.faint, pointerEvents: 'none', transition: 'color 0.2s' }}>S$</span>
          <input
            id={id} type="text" inputMode="text" value={value ?? ''} onChange={onChange}
            placeholder="0"
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{
              width: '100%', boxSizing: 'border-box', background: C.surface,
              border: `1.5px solid ${focused ? C.accent : C.borderControl}`, borderRadius: C.r,
              padding: '11px 12px 11px 36px',
              color: C.primary, fontSize: C.lg, fontFamily: C.fontMono, fontWeight: 500, outline: 'none',
              boxShadow: focused ? `0 0 0 3px ${C.accentBg}` : 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          />
        </div>
      ) : (
        <div style={{ padding: '11px 12px', background: C.bg, border: `1.5px dashed ${C.border}`, borderRadius: C.r, fontFamily: C.fontMono, fontSize: C.lg, color: C.text }}>
          S${computed!.toLocaleString('en-SG')}
          <span style={{ fontSize: C.xs, color: C.faint, fontWeight: 500, marginLeft: 8 }}>({pct}% of {base > 0 ? `S$${Math.round(base).toLocaleString('en-SG')}` : '—'})</span>
        </div>
      )}
      {hint && <p style={{ marginTop: 5, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}

