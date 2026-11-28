'use client'

// src/components/shared/inputs.tsx
// The one form kit every tool uses (super-app plan U2). It replaces five
// copies in components/{drive,house,ledger,retire,tax}/ui.js (four of them
// byte-identical) and the inline set in /drive/renew-or-replace. A
// per-tool ui.js now holds only components that really belong to that
// tool (drive: StatBox, GaugeBar; house: FeeInput; ledger: VerdictChip).
//
// Every field takes `id` and renders a real <label htmlFor={id}> so
// screen readers and tap targets work; `hint` is wired up with
// aria-describedby.

import { useState, type ReactPortal, type ReactNode, type ReactElement, type Key, type JSXElementConstructor } from 'react'
import type { CSSProperties } from 'react'
import { C } from '@/lib/shared/theme'
import { parseMoney, parseMoneyOrNull } from '@/lib/shared/money'

// Styles are built at render, never at module load: `C` is mutated in
// place on a light/dark switch, so a style object captured once would
// freeze one mode's colours (kit-guard.test.ts checks for this).
const labelStyle = (): CSSProperties => ({ display: 'block', fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 7 })
const hintStyle = (): CSSProperties => ({ marginTop: 5, fontSize: C.xs, color: C.muted, lineHeight: 1.5 })
const affixStyle = (): CSSProperties => ({ position: 'absolute', top: '50%', transform: 'translateY(-50%)', fontSize: C.sm, fontWeight: 600, pointerEvents: 'none' })

function fieldStyle(focused: boolean, { padding = '11px 12px', fontSize = C.lg, fontFamily = C.fontMono, border }: { padding?: string; fontSize?: string; fontFamily?: string; border?: string } = {}): CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box', background: C.surface,
    border: `1.5px solid ${border ?? (focused ? C.accent : C.borderControl)}`, borderRadius: C.r,
    padding, color: C.primary, fontSize, fontFamily, fontWeight: 500, outline: 'none',
    boxShadow: focused ? `0 0 0 3px ${C.accentBg}` : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }
}

function Label({ id, children }: { id?: any; children?: any; }) {
  if (children == null || children === '') return null
  return <label htmlFor={id} style={labelStyle()}>{children}</label>
}

function Hint({ id, children }: { id?: any; children?: any; }) {
  if (!children) return null
  return <p id={id} style={hintStyle()}>{children}</p>
}

/**
 * A labelled rule between groups of fields.
 * @param {{ label: string, align?: 'start' | 'center' }} props
 * `center` is DriveReady's style: a rule either side of a muted label.
 */
export function SectionDivider({ label, align = 'start' }: { label?: any; align?: any; }) {
  if (align === 'center') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: C.xs, fontWeight: 700, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 18px' }}>
      <span style={{ fontSize: C.xs, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

/**
 * S$ money field that understands "80k" / "1.2m" shorthand.
 *
 * The raw text is left alone while focused, so a half-typed decimal
 * ("1." before the "2") is never rounded away; it is normalised on blur.
 * - default: normalises to a plain number string ("1200000").
 * - `grouped` (DriveReady): normalises to a comma-grouped string
 *   ("1,200,000"), opens the numeric keypad, and keeps the accent border
 *   once filled.
 */
export function MoneyInput({ id, label, hint, value, onChange, placeholder = '0', grouped = false }: { id?: any; label?: any; hint?: any; value?: any; onChange?: any; placeholder?: any; grouped?: any; }) {
  const [focused, setFocused] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  const handleBlur = () => {
    setFocused(false)
    if (grouped) {
      const parsed = parseMoneyOrNull(value)
      if (parsed != null && String(parsed) !== String(value ?? '')) {
        onChange({ target: { value: parsed.toLocaleString('en-SG') } })
      }
      return
    }
    const parsed = parseMoney(value)
    if (parsed && String(parsed) !== String(value ?? '')) {
      onChange({ target: { value: String(parsed) } })
    }
  }
  return (
    <div>
      <Label id={id}>{label}</Label>
      <div style={{ position: 'relative' }}>
        <span aria-hidden="true" style={{ ...affixStyle(), left: 13, color: focused || value ? C.accent : C.faint, transition: 'color 0.2s' }}>S$</span>
        <input
          id={id} type="text" inputMode={grouped ? 'numeric' : 'text'} value={value ?? ''} onChange={onChange}
          placeholder={placeholder} aria-describedby={hintId}
          onFocus={() => setFocused(true)} onBlur={handleBlur}
          style={fieldStyle(focused, { padding: '11px 12px 11px 36px', border: grouped && !focused ? (value ? C.accent : C.borderControl) : undefined })}
        />
      </div>
      <Hint id={hintId}>{hint}</Hint>
    </div>
  )
}

/** Percentage field with a trailing % affix. */
export function PercentInput({ id, label, hint, value, onChange, placeholder = '0.00' }: { id?: any; label?: any; hint?: any; value?: any; onChange?: any; placeholder?: any; }) {
  const [focused, setFocused] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div>
      <Label id={id}>{label}</Label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type="text" inputMode="decimal" value={value ?? ''} onChange={onChange}
          placeholder={placeholder} aria-describedby={hintId}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={fieldStyle(focused, { padding: '11px 32px 11px 12px' })}
        />
        <span aria-hidden="true" style={{ ...affixStyle(), right: 13, color: C.faint }}>%</span>
      </div>
      <Hint id={hintId}>{hint}</Hint>
    </div>
  )
}

/** Plain number field with an optional trailing unit ("yrs", "mths"). */
export function NumberInput({ id, label, hint, value, onChange, suffix }: { id?: any; label?: any; hint?: any; value?: any; onChange?: any; suffix?: any; }) {
  const [focused, setFocused] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div>
      <Label id={id}>{label}</Label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type="text" inputMode="decimal" value={value ?? ''} onChange={onChange}
          placeholder="0" aria-describedby={hintId}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={fieldStyle(focused, { padding: suffix ? '11px 40px 11px 12px' : '11px 12px' })}
        />
        {suffix && <span aria-hidden="true" style={{ ...affixStyle(), right: 13, color: C.faint }}>{suffix}</span>}
      </div>
      <Hint id={hintId}>{hint}</Hint>
    </div>
  )
}

/** Plain text field (e.g. ISO dates typed by hand). */
export function TextInput({ id, label, hint, value, onChange, placeholder }: { id?: any; label?: any; hint?: any; value?: any; onChange?: any; placeholder?: any; }) {
  const [focused, setFocused] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div>
      <Label id={id}>{label}</Label>
      <input
        id={id} type="text" value={value ?? ''} onChange={onChange} placeholder={placeholder}
        aria-describedby={hintId}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={fieldStyle(focused, { fontSize: C.base })}
      />
      <Hint id={hintId}>{hint}</Hint>
    </div>
  )
}

