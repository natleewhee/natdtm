'use client'

import { C, SGD, parseMoney } from '@/lib/ledger/theme'
import { calcHousePurchase, calcHouseUpgrade } from '@/lib/ledger/calc'
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
const UPGRADE_DEFAULTS = { ...PURCHASE_DEFAULTS, absd: '' } // cashProceeds/totalCPFRefund carried over from scenario.house, not reset

// One scenario's full editable state — used for both the baseline (label
// locked to "Baseline") and any added what-if scenarios. Each field a
// module was synced from another tool shows that provenance; anything
// else is plain manual entry. A house can be:
//  - an existing mortgage (plain balance/instalment fields)
//  - "buying a new house" (price/downpayment/rate/tenure, with loan/
//    instalment/BSD derived automatically) which draws down cash savings
//  - "upgrading" (sell the current house, then buy the new one) — the
//    same purchase math, but funded first by sale proceeds + CPF refund
//    (synced from HouseMuch if you've run a sale calc there), only
//    drawing on cash savings for whatever's left over — or topping
//    savings up if the sale covers it with room to spare
export default function ScenarioCard({ scenario, onChange, onRemove, onLabelChange, isBaseline }) {
  const set = (patch) => onChange({ ...scenario, ...patch })
  const setHouse = (patch) => onChange({ ...scenario, house: { ...scenario.house, ...patch } })
  const setCar = (patch) => onChange({ ...scenario, car: { ...scenario.car, ...patch } })

  const houseMode = scenario.house?.mode || 'existing'
  const setHouseMode = (mode) => {
    if (mode === 'purchase') return setHouse({ ...PURCHASE_DEFAULTS, ...scenario.house, mode })
    if (mode === 'upgrade') return setHouse({ ...UPGRADE_DEFAULTS, ...scenario.house, mode })
    return setHouse({ mode })
  }

  const purchasePreview = scenario.hasHouse && houseMode === 'purchase'
    ? calcHousePurchase({
        price: num(scenario.house.price), downpaymentPct: num(scenario.house.downpaymentPct) || 25,
        rate: num(scenario.house.rate), tenureYears: num(scenario.house.tenureYears) || 25,
        otherFees: num(scenario.house.otherFees),
      })
    : null
  const purchaseShortfall = purchasePreview ? purchasePreview.cashNeeded - num(scenario.cashSavings) : 0

  const upgradePreview = scenario.hasHouse && houseMode === 'upgrade'
    ? calcHouseUpgrade({
        cashProceeds: num(scenario.house.cashProceeds), totalCPFRefund: num(scenario.house.totalCPFRefund),
        price: num(scenario.house.price), downpaymentPct: num(scenario.house.downpaymentPct) || 25,
        rate: num(scenario.house.rate), tenureYears: num(scenario.house.tenureYears) || 25,
        otherFees: num(scenario.house.otherFees), absd: num(scenario.house.absd),
      })
    : null
  // Only a gap beyond what the sale itself covers draws on cash savings.
  const upgradeShortfall = upgradePreview && upgradePreview.gap > 0 ? upgradePreview.gap - num(scenario.cashSavings) : 0

  // HDB purchases are additionally bound by the 30% Mortgage Servicing
  // Ratio, which is usually tighter than TDSR — so the tool needs to know
  // which kind of property this is.
  const propertyTypeToggle = (
    <div>
      <div style={{ fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 7 }}>Property type</div>
      <Segmented
        value={scenario.house.propertyType || 'private'}
        onChange={v => setHouse({ propertyType: v })}
        options={[{ value: 'hdb', label: 'HDB' }, { value: 'private', label: 'Private' }]}
      />
      {(scenario.house.propertyType || 'private') === 'hdb' && (
        <p style={{ marginTop: 7, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
          HDB loans are also capped by the 30% Mortgage Servicing Ratio, which usually binds before TDSR does.
        </p>
      )}
    </div>
  )

  // Joint loan: what fraction of THIS mortgage (and the home it's
  // attached to) is yours. Scales outstandingBalance, monthlyInstalment,
  // AND propertyValue together in resolveHouseModule, so net worth
  // reflects your equity share rather than your share of the debt
  // against the full household asset.
  const jointLoanToggle = (
    <div style={{ marginTop: 14 }}>
      <Toggle active={!!scenario.house.isJointLoan} onClick={() => setHouse({ isJointLoan: !scenario.house.isJointLoan, yourSharePct: scenario.house.yourSharePct || '50' })}>
        This is a joint loan
      </Toggle>
      {scenario.house.isJointLoan && scenario.house.source === 'auto' && (
        <p style={{ marginTop: 8, fontSize: C.xs, color: C.redText, lineHeight: 1.5 }}>
          These figures were synced from HouseMuch, where they were already scaled down to your share of a joint loan — turning this on would scale them down a second time. Only use this if the numbers above are the FULL household loan/property value.
        </p>
      )}
      {scenario.house.isJointLoan && (
        <div style={{ marginTop: 10, maxWidth: 320 }}>
          <Segmented
            value={scenario.house.yourSharePct === '50' ? '50' : 'custom'}
            onChange={v => setHouse({ yourSharePct: v === '50' ? '50' : (scenario.house.yourSharePct === '50' ? '60' : scenario.house.yourSharePct) })}
            options={[{ value: '50', label: '50 / 50' }, { value: 'custom', label: 'Custom' }]}
          />
          {scenario.house.yourSharePct !== '50' && (
            <div style={{ marginTop: 10, maxWidth: 160 }}>
              <PercentInput id={`${scenario.id}-house-share`} label="Your share" value={scenario.house.yourSharePct} onChange={e => setHouse({ yourSharePct: e.target.value })} />
            </div>
          )}
          {(num(scenario.house.yourSharePct) < 0 || num(scenario.house.yourSharePct) > 100) && (
            <p style={{ marginTop: 6, fontSize: C.xs, color: C.redText, lineHeight: 1.5 }}>
              A share has to be between 0% and 100% — this will be treated as {num(scenario.house.yourSharePct) > 100 ? '100%' : '0%'}.
            </p>
          )}
          <p style={{ marginTop: 8, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
            The figures above should stay the real, full loan and property value — this scales only what counts toward your net worth, TDSR, and MSR down to your share.
          </p>
        </div>
      )}
    </div>
  )

  const downpaymentToggle = (
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
  )

  const purchaseFields = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
      <MoneyInput id={`${scenario.id}-house-price`} label="New house price" value={scenario.house.price} onChange={e => setHouse({ price: e.target.value })} />
      <NumberInput id={`${scenario.id}-house-tenure`} label="Loan tenure" value={scenario.house.tenureYears} onChange={e => setHouse({ tenureYears: e.target.value })} suffix="years" />
      <PercentInput id={`${scenario.id}-house-rate`} label="Mortgage rate (p.a.)" value={scenario.house.rate} onChange={e => setHouse({ rate: e.target.value })} />
      <MoneyInput id={`${scenario.id}-house-fees`} label="Legal/other fees" hint="Optional" value={scenario.house.otherFees} onChange={e => setHouse({ otherFees: e.target.value })} />
    </div>
  )

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
              options={[
                { value: 'existing', label: 'Existing mortgage' },
                { value: 'purchase', label: 'Buying a new house' },
                { value: 'upgrade', label: 'Upgrading (sell + buy)' },
              ]}
            />
          </div>

          {houseMode === 'existing' && (
            <>
              {propertyTypeToggle}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 14 }}>
                <MoneyInput id={`${scenario.id}-house-value`} label="Current home value" value={scenario.house.propertyValue} onChange={e => setHouse({ propertyValue: e.target.value })} />
                <MoneyInput id={`${scenario.id}-house-balance`} label="Outstanding balance" value={scenario.house.outstandingBalance} onChange={e => setHouse({ outstandingBalance: e.target.value })} />
                <MoneyInput id={`${scenario.id}-house-instalment`} label="Monthly instalment" value={scenario.house.monthlyInstalment} onChange={e => setHouse({ monthlyInstalment: e.target.value })} />
                <NumberInput id={`${scenario.id}-house-years-left`} label="Years left on the loan" hint="Leave blank if you're not sure — it'll be assumed to run to retirement" value={scenario.house.tenureRemaining} onChange={e => setHouse({ tenureRemaining: e.target.value })} suffix="years" />
              </div>
              {scenario.house?.source === 'auto' && (
                <p style={{ marginTop: 8, fontSize: C.xs, color: C.faint }}>Synced from HouseMuch — edit freely, this won&apos;t change what&apos;s saved there.</p>
              )}
              {jointLoanToggle}
            </>
          )}

          {houseMode === 'purchase' && (
            <>
              {propertyTypeToggle}
              <div style={{ height: 14 }} />
              {purchaseFields}
              {downpaymentToggle}
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
                  {purchaseShortfall > 0 && (
                    <div style={{ fontSize: C.xs, color: C.redText, marginTop: 6, fontWeight: 600 }}>
                      Short by {SGD(purchaseShortfall)} against the cash savings entered below.
                    </div>
                  )}
                </div>
              )}
              {jointLoanToggle}
            </>
          )}

          {houseMode === 'upgrade' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                <MoneyInput id={`${scenario.id}-house-proceeds`} label="Cash proceeds from selling" value={scenario.house.cashProceeds} onChange={e => setHouse({ cashProceeds: e.target.value })} />
                <MoneyInput id={`${scenario.id}-house-cpf-refund`} label="CPF refund from selling" value={scenario.house.totalCPFRefund} onChange={e => setHouse({ totalCPFRefund: e.target.value })} />
              </div>
              {scenario.house?.source === 'auto' && (num(scenario.house.cashProceeds) > 0 || num(scenario.house.totalCPFRefund) > 0) && (
                <p style={{ marginTop: -8, marginBottom: 14, fontSize: C.xs, color: C.faint }}>Synced from your last HouseMuch sale calculation — edit freely.</p>
              )}
              {propertyTypeToggle}
              <div style={{ height: 14 }} />
              {purchaseFields}
              {downpaymentToggle}
              {upgradePreview && num(scenario.house.price) > 0 && (
                <div style={{ marginTop: 14, padding: '11px 14px', background: C.bg, border: `1px dashed ${C.border}`, borderRadius: C.r }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: C.fontMono, fontSize: C.sm, marginBottom: 6 }}>
                    <span style={{ color: C.text }}>Loan {SGD(upgradePreview.loanAmount)}</span>
                    <span style={{ color: C.text, fontWeight: 700 }}>{SGD(upgradePreview.monthlyInstalment)}/mo</span>
                    <span style={{ color: C.muted }}>BSD {SGD(upgradePreview.bsd)}</span>
                  </div>
                  <div style={{ fontSize: C.xs, color: C.muted }}>
                    Funds required (downpayment + BSD + fees): <strong style={{ color: C.text }}>{SGD(upgradePreview.fundsRequired)}</strong>
                    {' · '}from the sale: <strong style={{ color: C.text }}>{SGD(upgradePreview.cashProceeds + upgradePreview.totalCPFRefund)}</strong>
                  </div>
                  {upgradePreview.surplus ? (
                    <div style={{ fontSize: C.xs, color: C.greenText, marginTop: 6, fontWeight: 600 }}>
                      Sale proceeds cover it, with {SGD(Math.abs(upgradePreview.gap))} left over — added to cash savings below.
                    </div>
                  ) : (
                    <div style={{ fontSize: C.xs, color: C.amberText, marginTop: 6, fontWeight: 600 }}>
                      Sale proceeds fall {SGD(upgradePreview.gap)} short — drawn from cash savings below.
                    </div>
                  )}
                  {upgradeShortfall > 0 && (
                    <div style={{ fontSize: C.xs, color: C.redText, marginTop: 6, fontWeight: 600 }}>
                      Even with cash savings, still short by {SGD(upgradeShortfall)}.
                    </div>
                  )}
                </div>
              )}
              {jointLoanToggle}
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
          <NumberInput id={`${scenario.id}-car-years-left`} label="Years left on the loan" hint="Car loans end — this stops the projection charging you for it forever" value={scenario.car.tenureRemaining} onChange={e => setCar({ tenureRemaining: e.target.value })} suffix="years" />
        </div>
      )}
      {scenario.car?.source === 'auto' && scenario.hasCar && (
        <p style={{ marginTop: 8, fontSize: C.xs, color: C.faint }}>Synced from DriveReady — edit freely, this won&apos;t change what&apos;s saved there.</p>
      )}

      <SectionDivider label="Insurance" />
      <MoneyInput id={`${scenario.id}-insurance`} label="Monthly insurance premiums" hint="Reduces what you can invest, but banks don't count it toward TDSR — so it's excluded there" value={scenario.insurancePremium} onChange={e => set({ insurancePremium: e.target.value })} />
      {scenario.insuranceSource === 'auto' && num(scenario.insurancePremium) > 0 && (
        <p style={{ marginTop: 8, fontSize: C.xs, color: C.faint }}>Synced from InsureCheck — edit freely.</p>
      )}

      <SectionDivider label="Living expenses" />
      <MoneyInput id={`${scenario.id}-living`} label="Everything else — food, transport, utilities, subscriptions" hint="Reduces what you can invest, same as a loan — but isn't counted toward TDSR" value={scenario.livingExpenses} onChange={e => set({ livingExpenses: e.target.value })} />
      {scenario.livingExpensesSource === 'auto' && num(scenario.livingExpenses) > 0 && (
        <p style={{ marginTop: 8, fontSize: C.xs, color: C.faint }}>Synced from FlowState — edit freely, this won&apos;t change what&apos;s saved there.</p>
      )}
      {scenario.livingExpensesSource !== 'auto' && (
        <p style={{ marginTop: 8, fontSize: C.xs, color: C.faint }}>
          Not synced — <a href="/flow" style={{ color: C.accent }}>run FlowState</a> to measure this instead of guessing.
        </p>
      )}

      <SectionDivider label="Cash & investments" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <MoneyInput id={`${scenario.id}-cash`} label="Cash savings" hint="Adjusted automatically by a house purchase/upgrade above" value={scenario.cashSavings} onChange={e => set({ cashSavings: e.target.value })} />
        <MoneyInput id={`${scenario.id}-inv`} label="Investment portfolio" value={scenario.investmentBalance} onChange={e => set({ investmentBalance: e.target.value })} />
        <MoneyInput id={`${scenario.id}-oa`} label="CPF OA" value={scenario.oaBalance} onChange={e => set({ oaBalance: e.target.value })} />
        <MoneyInput id={`${scenario.id}-sa`} label="CPF SA" value={scenario.saBalance} onChange={e => set({ saBalance: e.target.value })} />
        <MoneyInput id={`${scenario.id}-ma`} label="CPF MA" value={scenario.maBalance} onChange={e => set({ maBalance: e.target.value })} />
      </div>
    </div>
  )
}
