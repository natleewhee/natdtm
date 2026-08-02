'use client'

import { useEffect, useState } from 'react'
import { C, SGD, parseMoney } from '@/lib/ledger/theme'
import { buildBaselineState, compareScenarios, resolveHouseModule } from '@/lib/ledger/calc'
import { loadMyNumbers, saveToolInputs, loadToolInputs } from '@/lib/shared/profile'
import { MoneyInput, PercentInput, NumberInput, SectionDivider } from '@/components/ledger/ui'
import ScenarioCard from '@/components/ledger/ScenarioCard'
import ComparisonTable from '@/components/ledger/ComparisonTable'
import ShellHeader from '@/components/shared/ShellHeader'
import TrustBadges from '@/components/shared/TrustBadges'
import Button from '@/components/shared/Button'
import AutosaveIndicator from '@/components/shared/AutosaveIndicator'

const num = parseMoney
const MAX_SCENARIOS = 3 // baseline + up to 2 what-ifs

let scenarioCounter = 0
function nextId() { scenarioCounter += 1; return `scenario-${scenarioCounter}` }

// Turns a numeric baseline state (from src/lib/ledger/calc.js) into the
// string-field shape ScenarioCard's inputs expect.
function stateToScenario(state, id, label) {
  return {
    id, label,
    salary: state.salary ? String(Math.round(state.salary)) : '',
    hasHouse: !!state.house,
    house: {
      mode: 'existing',
      propertyValue: state.house ? String(Math.round(state.house.propertyValue || 0)) : '',
      outstandingBalance: state.house ? String(Math.round(state.house.outstandingBalance || 0)) : '',
      monthlyInstalment: state.house ? String(Math.round(state.house.monthlyInstalment || 0)) : '',
      tenureRemaining: state.house?.tenureRemaining != null ? String(state.house.tenureRemaining) : '',
      propertyType: state.house?.propertyType || 'private',
      price: '', downpaymentPct: '25', rate: '2.60', tenureYears: '25', otherFees: '', absd: '',
      isJointLoan: false, yourSharePct: '50',
      cashProceeds: state.house?.cashProceeds ? String(Math.round(state.house.cashProceeds)) : '',
      totalCPFRefund: state.house?.totalCPFRefund ? String(Math.round(state.house.totalCPFRefund)) : '',
      source: state.house?.source || 'manual',
    },
    hasCar: !!state.car,
    car: {
      carValue: state.car ? String(Math.round(state.car.carValue || 0)) : '',
      loanOutstanding: state.car ? String(Math.round(state.car.loanOutstanding || 0)) : '',
      monthlyInstalment: state.car ? String(Math.round(state.car.monthlyInstalment || 0)) : '',
      tenureRemaining: state.car?.tenureRemaining != null ? String(state.car.tenureRemaining) : '',
      source: state.car?.source || 'manual',
    },
    oaBalance: state.cpf?.oa ? String(Math.round(state.cpf.oa)) : '',
    saBalance: state.cpf?.sa ? String(Math.round(state.cpf.sa)) : '',
    maBalance: state.cpf?.ma ? String(Math.round(state.cpf.ma)) : '',
    investmentBalance: state.investmentBalance ? String(Math.round(state.investmentBalance)) : '',
    cashSavings: state.cashSavings ? String(Math.round(state.cashSavings)) : '',
    insurancePremium: state.insurancePremium ? String(Math.round(state.insurancePremium)) : '',
    insuranceSource: state.insurancePremium ? 'auto' : 'manual',
    livingExpenses: state.livingExpenses ? String(Math.round(state.livingExpenses)) : '',
    livingExpensesSource: state.livingExpenses ? 'auto' : 'manual',
    // monthlyTakeHome is an EXACT figure from TaxWise, computed for a
    // specific salary — monthlyTakeHomeSalary records which one, so
    // scenarioToState can tell it's gone stale once the scenario's
    // salary is edited away from that baseline.
    monthlyTakeHome: state.monthlyTakeHome || 0,
    monthlyTakeHomeSalary: state.monthlyTakeHome ? (state.salary || 0) : 0,
  }
}