/** Native date picker styled to match the input row. */
export function DateInput({ id, label, hint, value, onChange }: { id?: any; label?: any; hint?: any; value?: any; onChange?: any; }) {
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div>
      <Label id={id}>{label}</Label>
      <input
        id={id} type="date" value={value ?? ''} onChange={onChange} aria-describedby={hintId}
        style={{ ...fieldStyle(false, { padding: '10px 12px', fontSize: C.base, fontFamily: C.fontBody, border: C.border }), colorScheme: 'dark' }}
      />
      <Hint id={hintId}>{hint}</Hint>
    </div>
  )
}

/** Native select styled to match the input row. `options`: [{ value, label }]. */
export function SelectInput({ id, label, hint, value, onChange, options }: { id?: any; label?: any; hint?: any; value?: any; onChange?: any; options?: any; }) {
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div>
      <Label id={id}>{label}</Label>
      <select
        id={id} value={value} onChange={onChange} aria-describedby={hintId}
        style={fieldStyle(false, { fontSize: C.base, fontFamily: C.fontBody, border: C.border })}
      >
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Hint id={hintId}>{hint}</Hint>
    </div>
  )
}

/**
 * Range slider with the current value shown beside the label and, unless
 * `showRange` is false, the min/max under the track. `onChange` receives
 * the number.
 */
export function Slider({ id, label, hint, value, onChange, min, max, step = 1, unit = '', showRange = true }: { id?: any; label?: any; hint?: any; value?: any; onChange?: any; min?: any; max?: any; step?: any; unit?: any; showRange?: any; }) {
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Label id={id}>{label}</Label>
        <span style={{ fontSize: C.sm, fontFamily: C.fontMono, fontWeight: 700, color: C.primary }}>{value}{unit}</span>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value} aria-describedby={hintId}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: C.accent }}
      />
      {showRange && (
        <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.faint, marginTop: 2 }}>
          <span>{min}{unit}</span><span>{max}{unit}</span>
        </div>
      )}
      <Hint id={hintId}>{hint}</Hint>
    </div>
  )
}

/** Two/three-way pill toggle. `options`: [{ value, label }]. */
export function Segmented({ options, value, onChange }: { options?: any; value?: any; onChange?: any; }) {
  return (
    <div style={{ display: 'inline-flex', background: C.surface, border: `1.5px solid ${C.borderControl}`, borderRadius: C.r, padding: 3, gap: 2 }}>
      {options.map((opt: any) => (
        <button
          key={opt.value} type="button" onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          style={{
            padding: '7px 16px', minHeight: 38, fontSize: C.xs, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', cursor: 'pointer', borderRadius: 6, border: 'none',
            fontFamily: C.fontBody, background: value === opt.value ? C.ndtm : 'transparent',
            color: value === opt.value ? '#fff' : C.muted, transition: 'all 0.2s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/** Pill toggle for a boolean setting ("I have a mortgage"). */
export function Toggle({ active, onClick, children }: { active?: any; onClick?: any; children?: any; }) {
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

/**
 * Shows a computed value by default, with an "I know the real number"
 * link that swaps it for an editable money field — for figures the
 * calculator can estimate but the user may know exactly (outstanding
 * loan, CPF accrued interest, SSD).
 */
export function OverrideField({ id, label, computedValue, computedHint, overrideValue, onOverrideChange, formatValue }: { id?: any; label?: any; computedValue?: any; computedHint?: any; overrideValue?: any; onOverrideChange?: any; formatValue?: any; }) {
  const [editing, setEditing] = useState(overrideValue != null && overrideValue !== '')
  const display = formatValue ? formatValue(computedValue) : computedValue

  if (!editing) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: C.sm, fontWeight: 600, color: C.primary }}>{label}</span>
          <button type="button" onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: C.xs, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            I know the real number →
          </button>
        </div>
        <div style={{ padding: '11px 12px', background: C.bg, border: `1.5px dashed ${C.border}`, borderRadius: C.r, fontFamily: C.fontMono, fontSize: C.lg, color: C.text }}>
          {display}
        </div>
        {computedHint && <p style={hintStyle()}>{computedHint}</p>}
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
