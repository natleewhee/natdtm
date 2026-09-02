'use client'

// One scenario's editing column: an editable label, its move list
// (MoveEditor), and a live mini-readout of the current band + verdict so
// the effect of an edit is visible without scrolling to the comparison.

import { C, SGD } from '@/lib/ledger/theme'
import MoveEditor from './MoveEditor'
import { VerdictChip } from './ui'

// A resolver / projection warning -> a one-line human note.
function warningText(w) {
  switch (w.warning) {
    case 'cash-shortfall':
      return `This path runs cash about ${SGD(w.amount)} short — it may not be fundable as laid out.`
    case 'investment-shortfall':
      return `This path draws the investment balance about ${SGD(w.amount)} negative along the way.`
    case 'after-retirement':
      return `A ${w.type.replace('-', ' ')} move at year ${w.year} is at or past retirement — ignored.`
    case 'lump-after-retirement':
      return `An education lump at year ${w.year} lands after retirement — ignored.`
    case 'payoff-after-retirement':
      return `A loan/support payoff at year ${w.year} lands after retirement — the cost is carried to retirement.`
    case 'sale-inputs-incomplete':
      return `Year ${w.year}: fill in the sale's purchase and sale dates.`
    case 'car-inputs-incomplete':
      return `Year ${w.year}: pick a car and enter a down payment.`
    case 'car-down-too-low':
      return `Year ${w.year}: the down payment is below the minimum a car loan allows.`
    default:
      return `Year ${w.year}: ${w.type} inputs incomplete.`
  }
}

export default function ScenarioColumn({
  scenario, isBaseline, onChange, onLabelChange, onRemove,
  retireYears, cars, carsLoading, invalidMoves = 0, result,
}) {
  // While the car catalogue is still loading, a "car incomplete" warning
  // is a false alarm — suppress it until the list is in.
  const warnings = (result?.warnings || []).filter(
    (w) => !(carsLoading && w.warning === 'car-inputs-incomplete'),
  )

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: 18, boxShadow: C.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {isBaseline ? (
          <span style={{ fontSize: C.sm, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>
            {scenario.label}
          </span>
        ) : (
          <input
            aria-label="Scenario name" value={scenario.label}
            onChange={(e) => onLabelChange(e.target.value)}
            style={{ flex: 1, fontSize: C.sm, fontWeight: 700, color: C.primary, border: `1px solid ${C.border}`, borderRadius: C.r, padding: '6px 10px', background: C.bg, outline: 'none' }}
          />
        )}
        {!isBaseline && (
          <button type="button" onClick={onRemove} aria-label="Remove scenario"
            style={{ border: 'none', background: 'transparent', color: C.faint, cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
        )}
      </div>

      {isBaseline ? (
        <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.5, margin: '0 0 12px' }}>
          Your current path — no moves. Every scenario is measured against this.
        </p>
      ) : (
        <MoveEditor
          moves={scenario.moves}
          onChange={(moves) => onChange({ ...scenario, moves })}
          retireYears={retireYears}
          cars={cars}
        />
      )}

      {invalidMoves > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: C.xs, color: C.redText, fontWeight: 600 }}>
          {invalidMoves} move{invalidMoves > 1 ? 's' : ''} with an invalid year {invalidMoves > 1 ? 'are' : 'is'} left out of the projection.
        </p>
      )}

      {result && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: C.fontMono, fontSize: C.sm, marginBottom: 6 }}>
            <span style={{ color: C.faint }}>{SGD(result.band.conservative)}</span>
            <span style={{ color: C.primary, fontWeight: 700, margin: '0 6px' }}>{SGD(result.band.base)}</span>
            <span style={{ color: C.faint }}>{SGD(result.band.optimistic)}</span>
            <span style={{ color: C.faint, fontSize: C.xs }}> /mo</span>
          </div>
          <VerdictChip read={result.read} />
          {warnings.length > 0 && (
            <ul style={{ margin: '8px 0 0', padding: '0 0 0 16px', fontSize: C.xs, color: C.amberText, lineHeight: 1.5 }}>
              {warnings.map((w, i) => <li key={i}>{warningText(w)}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