// Converts a scenario's string fields back into the numeric state shape
// the ledger engine (src/lib/ledger/calc.js) computes against. A
// "buying a new house" or "upgrading" module gets resolved into loan/
// instalment/BSD via resolveHouseModule, and its cashImpact (negative =
// draws down, positive = tops up, e.g. leftover sale proceeds) is
// applied to cash savings, floored at zero — a shortfall just means
// savings alone don't cover it, which ScenarioCard surfaces separately.
function scenarioToState(scenario) {
  // No `|| 100` fallback here — that's the exact falsy-coercion trap
  // resolveHouseModule's resolveSharePct (imported from house/calc.js)
  // exists to avoid: it would silently turn an explicitly-typed 0% share
  // into 100%. Pass the raw parsed value through and let resolveSharePct
  // do the clamping/defaulting, same as house/page.js does.
  const yourSharePct = scenario.house?.isJointLoan ? num(scenario.house.yourSharePct) : 100
  const houseInput = scenario.hasHouse ? (
    scenario.house.mode === 'purchase'
      ? {
          mode: 'purchase', propertyType: scenario.house.propertyType || 'private', yourSharePct,
          price: num(scenario.house.price), downpaymentPct: num(scenario.house.downpaymentPct) || 25,
          rate: num(scenario.house.rate), tenureYears: num(scenario.house.tenureYears) || 25,
          otherFees: num(scenario.house.otherFees),
        }
      : scenario.house.mode === 'upgrade'
      ? {
          mode: 'upgrade', propertyType: scenario.house.propertyType || 'private', yourSharePct,
          cashProceeds: num(scenario.house.cashProceeds), totalCPFRefund: num(scenario.house.totalCPFRefund),
          price: num(scenario.house.price), downpaymentPct: num(scenario.house.downpaymentPct) || 25,
          rate: num(scenario.house.rate), tenureYears: num(scenario.house.tenureYears) || 25,
          otherFees: num(scenario.house.otherFees), absd: num(scenario.house.absd),
        }
      : {
          propertyValue: num(scenario.house.propertyValue),
          outstandingBalance: num(scenario.house.outstandingBalance),
          monthlyInstalment: num(scenario.house.monthlyInstalment),
          tenureRemaining: scenario.house.tenureRemaining !== '' ? num(scenario.house.tenureRemaining) : null,
          propertyType: scenario.house.propertyType || 'private',
          yourSharePct,
        }
  ) : null

  const { resolved: house, cashImpact } = resolveHouseModule(houseInput)
  const cashSavings = Math.max(0, num(scenario.cashSavings) + cashImpact)

  return {
    salary: num(scenario.salary),
    house,
    car: scenario.hasCar ? {
      carValue: num(scenario.car.carValue),
      loanOutstanding: num(scenario.car.loanOutstanding),
      monthlyInstalment: num(scenario.car.monthlyInstalment),
      tenureRemaining: scenario.car.tenureRemaining !== '' ? num(scenario.car.tenureRemaining) : null,
    } : null,
    cpf: { oa: num(scenario.oaBalance), sa: num(scenario.saBalance), ma: num(scenario.maBalance) },
    investmentBalance: num(scenario.investmentBalance),
    cashSavings,
    insurancePremium: num(scenario.insurancePremium),
    livingExpenses: num(scenario.livingExpenses),
    // If the salary was edited away from what monthlyTakeHome was
    // actually computed for, that exact figure no longer applies —
    // fall back to calcTakeHome's flat 80% approximation instead of
    // silently reusing take-home math for a different salary.
    monthlyTakeHome: Math.round(num(scenario.salary)) === Math.round(scenario.monthlyTakeHomeSalary || 0)
      ? (scenario.monthlyTakeHome || 0)
      : 0,
  }
}

