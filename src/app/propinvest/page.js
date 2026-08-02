'use client'

import { useEffect, useState } from 'react'
import { C, SGD, parseMoney } from '@/lib/propinvest/theme'
import { calcInvestmentProperty, calcTdsrCheck, PROPERTY_TAX_NOO_AS_OF, TDSR_LIMIT, MSR_LIMIT } from '@/lib/propinvest/calc'
import { ABSD_REFERENCE, ABSD_AS_OF } from '@/lib/house/stampDuty'
import { saveToolInputs, loadToolInputs } from '@/lib/shared/profile'
import { SectionDivider, MoneyInput, PercentInput, NumberInput, Segmented } from '@/components/propinvest/ui'
import ShellHeader from '@/components/shared/ShellHeader'
import TrustBadges from '@/components/shared/TrustBadges'
import Button from '@/components/shared/Button'
import AutosaveIndicator from '@/components/shared/AutosaveIndicator'
import ExploreSection from '@/components/shared/ExploreSection'
import Row from '@/components/shared/Row'

const num = parseMoney
// parseMoney strips a leading "-" (built for money fields, never negative),
// so a downpayment % typed as "-20" would read as +20 — Number() preserves
// the sign so an out-of-range value is actually caught below, instead of
// being silently clamped into [0,100] with no warning (the exact bug class
// this app already fixed once for joint-ownership share percentages).
const numSigned = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

