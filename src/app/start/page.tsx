'use client'

// /start — "Set up my numbers" (super-app plan U9). Six short, skippable
// steps; on finish the answers are written to every tool's slot through
// src/lib/shared/onboarding.ts and the user lands on the dashboard.

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ShellHeader from '@/components/shared/ShellHeader'
import ProfileScope from '@/components/shared/ProfileScope'
import { MoneyInput, NumberInput, Segmented } from '@/components/shared/inputs'
import { loadMyNumbers, saveModule, saveToolInputs, type ProfileData } from '@/lib/shared/profile'
import { planOnboarding, applyOnboarding } from '@/lib/shared/onboarding'

const str = (v: number|null) => (v == null || v === 0 ? '' : String(Math.round(v)))

// Seed the form from whatever the profile already holds, so re-running
// setup shows the current figures instead of blanks.
function seed(d: ProfileData) {
  return {
    age: d.tax?.age ? String(d.tax.age) : (d.retire?.inputs?.currentAge ?? ''),
    residency: d.tax?.inputs?.residency === 'foreigner' ? 'foreigner' : 'citizen',
    monthlySalary: str(d.retire?.salary || d.drive?.salary),
    annualBonus: d.tax?.inputs?.annualBonus ?? '',
    cpfOA: str(d.retire?.oaBalance), cpfSA: str(d.retire?.saBalance), cpfMA: str(d.retire?.maBalance),
    home: d.house ? (d.house.propertyType === 'hdb' ? 'hdb' : 'private') : 'none',
    homeValue: str(d.house?.propertyValue), homeLoan: str(d.house?.outstandingBalance), homeInstalment: str(d.house?.monthlyInstalment),
    car: d.drive?.monthlyInstalment || d.drive?.carValue ? 'own' : 'none',
    carValue: str(d.drive?.carValue), carLoan: str(d.drive?.loanOutstanding), carInstalment: str(d.drive?.monthlyInstalment),
    investments: str(d.retire?.investmentBalance), monthlyInvesting: str(d.retire?.monthlyContribution),
    monthlySpend: str(d.flow?.livingExpenses),
  }
}

const STEPS = [
  { id: 'you', title: 'About you', why: 'Age sets your CPF rates and tax reliefs.' },
  { id: 'income', title: 'Your income', why: 'Gross pay before CPF. This drives take-home, tax and loan limits.' },
  { id: 'cpf', title: 'Your CPF', why: 'Find these in the CPF app under "My balances". Skip if you don\'t have them handy.' },
  { id: 'home', title: 'Your home', why: 'For net worth and how much of your pay goes to loans.' },
  { id: 'car', title: 'Your car', why: 'Car loans count towards the bank\'s 55% debt limit.' },
  { id: 'money', title: 'Savings and spending', why: 'What you have invested, and what a normal month costs, excluding loans.' },
]

