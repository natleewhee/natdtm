'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BENCHMARKS, RISK_PROFILES, getProfileBenchmarks } from '@/lib/insure/engine/scorer'
import ShellHeader from '@/components/shared/ShellHeader'

// ─── Shared styles ───────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-bg)',
    fontFamily: 'var(--font-body)',
    paddingBottom: '48px',
  },
  progressTrack: {
    height: '4px',
    background: 'var(--color-border)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: (pct) => ({
    height: '100%',
    width: `${pct}%`,
    background: 'var(--color-accent)',
    borderRadius: '2px',
    transition: 'width 0.35s ease-out',
  }),
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    padding: '28px 24px',
    marginTop: '24px',
    maxWidth: '520px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  label: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--color-primary)',
    marginBottom: '6px',
    lineHeight: 1.4,
    fontFamily: 'var(--font-display)',
  },
  hint: {
    fontSize: '13px',
    color: 'var(--color-faint)',
    marginBottom: '16px',
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    fontSize: '16px',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-primary)',
    background: 'var(--color-surface)',
    transition: 'border-color 0.2s',
  },
  inputPrefix: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    background: 'var(--color-surface)',
    transition: 'border-color 0.2s',
  },
  prefix: {
    padding: '13px 14px',
    fontSize: '16px',
    color: 'var(--color-faint)',
    background: 'var(--color-surface)',
    borderRight: '1.5px solid var(--color-border)',
    userSelect: 'none',
  },
  prefixInput: {
    flex: 1,
    padding: '13px 16px',
    fontSize: '16px',
    border: 'none',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-primary)',
    background: 'transparent',
    width: '100%',
  },
  optionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  option: (selected) => ({
    padding: '14px 18px',
    borderRadius: 'var(--radius-md)',
    border: `1.5px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: selected ? 'var(--color-accent-bg)' : 'var(--color-surface)',
    color: selected ? 'var(--color-accent)' : 'var(--color-primary)',
    fontSize: '15px',
    fontWeight: selected ? '600' : '400',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    fontFamily: 'var(--font-body)',
  }),
  pillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
  },
  pill: (selected) => ({
    padding: '8px 16px',
    borderRadius: '100px',
    border: `1.5px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: selected ? 'var(--color-accent)' : 'var(--color-surface)',
    color: selected ? 'var(--l-accent-ink)' : 'var(--color-primary)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'var(--font-body)',
  }),
  unknownLink: {
    display: 'block',
    marginTop: '10px',
    fontSize: '13px',
    color: 'var(--color-faint)',
    cursor: 'pointer',
    textDecoration: 'underline',
    textDecorationColor: 'var(--color-border)',
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: 'var(--font-body)',
    textAlign: 'left',
  },
  tooltipBox: {
    marginTop: '12px',
    padding: '14px 16px',
    background: 'var(--color-blue-bg)',
    borderRadius: 'var(--radius-md)',
    borderLeft: '3px solid var(--color-blue)',
    fontSize: '13px',
    color: 'var(--color-text)',
    lineHeight: 1.6,
  },
  nextBtn: (disabled) => ({
    marginTop: '24px',
    width: '100%',
    padding: '15px',
    background: disabled ? 'var(--color-border)' : 'var(--color-accent)',
    color: disabled ? 'var(--color-faint)' : 'var(--l-accent-ink)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '16px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s',
    fontFamily: 'var(--font-body)',
  }),
  skipLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '14px',
    fontSize: '13px',
    color: 'var(--color-faint)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    width: '100%',
    fontFamily: 'var(--font-body)',
    textDecoration: 'underline',
    textDecorationColor: 'var(--color-border)',
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--color-faint)',
    marginTop: '20px',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid var(--color-border)',
    margin: '20px 0',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    color: 'var(--color-faint)',
    textTransform: 'uppercase',
    marginBottom: '10px',
  },
  toggle: {
    display: 'flex',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-md)',
    padding: '4px',
    marginBottom: '16px',
    gap: '4px',
  },
  toggleBtn: (active) => ({
    flex: 1,
    padding: '8px',
    borderRadius: '8px',
    border: 'none',
    background: active ? 'var(--color-surface)' : 'transparent',
    color: active ? 'var(--color-primary)' : 'var(--color-faint)',
    fontWeight: active ? '600' : '400',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.15s ease',
  }),
  convertedAmount: {
    fontSize: '13px',
    color: 'var(--color-faint)',
    marginTop: '8px',
  },
}

