'use client'

// One scenario's editing column: an editable label, its move list
// (MoveEditor), and a live mini-readout of the current band + verdict so
// the effect of an edit is visible without scrolling to the comparison.

import { C, SGD } from '@/lib/ledger/theme'
import MoveEditor from './MoveEditor'
import { VerdictChip } from './ui'

export default function ScenarioColumn({
  scenario, isBaseline, onChange, onLabelChange, onRemove,
  retireYears, cars, salary, result,
}) {
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
          salary={salary}
        />
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
          {result.warnings?.length > 0 && (
            <ul style={{ margin: '8px 0 0', padding: '0 0 0 16px', fontSize: C.xs, color: C.amberText }}>
              {result.warnings.map((w, i) => (
                <li key={i}>Year {w.year} {w.type}: inputs incomplete</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
