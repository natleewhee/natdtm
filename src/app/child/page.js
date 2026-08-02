'use client'

import { useEffect, useState } from 'react'
import { C, SGD, parseMoney } from '@/lib/child/theme'
import { AGE_BANDS, SUBSIDY_TIERS, projectChildCost, monthlySavingsPlan } from '@/lib/child/calc'
import { saveToolInputs, loadToolInputs } from '@/lib/shared/profile'
import { SectionDivider, NumberInput, Segmented, Toggle } from '@/components/child/ui'
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

export default function ChildCostPlannerPage() {
  const [currentAge, setCurrentAge] = useState('0')
  const [planUntilAge, setPlanUntilAge] = useState('18')
  const [numberOfChildren, setNumberOfChildren] = useState('1')
  const [incomeTier, setIncomeTier] = useState('high')
  const [useSubsidy, setUseSubsidy] = useState(true)
  const [assumedReturn, setAssumedReturn] = useState('3.0')

  const [hasRestored, setHasRestored] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [savedTick, setSavedTick] = useState(0)
  const [calculated, setCalculated] = useState(false)

  useEffect(() => {
    const saved = loadToolInputs('child')
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from
       localStorage on mount; unavailable during SSR so can't happen during render */
    if (saved) {
      setCurrentAge(saved.currentAge ?? '0')
      setPlanUntilAge(saved.planUntilAge ?? '18')
      setNumberOfChildren(saved.numberOfChildren ?? '1')
      setIncomeTier(saved.incomeTier ?? 'high')
      setUseSubsidy(saved.useSubsidy ?? true)
      setAssumedReturn(saved.assumedReturn ?? '3.0')
    }
    setHasRestored(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (!hasRestored) return
    const ok = saveToolInputs('child', { currentAge, planUntilAge, numberOfChildren, incomeTier, useSubsidy, assumedReturn })
    if (ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
      setSavedTick(t => t + 1)
    }
  }, [hasRestored, currentAge, planUntilAge, numberOfChildren, incomeTier, useSubsidy, assumedReturn])

  useEffect(() => {
    if (savedTick === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
    setJustSaved(true)
    const t = setTimeout(() => setJustSaved(false), 1400)
    return () => clearTimeout(t)
  }, [savedTick])

  const isReady = num(currentAge) >= 0 && num(planUntilAge) > num(currentAge)

  const result = calculated && isReady ? projectChildCost({
    currentAge: num(currentAge), planUntilAge: num(planUntilAge),
    incomeTier, useSubsidy, numberOfChildren: num(numberOfChildren) || 1,
  }) : null

  const monthlyPlan = result ? monthlySavingsPlan(result.totalAllChildren, result.years.length, num(assumedReturn)) : 0

  const handleCalc = () => setCalculated(true)

  return (
    <>
      <ShellHeader />
      <div className="shell-wrap" style={{ padding: '40px 24px 80px', maxWidth: 780, margin: '0 auto' }}>
        <p style={{ fontFamily: C.fontMono, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: C.faint, margin: '0 0 10px' }}>
          Children&apos;s Cost Planner
        </p>
        <h1 style={{ fontFamily: C.fontDisplay, fontWeight: 600, fontSize: 'clamp(26px,4vw,36px)', lineHeight: 1.15, margin: '0 0 14px' }}>
          What will raising your child actually cost?
        </h1>
        <p style={{ color: C.muted, fontSize: 15, margin: '0 0 20px', maxWidth: '58ch', lineHeight: 1.6 }}>
          Childcare/infant-care subsidies, school fees, tuition, and daily expenses — projected year by year to age 18, so you know what to save for and when the cost actually rises.
        </p>
        <TrustBadges items={['Singapore-specific', 'Age-banded, not a flat guess', 'Zero data collected', 'Free, forever']} />

        <div style={{ marginTop: 28, background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, boxShadow: C.shadow, padding: '24px 24px 22px' }}>
          <SectionDivider label="Child" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <NumberInput id="child-current-age" label="Child's current age" hint="0 if not yet born" value={currentAge} onChange={e => setCurrentAge(e.target.value)} suffix="yrs" />
            <NumberInput id="child-plan-until" label="Plan until age" hint="18 covers school; extend for university" value={planUntilAge} onChange={e => setPlanUntilAge(e.target.value)} suffix="yrs" />
            <NumberInput id="child-count" label="Number of children" hint="Same age profile assumed for each" value={numberOfChildren} onChange={e => setNumberOfChildren(e.target.value)} />
          </div>

          <SectionDivider label="Childcare subsidy" />
          <Toggle active={useSubsidy} onClick={() => setUseSubsidy(s => !s)}>
            Using an ECDA-registered infant care / childcare centre
          </Toggle>
          {useSubsidy && (
            <div style={{ marginTop: 12, maxWidth: 420 }}>
              <div style={{ fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 7 }}>Household income</div>
              <Segmented
                value={incomeTier} onChange={setIncomeTier}
                options={Object.entries(SUBSIDY_TIERS).map(([key, t]) => ({ value: key, label: t.label.replace('S$', '').replace('/mo household income', '') }))}
              />
              <p style={{ marginTop: 7, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
                {SUBSIDY_TIERS[incomeTier]?.label} — subsidy applies only during infant care and preschool years.
              </p>
            </div>
          )}

          <SectionDivider label="Savings plan" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <NumberInput id="child-return" label="Assumed annual return on savings" hint="0 for a plain savings account" value={assumedReturn} onChange={e => setAssumedReturn(e.target.value)} suffix="%" />
          </div>

          <div style={{ marginTop: 24 }}>
            <Button variant="accent" fullWidth onClick={handleCalc} disabled={!isReady}>
              {isReady ? 'Project the cost' : 'Enter a valid age range above'}
            </Button>
          </div>
          <AutosaveIndicator justSaved={justSaved} C={C} />
        </div>

        {result && (
          <div style={{ marginTop: 32 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, boxShadow: C.shadow, padding: '26px 26px 24px' }}>
              <div style={{ fontFamily: C.fontMono, fontSize: 34, fontWeight: 500, color: C.accentText, marginBottom: 6 }}>
                {SGD(result.totalAllChildren)}
              </div>
              <p style={{ fontSize: C.sm, color: C.muted, margin: 0 }}>
                Total estimated cost from age {result.startAge} to {result.endAge}, for {result.children} {result.children === 1 ? 'child' : 'children'}.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: C.border, borderRadius: C.rL, overflow: 'hidden', marginTop: 20 }}>
                <div style={{ background: C.surface2 || C.bg, padding: '15px 16px 14px' }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.faint, fontWeight: 600 }}>Right now</div>
                  <div style={{ fontFamily: C.fontMono, fontSize: 22, fontWeight: 700, color: C.text }}>{SGD(result.currentMonthlyAllChildren)}/mo</div>
                </div>
                <div style={{ background: C.surface2 || C.bg, padding: '15px 16px 14px' }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.faint, fontWeight: 600 }}>Average, per child</div>
                  <div style={{ fontFamily: C.fontMono, fontSize: 22, fontWeight: 700, color: C.text }}>{SGD(result.averageMonthlyPerChild)}/mo</div>
                </div>
                <div style={{ background: C.surface2 || C.bg, padding: '15px 16px 14px' }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.faint, fontWeight: 600 }}>To save monthly</div>
                  <div style={{ fontFamily: C.fontMono, fontSize: 22, fontWeight: 700, color: C.greenText }}>{SGD(monthlyPlan)}/mo</div>
                </div>
              </div>
              {result.categoryTotals.subsidySaved > 0 && (
                <p style={{ fontSize: C.xs, color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
                  Subsidies save you an estimated <strong style={{ color: C.text }}>{SGD(result.categoryTotals.subsidySaved)}</strong> over the horizon, already netted out of the figures above.
                </p>
              )}
            </div>

            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Where it goes, per child
              </div>
              <Row label="Childcare / infant care" value={SGD(result.categoryTotals.childcare)} />
              <Row label="Tuition & enrichment" value={SGD(result.categoryTotals.tuitionEnrichment)} />
              <Row label="Daily expenses (food, clothes, misc)" value={SGD(result.categoryTotals.dailyExpenses)} />
              <Row label="School fees" value={SGD(result.categoryTotals.schoolFees)} />
              <Row label="Total per child" value={SGD(result.totalPerChild)} bold />
            </div>

            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Monthly cost by stage
              </div>
              {AGE_BANDS.filter(b => b.maxAge >= result.startAge && b.minAge <= result.endAge).map(band => {
                const rowInHorizon = result.years.find(y => y.bandKey === band.key)
                if (!rowInHorizon) return null
                return <Row key={band.key} label={band.label} value={`${SGD(rowInHorizon.monthly.total)}/mo`} />
              })}
            </div>

            <ExploreSection title="Show the math" defaultOpen={false}>
              <p style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6, marginBottom: 10 }}>
                Total = Σ (monthly cost for each year&apos;s age band × 12), from age {result.startAge} to {result.endAge}, × {result.children} {result.children === 1 ? 'child' : 'children'}. Monthly savings plan solves the standard future-value-of-an-annuity formula for the payment, at your assumed return, over {result.years.length * 12} months.
              </p>
              <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6 }}>
                These are rough, good-faith 2026 estimates of typical Singapore household spending by stage — not a quote, and not pulled from a single official source. Actual cost varies enormously by lifestyle, school type, and how much tuition/enrichment you use. Subsidy figures approximate MSF/ECDA&apos;s Basic + Additional Subsidy as three simplified income tiers rather than the real sliding scale.
              </p>
            </ExploreSection>
          </div>
        )}
      </div>
    </>
  )
}
