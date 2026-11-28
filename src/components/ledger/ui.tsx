'use client'

import { C } from '@/lib/shared/theme'

// The enough / tight / short verdict pill.
// Token NAMES, resolved against `C` at render — `C` is mutated in place on
// a light/dark switch, so storing the hex here would freeze one mode's
// palette into every verdict pill.
const CHIP: Record<string, any> = {
  'comfortably enough': { bg: 'greenBg', fg: 'greenText', label: 'Comfortably enough' },
  tight: { bg: 'amberBg', fg: 'amberText', label: 'Tight' },
  short: { bg: 'redBg', fg: 'redText', label: 'Short' },
  'no-reference': { bg: 'accentBg', fg: 'muted', label: 'Set a monthly spend to see a verdict' },
}
export function VerdictChip({ read }: { read?: any; }) {
  const c = CHIP[read] || CHIP['no-reference']
  return (
    <span style={{ display: 'inline-block', background: (C as any)[c.bg], color: (C as any)[c.fg], fontSize: C.xs, fontWeight: 700, padding: '4px 10px', borderRadius: C.r }}>
      {c.label}
    </span>
  )
}

