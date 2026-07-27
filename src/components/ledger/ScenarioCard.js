'use client'

import { C, SGD, parseMoney } from '@/lib/ledger/theme'
import { calcHousePurchase } from '@/lib/ledger/calc'
import { MoneyInput, PercentInput, NumberInput, SectionDivider, Segmented } from './ui'

const num = parseMoney

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

const PURCHASE_DEFAULTS = { price: '', downpaymentPct: '25', rate: '2.60', tenureYears: '25', otherFees: '' }

// One scenario's full editable state — used for both the baseline (label
// locked to "Baseline") and any added what-if scenarios. Each field a
// module was synced from another tool shows that provenance; anything
// else is plain manual entry. A house can be either an existing mortgage
// (plain fields) or a "buying a new house" purchase (price/downpayment/
// rate/tenure, with loan/instalment/BSD derived automatically — same
// math as HouseMuch's NextPurchase) which also draws down cash savings.
export default function ScenarioCard({ scenario, onChange, onRemove, onLabelChange, isBaseline }) {
  const set = (patch) => onChange({ ...scenario, ...patch })
  const setHouse = (patch) => onChange({ ...scenario, house: { ...scenario.house, ...patch } })
  const setCar = (patch) => onChange({ ...scenario, car: { ...scenario.car, ...patch } })

  const houseMode = scenario.house?.mode || 'existing'
  const setHouseMode = (mode) => setHouse(mode === 'purchase' ? { ...PURCHASE_DEFAULTS, ...scenario.house, mode } : { mode })

  const purchasePreview = scenario.hasHouse && houseMode === 'purchase'
    ? calcHousePurchase({
        price: num(scenario.house.price), downpaymentPct: num(scenario.house.downpaymentPct) || 25,
        rate: num(scenario.house.rate), tenureYears: num(scenario.house.tenureYears) || 25,
        otherFees: num(scenario.house.otherFees),
      })
    : null
  const cashShortfall = purchasePreview ? purchasePreview.cashNeeded - num(scenario.cashSavings) : 0

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
        <>
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <Segmented
              value={houseMode} onChange={setHouseMode}
              options={[{ value: 'existing', label: 'Existing mortgage' }, { value: 'purchase', label: 'Buying a new house' }]}
            />
          </div>

          {houseMode === 'existing' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <MoneyInput id={`${scenario.id}-house-value`} label="Current home value" value={scenario.house.propertyValue} onChange={e => setHouse({ propertyValue: e.target.value })} />
                <MoneyInput id={`${scenario.id}-house-balance`} label="Outstanding balance" value={scenario.house.outstandingBalance} onChange={e => setHouse({ outstandingBalance: e.target.value })} />
                <MoneyInput id={`${scenario.id}-house-instalment`} label="Monthly instalment" value={scenario.house.monthlyInstalment} onChange={e => setHouse({ monthlyInstalment: e.target.value })} />
              </div>
              {scenario.house?.source === 'auto' && (
                <p style={{ marginTop: 8, fontSize: C.xs, color: C.faint }}>Synced from HouseMuch — edit freely, this won&apos;t change what&apos;s saved there.</p>
              )}
            </>
          )}

          {houseMode === 'purchase' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                <MoneyInput id={`${scenario.id}-house-price`} label="New house price" value={scenario.house.price} onChange={e => setHouse({ price: e.target.value })} />
                <NumberInput id={`${scenario.id}-house-tenure`} label="Loan tenure" value={scenario.house.tenureYears} onChange={e => setHouse({ tenureYears: e.target.value })} suffix="years" />
                <PercentInput id={`${scenario.id}-house-rate`} label="Mortgage rate (p.a.)" value={scenario.house.rate} onChange={e => setHouse({ rate: e.target.value })} />
                <MoneyInput id={`${scenario.id}-house-fees`} label="Legal/other fees" hint="Optional" value={scenario.house.otherFees} onChange={e => setHouse({ otherFees: e.target.value })} />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 7 }}>Downpayment</div>
                <Segmented
                  value={scenario.house.downpaymentPct === '25' ? '25' : 'custom'}
                  onChange={v => setHouse({ downpaymentPct: v === '25' ? '25' : (scenario.house.downpaymentPct === '25' ? '30' : scenario.house.downpaymentPct) })}
                  options={[{ value: '25', label: '75% loan (25% down)' }, { value: 'custom', label: 'Custom' }]}
                />
                {scenario.house.downpaymentPct !== '25' && (
                  <div style={{ marginTop: 10, maxWidth: 160 }}>
                    <PercentInput id={`${scenario.id}-house-down`} label="Downpayment %" value={scenario.house.downpaymentPct} onChange={e => setHouse({ downpaymentPct: e.target.value })} />
                  </div>
                )}
              </div>

              {purchasePreview && num(scenario.house.price) > 0 && (
                <div style={{ marginTop: 14, padding: '11px 14px', background: C.bg, border: `1px dashed ${C.border}`, borderRadius: C.r }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: C.fontMono, fontSize: C.sm, marginBottom: 6 }}>
                    <span style={{ color: C.text }}>Loan {SGD(purchasePreview.loanAmount)}</span>
                    <span style={{ color: C.text, fontWeight: 700 }}>{SGD(purchasePreview.monthlyInstalment)}/mo</span>
                    <span style={{ color: C.muted }}>BSD {SGD(purchasePreview.bsd)}</span>
                  </div>
                  <div style={{ fontSize: C.xs, color: C.muted }}>
                    Cash needed upfront (downpayment + BSD + fees): <strong style={{ color: C.text }}>{SGD(purchasePreview.cashNeeded)}</strong>
                  </div>
                  {cashShortfall > 0 && (
                    <div style={{ fontSize: C.xs, color: C.redText, marginTop: 6, fontWeight: 600 }}>
                      Short by {SGD(cashShortfall)} against the cash savings entered below.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
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

      <SectionDivider label="Cash & investments" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <MoneyInput id={`${scenario.id}-cash`} label="Cash savings" hint="Drawn down automatically if you're buying a new house above" value={scenario.cashSavings} onChange={e => set({ cashSavings: e.target.value })} />
        <MoneyInput id={`${scenario.id}-inv`} label="Investment portfolio" value={scenario.investmentBalance} onChange={e => set({ investmentBalance: e.target.value })} />
        <MoneyInput id={`${scenario.id}-oa`} label="CPF OA" value={scenario.oaBalance} onChange={e => set({ oaBalance: e.target.value })} />
        <MoneyInput id={`${scenario.id}-sa`} label="CPF SA" value={scenario.saBalance} onChange={e => set({ saBalance: e.target.value })} />
        <MoneyInput id={`${scenario.id}-ma`} label="CPF MA" value={scenario.maBalance} onChange={e => set({ maBalance: e.target.value })} />
      </div>
    </div>
  )
}