export default function MyLedgerPage() {
  const [scenarios, setScenarios] = useState([stateToScenario({ salary: 0, house: null, car: null, cpf: {}, investmentBalance: 0 }, 'baseline', 'Baseline')])
  const [synced, setSynced] = useState(false)

  const [currentAge, setCurrentAge] = useState('')
  const [retirementAge, setRetirementAge] = useState('65')
  const [lifeExpectancy, setLifeExpectancy] = useState('95')
  const [desiredMonthlyWithdrawal, setDesiredMonthlyWithdrawal] = useState('')
  const [inflationRate, setInflationRate] = useState('2.5')
  const [swr, setSwr] = useState('3')
  const [investmentReturn, setInvestmentReturn] = useState('3.0')

  const [calculated, setCalculated] = useState(false)
  const [restoredFromSave, setRestoredFromSave] = useState(false)
  const [hasRestored, setHasRestored] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  // Increments on every autosave — see the matching comment in
  // src/app/house/page.js for why a plain boolean isn't enough to keep
  // "Saved ✓" showing continuously through a fast typing burst.
  const [savedTick, setSavedTick] = useState(0)

  // Pull in whatever the other tools last saved locally as the starting
  // baseline — nothing is sent anywhere. See src/lib/shared/profile.js.
  // Scenarios (the baseline + any what-if variants) are always rebuilt
  // fresh from the other tools' latest numbers, since a stale saved
  // scenario would silently disagree with what those tools now show —
  // only the retirement-assumption fields below (which are MyLedger's
  // own, not derived from anywhere else) are restored from a save.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read from
       localStorage on mount; unavailable during SSR so can't happen during
       render without a hydration mismatch */
    const myNumbers = loadMyNumbers()
    const baseline = buildBaselineState(myNumbers)
    setScenarios([stateToScenario(baseline, 'baseline', 'Baseline')])
    setSynced(!!(myNumbers.house || myNumbers.drive || myNumbers.retire || myNumbers.insure || myNumbers.tax || myNumbers.etf || myNumbers.flow))
    const saved = loadToolInputs('ledger')
    if (saved) {
      setCurrentAge(saved.currentAge ?? '')
      setRetirementAge(saved.retirementAge ?? '65')
      setLifeExpectancy(saved.lifeExpectancy ?? '95')
      setDesiredMonthlyWithdrawal(saved.desiredMonthlyWithdrawal ?? '')
      setInflationRate(saved.inflationRate ?? '2.5')
      setSwr(saved.swr ?? '3')
      setInvestmentReturn(saved.investmentReturn ?? '3.0')
      setRestoredFromSave(true)
    }
    setHasRestored(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Autosave every keystroke, same as DriveReady's own persistence, just
  // scoped to whichever profile is active — only the retirement
  // assumptions, per the comment above (scenarios always rebuild fresh).
  useEffect(() => {
    if (!hasRestored) return
    const ok = saveToolInputs('ledger', {
      currentAge, retirementAge, lifeExpectancy, desiredMonthlyWithdrawal, inflationRate, swr, investmentReturn,
    })
    // Only flash "Saved" when the write actually landed — see tax/page.js.
    if (ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
      setSavedTick(t => t + 1)
    }
  }, [hasRestored, currentAge, retirementAge, lifeExpectancy, desiredMonthlyWithdrawal, inflationRate, swr, investmentReturn])

  useEffect(() => {
    if (savedTick === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
    setJustSaved(true)
    const t = setTimeout(() => setJustSaved(false), 1400)
    return () => clearTimeout(t)
  }, [savedTick])

  const updateScenario = (id, next) => setScenarios(s => s.map(sc => sc.id === id ? next : sc))
  const removeScenario = (id) => setScenarios(s => s.filter(sc => sc.id !== id))
  const addScenario = () => {
    if (scenarios.length >= MAX_SCENARIOS) return
    const base = scenarios[0]
    const usedLabels = new Set(scenarios.map(sc => sc.label))
    const label = ['Scenario A', 'Scenario B'].find(l => !usedLabels.has(l)) || 'Scenario B'
    setScenarios(s => [...s, { ...base, id: nextId(), label, house: { ...base.house }, car: { ...base.car } }])
  }

  const isReady = num(currentAge) > 0 && num(retirementAge) > num(currentAge) && num(desiredMonthlyWithdrawal) > 0 && num(scenarios[0]?.salary) > 0

  const comparison = calculated && isReady ? compareScenarios(
    scenarios.map(sc => ({ label: sc.label, state: scenarioToState(sc) })),
    {
      currentAge: num(currentAge), retirementAge: num(retirementAge), lifeExpectancy: num(lifeExpectancy) || 95,
      desiredMonthlyWithdrawal: num(desiredMonthlyWithdrawal), inflationRate: num(inflationRate), swr: num(swr),
      investmentReturn: num(investmentReturn),
    },
  ) : null

  const handleCalc = () => setCalculated(true)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="MyLedger" links={[{ href: '/ledger/the-math', label: 'The Math' }]} />

      {/* Hero */}
      <div style={{ background: C.coah, padding: '48px 32px 52px', textAlign: 'center' }}>
        <div style={{ fontFamily: C.fontCoah, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
          Your Whole Financial Picture
        </div>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 'clamp(30px, 5.5vw, 48px)', color: '#fff', marginBottom: 10, lineHeight: 1.2 }}>
          Net worth, TDSR, retirement — together.
        </h1>
        <p style={{ fontFamily: C.fontDisplay, fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 24, fontStyle: 'italic' }}>
          One picture for your mortgage, car, and CPF — plus what a big decision does to all three at once.
        </p>
        <TrustBadges tone="dark" items={['Pulls from your other ndtm tools', 'Compare up to 3 scenarios', 'Zero data collected', 'Free, forever']} />
      </div>

      {/* Compliance line */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '8px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>
          Educational tool only · Not financial advice · Not affiliated with CPF Board or MAS
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px 80px' }}>
        {synced && (
          <div style={{ background: C.accentBg, border: `1px solid ${C.accent}55`, borderRadius: C.rL, padding: '12px 16px', marginBottom: 20, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
            Baseline prefilled from whatever the other ndtm tools last had saved on this browser. Everything below is editable — nothing here changes what those tools have saved.
          </div>
        )}
        {restoredFromSave && (
          <div style={{ background: C.accentBg, border: `1px solid ${C.accent}55`, borderRadius: C.rL, padding: '12px 16px', marginBottom: 20, fontSize: C.xs, color: C.accent, fontWeight: 600 }}>
            Restored the retirement assumptions you last saved to this profile — edit freely.
          </div>
        )}

        <SectionDivider label="Retirement assumptions (shared across every scenario)" />
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: '22px', boxShadow: C.shadow, marginBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            <NumberInput id="ledger-current-age" label="Current age" value={currentAge} onChange={e => setCurrentAge(e.target.value)} />
            <NumberInput id="ledger-retirement-age" label="Retirement age" value={retirementAge} onChange={e => setRetirementAge(e.target.value)} />
            <NumberInput id="ledger-life-expectancy" label="Plan until age" value={lifeExpectancy} onChange={e => setLifeExpectancy(e.target.value)} />
            <MoneyInput id="ledger-withdrawal" label="Desired monthly withdrawal" value={desiredMonthlyWithdrawal} onChange={e => setDesiredMonthlyWithdrawal(e.target.value)} />
            <PercentInput id="ledger-inflation" label="Inflation" value={inflationRate} onChange={e => setInflationRate(e.target.value)} />
            <PercentInput id="ledger-swr" label="Safe withdrawal rate" value={swr} onChange={e => setSwr(e.target.value)} />
            <PercentInput id="ledger-return" label="Investment return" value={investmentReturn} onChange={e => setInvestmentReturn(e.target.value)} />
          </div>
        </div>

        <SectionDivider label={`Scenarios (${scenarios.length}/${MAX_SCENARIOS})`} />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${scenarios.length}, minmax(280px, 1fr))`, gap: 16, overflowX: 'auto' }}>
          {scenarios.map((sc, i) => (
            <ScenarioCard
              key={sc.id} scenario={sc} isBaseline={i === 0}
              onChange={next => updateScenario(sc.id, next)}
              onLabelChange={label => updateScenario(sc.id, { ...sc, label })}
              onRemove={() => removeScenario(sc.id)}
            />
          ))}
        </div>

        {scenarios.length < MAX_SCENARIOS && (
          <div style={{ marginTop: 16 }}>
            <Button variant="outline" onClick={addScenario}>+ Add a what-if scenario</Button>
          </div>
        )}

        <div style={{ marginTop: 28 }}>
          <Button variant="accent" fullWidth onClick={handleCalc} disabled={!isReady}>
            {isReady ? 'Check my full picture' : 'Fill in age, salary, and desired withdrawal above'}
          </Button>
        </div>
        <AutosaveIndicator justSaved={justSaved} C={C} style={{ textAlign: 'left' }} />
        <p style={{ marginTop: 4, fontSize: C.xs, color: C.faint, lineHeight: 1.5 }}>
          Only the retirement assumptions above are saved — scenarios always rebuild fresh from your other tools&apos; latest numbers.
        </p>

        {comparison && (
          <div style={{ marginTop: 32 }}>
            <SectionDivider label="Side by side" />
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: '20px', boxShadow: C.shadow }}>
              <ComparisonTable rows={comparison} />
              <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 16 }}>
                TDSR counts loan repayments only (banks don&apos;t count insurance premiums), against gross salary; MSR applies to HDB loans and is usually the tighter of the two. Retirement figures reuse RetireWell&apos;s own projection engine, fed with capacity that <strong>rises as your loans end</strong> rather than assuming today&apos;s repayments last forever. See <a href="/ledger/the-math" style={{ color: C.accent }}>the math</a> for the full formulas.
              </p>
              <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 8 }}>
                {comparison[0]?.takeHome?.exact
                  ? 'Take-home pay is the exact after-tax figure from TaxWise, including your age-banded CPF share.'
                  : <>Take-home pay is approximated at 80% of gross. <a href="/tax" style={{ color: C.accent }}>Run TaxWise</a> for an exact after-tax figure — it matters most if you&apos;re over 55 or paying significant tax.</>}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
