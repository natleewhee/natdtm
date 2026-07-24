'use client'

import { useState } from 'react'
import { C } from '@/lib/house/theme'

export function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 18px' }}>
      <span style={{ fontSize: C.xs, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

export function MoneyInput({ id, label, hint, value, onChange, placeholder = '0' }) {
  const [focused, setFocused] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 7 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span aria-hidden="true" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: C.sm, fontWeight: 600, color: focused || value ? C.accent : C.faint, pointerEvents: 'none', transition: 'color 0.2s' }}>S$</span>
        <input
          id={id} type="text" inputMode="numeric" value={value ?? ''} onChange={onChange}
          placeholder={placeholder} aria-describedby={hintId}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box', background: C.surface,
            border: `1.5px solid ${focused ? C.accent : C.border}`, borderRadius: C.r,
            padding: '11px 12px 11px 36px', color: C.primary, fontSize: C.lg,
            fontFamily: C.fontMono, fontWeight: 500, outline: 'none',
            boxShadow: focused ? `0 0 0 3px ${C.accentBg}` : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />
      </div>
      {hint && <p id={hintId} style={{ marginTop: 5, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}

export function PercentInput({ id, label, hint, value, onChange, step = '0.01' }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 7 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type="text" inputMode="decimal" value={value ?? ''} onChange={onChange}
          placeholder="0.00" step={step}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box', background: C.surface,
            border: `1.5px solid ${focused ? C.accent : C.border}`, borderRadius: C.r,
            padding: '11px 32px 11px 12px', color: C.primary, fontSize: C.lg,
            fontFamily: C.fontMono, fontWeight: 500, outline: 'none',
            boxShadow: focused ? `0 0 0 3px ${C.accentBg}` : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />
        <span aria-hidden="true" style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: C.sm, fontWeight: 600, color: C.faint, pointerEvents: 'none' }}>%</span>
      </div>
      {hint && <p style={{ marginTop: 5, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>{hint}</p>}
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

export function DateInput({ id, label, hint, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 7 }}>{label}</label>
      <input
        id={id} type="date" value={value ?? ''} onChange={onChange}
        style={{
          width: '100%', boxSizing: 'border-box', background: C.surface,
          border: `1.5px solid ${C.border}`, borderRadius: C.r,
          padding: '10px 12px', color: C.primary, fontSize: C.base,
          fontFamily: C.fontBody, outline: 'none', colorScheme: 'dark',
        }}
      />
      {hint && <p style={{ marginTop: 5, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}

// Two/three-way pill toggle — same visual shape as Drive's Single/Compare switch.
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

// A fee field that can be entered as a flat dollar amount or a percentage
// of some base (purchase price, sale price) — agent commissions are
// commonly quoted as a %, but the calculator needs a dollar figure, so
// this resolves it and shows the $ equivalent as you type in percent mode.
export function FeeInput({ id, label, hint, base, mode, onModeChange, value, onChange }) {
  const [focused, setFocused] = useState(false)
  const num = parseFloat(String(value ?? '').replace(/,/g, ''))
  const resolved = Number.isFinite(num) ? num : 0
  const preview = mode === 'percent' && base > 0 && value
    ? `≈ S$${Math.round(base * resolved / 100).toLocaleString('en-SG')}`
    : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
        <label htmlFor={id} style={{ fontSize: C.sm, fontWeight: 600, color: C.primary }}>{label}</label>
        <div style={{ display: 'inline-flex', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: 2, gap: 1 }}>
          {[{ v: 'amount', l: 'S$' }, { v: 'percent', l: '%' }].map(opt => (
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
      <div style={{ position: 'relative' }}>
        <span aria-hidden="true" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: C.sm, fontWeight: 600, color: focused || value ? C.accent : C.faint, pointerEvents: 'none', transition: 'color 0.2s' }}>
          {mode === 'percent' ? '' : 'S$'}
        </span>
        <input
          id={id} type="text" inputMode="decimal" value={value ?? ''} onChange={onChange}
          placeholder={mode === 'percent' ? '0.00' : '0'}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box', background: C.surface,
            border: `1.5px solid ${focused ? C.accent : C.border}`, borderRadius: C.r,
            padding: mode === 'percent' ? '11px 32px 11px 12px' : '11px 12px 11px 36px',
            color: C.primary, fontSize: C.lg, fontFamily: C.fontMono, fontWeight: 500, outline: 'none',
            boxShadow: focused ? `0 0 0 3px ${C.accentBg}` : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />
        {mode === 'percent' && <span aria-hidden="true" style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: C.sm, fontWeight: 600, color: C.faint, pointerEvents: 'none' }}>%</span>}
      </div>
      {preview && <p style={{ marginTop: 5, fontSize: C.xs, color: C.accent, fontWeight: 600 }}>{preview}</p>}
      {hint && <p style={{ marginTop: 5, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}

// A field that shows a computed value by default, with a small "override"
// link that swaps it for an editable input — used for outstanding loan
// balance, CPF accrued interest, and SSD, all of which have a computed
// default the calculator can produce but a real number you may already
// know is always better.
export function OverrideField({ id, label, computedValue, computedHint, overrideValue, onOverrideChange, formatValue }) {
  const [editing, setEditing] = useState(overrideValue != null && overrideValue !== '')
  const display = formatValue ? formatValue(computedValue) : computedValue

  if (!editing) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={{ fontSize: C.sm, fontWeight: 600, color: C.primary }}>{label}</label>
          <button type="button" onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: C.xs, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            I know the real number →
          </button>
        </div>
        <div style={{ padding: '11px 12px', background: C.bg, border: `1.5px dashed ${C.border}`, borderRadius: C.r, fontFamily: C.fontMono, fontSize: C.lg, color: C.text }}>
          {display}
        </div>
        {computedHint && <p style={{ marginTop: 5, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>{computedHint}</p>}
      </div>
    )
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
        <label htmlFor={id} style={{ fontSize: C.sm, fontWeight: 600, color: C.primary }}>{label}</label>
        <button
          type="button"
          onClick={() => { setEditing(false); onOverrideChange({ target: { value: '' } }) }}
          style={{ background: 'none', border: 'none', color: C.faint, fontSize: C.xs, fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          Use estimate instead
        </button>
      </div>
      <MoneyInput id={id} value={overrideValue} onChange={onOverrideChange} placeholder={String(Math.round(computedValue))} />
    </div>
  )
}
