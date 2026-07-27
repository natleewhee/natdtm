'use client'

import { useState } from 'react'
import { C, SGD, parseMoney } from '@/lib/retire/theme'
import { calcRetirement } from '@/lib/retire/calc'
import { MoneyInput, PercentInput, NumberInput, SectionDivider } from '@/components/retire/ui'
import RetireResults from '@/components/retire/Results'
import ShellHeader from '@/components/shared/ShellHeader'
import TrustBadges from '@/components/shared/TrustBadges'
import Button from '@/components/shared/Button'

const num = parseMoney

export default function RetireWellPage() {
  const [currentAge, setCurrentAge] = useState('')
  const [retirementAge, setRetirementAge] = useState('65')
  const [lifeExpectancy, setLifeExpectancy] = useState('90')

  const [salary, setSalary] = useState('')
  const [startingOA, setStartingOA] = useState('')
  const [startingSA, setStartingSA] = useState('')
  const [startingMA, setStartingMA] = useState('')

  const [hasHousingDraw, setHasHousingDraw] = useState(false)
  const [housingOaMonthly, setHousingOaMonthly] = useState('')
  const [housingOaUntilAge, setHousingOaUntilAge] = useState('')

  const [investmentStart, setInvestmentStart] = useState('')
  const [investmentMonthly, setInvestmentMonthly] = useState('')
  const [investmentReturn, setInvestmentReturn] = useState('3.0')

  const [desiredMonthlyWithdrawal, setDesiredMonthlyWithdrawal] = useState('')
  const [inflationRate, setInflationRate] = useState('2.5')
  const [swr, setSwr] = useState('3')
  const [cpfLifeMonthlyPayout, setCpfLifeMonthlyPayout] = useState('')

  const [calculated, setCalculated] = useState(false)

  const isReady = num(currentAge) > 0 && num(retirementAge) > num(currentAge) && num(desiredMonthlyWithdrawal) > 0

  const result = calculated && isReady ? calcRetirement({
    currentAge: num(currentAge), retirementAge: num(retirementAge), lifeExpectancy: num(lifeExpectancy) || 90,
    salary: num(salary),
    startingOA: num(startingOA), startingSA: num(startingSA), startingMA: num(startingMA),
    housingOaMonthly: hasHousingDraw ? num(housingOaMonthly) : 0,
    housingOaUntilAge: hasHousingDraw && housingOaUntilAge !== '' ? num(housingOaUntilAge) : null,
    investmentStart: num(investmentStart), investmentMonthly: num(investmentMonthly), investmentReturn: num(investmentReturn),
    desiredMonthlyWithdrawal: num(desiredMonthlyWithdrawal), inflationRate: num(inflationRate), swr: num(swr),
    cpfLifeMonthlyPayout: num(cpfLifeMonthlyPayout),
  }) : null

  const handleCalc = () => setCalculated(true)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="RetireWell" links={[{ href: '/retire/the-math', label: 'The Math' }]} />

      {/* Hero */}
      <div style={{ background: C.coah, padding: '48px 32px 52px', textAlign: 'center' }}>
        <div style={{ fontFamily: C.fontCoah, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
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
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: '28px 24px', boxShadow: C.shadow }}>

          <SectionDivider label="You" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <NumberInput id="current-age" label="Current age" value={currentAge} onChange={e => setCurrentAge(e.target.value)} />
            <NumberInput id="retirement-age" label="Envisioned retirement age" value={retirementAge} onChange={e => setRetirementAge(e.target.value)} />
            <NumberInput id="life-expectancy" label="Plan until age" hint="For the depletion stress-test only" value={lifeExpectancy} onChange={e => setLifeExpectancy(e.target.value)} />
          </div>

          <SectionDivider label="Income & CPF" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="salary" label="Monthly salary" hint="Base salary only — bonuses aren't modeled" value={salary} onChange={e => setSalary(e.target.value)} />
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

          <SectionDivider label="Investments (money market funds)" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="investment-start" label="Current portfolio value" value={investmentStart} onChange={e => setInvestmentStart(e.target.value)} />
            <MoneyInput id="investment-monthly" label="Monthly contribution" value={investmentMonthly} onChange={e => setInvestmentMonthly(e.target.value)} />
            <PercentInput id="investment-return" label="Assumed annual return" hint="Money market funds typically track short-term rates" value={investmentReturn} onChange={e => setInvestmentReturn(e.target.value)} />
          </div>

          <SectionDivider label="Retirement target" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="desired-withdrawal" label="Desired monthly withdrawal" hint="In today's dollars — I'll escalate it for inflation" value={desiredMonthlyWithdrawal} onChange={e => setDesiredMonthlyWithdrawal(e.target.value)} />
            <PercentInput id="inflation-rate" label="Inflation assumption" value={inflationRate} onChange={e => setInflationRate(e.target.value)} />
            <PercentInput id="swr" label="Safe withdrawal rate" hint="3% is a conservative default — see the math" value={swr} onChange={e => setSwr(e.target.value)} />
            <MoneyInput id="cpf-life-payout" label="Expected CPF LIFE payout" hint="Optional — look this up on the CPF Retirement dashboard" value={cpfLifeMonthlyPayout} onChange={e => setCpfLifeMonthlyPayout(e.target.value)} />
          </div>

          <div style={{ marginTop: 24 }}>
            <Button variant="accent" fullWidth onClick={handleCalc} disabled={!isReady}>
              {isReady ? 'Check my retirement readiness' : 'Fill in the fields above'}
            </Button>
          </div>
        </div>

        {result && <RetireResults result={result} />}
      </div>
    </div>
  )
}
