'use client'

// Side-by-side comparison: baseline + up to two scenarios, one row per
// metric so the trade-off reads across, not just down. Headline band with
// the Base value marked, the enough/tight/short chip, net worth and asset
// mix at retirement, then the secondary today's-net-worth / TDSR reads.

import { C, SGD } from '@/lib/ledger/theme'
import { VerdictChip } from './ui'

function HeadCell({ children, accent }) {
  return (
    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: C.xs, fontWeight: 700, color: accent ? C.accent : C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )
}
function Label({ children }) {
  return <td style={{ padding: '10px 12px', fontSize: C.sm, color: C.muted, fontWeight: 600 }}>{children}</td>
}
function Cell({ children, bold }) {
  return <td style={{ padding: '10px 12px', fontFamily: C.fontMono, fontSize: C.sm, fontWeight: bold ? 700 : 500, color: C.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{children}</td>
}

function Band({ band }) {
  return (
    <span style={{ fontFamily: C.fontMono, whiteSpace: 'nowrap' }}>
      <span style={{ color: C.faint, fontSize: C.xs }}>{SGD(band.conservative)}</span>
      <span style={{ color: C.primary, fontWeight: 700, margin: '0 6px' }}>{SGD(band.base)}</span>
      <span style={{ color: C.faint, fontSize: C.xs }}>{SGD(band.optimistic)}</span>
    </span>
  )
}

export default function ComparisonRow({ columns, today }) {
  if (!columns || columns.length === 0) return null
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.border}` }}>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Metric</th>
            {columns.map((c, i) => <HeadCell key={c.label} accent={i > 0}>{c.label}</HeadCell>)}
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <Label>Sustainable monthly withdrawal<br /><span style={{ fontSize: C.xs, color: C.faint, fontWeight: 400 }}>low · <strong style={{ color: C.muted }}>base</strong> · high</span></Label>
            {columns.map(c => <td key={c.label} style={{ padding: '10px 12px', textAlign: 'right' }}><Band band={c.result.band} /></td>)}
          </tr>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <Label>Verdict vs. your monthly spend</Label>
            {columns.map(c => <td key={c.label} style={{ padding: '10px 12px', textAlign: 'right' }}><VerdictChip read={c.result.read} /></td>)}
          </tr>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <Label>Net worth at retirement</Label>
            {columns.map(c => <Cell key={c.label} bold>{SGD(c.result.netWorthAtRetirement)}</Cell>)}
          </tr>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <Label>Mix at retirement — liquid</Label>
            {columns.map(c => <Cell key={c.label}>{SGD(c.result.assetMix.liquid)}</Cell>)}
          </tr>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <Label>Mix at retirement — property</Label>
            {columns.map(c => <Cell key={c.label}>{SGD(c.result.assetMix.property)}</Cell>)}
          </tr>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <Label>Mix at retirement — cash</Label>
            {columns.map(c => <Cell key={c.label}>{SGD(c.result.assetMix.cash)}</Cell>)}
          </tr>
        </tbody>
      </table>

      {today && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: C.sm }}>
          <div>
            <span style={{ color: C.muted, fontWeight: 600 }}>Net worth today</span>{' '}
            <span style={{ fontFamily: C.fontMono, fontWeight: 700, color: C.primary }}>{SGD(today.netWorth.netWorth)}</span>
          </div>
          <div>
            <span style={{ color: C.muted, fontWeight: 600 }}>TDSR across every loan</span>{' '}
            <span style={{ fontFamily: C.fontMono, fontWeight: 700, color: today.tdsr.exceeded ? C.redText : C.primary }}>
              {today.tdsr.tdsr != null ? `${(today.tdsr.tdsr * 100).toFixed(0)}%` : '—'}
            </span>
            <span style={{ color: C.faint }}> (limit 55%)</span>
          </div>
        </div>
      )}
    </div>
  )
}
