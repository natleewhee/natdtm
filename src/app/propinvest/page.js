'use client'

import { useEffect, useState } from 'react'
import { C, SGD, parseMoney } from '@/lib/propinvest/theme'
import { calcInvestmentProperty, PROPERTY_TAX_NOO_AS_OF } from '@/lib/propinvest/calc'
import { ABSD_REFERENCE, ABSD_AS_OF } from '@/lib/house/stampDuty'
import { saveToolInputs, loadToolInputs } from '@/lib/shared/profile'
import { SectionDivider, MoneyInput, PercentInput, NumberInput } from '@/components/propinvest/ui'
import ShellHeader from '@/components/shared/ShellHeader'
import TrustBadges from '@/components/shared/TrustBadges'
import Button from '@/components/shared/Button'
import AutosaveIndicator from '@/components/shared/AutosaveIndicator'
import ExploreSection from '@/components/shared/ExploreSection'

const num = parseMoney

function Row({ label, value, tone, bold, indent }) {
  const color = tone === 'red' ? C.redText : tone === 'green' ? C.greenText : C.text
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: `1px solid ${C.border}`, paddingLeft: indent ? 16 : 0 }}>
      <span style={{ fontSize: C.sm, color: bold ? C.primary : C.muted, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? C.lg : C.sm, fontFamily: C.fontMono, fontWeight: bold ? 700 : 600, color }}>{value}</span>
    </div>
  )
}

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
    }
    setHasRestored(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (!hasRestored) return
    const ok = saveToolInputs('propinvest', {
      price, downpaymentPct, rate, tenureYears, absd, otherFees,
      monthlyRent, annualValue, maintenanceMonthly, vacancyMonthsPerYear, agentCommissionMonths,
    })
    if (ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
      setSavedTick(t => t + 1)
    }
  }, [hasRestored, price, downpaymentPct, rate, tenureYears, absd, otherFees, monthlyRent, annualValue, maintenanceMonthly, vacancyMonthsPerYear, agentCommissionMonths])

  useEffect(() => {
    if (savedTick === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
    setJustSaved(true)
    const t = setTimeout(() => setJustSaved(false), 1400)
    return () => clearTimeout(t)
  }, [savedTick])

  const isReady = num(price) > 0 && num(monthlyRent) > 0

  const result = calculated && isReady ? calcInvestmentProperty({
    price: num(price), downpaymentPct: num(downpaymentPct) || 25,
    rate: num(rate), tenureYears: num(tenureYears) || 25,
    absd: num(absd), otherFees: num(otherFees),
    monthlyRent: num(monthlyRent), annualValue: num(annualValue),
    maintenanceMonthly: num(maintenanceMonthly),
    vacancyMonthsPerYear: num(vacancyMonthsPerYear),
    agentCommissionMonths: num(agentCommissionMonths),
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="pi-price" label="Purchase price" value={price} onChange={e => setPrice(e.target.value)} />
            <PercentInput id="pi-downpayment" label="Downpayment" value={downpaymentPct} onChange={e => setDownpaymentPct(e.target.value)} />
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

          <SectionDivider label="Renting it out" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="pi-rent" label="Expected monthly rent" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} />
            <MoneyInput id="pi-av" label="Annual Value (AV)" hint="IRAS's estimate — check your Property Tax bill or myTax Portal" value={annualValue} onChange={e => setAnnualValue(e.target.value)} />
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
                  ? 'Rent covers the instalment and every holding cost, with room to spare.'
                  : 'This shortfall comes out of your own pocket every month, on top of the upfront cost below.'}
              </p>
            </div>

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
                <Row label="Purchase price" value={SGD(result.price)} />
                <Row label="− Downpayment" value={`−${SGD(result.downpayment)}`} indent />
                <Row label="= Loan amount" value={SGD(result.loanAmount)} bold />
                <div style={{ height: 10 }} />
                <Row label="Downpayment" value={SGD(result.downpayment)} />
                <Row label="+ BSD (auto-computed)" value={`+${SGD(result.bsd)}`} indent />
                {result.absd > 0 && <Row label="+ ABSD (your figure)" value={`+${SGD(result.absd)}`} indent />}
                {result.otherFees > 0 && <Row label="+ Other fees" value={`+${SGD(result.otherFees)}`} indent />}
                <Row label="= Upfront cost" value={SGD(result.upfrontCost)} bold />
                <div style={{ height: 10 }} />
                <Row label="Effective monthly rent (after vacancy)" value={SGD(result.effectiveMonthlyRent)} />
                <Row label="− Monthly instalment" value={`−${SGD(result.monthlyInstalment)}`} indent />
                <Row label="− Property tax (non-owner-occupied)" value={`−${SGD(result.monthlyPropertyTax)}`} indent />
                <Row label="− Maintenance" value={`−${SGD(num(maintenanceMonthly))}`} indent />
                <Row label="− Agent commission (amortized)" value={`−${SGD(result.monthlyAgentCommission)}`} indent />
                <Row label="= Monthly cash flow" value={`${result.cashFlowPositive ? '+' : '−'}${SGD(Math.abs(result.monthlyCashFlow))}`} bold tone={result.cashFlowPositive ? 'green' : 'red'} />
              </div>
              <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 14 }}>
                Non-owner-occupied property tax uses IRAS&apos;s real tiered schedule on Annual Value, effective {PROPERTY_TAX_NOO_AS_OF} — verify against your actual bill, which can change if IRAS revises your property&apos;s AV. ABSD is not auto-computed (it depends on citizenship, entity structure, and existing property count) — enter your own figure from the reference table above. This doesn&apos;t model rental income tax, capital appreciation, or refinancing — it&apos;s a monthly cash-flow check, not a full investment return.
              </p>
            </ExploreSection>
          </div>
        )}
      </div>
    </>
  )
}