function StartForm() {
  const router = useRouter()
  const [a, setA] = useState(() => seed(loadMyNumbers()))
  const [step, setStep] = useState(0)
  const [error, setError] = useState<any>(null)
  const set = (k: string) => (e: Record<string, any>) => setA((s) => ({ ...s, [k]: e.target.value }))
  const pick = (k: string) => (v: any) => setA((s) => ({ ...s, [k]: v }))
  const s = STEPS[step]
  const last = step === STEPS.length - 1

  const finish = () => {
    const plan = planOnboarding(a as any, loadMyNumbers())
    const ok = applyOnboarding(plan, { saveModule, saveToolInputs })
    if (!ok) { setError('Your browser would not save these numbers (storage may be full or blocked). Nothing was changed.'); return }
    router.push('/')
  }

  const preview = useMemo(() => planOnboarding(a as any, {}), [a])

  return (
    <div className="start-wrap">
      <p className="start-progress" aria-live="polite">Step {step + 1} of {STEPS.length}</p>
      <div className="start-bar" aria-hidden="true"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      <h1 className="start-title">{s.title}</h1>
      <p className="start-why">{s.why}</p>

      <div className="start-fields">
        {s.id === 'you' && (<>
          <NumberInput id="ob-age" label="Age" value={a.age} onChange={set('age')} suffix="yrs" />
          <div>
            <span className="start-label">Residency</span>
            <Segmented value={a.residency} onChange={pick('residency')} options={[{ value: 'citizen', label: 'Citizen / PR' }, { value: 'foreigner', label: 'Foreigner' }]} />
          </div>
        </>)}
        {s.id === 'income' && (<>
          <MoneyInput id="ob-salary" label="Monthly gross salary" value={a.monthlySalary} onChange={set('monthlySalary')} hint="Before CPF. Shorthand works: 8k" />
          <MoneyInput id="ob-bonus" label="Annual bonus (optional)" value={a.annualBonus} onChange={set('annualBonus')} />
        </>)}
        {s.id === 'cpf' && (<>
          <MoneyInput id="ob-oa" label="Ordinary Account (OA)" value={a.cpfOA} onChange={set('cpfOA')} />
          <MoneyInput id="ob-sa" label="Special Account (SA)" value={a.cpfSA} onChange={set('cpfSA')} />
          <MoneyInput id="ob-ma" label="MediSave Account (MA)" value={a.cpfMA} onChange={set('cpfMA')} />
        </>)}
        {s.id === 'home' && (<>
          <div>
            <span className="start-label">Do you own a home?</span>
            <Segmented value={a.home} onChange={pick('home')} options={[{ value: 'none', label: 'No' }, { value: 'hdb', label: 'HDB' }, { value: 'private', label: 'Private' }]} />
          </div>
          {a.home !== 'none' && (<>
            <MoneyInput id="ob-home-value" label="What it would sell for today" value={a.homeValue} onChange={set('homeValue')} />
            <MoneyInput id="ob-home-loan" label="Loan still outstanding" value={a.homeLoan} onChange={set('homeLoan')} />
            <MoneyInput id="ob-home-instalment" label="Monthly instalment (optional)" value={a.homeInstalment} onChange={set('homeInstalment')} hint="Leave blank and I'll estimate it at 3% over 25 years." />
          </>)}
        </>)}
        {s.id === 'car' && (<>
          <div>
            <span className="start-label">Do you own a car?</span>
            <Segmented value={a.car} onChange={pick('car')} options={[{ value: 'none', label: 'No' }, { value: 'own', label: 'Yes' }]} />
          </div>
          {a.car === 'own' && (<>
            <MoneyInput id="ob-car-value" label="What it is worth today" value={a.carValue} onChange={set('carValue')} hint="Roughly its PARF/COE rebate plus resale margin." />
            <MoneyInput id="ob-car-loan" label="Car loan outstanding" value={a.carLoan} onChange={set('carLoan')} />
            <MoneyInput id="ob-car-instalment" label="Monthly car instalment" value={a.carInstalment} onChange={set('carInstalment')} />
          </>)}
        </>)}
        {s.id === 'money' && (<>
          <MoneyInput id="ob-investments" label="Invested today (stocks, ETFs, funds)" value={a.investments} onChange={set('investments')} />
          <MoneyInput id="ob-investing" label="Invested each month" value={a.monthlyInvesting} onChange={set('monthlyInvesting')} />
          <MoneyInput id="ob-spend" label="A normal month's spending, excluding loans" value={a.monthlySpend} onChange={set('monthlySpend')} hint="Food, transport, bills, everything else." />
        </>)}
      </div>

      {last && preview.assumed.length > 0 && (
        <p className="start-assumed">To fill the gaps I&apos;ll assume {preview.assumed.join(', and ')}. You can change it in each tool.</p>
      )}
      {error && <p className="start-error" role="alert">{error}</p>}

      <div className="start-nav">
        {step > 0
          ? <button type="button" className="start-back" onClick={() => setStep(step - 1)}>Back</button>
          : <Link href="/" className="start-back">Cancel</Link>}
        <div className="start-nav-right">
          {!last && <button type="button" className="start-skip" onClick={() => setStep(step + 1)}>Skip</button>}
          <button type="button" className="start-next" onClick={last ? finish : () => setStep(step + 1)}>
            {last ? 'Save and see my picture' : 'Next'}
          </button>
        </div>
      </div>
      <p className="start-privacy">Saved only in this browser, in your active profile. Nothing is sent anywhere.</p>
    </div>
  )
}

const noop = () => () => {}

export default function StartPage() {
  // The form seeds itself from localStorage, which the server cannot see;
  // mounting it only after hydration avoids a server/client mismatch.
  const hydrated = useSyncExternalStore(noop, () => true, () => false)
  return (
    <ProfileScope>
      <ShellHeader title="Set up my numbers" />
      {hydrated ? <StartForm /> : <div className="start-wrap" aria-busy="true" />}
    </ProfileScope>
  )
}
