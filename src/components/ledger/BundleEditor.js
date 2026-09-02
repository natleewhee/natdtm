'use client'

// The three assumption bundles — Conservative / Base / Optimistic — each
// a fixed (equity return, property appreciation, inflation) triple.
// Editing any rate re-runs every scenario (R12).

import { C, parseMoney } from '@/lib/ledger/theme'
import { BUNDLE_KEYS } from '@/lib/ledger/scenario/index'
import { PercentInput } from './ui'

const num = parseMoney
const NAME = { conservative: 'Conservative', base: 'Base', optimistic: 'Optimistic' }

export default function BundleEditor({ bundles, onChange }) {
  const setRate = (key, field) => (e) =>
    onChange({ ...bundles, [key]: { ...bundles[key], [field]: num(e.target.value) } })

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {BUNDLE_KEYS.map((key) => (
        <div key={key} style={{ display: 'grid', gridTemplateColumns: '110px repeat(3, 1fr)', gap: 10, alignItems: 'end' }}>
          <div style={{ fontSize: C.sm, fontWeight: 700, color: key === 'base' ? C.primary : C.muted, paddingBottom: 10 }}>{NAME[key]}</div>
          <PercentInput id={`bundle-${key}-equity`} label="Equity return" value={String(bundles[key].equityReturn)} onChange={setRate(key, 'equityReturn')} />
          <PercentInput id={`bundle-${key}-property`} label="Property appr." value={String(bundles[key].propertyAppreciation)} onChange={setRate(key, 'propertyAppreciation')} />
          <PercentInput id={`bundle-${key}-inflation`} label="Inflation" value={String(bundles[key].inflation)} onChange={setRate(key, 'inflation')} />
        </div>
      ))}
    </div>
  )
}
