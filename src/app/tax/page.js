'use client'

import { useEffect, useState } from 'react'
import { C, SGD, parseMoney } from '@/lib/tax/theme'
import { calcTax, NSMAN_RELIEF, SRS_CAP_CITIZEN_PR, SRS_CAP_FOREIGNER, RSTU_RELIEF_CAP_SELF, RSTU_RELIEF_CAP_FAMILY, COURSE_FEES_CAP } from '@/lib/tax/calc'
import { loadMyNumbers, saveTaxNumbers, saveToolInputs, loadToolInputs } from '@/lib/shared/profile'
import { MoneyInput, NumberInput, SectionDivider, Segmented } from '@/components/tax/ui'
import TaxResults from '@/components/tax/Results'
import ShellHeader from '@/components/shared/ShellHeader'
import TrustBadges from '@/components/shared/TrustBadges'
import Button from '@/components/shared/Button'
import AutosaveIndicator from '@/components/shared/AutosaveIndicator'

const num = parseMoney

export default function TaxWisePage() {
  const [age, setAge] = useState('')
  const [residency, setResidency] = useState('citizen')
  const [monthlySalary, setMonthlySalary] = useState('')
  const [annualBonus, setAnnualBonus] = useState('')
  const [otherIncome, setOtherIncome] = useState('')

  const [srsContribution, setSrsContribution] = useState('')
  const [rstuSelf, setRstuSelf] = useState('')
  const [rstuFamily, setRstuFamily] = useState('')
  const [courseFees, setCourseFees] = useState('')
  const [nsmanStatus, setNsmanStatus] = useState('none')
  const [childCount, setChildCount] = useState('')
  const [parentLivingWith, setParentLivingWith] = useState('')
  const [parentNotLivingWith, setParentNotLivingWith] = useState('')
  const [otherReliefs, setOtherReliefs] = useState('')

  const [showMoreReliefs, setShowMoreReliefs] = useState(false)
  const [calculated, setCalculated] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  const [restoredFromSave, setRestoredFromSave] = useState(false)
  const [hasRestored, setHasRestored] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  // Increments on every autosave — see the matching comment in
  // src/app/house/page.js for why a plain boolean isn't enough to keep
  // "Saved ✓" showing continuously through a fast typing burst.
  const [savedTick, setSavedTick] = useState(0)

  // Restored inputs (an earlier autosave) take priority over the
  // cross-tool salary prefill below — if this form has been filled in
  // here before, that's a stronger signal than a salary borrowed from
  // another tool.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = loadToolInputs('tax')
    if (saved) {
      setAge(saved.age ?? '')
      setResidency(saved.residency ?? 'citizen')
      setMonthlySalary(saved.monthlySalary ?? '')
      setAnnualBonus(saved.annualBonus ?? '')
      setOtherIncome(saved.otherIncome ?? '')
      setSrsContribution(saved.srsContribution ?? '')
      setRstuSelf(saved.rstuSelf ?? '')
      setRstuFamily(saved.rstuFamily ?? '')
      setCourseFees(saved.courseFees ?? '')
      setNsmanStatus(saved.nsmanStatus ?? 'none')
      setChildCount(saved.childCount ?? '')
      setParentLivingWith(saved.parentLivingWith ?? '')
      setParentNotLivingWith(saved.parentNotLivingWith ?? '')
      setOtherReliefs(saved.otherReliefs ?? '')
      setShowMoreReliefs(!!saved.showMoreReliefs)
      setRestoredFromSave(true)
    } else {
      // Salary is already known if you've used RetireWell or DriveReady —
      // no reason to ask a third time. Nothing is sent anywhere; see
      // src/lib/shared/profile.js.
      const { retire, drive } = loadMyNumbers()
      const knownSalary = retire?.salary || drive?.salary || 0
      if (knownSalary > 0) {
        setMonthlySalary(String(Math.round(knownSalary)))
        setPrefilled(true)
      }
    }
    setHasRestored(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Autosave every keystroke, same as DriveReady's own persistence, just
  // scoped to whichever profile is active.
  useEffect(() => {
    if (!hasRestored) return
    saveToolInputs('tax', {
      age, residency, monthlySalary, annualBonus, otherIncome,
      srsContribution, rstuSelf, rstuFamily, courseFees, nsmanStatus,
      childCount, parentLivingWith, parentNotLivingWith, otherReliefs, showMoreReliefs,
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
    setSavedTick(t => t + 1)
  }, [
    hasRestored, age, residency, monthlySalary, annualBonus, otherIncome,
    srsContribution, rstuSelf, rstuFamily, courseFees, nsmanStatus,
    childCount, parentLivingWith, parentNotLivingWith, otherReliefs, showMoreReliefs,
  ])

  useEffect(() => {
    if (savedTick === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
    setJustSaved(true)
    const t = setTimeout(() => setJustSaved(false), 1400)
    return () => clearTimeout(t)
  }, [savedTick])

  const isReady = num(age) > 0 && num(monthlySalary) > 0

  const inputs = {
    age: num(age), isForeigner: residency === 'foreigner',
    monthlySalary: num(monthlySalary), annualBonus: num(annualBonus), otherIncome: num(otherIncome),
    srsContribution: num(srsContribution), rstuSelf: num(rstuSelf), rstuFamily: num(rstuFamily),
    courseFees: num(courseFees), nsmanStatus,
    childCount: num(childCount),
    parentReliefLivingWith: num(parentLivingWith), parentReliefNotLivingWith: num(parentNotLivingWith),
    otherReliefs: num(otherReliefs),
  }

  const result = calculated && isReady ? calcTax(inputs) : null

  // Hand the exact after-tax, age-correct take-home to MyLedger, which
  // otherwise falls back to a flat 80%-of-gross approximation. Depend on
  // the primitive figures, not `result` itself — calcTax returns a new
  // object every render (inputs is rebuilt each render too), so keying
  // off the object reference would re-save to localStorage every render.
  useEffect(() => {
    if (!result) return
    saveTaxNumbers({
      monthlyTakeHome: result.monthlyTakeHome,
      annualTax: result.tax,
      marginalRate: result.marginal,
      age: num(age),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed off primitives, not `result` itself (a new object every render)
  }, [result?.monthlyTakeHome, result?.tax, result?.marginal, age])

  const srsCap = residency === 'foreigner' ? SRS_CAP_FOREIGNER : SRS_CAP_CITIZEN_PR

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="TaxWise" links={[{ href: '/tax/the-math', label: 'The Math' }]} />

      {/* Hero */}
      <div style={{ background: C.coah, padding: '48px 32px 52px', textAlign: 'center' }}>
        <div style={{ fontFamily: C.fontCoah, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
          Singapore Income Tax &amp; Relief Calculator
        </div>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 'clamp(30px, 5.5vw, 48px)', color: '#fff', marginBottom: 10, lineHeight: 1.2 }}>
          What do you actually owe IRAS?
        </h1>
        <p style={{ fontFamily: C.fontDisplay, fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 24, fontStyle: 'italic' }}>
          And what every relief is really worth — in dollars saved, not percentages.
        </p>
        <TrustBadges tone="dark" items={['Every relief cap modeled', 'Shows what the next $1k saves', 'Zero data collected', 'Free, forever']} />
      </div>

      {/* Compliance line */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '8px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>
          Educational tool only · Not tax advice · Not affiliated with IRAS or CPF Board
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: '28px 24px', boxShadow: C.shadow }}>

          {restoredFromSave && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: C.accentBg, border: `1px solid ${C.accent}55`, borderRadius: C.r, fontSize: C.xs, color: C.accent, fontWeight: 600 }}>
              Restored what you last saved to this profile — edit freely.
            </div>
          )}

          <SectionDivider label="You" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <NumberInput id="tax-age" label="Age" hint="Sets your Earned Income Relief and CPF rate" value={age} onChange={e => setAge(e.target.value)} />
            <div>
              <label style={{ display: 'block', fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 10 }}>Residency</label>
              <Segmented
                value={residency} onChange={setResidency}
                options={[{ value: 'citizen', label: 'Citizen / PR' }, { value: 'foreigner', label: 'Foreigner' }]}
              />
              <p style={{ marginTop: 8, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
                Affects your SRS cap ({SGD(srsCap)}). This tool assumes you&apos;re a tax resident either way.
              </p>
            </div>
          </div>

          <SectionDivider label="Income" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="tax-salary" label="Monthly salary" value={monthlySalary} onChange={e => { setMonthlySalary(e.target.value); setPrefilled(false) }} />
            <MoneyInput id="tax-bonus" label="Annual bonus / AWS" hint="Optional" value={annualBonus} onChange={e => setAnnualBonus(e.target.value)} />
            <MoneyInput id="tax-other" label="Other taxable income" hint="Rental, freelance, director's fees" value={otherIncome} onChange={e => setOtherIncome(e.target.value)} />
          </div>
          {prefilled && (
            <p style={{ marginTop: 10, fontSize: C.xs, color: C.faint }}>
              Salary prefilled from another ndtm tool on this browser — edit it freely.
            </p>
          )}

          <SectionDivider label="Reliefs worth optimising" />
          <p style={{ marginTop: -8, marginBottom: 16, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
            Your own CPF contributions and Earned Income Relief are added automatically — no need to enter them. These are the ones you actively choose.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="tax-srs" label="SRS contributions this year" hint={`Capped at ${SGD(srsCap)}`} value={srsContribution} onChange={e => setSrsContribution(e.target.value)} />
            <MoneyInput id="tax-rstu-self" label="CPF top-up — your own account" hint={`Capped at ${SGD(RSTU_RELIEF_CAP_SELF)}`} value={rstuSelf} onChange={e => setRstuSelf(e.target.value)} />
            <MoneyInput id="tax-rstu-family" label="CPF top-up — family" hint={`Capped at ${SGD(RSTU_RELIEF_CAP_FAMILY)}, separate from your own`} value={rstuFamily} onChange={e => setRstuFamily(e.target.value)} />
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              type="button" onClick={() => setShowMoreReliefs(s => !s)} aria-pressed={showMoreReliefs}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                background: showMoreReliefs ? C.accentBg : C.bg, border: `1.5px solid ${showMoreReliefs ? C.accent : C.border}`,
                borderRadius: 100, cursor: 'pointer', fontSize: C.xs, fontWeight: 700,
                color: showMoreReliefs ? C.accent : C.muted, fontFamily: C.fontBody,
              }}
            >
              {showMoreReliefs ? '− ' : '+ '} Other reliefs (NSman, children, parents, courses)
            </button>
            {showMoreReliefs && (
              <div style={{ marginTop: 14 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 10 }}>NSman status</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { value: 'none', label: 'Not applicable' },
                      { value: 'nonKeyInactive', label: `No activity (${SGD(NSMAN_RELIEF.nonKeyInactive)})` },
                      { value: 'nonKeyActive', label: `Performed NS (${SGD(NSMAN_RELIEF.nonKeyActive)})` },
                      { value: 'keyInactive', label: `Key appt, no activity (${SGD(NSMAN_RELIEF.keyInactive)})` },
                      { value: 'keyActive', label: `Key appt, performed NS (${SGD(NSMAN_RELIEF.keyActive)})` },
                    ].map(opt => (
                      <button
                        key={opt.value} type="button" onClick={() => setNsmanStatus(opt.value)}
                        aria-pressed={nsmanStatus === opt.value}
                        style={{
                          padding: '7px 13px', fontSize: C.xs, fontWeight: 600, cursor: 'pointer',
                          borderRadius: 100, fontFamily: C.fontBody,
                          background: nsmanStatus === opt.value ? C.accentBg : C.bg,
                          border: `1.5px solid ${nsmanStatus === opt.value ? C.accent : C.border}`,
                          color: nsmanStatus === opt.value ? C.accent : C.muted,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  <NumberInput id="tax-children" label="Qualifying children" hint="$4,000 each" value={childCount} onChange={e => setChildCount(e.target.value)} />
                  <NumberInput id="tax-parent-with" label="Parents living with you" hint="$9,000 each" value={parentLivingWith} onChange={e => setParentLivingWith(e.target.value)} />
                  <NumberInput id="tax-parent-without" label="Parents not living with you" hint="$5,500 each" value={parentNotLivingWith} onChange={e => setParentNotLivingWith(e.target.value)} />
                  <MoneyInput id="tax-course" label="Course fees" hint={`Capped at ${SGD(COURSE_FEES_CAP)}`} value={courseFees} onChange={e => setCourseFees(e.target.value)} />
                  <MoneyInput id="tax-other-reliefs" label="Any other reliefs" hint="e.g. Working Mother's Child Relief, life insurance relief" value={otherReliefs} onChange={e => setOtherReliefs(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            <Button variant="accent" fullWidth onClick={() => setCalculated(true)} disabled={!isReady}>
              {isReady ? 'Work out my tax' : 'Enter your age and salary above'}
            </Button>
          </div>
          <AutosaveIndicator justSaved={justSaved} C={C} />
        </div>

        {result && <TaxResults result={result} />}
      </div>
    </div>
  )
}
