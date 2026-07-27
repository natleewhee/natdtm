'use client'

import { C, SGD } from '@/lib/ledger/theme'

function Cell({ value, tone, bold }) {
  const color = tone === 'red' ? C.redText : tone === 'green' ? C.greenText : C.text
  return (
    <td style={{ padding: '10px 14px', fontFamily: C.fontMono, fontSize: C.sm, fontWeight: bold ? 700 : 500, color, textAlign: 'right', whiteSpace: 'nowrap' }}>
      {value}
    </td>
  )
}

function RowLabel({ children }) {
  return <td style={{ padding: '10px 14px', fontSize: C.sm, color: C.muted, fontWeight: 600 }}>{children}</td>
}

// Baseline / Scenario A / Scenario B side by side — one row per metric,
// so the tradeoff between scenarios reads across, not just down.
export default function ComparisonTable({ rows }) {
  if (!rows || rows.length === 0) return null

  return (
    <div style={{ overflowX: 'auto', marginTop: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.border}` }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Metric</th>
            {rows.map(r => (
              <th key={r.label} style={{ padding: '10px 14px', textAlign: 'right', fontSize: C.xs, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{r.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <RowLabel>Net worth</RowLabel>
            {rows.map(r => <Cell key={r.label} value={SGD(r.netWorth.netWorth)} bold />)}
          </tr>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <RowLabel>Monthly commitments (loans + insurance)</RowLabel>
            {rows.map(r => <Cell key={r.label} value={SGD(r.obligations.total)} />)}
          </tr>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <RowLabel>TDSR (loans only, limit 55%)</RowLabel>
            {rows.map(r => (
              <Cell key={r.label} value={r.tdsr.tdsr != null ? `${(r.tdsr.tdsr * 100).toFixed(0)}%` : '—'} tone={r.tdsr.exceeded ? 'red' : undefined} bold={r.tdsr.exceeded} />
            ))}
          </tr>
          {rows.some(r => r.msr?.applicable) && (
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <RowLabel>MSR (HDB only, limit 30%)</RowLabel>
              {rows.map(r => (
                <Cell
                  key={r.label}
                  value={r.msr?.applicable && r.msr.msr != null ? `${(r.msr.msr * 100).toFixed(0)}%` : '—'}
                  tone={r.msr?.exceeded ? 'red' : undefined} bold={r.msr?.exceeded}
                />
              ))}
            </tr>
          )}
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <RowLabel>Investable now → once loans end</RowLabel>
            {rows.map(r => (
              <Cell
                key={r.label}
                value={
                  Math.round(r.finalCapacity) > Math.round(r.investmentCapacity)
                    ? `${SGD(r.investmentCapacity)} → ${SGD(r.finalCapacity)}`
                    : SGD(r.investmentCapacity)
                }
              />
            ))}
          </tr>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <RowLabel>Projected portfolio at retirement</RowLabel>
            {rows.map(r => <Cell key={r.label} value={SGD(r.retirement.target.projectedPortfolio)} />)}
          </tr>
          <tr>
            <RowLabel>Retirement gap / surplus</RowLabel>
            {rows.map(r => (
              <Cell
                key={r.label}
                value={`${r.retirement.target.onTrack ? '+' : '−'}${SGD(Math.abs(r.retirement.target.gap ?? 0))}`}
                tone={r.retirement.target.onTrack ? 'green' : 'red'} bold
              />
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
