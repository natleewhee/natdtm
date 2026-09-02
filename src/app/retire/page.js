'use client'

import { useEffect, useState } from 'react'
import { C, SGD, parseMoney } from '@/lib/retire/theme'
import { calcRetirement } from '@/lib/retire/calc'
import { monthlyCpfContribution, CPF_OW_CEILING } from '@/lib/retire/cpf'
import { projectSrsBalance, compareSrsWithdrawalPlans, SRS_RETIREMENT_AGE } from '@/lib/retire/srs'
import { loadMyNumbers, saveRetireNumbers, saveToolInputs, loadToolInputs } from '@/lib/shared/profile'
import { MoneyInput, PercentInput, NumberInput, SectionDivider, Segmented } from '@/components/retire/ui'
import RetireResults from '@/components/retire/Results'
import ShellHeader from '@/components/shared/ShellHeader'
import TrustBadges from '@/components/shared/TrustBadges'
import Button from '@/components/shared/Button'
import AutosaveIndicator from '@/components/shared/AutosaveIndicator'

const num = parseMoney

export default function RetireWellPage() {
  const [currentAge, setCurrentAge] = useState('')
  const [retirementAge, setRetirementAge] = useState('65')
  const [lifeExpectancy, setLifeExpectancy] = useState('95')

  const [salary, setSalary] = useState('')
  const [salaryGrowthRate, setSalaryGrowthRate] = useState('3.0')
  const [annualBonus, setAnnualBonus] = useState('')
  const [startingOA, setStartingOA] = useState('')
  const [startingSA, setStartingSA] = useState('')
  const [startingMA, setStartingMA] = useState('')

  const [hasHousingDraw, setHasHousingDraw] = useState(false)
  const [housingOaMonthly, setHousingOaMonthly] = useState('')
  const [housingOaUntilAge, setHousingOaUntilAge] = useState('')

  const [hasRstu, setHasRstu] = useState(false)
  const [rstuAmount, setRstuAmount] = useState('')
  const [rstuFrequency, setRstuFrequency] = useState('monthly')

  const [investmentStart, setInvestmentStart] = useState('')
  const [investmentMonthly, setInvestmentMonthly] = useState('')
  const [investmentReturn, setInvestmentReturn] = useState('3.0')

  const [hasSrs, setHasSrs] = useState(false)
  const [srsBalance, setSrsBalance] = useState('')
  const [srsMonthly, setSrsMonthly] = useState('')

  const [desiredMonthlyWithdrawal, setDesiredMonthlyWithdrawal] = useState('')
  const [inflationRate, setInflationRate] = useState('2.5')
  const [swr, setSwr] = useState('3')

  const [calculated, setCalculated] = useState(false)

  const [houseNumbers, setHouseNumbers] = useState(null)
  const [driveNumbers, setDriveNumbers] = useState(null)
  const [houseApplied, setHouseApplied] = useState(false)
  const [houseDismissed, setHouseDismissed] = useState(false)

  // Pull in whatever HouseMuch/DriveReady last saved locally (nothing is
  // sent anywhere) so this page can offer them as an editable starting
  // point instead of asking for the same numbers twice.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read from
       localStorage on mount; unavailable during SSR so can't happen during
       render without a hydration mismatch */
    const { house, drive } = loadMyNumbers()
    setHouseNumbers(house)
    setDriveNumbers(drive)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const applyHouseNumbers = () => {
    if (!houseNumbers) return
    setInvestmentStart(String(Math.round(houseNumbers.cashProceeds)))
    setStartingOA(String(Math.round(houseNumbers.totalCPFRefund)))
    setHouseApplied(true)
  }

  const [restoredFromSave, setRestoredFromSave] = useState(false)
  const [hasRestored, setHasRestored] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  // Increments on every autosave — see the matching comment in
  // src/app/house/page.js for why a plain boolean isn't enough to keep
  // "Saved ✓" showing continuously through a fast typing burst.
  const [savedTick, setSavedTick] = useState(0)

  useEffect(() => {
    const saved = loadToolInputs('retire')
    /* eslint-disable react-hooks/set-state-in-effect */
    if (saved) {
      setCurrentAge(saved.currentAge ?? '')
      setRetirementAge(saved.retirementAge ?? '65')
      setLifeExpectancy(saved.lifeExpectancy ?? '95')
      setSalary(saved.salary ?? '')
      setSalaryGrowthRate(saved.salaryGrowthRate ?? '3.0')
      setAnnualBonus(saved.annualBonus ?? '')
      setStartingOA(saved.startingOA ?? '')
      setStartingSA(saved.startingSA ?? '')
      setStartingMA(saved.startingMA ?? '')
      setHasHousingDraw(!!saved.hasHousingDraw)
      setHousingOaMonthly(saved.housingOaMonthly ?? '')
      setHousingOaUntilAge(saved.housingOaUntilAge ?? '')
      setHasRstu(!!saved.hasRstu)
      setRstuAmount(saved.rstuAmount ?? '')
      setRstuFrequency(saved.rstuFrequency ?? 'monthly')
      setInvestmentStart(saved.investmentStart ?? '')
      setInvestmentMonthly(saved.investmentMonthly ?? '')
      setInvestmentReturn(saved.investmentReturn ?? '3.0')
      setHasSrs(!!saved.hasSrs)
      setSrsBalance(saved.srsBalance ?? '')
      setSrsMonthly(saved.srsMonthly ?? '')
      setDesiredMonthlyWithdrawal(saved.desiredMonthlyWithdrawal ?? '')
      setInflationRate(saved.inflationRate ?? '2.5')
      setSwr(saved.swr ?? '3')
      setRestoredFromSave(true)
    }
    setHasRestored(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Autosave every keystroke, same as DriveReady's own persistence, just
  // scoped to whichever profile is active.
  useEffect(() => {
    if (!hasRestored) return
    const ok = saveToolInputs('retire', {
      currentAge, retirementAge, lifeExpectancy,
      salary, salaryGrowthRate, annualBonus, startingOA, startingSA, startingMA,
      hasHousingDraw, housingOaMonthly, housingOaUntilAge,
      hasRstu, rstuAmount, rstuFrequency,
      investmentStart, investmentMonthly, investmentReturn,
      hasSrs, srsBalance, srsMonthly,
      desiredMonthlyWithdrawal, inflationRate, swr,
    })
    // Only flash "Saved" when the write actually landed — see tax/page.js.
    if (ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
      setSavedTick(t => t + 1)
    }
  }, [
    hasRestored, currentAge, retirementAge, lifeExpectancy,
    salary, salaryGrowthRate, annualBonus, startingOA, startingSA, startingMA,
    hasHousingDraw, housingOaMonthly, housingOaUntilAge,
    hasRstu, rstuAmount, rstuFrequency,
    investmentStart, investmentMonthly, investmentReturn,
    hasSrs, srsBalance, srsMonthly,
    desiredMonthlyWithdrawal, inflationRate, swr,
  ])

  useEffect(() => {
    if (savedTick === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
    setJustSaved(true)
    const t = setTimeout(() => setJustSaved(false), 1400)
    return () => clearTimeout(t)
  }, [savedTick])

  const isReady = num(currentAge) > 0 && num(retirementAge) > num(currentAge) && num(desiredMonthlyWithdrawal) > 0

  // Live preview of this month's CPF split, shown as soon as age + salary
  // are entered — no need to hit Calculate first.
  const cpfPreview = num(currentAge) > 0 && num(salary) > 0 ? monthlyCpfContribution(num(salary), num(currentAge)) : null
  const salaryIsCapped = num(salary) > CPF_OW_CEILING

  const result = calculated && isReady ? calcRetirement({
    currentAge: num(currentAge), retirementAge: num(retirementAge), lifeExpectancy: num(lifeExpectancy) || 95,
    salary: num(salary), salaryGrowthRate: num(salaryGrowthRate), annualBonus: num(annualBonus),
    startingOA: num(startingOA), startingSA: num(startingSA), startingMA: num(startingMA),
    housingOaMonthly: hasHousingDraw ? num(housingOaMonthly) : 0,
    housingOaUntilAge: hasHousingDraw && housingOaUntilAge !== '' ? num(housingOaUntilAge) : null,
    rstuAmount: hasRstu ? num(rstuAmount) : 0, rstuFrequency,
    investmentStart: num(investmentStart), investmentMonthly: num(investmentMonthly), investmentReturn: num(investmentReturn),
    desiredMonthlyWithdrawal: num(desiredMonthlyWithdrawal), inflationRate: num(inflationRate), swr: num(swr),
  }) : null

  // SRS withdrawal-side modeling — additive to the main accumulation/
  // depletion engine above, not folded into it, since SRS has its own
  // withdrawal rules entirely distinct from the money-market investment
  // balance that engine already tracks. Years to retirement here uses
  // SRS_RETIREMENT_AGE (the statutory age that unlocks penalty-free
  // withdrawal), not your chosen retirementAge above — those two ages
  // can differ (e.g. retiring at 55 doesn't unlock SRS at 55).
  const srsResult = calculated && isReady && hasSrs ? (() => {
    const yearsToSrsAge = Math.max(0, SRS_RETIREMENT_AGE - num(currentAge))
    const balanceAtRetirement = projectSrsBalance({
      startBalance: num(srsBalance), monthlyContribution: num(srsMonthly),
      annualReturnPct: num(investmentReturn), yearsToRetirement: yearsToSrsAge,
    })
    // CPF LIFE payouts are not taxable in Singapore, so they're never
    // stacked into otherTaxableIncome here — only genuinely taxable
    // retirement income (rental, part-time work, etc.) would belong,
    // and this tool doesn't currently collect that, so it defaults to 0.
    const plans = compareSrsWithdrawalPlans(balanceAtRetirement, 0, [1, 5, 10])
    return { balanceAtRetirement, plans, yearsToSrsAge }
  })() : null

  const handleCalc = () => setCalculated(true)

  // Hand off this month's CPF balances/investments/salary so MyLedger can
  // use them as a baseline module — stored locally only. See
  // src/lib/shared/profile.js.
  useEffect(() => {
    if (!result) return
    saveRetireNumbers({
      salary: num(salary),
      oaBalance: num(startingOA), saBalance: num(startingSA), maBalance: num(startingMA),
      investmentBalance: num(investmentStart),
      monthlyContribution: num(investmentMonthly),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed off `calculated` (whether result exists at all), not `result` itself (a new object every render, which would re-save on every keystroke); nothing else in the body reads a result field
  }, [calculated, salary, startingOA, startingSA, startingMA, investmentStart, investmentMonthly])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="RetireWell" links={[{ href: '/retire/the-math', label: 'The Math' }]} />

      {/* Hero */}
      <div style={{ background: C.ndtm, padding: '48px 32px 52px', textAlign: 'center' }}>
        <div style={{ fontFamily: C.fontNdtm, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
          Singapore Retirement Readiness Calculator
        </div>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 'clamp(30px, 5.5vw, 48px)', color: '#fff', marginBottom: 10, lineHeight: 1.2 }}>
          Will you actually have enough?
        </h1>
        <p style={{ fontFamily: C.fontDisplay, fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 24, fontStyle: 'italic' }}>
          CPF projected properly, your investments stress-tested — not a rule of thumb.
        </p>
        <TrustBadges tone="dark" items={['CPF contribution rates modeled', 'Depletion-tested, not just the 3% rule', 'Zero data collected', 'Free, forever']} />
      </div>

      {/* Compliance line */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '8px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>
          Educational tool only · Not financial advice · Not affiliated with CPF Board or MAS
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        {houseNumbers && !houseApplied && !houseDismissed && (
          <div style={{ background: C.accentBg, border: `1px solid ${C.accent}55`, borderRadius: C.rL, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: C.sm, fontWeight: 700, color: C.accent }}>
                Found numbers from your HouseMuch sale{houseNumbers.saleDate ? ` on ${houseNumbers.saleDate}` : ''}
              </div>
              <div style={{ fontSize: C.xs, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
                {SGD(houseNumbers.cashProceeds)} cash proceeds → starting portfolio, {SGD(houseNumbers.totalCPFRefund)} CPF refund → Ordinary Account. Nothing is applied until you say so, and you can edit any field afterward.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Button variant="accent" onClick={applyHouseNumbers}>Use these numbers</Button>
              <Button variant="outline" onClick={() => setHouseDismissed(true)}>Dismiss</Button>
            </div>
          </div>
        )}
        {houseApplied && (
          <div style={{ fontSize: C.xs, color: C.muted, marginBottom: 12 }}>
            Prefilled from your HouseMuch sale — <button type="button" onClick={() => setHouseApplied(false)} style={{ background: 'none', border: 'none', padding: 0, color: C.accent, fontWeight: 600, cursor: 'pointer', fontSize: C.xs, fontFamily: C.fontBody }}>show that banner again</button>.
          </div>
        )}

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: '28px 24px', boxShadow: C.shadow }}>

          {restoredFromSave && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: C.accentBg, border: `1px solid ${C.accent}55`, borderRadius: C.r, fontSize: C.xs, color: C.accent, fontWeight: 600 }}>
              Restored what you last saved to this profile — edit freely.
            </div>
          )}

          <SectionDivider label="You" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <NumberInput id="current-age" label="Current age" value={currentAge} onChange={e => setCurrentAge(e.target.value)} />
            <NumberInput id="retirement-age" label="Envisioned retirement age" value={retirementAge} onChange={e => setRetirementAge(e.target.value)} />
            <NumberInput id="life-expectancy" label="Plan until age" hint="For the depletion stress-test — life expectancy is a median, not a ceiling, so this defaults conservatively higher" value={lifeExpectancy} onChange={e => setLifeExpectancy(e.target.value)} />
          </div>

          <SectionDivider label="Income & CPF" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="salary" label="Monthly salary" value={salary} onChange={e => setSalary(e.target.value)} />
            <PercentInput id="salary-growth" label="Annual salary growth" hint="Long-run SG wage growth is roughly 3%" value={salaryGrowthRate} onChange={e => setSalaryGrowthRate(e.target.value)} />
            <MoneyInput id="annual-bonus" label="Annual bonus / AWS" hint="Optional — capped by the CPF annual wage ceiling" value={annualBonus} onChange={e => setAnnualBonus(e.target.value)} />
          </div>

          {cpfPreview && (
            <div style={{ marginTop: 14, padding: '11px 14px', background: C.bg, border: `1px dashed ${C.border}`, borderRadius: C.r }}>
              <div style={{ fontSize: C.xs, color: C.muted, marginBottom: 6 }}>
                At age {currentAge} on this salary{salaryIsCapped ? ` (capped at ${SGD(CPF_OW_CEILING)} for CPF)` : ''}, your monthly CPF contribution is:
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: C.fontMono, fontSize: C.sm }}>
                <span style={{ color: C.text, fontWeight: 700 }}>{SGD(cpfPreview.total)} total</span>
                <span style={{ color: C.muted }}>OA {SGD(cpfPreview.oa)}</span>
                <span style={{ color: C.muted }}>SA {SGD(cpfPreview.sa)}</span>
                <span style={{ color: C.muted }}>MA {SGD(cpfPreview.ma)}</span>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="starting-oa" label="Current CPF Ordinary Account" value={startingOA} onChange={e => setStartingOA(e.target.value)} />
            <MoneyInput id="starting-sa" label="Current CPF Special Account" value={startingSA} onChange={e => setStartingSA(e.target.value)} />
            <MoneyInput id="starting-ma" label="Current CPF MediSave Account" value={startingMA} onChange={e => setStartingMA(e.target.value)} />
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              type="button" onClick={() => setHasHousingDraw(h => !h)} aria-pressed={hasHousingDraw}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                background: hasHousingDraw ? C.accentBg : C.bg, border: `1.5px solid ${hasHousingDraw ? C.accent : C.border}`,
                borderRadius: 100, cursor: 'pointer', fontSize: C.xs, fontWeight: 700,
                color: hasHousingDraw ? C.accent : C.muted, fontFamily: C.fontBody,
              }}
            >
              {hasHousingDraw ? '✓ ' : ''} I&apos;m drawing CPF OA to service a mortgage
            </button>
            {hasHousingDraw && (
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <MoneyInput id="housing-oa-monthly" label="Monthly OA drawn for housing" value={housingOaMonthly} onChange={e => setHousingOaMonthly(e.target.value)} />
                <NumberInput id="housing-oa-until" label="Until age" hint="Loan payoff age — leave blank if ongoing to retirement" value={housingOaUntilAge} onChange={e => setHousingOaUntilAge(e.target.value)} />
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              type="button" onClick={() => setHasRstu(h => !h)} aria-pressed={hasRstu}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                background: hasRstu ? C.accentBg : C.bg, border: `1.5px solid ${hasRstu ? C.accent : C.border}`,
                borderRadius: 100, cursor: 'pointer', fontSize: C.xs, fontWeight: 700,
                color: hasRstu ? C.accent : C.muted, fontFamily: C.fontBody,
              }}
            >
              {hasRstu ? '✓ ' : ''} I&apos;m topping up my Special Account (RSTU)
            </button>
            {hasRstu && (
              <div style={{ marginTop: 12, maxWidth: 320 }}>
                <div style={{ marginBottom: 10 }}>
                  <Segmented
                    value={rstuFrequency} onChange={setRstuFrequency}
                    options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]}
                  />
                </div>
                <MoneyInput
                  id="rstu-amount" label={rstuFrequency === 'annual' ? 'Annual RSTU top-up' : 'Monthly RSTU top-up'}
                  hint="Capped at the prevailing Full Retirement Sum — see the math"
                  value={rstuAmount} onChange={e => setRstuAmount(e.target.value)}
                />
              </div>
            )}
          </div>

          <SectionDivider label="Investments (money market funds)" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="investment-start" label="Current portfolio value" value={investmentStart} onChange={e => setInvestmentStart(e.target.value)} />
            <MoneyInput id="investment-monthly" label="Monthly contribution" value={investmentMonthly} onChange={e => setInvestmentMonthly(e.target.value)} />
            <PercentInput id="investment-return" label="Assumed annual return" hint="Money market funds typically track short-term rates" value={investmentReturn} onChange={e => setInvestmentReturn(e.target.value)} />
          </div>

          {driveNumbers && (
            <p style={{ marginTop: 10, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
              From DriveReady{driveNumbers.carLabel ? `, your ${driveNumbers.carLabel}` : ''}: you&apos;re committing {SGD(driveNumbers.monthlyInstalment)}/month to a car loan.
              {num(investmentMonthly) > 0 && ` That's ${(driveNumbers.monthlyInstalment / (num(investmentMonthly) || 1)).toFixed(1)}× your planned monthly investment — worth weighing against each other.`}
            </p>
          )}

          <div style={{ marginTop: 20 }}>
            <button
              type="button" onClick={() => setHasSrs(h => !h)} aria-pressed={hasSrs}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                background: hasSrs ? C.accentBg : C.bg, border: `1.5px solid ${hasSrs ? C.accent : C.border}`,
                borderRadius: 100, cursor: 'pointer', fontSize: C.xs, fontWeight: 700,
                color: hasSrs ? C.accent : C.muted, fontFamily: C.fontBody,
              }}
            >
              {hasSrs ? '✓ ' : ''} I have an SRS (Supplementary Retirement Scheme) account
            </button>
            {hasSrs && (
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <MoneyInput id="srs-balance" label="Current SRS balance" value={srsBalance} onChange={e => setSrsBalance(e.target.value)} />
                <MoneyInput id="srs-monthly" label="Monthly SRS contribution" hint={`Tax relief — see TaxWise for exactly how much this saves you now`} value={srsMonthly} onChange={e => setSrsMonthly(e.target.value)} />
              </div>
            )}
            {hasSrs && (
              <p style={{ marginTop: 8, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
                Grown at the same {investmentReturn || 0}% return assumed for your investments above, to age {SRS_RETIREMENT_AGE} — the statutory retirement age that unlocks penalty-free withdrawal.
              </p>
            )}
          </div>

          <SectionDivider label="Retirement target" />
          <p style={{ marginTop: -8, marginBottom: 16, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
            Checked against your combined portfolio at retirement — investments plus CPF Ordinary and Special Account (MediSave excluded, since it&apos;s earmarked for healthcare, not withdrawals).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="desired-withdrawal" label="Desired monthly withdrawal" hint="In today's dollars — I'll escalate it for inflation" value={desiredMonthlyWithdrawal} onChange={e => setDesiredMonthlyWithdrawal(e.target.value)} />
            <PercentInput id="inflation-rate" label="Inflation assumption" value={inflationRate} onChange={e => setInflationRate(e.target.value)} />
            <PercentInput id="swr" label="Safe withdrawal rate" hint="3% is a conservative default — see the math" value={swr} onChange={e => setSwr(e.target.value)} />
          </div>

          <div style={{ marginTop: 24 }}>
            <Button variant="accent" fullWidth onClick={handleCalc} disabled={!isReady}>
              {isReady ? 'Check my retirement readiness' : 'Fill in the fields above'}
            </Button>
          </div>
          <AutosaveIndicator justSaved={justSaved} C={C} />
        </div>

        {result && <RetireResults result={result} srs={srsResult} />}
      </div>
    </div>
  )
}
