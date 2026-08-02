'use client'

import { useState } from 'react'
import { C } from '@/lib/child/theme'

export function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 18px' }}>
      <span style={{ fontSize: C.xs, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

export function NumberInput({ id, label, hint, value, onChange, suffix }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 7 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type="text" inputMode="decimal" value={value ?? ''} onChange={onChange}
          placeholder="0"
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box', background: C.surface,
            border: `1.5px solid ${focused ? C.accent : C.border}`, borderRadius: C.r,
            padding: suffix ? '11px 40px 11px 12px' : '11px 12px', color: C.primary, fontSize: C.lg,
            fontFamily: C.fontMono, fontWeight: 500, outline: 'none',
            boxShadow: focused ? `0 0 0 3px ${C.accentBg}` : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />
        {suffix && <span aria-hidden="true" style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: C.sm, fontWeight: 600, color: C.faint, pointerEvents: 'none' }}>{suffix}</span>}
      </div>
      {hint && <p style={{ marginTop: 5, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}

// Two/three-way pill toggle — same visual shape used across the other tools.
export function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: C.r, padding: 3, gap: 2 }}>
      {options.map(opt => (
        <button
          key={opt.value} type="button" onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          style={{
            padding: '7px 16px', fontSize: C.xs, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', cursor: 'pointer', borderRadius: 6, border: 'none',
            fontFamily: C.fontBody, background: value === opt.value ? C.coah : 'transparent',
            color: value === opt.value ? '#fff' : C.muted, transition: 'all 0.2s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// Pill toggle for a boolean setting (e.g. "using a registered childcare
// centre") — same shape as ledger/ScenarioCard.js's local Toggle.
export function Toggle({ active, onClick, children }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={active}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px',
        background: active ? C.accentBg : C.bg, border: `1.5px solid ${active ? C.accent : C.border}`,
        borderRadius: 100, cursor: 'pointer', fontSize: C.xs, fontWeight: 700,
        color: active ? C.accent : C.muted, fontFamily: C.fontBody,
      }}
    >
      {active ? '✓ ' : ''}{children}
    </button>
  )
}