export default function PropInvestPage() {
  const [price, setPrice] = useState('')
  const [downpaymentPct, setDownpaymentPct] = useState('25')
  const [rate, setRate] = useState('3.00')
  const [tenureYears, setTenureYears] = useState('25')
  const [absd, setAbsd] = useState('')
  const [showAbsdRef, setShowAbsdRef] = useState(false)
  const [otherFees, setOtherFees] = useState('')

  const [monthlyRent, setMonthlyRent] = useState('')
  const [annualValue, setAnnualValue] = useState('')
  const [maintenanceMonthly, setMaintenanceMonthly] = useState('')
  const [vacancyMonthsPerYear, setVacancyMonthsPerYear] = useState('1')
  const [agentCommissionMonths, setAgentCommissionMonths] = useState('0.5')

  const [propertyType, setPropertyType] = useState('private')
  const [salary, setSalary] = useState('')
  const [existingMonthlyDebt, setExistingMonthlyDebt] = useState('')

  const [hasRestored, setHasRestored] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [savedTick, setSavedTick] = useState(0)
  const [calculated, setCalculated] = useState(false)

  useEffect(() => {
    const saved = loadToolInputs('propinvest')
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from
       localStorage on mount; unavailable during SSR so can't happen during render */
    if (saved) {
      setPrice(saved.price ?? '')
      setDownpaymentPct(saved.downpaymentPct ?? '25')
      setRate(saved.rate ?? '3.00')
      setTenureYears(saved.tenureYears ?? '25')
      setAbsd(saved.absd ?? '')
      setOtherFees(saved.otherFees ?? '')
      setMonthlyRent(saved.monthlyRent ?? '')
      setAnnualValue(saved.annualValue ?? '')
      setMaintenanceMonthly(saved.maintenanceMonthly ?? '')
      setVacancyMonthsPerYear(saved.vacancyMonthsPerYear ?? '1')
      setAgentCommissionMonths(saved.agentCommissionMonths ?? '0.5')
      setPropertyType(saved.propertyType ?? 'private')
      setSalary(saved.salary ?? '')
      setExistingMonthlyDebt(saved.existingMonthlyDebt ?? '')
    }
    setHasRestored(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (!hasRestored) return
    const ok = saveToolInputs('propinvest', {
      price, downpaymentPct, rate, tenureYears, absd, otherFees,
      monthlyRent, annualValue, maintenanceMonthly, vacancyMonthsPerYear, agentCommissionMonths,
      propertyType, salary, existingMonthlyDebt,
    })
    if (ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
      setSavedTick(t => t + 1)
    }
  }, [hasRestored, price, downpaymentPct, rate, tenureYears, absd, otherFees, monthlyRent, annualValue, maintenanceMonthly, vacancyMonthsPerYear, agentCommissionMonths, propertyType, salary, existingMonthlyDebt])

  useEffect(() => {
    if (savedTick === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
    setJustSaved(true)
    const t = setTimeout(() => setJustSaved(false), 1400)
    return () => clearTimeout(t)
  }, [savedTick])

  const isReady = num(price) > 0 && num(monthlyRent) > 0
  // IRAS bases Annual Value on the estimated annual rent a property could
  // fetch — a real figure only an existing owner can look up. For this
  // tool's actual audience (someone deciding whether to BUY), that's
  // never available, so a blank AV defaults to the annualised rent
  // they've already entered rather than silently zeroing property tax.
  const annualValueIsEstimated = annualValue === ''
  const effectiveAnnualValue = annualValueIsEstimated ? num(monthlyRent) * 12 : num(annualValue)

  const result = calculated && isReady ? calcInvestmentProperty({
    price: num(price), downpaymentPct: downpaymentPct === '' ? 25 : numSigned(downpaymentPct),
    rate: num(rate), tenureYears: num(tenureYears) || 25,
    absd: num(absd), otherFees: num(otherFees),
    monthlyRent: num(monthlyRent), annualValue: effectiveAnnualValue,
    maintenanceMonthly: num(maintenanceMonthly),
    vacancyMonthsPerYear: num(vacancyMonthsPerYear),
    agentCommissionMonths: num(agentCommissionMonths),
  }) : null

  // TDSR/MSR — a cash-flow-positive verdict above is meaningless if a
  // bank wouldn't actually approve this loan. Checked against the same
  // 55%/30% limits DriveReady and MyLedger already use, so a "financeable"
  // claim here isn't made with zero reference to income or other debt.
  const tdsrCheck = result ? calcTdsrCheck({
    salary: num(salary), existingMonthlyDebt: num(existingMonthlyDebt),
    newMonthlyInstalment: result.monthlyInstalment, propertyType,
  }) : null

  const handleCalc = () => setCalculated(true)

  return (
    <>
      <ShellHeader />
      <div className="shell-wrap" style={{ padding: '40px 24px 80px', maxWidth: 780, margin: '0 auto' }}>
        <p style={{ fontFamily: C.fontMono, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: C.faint, margin: '0 0 10px' }}>
          Investment Property Calculator
        </p>
        <h1 style={{ fontFamily: C.fontDisplay, fontWeight: 600, fontSize: 'clamp(26px,4vw,36px)', lineHeight: 1.15, margin: '0 0 14px' }}>
          Does the rent actually cover it?
        </h1>
        <p style={{ color: C.muted, fontSize: 15, margin: '0 0 20px', maxWidth: '58ch', lineHeight: 1.6 }}>
          Upfront cost, monthly instalment, non-owner-occupied property tax, and whether your rental income leaves you cash-flow positive or negative every month.
        </p>
        <TrustBadges items={['Reuses HouseMuch\'s own stamp-duty math', 'Real IRAS property tax tiers', 'Zero data collected', 'Free, forever']} />

        <div style={{ marginTop: 28, background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, boxShadow: C.shadow, padding: '24px 24px 22px' }}>
          <SectionDivider label="The purchase" />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 7 }}>Property type</div>
            <Segmented
              value={propertyType} onChange={setPropertyType}
              options={[{ value: 'private', label: 'Private' }, { value: 'hdb', label: 'HDB' }]}
            />
            {propertyType === 'hdb' && (
              <p style={{ marginTop: 7, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
                HDB loans are also capped by the 30% Mortgage Servicing Ratio, checked below. Note: whole-flat HDB rental has its own MOP and eligibility rules this tool doesn&apos;t model — verify with HDB before relying on rental income from an HDB flat.
              </p>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="pi-price" label="Purchase price" value={price} onChange={e => setPrice(e.target.value)} />
            <div>
              <PercentInput id="pi-downpayment" label="Downpayment" value={downpaymentPct} onChange={e => setDownpaymentPct(e.target.value)} />
              {downpaymentPct !== '' && (numSigned(downpaymentPct) < 0 || numSigned(downpaymentPct) > 100) && (
                <p style={{ marginTop: 6, fontSize: C.xs, color: C.redText, lineHeight: 1.5 }}>
                  A downpayment has to be between 0% and 100% — this will be treated as {numSigned(downpaymentPct) > 100 ? '100%' : '0%'}.
                </p>
              )}
              {downpaymentPct !== '' && numSigned(downpaymentPct) >= 0 && numSigned(downpaymentPct) < 55 && (
                <p style={{ marginTop: 6, fontSize: C.xs, color: C.amberText, lineHeight: 1.5 }}>
                  An investment property is almost always a 2nd+ property, where LTV caps at 45% — you&apos;ll likely need at least 55% down.
                </p>
              )}
            </div>
            <PercentInput id="pi-rate" label="Mortgage rate (p.a.)" value={rate} onChange={e => setRate(e.target.value)} />
            <NumberInput id="pi-tenure" label="Loan tenure" value={tenureYears} onChange={e => setTenureYears(e.target.value)} suffix="years" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
                <label htmlFor="pi-absd" style={{ fontSize: C.sm, fontWeight: 600, color: C.primary }}>ABSD (if any)</label>
                <button type="button" onClick={() => setShowAbsdRef(s => !s)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: C.xs, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  What&apos;s my rate?
                </button>
              </div>
              <MoneyInput id="pi-absd" value={absd} onChange={e => setAbsd(e.target.value)} />
              {showAbsdRef && (
                <div style={{ marginTop: 10, padding: '12px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: C.r }}>
                  {ABSD_REFERENCE.map(row => (
                    <div key={row.profile} style={{ display: 'flex', justifyContent: 'space-between', fontSize: C.xs, color: C.muted, padding: '3px 0' }}>
                      <span>{row.profile}</span>
                      <span style={{ fontFamily: C.fontMono, color: C.text, fontWeight: 600 }}>{row.rate}</span>
                    </div>
                  ))}
                  <p style={{ fontSize: C.xs, color: C.faint, marginTop: 8, marginBottom: 0 }}>Reference rates as of {ABSD_AS_OF}, before remission. An investment property is virtually always a 2nd+ property — verify your exact bracket on IRAS.</p>
                </div>
              )}
            </div>
            <MoneyInput id="pi-other-fees" label="Other fees (legal, agent, valuation)" hint="Optional" value={otherFees} onChange={e => setOtherFees(e.target.value)} />
          </div>

          <SectionDivider label="Can you actually get this loan?" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="pi-salary" label="Your gross monthly income" hint="Before CPF/tax — what a bank checks TDSR/MSR against" value={salary} onChange={e => setSalary(e.target.value)} />
            <MoneyInput id="pi-existing-debt" label="Existing monthly debt" hint="Other loans, credit cards, etc. — optional" value={existingMonthlyDebt} onChange={e => setExistingMonthlyDebt(e.target.value)} />
          </div>

          <SectionDivider label="Renting it out" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="pi-rent" label="Expected monthly rent" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} />
            <MoneyInput id="pi-av" label="Annual Value (AV)" hint="Leave blank to estimate from your expected rent — check your Property Tax bill or myTax Portal if you already own it" value={annualValue} onChange={e => setAnnualValue(e.target.value)} />
            <MoneyInput id="pi-maintenance" label="Monthly maintenance / conservancy" value={maintenanceMonthly} onChange={e => setMaintenanceMonthly(e.target.value)} />
            <NumberInput id="pi-vacancy" label="Vacancy between tenants" hint="Months per year, spread evenly" value={vacancyMonthsPerYear} onChange={e => setVacancyMonthsPerYear(e.target.value)} suffix="mo/yr" />
            <NumberInput id="pi-commission" label="Agent commission" hint="Months of rent per year of lease, typically 0.5" value={agentCommissionMonths} onChange={e => setAgentCommissionMonths(e.target.value)} suffix="mo" />
          </div>

          <div style={{ marginTop: 24 }}>
            <Button variant="accent" fullWidth onClick={handleCalc} disabled={!isReady}>
              {isReady ? 'Check the cash flow' : 'Fill in the price and expected rent above'}
            </Button>
          </div>
          <AutosaveIndicator justSaved={justSaved} C={C} />
        </div>

        {result && (
          <div style={{ marginTop: 32 }}>
            {tdsrCheck && (tdsrCheck.tdsrExceeded || tdsrCheck.msrExceeded) && (
              <div style={{ background: C.redBg, border: `1px solid ${C.red}55`, borderRadius: C.rL, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: C.sm, fontWeight: 700, color: C.redText, marginBottom: 4 }}>
                  A bank likely wouldn&apos;t approve this loan
                </div>
                <div style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6 }}>
                  {tdsrCheck.tdsrExceeded && <>Total debt (this instalment + your existing debt) is {(tdsrCheck.tdsr * 100).toFixed(0)}% of your gross income — above the {(TDSR_LIMIT * 100).toFixed(0)}% TDSR limit banks apply to every loan. </>}
                  {tdsrCheck.msrExceeded && <>This instalment alone is {(tdsrCheck.msr * 100).toFixed(0)}% of your gross income — above the {(MSR_LIMIT * 100).toFixed(0)}% MSR limit for HDB loans. </>}
                  The cash-flow figures below assume you got the loan — worth checking financing before relying on them.
                </div>
              </div>
            )}
            {tdsrCheck && !tdsrCheck.tdsrExceeded && !tdsrCheck.msrExceeded && tdsrCheck.tdsr != null && (
              <p style={{ fontSize: C.xs, color: C.faint, textAlign: 'center', marginBottom: 12 }}>
                TDSR {(tdsrCheck.tdsr * 100).toFixed(0)}% (limit {(TDSR_LIMIT * 100).toFixed(0)}%){tdsrCheck.msrApplicable ? ` · MSR ${(tdsrCheck.msr * 100).toFixed(0)}% (limit ${(MSR_LIMIT * 100).toFixed(0)}%)` : ''} — within bank limits, based on the income and debt you entered.
              </p>
            )}
            {tdsrCheck && tdsrCheck.tdsr == null && (
              <p style={{ fontSize: C.xs, color: C.faint, textAlign: 'center', marginBottom: 12 }}>
                Enter your income above to check whether a bank would actually approve this loan (TDSR/MSR).
              </p>
            )}
            <div style={{
              background: result.cashFlowPositive ? C.greenBg : C.redBg,
              border: `1px solid ${result.cashFlowPositive ? C.green : C.red}55`,
              borderRadius: C.rXL, boxShadow: C.shadow, padding: '26px 26px 24px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: C.fontMono, fontSize: 34, fontWeight: 500, color: result.cashFlowPositive ? C.greenText : C.redText, marginBottom: 6 }}>
                {result.cashFlowPositive ? '+' : '−'}{SGD(Math.abs(result.monthlyCashFlow))}/mo
              </div>
              <p style={{ fontSize: C.sm, color: C.muted, margin: 0 }}>
                {result.cashFlowPositive
                  ? 'Rent covers the instalment and the holding costs modeled below, with room to spare.'
                  : 'This shortfall comes out of your own pocket every month, on top of the upfront cost below.'}
              </p>
            </div>

            <p style={{ fontSize: C.xs, color: C.faint, marginTop: 12, lineHeight: 1.6, textAlign: 'center' }}>
              Not modeled: rental income tax (real money on top of this), fire insurance, repairs. Property tax uses IRAS&apos;s published non-owner-occupied schedule as of {PROPERTY_TAX_NOO_AS_OF} — verify against your actual bill.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: C.border, borderRadius: C.rL, overflow: 'hidden', marginTop: 20 }}>
              <div style={{ background: C.surface2 || C.bg, padding: '15px 16px 14px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.faint, fontWeight: 600 }}>Upfront cost</div>
                <div style={{ fontFamily: C.fontMono, fontSize: 20, fontWeight: 700, color: C.text }}>{SGD(result.upfrontCost)}</div>
              </div>
              <div style={{ background: C.surface2 || C.bg, padding: '15px 16px 14px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.faint, fontWeight: 600 }}>Monthly instalment</div>
                <div style={{ fontFamily: C.fontMono, fontSize: 20, fontWeight: 700, color: C.text }}>{SGD(result.monthlyInstalment)}</div>
              </div>
              <div style={{ background: C.surface2 || C.bg, padding: '15px 16px 14px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.faint, fontWeight: 600 }}>Gross rental yield</div>
                <div style={{ fontFamily: C.fontMono, fontSize: 20, fontWeight: 700, color: C.text }}>{result.grossRentalYieldPct != null ? `${result.grossRentalYieldPct.toFixed(2)}%` : '—'}</div>
              </div>
              <div style={{ background: C.surface2 || C.bg, padding: '15px 16px 14px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.faint, fontWeight: 600 }}>Net rental yield</div>
                <div style={{ fontFamily: C.fontMono, fontSize: 20, fontWeight: 700, color: C.text }}>{result.netRentalYieldPct != null ? `${result.netRentalYieldPct.toFixed(2)}%` : '—'}</div>
              </div>
            </div>

            <p style={{ fontSize: C.xs, color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
              Break-even rent (covers instalment + property tax + maintenance + commission, before vacancy): <strong style={{ color: C.text }}>{SGD(result.breakEvenMonthlyRent)}/mo</strong>.
            </p>

            <ExploreSection title="Show the math" defaultOpen={false}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Row C={C} label="Purchase price" value={SGD(result.price)} />
                <Row C={C} label="− Downpayment" value={`−${SGD(result.downpayment)}`} indent />
                <Row C={C} label="= Loan amount" value={SGD(result.loanAmount)} bold />
                <div style={{ height: 10 }} />
                <Row C={C} label="Downpayment" value={SGD(result.downpayment)} />
                <Row C={C} label="+ BSD (auto-computed)" value={`+${SGD(result.bsd)}`} indent />
                {result.absd > 0 && <Row C={C} label="+ ABSD (your figure)" value={`+${SGD(result.absd)}`} indent />}
                {result.otherFees > 0 && <Row C={C} label="+ Other fees" value={`+${SGD(result.otherFees)}`} indent />}
                <Row C={C} label="= Upfront cost" value={SGD(result.upfrontCost)} bold />
                <div style={{ height: 10 }} />
                <Row C={C} label="Effective monthly rent (after vacancy)" value={SGD(result.effectiveMonthlyRent)} />
                <Row C={C} label="− Monthly instalment" value={`−${SGD(result.monthlyInstalment)}`} indent />
                <Row C={C} label={`− Property tax (non-owner-occupied${annualValueIsEstimated ? ', AV estimated from rent' : ''})`} value={`−${SGD(result.monthlyPropertyTax)}`} indent />
                <Row C={C} label="− Maintenance" value={`−${SGD(num(maintenanceMonthly))}`} indent />
                <Row C={C} label="− Agent commission (amortized)" value={`−${SGD(result.monthlyAgentCommission)}`} indent />
                <Row C={C} label="= Monthly cash flow" value={`${result.cashFlowPositive ? '+' : '−'}${SGD(Math.abs(result.monthlyCashFlow))}`} bold tone={result.cashFlowPositive ? 'green' : 'red'} />
              </div>
              <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 14 }}>
                Non-owner-occupied property tax uses IRAS&apos;s real tiered schedule on Annual Value, effective {PROPERTY_TAX_NOO_AS_OF} — verify against your actual bill, which can change if IRAS revises your property&apos;s AV. ABSD is not auto-computed (it depends on citizenship, entity structure, and existing property count) — enter your own figure from the reference table above. This doesn&apos;t model rental income tax, capital appreciation, or refinancing — it&apos;s a monthly cash-flow check, not a full investment return.
              </p>
              <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 10 }}>
                See <a href="/propinvest/the-math" style={{ color: C.accent }}>the math</a> for the full formulas, TDSR/MSR limits, and every figure&apos;s source behind this page.
              </p>
            </ExploreSection>
          </div>
        )}
      </div>
    </>
  )
}
