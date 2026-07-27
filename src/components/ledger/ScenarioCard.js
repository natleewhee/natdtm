'use client'

import { C } from '@/lib/ledger/theme'
import { MoneyInput, SectionDivider } from './ui'

function Toggle({ active, onClick, children }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={active}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
        background: active ? C.accentBg : C.bg, border: `1.5px solid ${active ? C.accent : C.border}`,
        borderRadius: 100, cursor: 'pointer', fontSize: C.xs, fontWeight: 700,
        color: active ? C.accent : C.muted, fontFamily: C.fontBody,
      }}
    >
      {active ? '✓ ' : ''}{children}
    </button>
  )
}

// One scenario's full editable state — used for both the baseline (label
// locked to "Baseline") and any added what-if scenarios. Each field a
// module was synced from another tool shows that provenance; anything
// else is plain manual entry.
export default function ScenarioCard({ scenario, onChange, onRemove, onLabelChange, isBaseline }) {
  const set = (patch) => onChange({ ...scenario, ...patch })
  const setHouse = (patch) => onChange({ ...scenario, house: { ...scenario.house, ...patch } })
  const setCar = (patch) => onChange({ ...scenario, car: { ...scenario.car, ...patch } })

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: '24px 22px', boxShadow: C.shadow }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        {isBaseline ? (
          <div style={{ fontSize: C.lg, fontWeight: 700, color: C.primary }}>Baseline — your numbers today</div>
        ) : (
          <input
            value={scenario.label} onChange={e => onLabelChange(e.target.value)}
            style={{
              fontSize: C.lg, fontWeight: 700, color: C.primary, background: 'none', border: 'none',
              borderBottom: `1.5px dashed ${C.border}`, padding: '0 0 2px', fontFamily: C.fontBody, outline: 'none', maxWidth: '70%',
            }}
          />
        )}
        {!isBaseline && (
          <button type="button" onClick={onRemove} style={{ background: 'none', border: 'none', color: C.muted, fontSize: C.xs, fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }}>
            Remove
          </button>
        )}
      </div>

      <SectionDivider label="Income" />
      <MoneyInput id={`${scenario.id}-salary`} label="Monthly gross salary" value={scenario.salary} onChange={e => set({ salary: e.target.value })} />

      <SectionDivider label="Mortgage" />
      <Toggle active={scenario.hasHouse} onClick={() => set({ hasHouse: !scenario.hasHouse })}>I have a mortgage</Toggle>
      {scenario.hasHouse && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <MoneyInput id={`${scenario.id}-house-value`} label="Current home value" value={scenario.house.propertyValue} onChange={e => setHouse({ propertyValue: e.target.value })} />
          <MoneyInput id={`${scenario.id}-house-balance`} label="Outstanding balance" value={scenario.house.outstandingBalance} onChange={e => setHouse({ outstandingBalance: e.target.value })} />
          <MoneyInput id={`${scenario.id}-house-instalment`} label="Monthly instalment" value={scenario.house.monthlyInstalment} onChange={e => setHouse({ monthlyInstalment: e.target.value })} />
        </div>
      )}
      {scenario.house?.source === 'auto' && scenario.hasHouse && (
        <p style={{ marginTop: 8, fontSize: C.xs, color: C.faint }}>Synced from HouseMuch — edit freely, this won&apos;t change what&apos;s saved there.</p>
      )}

      <SectionDivider label="Car loan" />
      <Toggle active={scenario.hasCar} onClick={() => set({ hasCar: !scenario.hasCar })}>I have a car loan</Toggle>
      {scenario.hasCar && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <MoneyInput id={`${scenario.id}-car-value`} label="Current car value" value={scenario.car.carValue} onChange={e => setCar({ carValue: e.target.value })} />
          <MoneyInput id={`${scenario.id}-car-balance`} label="Loan outstanding" value={scenario.car.loanOutstanding} onChange={e => setCar({ loanOutstanding: e.target.value })} />
          <MoneyInput id={`${scenario.id}-car-instalment`} label="Monthly instalment" value={scenario.car.monthlyInstalment} onChange={e => setCar({ monthlyInstalment: e.target.value })} />
        </div>
      )}
      {scenario.car?.source === 'auto' && scenario.hasCar && (
        <p style={{ marginTop: 8, fontSize: C.xs, color: C.faint }}>Synced from DriveReady — edit freely, this won&apos;t change what&apos;s saved there.</p>
      )}

      <SectionDivider label="CPF & investments" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <MoneyInput id={`${scenario.id}-oa`} label="CPF OA" value={scenario.oaBalance} onChange={e => set({ oaBalance: e.target.value })} />
        <MoneyInput id={`${scenario.id}-sa`} label="CPF SA" value={scenario.saBalance} onChange={e => set({ saBalance: e.target.value })} />
        <MoneyInput id={`${scenario.id}-ma`} label="CPF MA" value={scenario.maBalance} onChange={e => set({ maBalance: e.target.value })} />
        <MoneyInput id={`${scenario.id}-inv`} label="Investment portfolio" value={scenario.investmentBalance} onChange={e => set({ investmentBalance: e.target.value })} />
      </div>
    </div>
  )
}