// ─── Initial form state ───────────────────────────────────────────────────────

const INITIAL = {
  age: '',
  annualIncome: '',
  incomeMode: 'annual',
  hasHosp: null,
  riskProfile: 'balanced',
  hasDependents: null,
  hasCI: null,
  ciAmount: '',
  ciBand: null,
  ciUseBand: false,
  hasECI: null,
  eciAmount: '',
  eciBand: null,
  eciUseBand: false,
  hasLife: null,
  lifeAmount: '',
  lifeBand: null,
  lifeUseBand: false,
  outstandingDebt: '',
  monthlyPremium: '',
  yearlyPremium: '',
  premiumMode: 'monthly',
  hasDI: null,
  diMonthlyBenefit: '',
  primaryConcern: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseInt(String(val).replace(/[^0-9]/g, ''), 10)
  if (isNaN(n) || n < 0 || n > 100_000_000) return null
  return n
}

function fmtAmount(n) {
  if (!n || n <= 0) return null
  if (n >= 1000000) return `S$${(n / 1000000).toFixed(1)}m`
  return `S$${(n / 1000).toFixed(0)}k`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AmountInput({ value, onChange, onUnknown, placeholder = 'e.g. 200k' }) {
  const [display, setDisplay] = useState(
    value ? Number(value).toLocaleString('en-SG') : ''
  )

  function parseInput(raw) {
    const cleaned = raw.trim().toLowerCase().replace(/,/g, '')
    if (!cleaned) return null
    const kMatch = cleaned.match(/^([\d.]+)\s*k$/)
    if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1_000)
    const mMatch = cleaned.match(/^([\d.]+)\s*m$/)
    if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000)
    const n = parseFloat(cleaned)
    return isNaN(n) ? null : Math.round(n)
  }

  function handleChange(e) {
    setDisplay(e.target.value)
    const parsed = parseInput(e.target.value)
    onChange(parsed)
  }

  function handleBlur() {
    const parsed = parseInput(display)
    if (parsed !== null) {
      setDisplay(parsed.toLocaleString('en-SG'))
      onChange(parsed)
    } else {
      setDisplay('')
      onChange(null)
    }
  }

  function handleFocus() {
    if (value) setDisplay(String(value))
  }

  return (
    <>
      <div style={s.inputPrefix}>
        <span style={s.prefix}>S$</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          style={s.prefixInput}
        />
      </div>
      {onUnknown && (
        <button style={s.unknownLink} onClick={onUnknown}>
          I don&apos;t know the exact amount
        </button>
      )}
    </>
  )
}

function BandSelector({ options, value, onChange }) {
  return (
    <div style={s.pillRow}>
      {options.map(opt => (
        <button
          key={opt.value}
          style={s.pill(value === opt.value)}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function ECITooltip() {
  const [open, setOpen] = useState(() => {
    try {
      const seen = sessionStorage.getItem('iga_eci_seen')
      return !seen
    } catch { return true }
  })

  function handleToggle() {
    setOpen(o => !o)
    try { sessionStorage.setItem('iga_eci_seen', '1') } catch {}
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <button
        style={{
          ...s.unknownLink,
          color: 'var(--color-blue)',
          textDecorationColor: 'var(--color-blue)',
        }}
        onClick={handleToggle}
      >
        {open ? '▾' : '▸'} What is Early Critical Illness (ECI)?
      </button>
      {open && (
        <div style={s.tooltipBox}>
          Standard CI policies pay out at <strong>late-stage</strong> diagnosis —
          confirmed heart failure, late-stage cancer, etc. ECI cover pays out{' '}
          <strong>earlier</strong>, at a minor heart attack, early-stage cancer, or
          initial stroke — when treatment is most intensive and costs are highest.
          Check your policy document for &quot;early stage&quot; or &quot;special benefit&quot; to see
          if you have it.
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 8

export default function CheckPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('iga_recheck')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Must run post-mount: sessionStorage doesn't exist during SSR, so this
        // can't move into a lazy useState initializer without crashing the server render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
          age: parsed.age ?? '',
          annualIncome: parsed.annualIncome ?? '',
          incomeMode: parsed.incomeMode ?? 'annual',
          hasHosp: parsed.hasHosp ?? null,
          riskProfile: parsed.riskProfile ?? 'balanced',
          hasDependents: parsed.hasDependents ?? null,
          hasCI: parsed.hasCI ?? null,
          ciAmount: parsed.ciAmount ?? '',
          ciBand: parsed.ciBand ?? null,
          ciUseBand: parsed.ciBand !== null,
          hasECI: parsed.hasECI ?? null,
          eciAmount: parsed.eciAmount ?? '',
          eciBand: parsed.eciBand ?? null,
          eciUseBand: parsed.eciBand !== null,
          hasLife: parsed.hasLife ?? null,
          lifeAmount: parsed.lifeAmount ?? '',
          lifeBand: parsed.lifeBand ?? null,
          lifeUseBand: parsed.lifeBand !== null,
          outstandingDebt: parsed.outstandingDebt ?? '',
          monthlyPremium: parsed.monthlyPremium ?? '',
          yearlyPremium: parsed.yearlyPremium ?? '',
          premiumMode: parsed.premiumMode ?? 'monthly',
          hasDI: parsed.hasDI ?? null,
          diMonthlyBenefit: parsed.diMonthlyBenefit ?? '',
          primaryConcern: parsed.primaryConcern ?? null,
        })
        sessionStorage.removeItem('iga_recheck')
      }
    } catch {}
    setMounted(true)
  }, [])

  if (!mounted) return null

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const progress = (step / TOTAL_STEPS) * 100
  const inc = parseNum(form.annualIncome)
  const profileBenchmarks = getProfileBenchmarks(form.riskProfile)

  // Dynamic band options based on income and the selected risk profile
  function ciBands() {
    if (inc && inc > 0) {
      const low  = Math.round(inc * profileBenchmarks.ciPartialMultiple)
      const high = Math.round(inc * profileBenchmarks.ciAdequateMultiple)
      return [
        { value: 'low',     label: `Less than ${fmtAmount(low)}` },
        { value: 'partial', label: `${fmtAmount(low)} – ${fmtAmount(high)}` },
        { value: 'high',    label: `More than ${fmtAmount(high)}` },
      ]
    }
    return [
      { value: 'low',     label: 'Less than S$100k' },
      { value: 'partial', label: 'S$100k – S$300k' },
      { value: 'high',    label: 'More than S$300k' },
    ]
  }

  function eciBands() {
    if (inc && inc > 0) {
      const low = Math.round(inc * BENCHMARKS.ECI_SOME_RATIO)
      const mid = Math.round(inc * BENCHMARKS.ECI_STRONG_RATIO)
      return [
        { value: 'low',  label: `Less than ${fmtAmount(low)}` },
        { value: 'mid',  label: `${fmtAmount(low)} – ${fmtAmount(mid)}` },
        { value: 'high', label: `More than ${fmtAmount(mid)}` },
      ]
    }
    return [
      { value: 'low',  label: 'Less than S$50k' },
      { value: 'mid',  label: 'S$50k – S$100k' },
      { value: 'high', label: 'More than S$100k' },
    ]
  }

  function lifeBands() {
    if (inc && inc > 0) {
      const low  = Math.round(inc * profileBenchmarks.lifePartialMultiple)
      const high = Math.round(inc * profileBenchmarks.lifeAdequateMultiple)
      return [
        { value: 'low',     label: `Less than ${fmtAmount(low)}` },
        { value: 'partial', label: `${fmtAmount(low)} – ${fmtAmount(high)}` },
        { value: 'high',    label: `More than ${fmtAmount(high)}` },
      ]
    }
    return [
      { value: 'low',     label: 'Less than S$450k' },
      { value: 'partial', label: 'S$450k – S$810k' },
      { value: 'high',    label: 'More than S$810k' },
    ]
  }

  function buildInputs() {
    return {
      age: parseInt(form.age) || null,
      annualIncome: parseNum(form.annualIncome),
      incomeMode: form.incomeMode,
      hasHosp: form.hasHosp,
      riskProfile: form.riskProfile ?? 'balanced',
      hasDependents: form.hasDependents,
      hasCI: form.hasCI,
      ciAmount: form.ciUseBand ? null : parseNum(form.ciAmount),
      ciBand: form.ciUseBand ? form.ciBand : null,
      hasECI: form.hasECI ?? 'no',
      eciAmount: form.eciUseBand ? null : parseNum(form.eciAmount),
      eciBand: form.eciUseBand ? form.eciBand : null,
      hasLife: form.hasLife,
      lifeAmount: form.lifeUseBand ? null : parseNum(form.lifeAmount),
      lifeBand: form.lifeUseBand ? form.lifeBand : null,
      outstandingDebt: parseNum(form.outstandingDebt) || 0,
      monthlyPremium: parseNum(form.monthlyPremium),
      yearlyPremium: parseNum(form.yearlyPremium),
      premiumMode: form.premiumMode,
      hasDI: form.hasDI,
      diMonthlyBenefit: parseNum(form.diMonthlyBenefit),
      primaryConcern: form.primaryConcern,
    }
  }

  function handleSubmit() {
    const inputs = buildInputs()
    sessionStorage.setItem('iga_inputs', JSON.stringify(inputs))
    router.push('/insure/loading')
  }

  function next() {
    if (step < TOTAL_STEPS) setStep(s => s + 1)
    else handleSubmit()
  }

  function back() {
    if (step > 1) setStep(s => s - 1)
    else router.push('/insure')
  }

  function canProceed() {
    if (step === 1) {
      const age = parseInt(form.age)
      const income = parseNum(form.annualIncome)
      return age >= 16 && age <= 100 && income > 0 && income <= 100_000_000
    }
    if (step === 2) return form.hasHosp !== null
    if (step === 3) return true // planning profile — optional, has defaults
    if (step === 4) {
      if (form.hasCI === 'no' || form.hasCI === 'unsure') return true
      if (form.hasCI === 'yes') {
        return form.ciUseBand
          ? form.ciBand !== null
          : parseNum(form.ciAmount) > 0
      }
      return false
    }
    if (step === 5) {
      if (form.hasLife === 'no' || form.hasLife === 'unsure') return true
      if (form.hasLife === 'yes') {
        return form.lifeUseBand
          ? form.lifeBand !== null
          : parseNum(form.lifeAmount) > 0
      }
      return false
    }
    if (step === 6) return true
    if (step === 7) return true
    if (step === 8) return true
    return false
  }

  // ── Step renderers ──────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {

      case 1: return (
        <>
          <label style={s.label}>How old are you?</label>
          <p style={s.hint}>Helps us tailor the guidance in your results.</p>
          <input
            type="number"
            inputMode="numeric"
            placeholder="e.g. 28"
            value={form.age}
            onChange={e => set('age', e.target.value)}
            style={{ ...s.input, marginBottom: '20px' }}
            min={16}
            max={100}
          />

          <hr style={s.divider} />

          <label style={s.label}>What is your income?</label>
          <p style={s.hint}>
            Your gross salary in SGD. Tip: type <strong>60k</strong> for $60,000
            or <strong>1.2m</strong> for $1,200,000.
          </p>

          {/* Annual / Monthly toggle — annualIncome always stores the annual
              figure; the toggle only changes how it's displayed/entered. */}
          <div style={s.toggle}>
            {[
              { value: 'annual',  label: 'Annual' },
              { value: 'monthly', label: 'Monthly' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => set('incomeMode', tab.value)}
                style={s.toggleBtn((form.incomeMode ?? 'annual') === tab.value)}
                aria-pressed={(form.incomeMode ?? 'annual') === tab.value}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AmountInput
            key={form.incomeMode ?? 'annual'}
            value={form.incomeMode === 'monthly'
              ? (parseNum(form.annualIncome) ? Math.round(parseNum(form.annualIncome) / 12) : '')
              : form.annualIncome}
            onChange={v => {
              if (form.incomeMode === 'monthly') {
                set('annualIncome', v ? v * 12 : null)
              } else {
                set('annualIncome', v)
              }
            }}
            placeholder={form.incomeMode === 'monthly' ? 'e.g. 5k' : 'e.g. 60k'}
          />

          {parseNum(form.annualIncome) > 0 && (
            <p style={s.convertedAmount}>
              {form.incomeMode === 'monthly'
                ? `≈ S$${parseNum(form.annualIncome).toLocaleString('en-SG')} / year`
                : `≈ S$${Math.round(parseNum(form.annualIncome) / 12).toLocaleString('en-SG')} / month`
              }
            </p>
          )}

          <p style={{
            fontSize: '12px',
            color: 'var(--color-faint)',
            margin: '8px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span style={{ color: 'var(--color-accent)' }}>✓</span>
            Your income is never stored or shared.
          </p>
        </>
      )

      case 2: return (
        <>
          <label style={s.label}>Do you have hospitalisation insurance?</label>
          <p style={s.hint}>
            This includes MediShield Life top-ups and Integrated Shield Plans
            (AIA, Prudential, NTUC, etc.).
          </p>
          <div style={s.optionGrid}>
            {[
              { value: 'yes',    label: "Yes, I'm covered",     sub: null },
              { value: 'no',     label: "No, I don't have any", sub: null },
              { value: 'unsure', label: 'Not sure',              sub: "All S'pore Citizens & PRs have MediShield Life. Check if you have an Integrated Shield Plan on top." },
            ].map(opt => (
              <button
                key={opt.value}
                style={s.option(form.hasHosp === opt.value)}
                aria-pressed={form.hasHosp === opt.value}
                onClick={() => set('hasHosp', opt.value)}
              >
                <span style={{ display: 'block', fontWeight: form.hasHosp === opt.value ? '600' : '400' }}>
                  {opt.label}
                </span>
                {opt.sub && (
                  <span style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '400',
                    color: form.hasHosp === opt.value ? 'var(--color-accent)' : 'var(--color-faint)',
                    marginTop: '4px',
                    lineHeight: 1.4,
                  }}>
                    {opt.sub}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )

      case 3: return (
        <>
          <label style={s.label}>Who depends on your income?</label>
          <p style={s.hint}>
            This changes how much life/TPD cover you actually need — the
            benchmark drops a lot if no one relies on your income.
          </p>
          <div style={s.optionGrid}>
            {[
              { value: 'yes',    label: 'Yes — spouse, children, or parents' },
              { value: 'no',     label: "No one depends on my income" },
              { value: 'unsure', label: "I'm not sure" },
            ].map(opt => (
              <button
                key={opt.value}
                style={s.option(form.hasDependents === opt.value)}
                aria-pressed={form.hasDependents === opt.value}
                onClick={() => set('hasDependents', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <hr style={s.divider} />

          <label style={s.label}>How would you describe your risk tolerance?</label>
          <p style={s.hint}>
            This scales the coverage benchmarks up or down. &quot;Balanced&quot; is the
            standard most financial planners use — change it if you want to
            deviate from that norm.
          </p>
          <div style={s.optionGrid}>
            {Object.entries(RISK_PROFILES).map(([key, profile]) => (
              <button
                key={key}
                style={s.option(form.riskProfile === key)}
                aria-pressed={form.riskProfile === key}
                onClick={() => set('riskProfile', key)}
              >
                <span style={{ display: 'block', fontWeight: form.riskProfile === key ? '600' : '400' }}>
                  {profile.label}
                </span>
                <span style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '400',
                  color: form.riskProfile === key ? 'var(--color-accent)' : 'var(--color-faint)',
                  marginTop: '4px',
                  lineHeight: 1.4,
                }}>
                  {profile.description} (CI {profile.ciMultiple}× · Life {profile.lifeMultiple}× income)
                </span>
              </button>
            ))}
          </div>
        </>
      )

      case 4: return (
        <>
          <label style={s.label}>Do you have critical illness (CI) coverage?</label>
          <p style={s.hint}>
            A CI policy pays a lump sum on diagnosis of major illnesses like
            cancer, heart attack, or stroke.
          </p>
          <div style={s.optionGrid}>
            {[
              { value: 'yes',    label: 'Yes' },
              { value: 'no',     label: 'No' },
              { value: 'unsure', label: 'Not sure' },
            ].map(opt => (
              <button
                key={opt.value}
                style={s.option(form.hasCI === opt.value)}
                aria-pressed={form.hasCI === opt.value}
                onClick={() => set('hasCI', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {form.hasCI === 'yes' && (
            <>
              <hr style={s.divider} />
              <p style={s.sectionLabel}>CI sum assured</p>
              {!form.ciUseBand ? (
                <AmountInput
                  value={form.ciAmount}
                  onChange={v => set('ciAmount', v)}
                  placeholder="e.g. 200k"
                  onUnknown={() => set('ciUseBand', true)}
                />
              ) : (
                <>
                  <BandSelector
                    value={form.ciBand}
                    onChange={v => set('ciBand', v)}
                    options={ciBands()}
                  />
                  <button
                    style={s.unknownLink}
                    onClick={() => { set('ciUseBand', false); set('ciBand', null) }}
                  >
                    I know the exact amount
                  </button>
                </>
              )}

              <hr style={s.divider} />
              <ECITooltip />
              <p style={s.sectionLabel}>Do you also have early critical illness (ECI)?</p>
              <div style={s.optionGrid}>
                {[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no',  label: 'No' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    style={s.option(form.hasECI === opt.value)}
                    aria-pressed={form.hasECI === opt.value}
                    onClick={() => set('hasECI', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {form.hasECI === 'yes' && (
                <>
                  <p style={{ ...s.sectionLabel, marginTop: '16px' }}>ECI sum assured</p>
                  {!form.eciUseBand ? (
                    <AmountInput
                      value={form.eciAmount}
                      onChange={v => set('eciAmount', v)}
                      placeholder="e.g. 75k"
                      onUnknown={() => set('eciUseBand', true)}
                    />
                  ) : (
                    <>
                      <BandSelector
                        value={form.eciBand}
                        onChange={v => set('eciBand', v)}
                        options={eciBands()}
                      />
                      <button
                        style={s.unknownLink}
                        onClick={() => { set('eciUseBand', false); set('eciBand', null) }}
                      >
                        I know the exact amount
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )

      case 5: return (
        <>
          <label style={s.label}>Do you have life or TPD coverage?</label>
          <p style={s.hint}>
            Life insurance pays out on death. Total Permanent Disability (TPD)
            pays if you can no longer work.
          </p>
          <div style={s.optionGrid}>
            {[
              { value: 'yes',    label: 'Yes' },
              { value: 'no',     label: 'No' },
              { value: 'unsure', label: 'Not sure' },
            ].map(opt => (
              <button
                key={opt.value}
                style={s.option(form.hasLife === opt.value)}
                aria-pressed={form.hasLife === opt.value}
                onClick={() => set('hasLife', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {form.hasLife === 'yes' && (
            <>
              <hr style={s.divider} />
              <p style={s.sectionLabel}>Life / TPD sum assured</p>
              {!form.lifeUseBand ? (
                <AmountInput
                  value={form.lifeAmount}
                  onChange={v => set('lifeAmount', v)}
                  placeholder="e.g. 500k"
                  onUnknown={() => set('lifeUseBand', true)}
                />
              ) : (
                <>
                  <BandSelector
                    value={form.lifeBand}
                    onChange={v => set('lifeBand', v)}
                    options={lifeBands()}
                  />
                  <button
                    style={s.unknownLink}
                    onClick={() => { set('lifeUseBand', false); set('lifeBand', null) }}
                  >
                    I know the exact amount
                  </button>
                </>
              )}
            </>
          )}
        </>
      )

      case 6: return (
        <>
          <label style={s.label}>Do you have any outstanding loans?</label>
          <p style={s.hint}>
            Mortgage, car loan, personal loan, education loan — anything you&apos;d
            want your insurance to help clear if something happened to you.
            Optional, but it raises the coverage benchmark for CI and Life/TPD
            so it reflects what you&apos;d actually need.
          </p>
          <AmountInput
            value={form.outstandingDebt}
            onChange={v => set('outstandingDebt', v)}
            placeholder="e.g. 300k"
          />
        </>
      )

      case 7: return (
        <>
          <label style={s.label}>How much do you pay for all policies?</label>
          <p style={s.hint}>
            Add up all your insurance premiums — life, CI, hospitalisation, etc.
            Optional but improves your score accuracy.
          </p>

          <div style={s.toggle}>
            {[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly',  label: 'Yearly' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => {
                  set('premiumMode', tab.value)
                  if (tab.value === 'yearly' && form.monthlyPremium) {
                    set('yearlyPremium', parseNum(form.monthlyPremium) * 12)
                  }
                  if (tab.value === 'monthly' && form.yearlyPremium) {
                    set('monthlyPremium', Math.round(parseNum(form.yearlyPremium) / 12))
                  }
                }}
                style={s.toggleBtn((form.premiumMode ?? 'monthly') === tab.value)}
                aria-pressed={(form.premiumMode ?? 'monthly') === tab.value}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AmountInput
            key={form.premiumMode}
            value={form.premiumMode === 'yearly' ? form.yearlyPremium : form.monthlyPremium}
            onChange={v => {
              if (form.premiumMode === 'yearly') {
                set('yearlyPremium', v)
                set('monthlyPremium', v ? Math.round(v / 12) : null)
              } else {
                set('monthlyPremium', v)
                set('yearlyPremium', v ? v * 12 : null)
              }
            }}
            placeholder={form.premiumMode === 'yearly' ? 'e.g. 4,200' : 'e.g. 350'}
          />

          {(form.premiumMode === 'yearly'
            ? parseNum(form.yearlyPremium)
            : parseNum(form.monthlyPremium)) > 0 && (
            <p style={s.convertedAmount}>
              {form.premiumMode === 'yearly'
                ? `≈ S$${Math.round((parseNum(form.yearlyPremium) ?? 0) / 12).toLocaleString('en-SG')} / month`
                : `≈ S$${((parseNum(form.monthlyPremium) ?? 0) * 12).toLocaleString('en-SG')} / year`
              }
            </p>
          )}
        </>
      )

      case 8: return (
        <>
          <label style={s.label}>Do you have disability income (DI) insurance?</label>
          <p style={s.hint}>
            Optional, and doesn&apos;t affect your main score — but a temporary
            disability that keeps you off work isn&apos;t covered by CI (which
            needs a diagnosis) or hospitalisation (which only covers the
            hospital stay).
          </p>
          <div style={s.optionGrid}>
            {[
              { value: 'yes',    label: 'Yes' },
              { value: 'no',     label: 'No' },
              { value: 'unsure', label: 'Not sure' },
            ].map(opt => (
              <button
                key={opt.value}
                style={s.option(form.hasDI === opt.value)}
                aria-pressed={form.hasDI === opt.value}
                onClick={() => set('hasDI', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {form.hasDI === 'yes' && (
            <>
              <hr style={s.divider} />
              <p style={s.sectionLabel}>Monthly benefit amount</p>
              <AmountInput
                value={form.diMonthlyBenefit}
                onChange={v => set('diMonthlyBenefit', v)}
                placeholder="e.g. 3,000"
              />
            </>
          )}
        </>
      )

      default: return null
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLastStep = step === TOTAL_STEPS
  const isOptional = step === 3 || step === 6 || step === 7 || step === 8
  const disabled = !canProceed() && !isOptional

  return (
    <div style={s.page}>

<ShellHeader
  onBack={back}
  step={`${step} of ${TOTAL_STEPS}`}
  below={(
    <div style={{ padding: '0 24px 12px' }}>
      <div style={s.progressTrack}>
        <div style={s.progressFill(progress)} />
      </div>
      <p style={{
        fontSize: '11px',
        color: 'var(--color-faint)',
        margin: '8px 0 0',
        textAlign: 'center',
      }}>
        Educational tool · No login required · No data sent to any server
      </p>
    </div>
  )}
/>

      <div style={{
        ...s.card,
        marginLeft: 'auto',
        marginRight: 'auto',
        marginTop: '24px',
        width: 'calc(100% - 32px)',
      }}>
        {renderStep()}

        <button
          style={s.nextBtn(disabled)}
          onClick={next}
          disabled={disabled}
        >
          {isLastStep ? 'Get my score \u2192' : 'Next \u2192'}
        </button>

        {isOptional && (
          <button style={s.skipLink} onClick={next}>
            Skip this question
          </button>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
  <p style={{ ...s.privacyNote, marginBottom: '4px' }}>
    Your answers stay on your device and are never stored.
  </p>
  <p style={{ fontSize: '11px', color: 'var(--color-faint)', margin: '0 0 6px' }}>
    Educational tool only · Not affiliated with any insurer or MAS-licensed entity
  </p>
  <p style={{ fontSize: '11px', color: 'var(--color-faint)', margin: 0 }}>
    <span style={{
      fontFamily: 'var(--font-coah)',
      fontWeight: '600',
      letterSpacing: '0.06em',
    }}>
      NDTM
    </span>
    {' '}· Built for Singapore
  </p>
</div>

    </div>
  )
}