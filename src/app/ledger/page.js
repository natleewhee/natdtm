'use client'

// MyLedger — the timed cross-tool scenario planner. Lay a major asset
// move out as a dated sequence and see how each future plays out against
// doing nothing: the sustainable monthly withdrawal it leaves, read as
// comfortably enough / tight / short, across three assumption bundles.
// The old net-worth / TDSR-across-loans dashboard is kept as a secondary
// read. Engine: src/lib/ledger/scenario/*.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { C, SGD, parseMoney } from '@/lib/ledger/theme'
import { buildBaselineState, calcNetWorth, calcTDSR } from '@/lib/ledger/calc'
import { loadMyNumbers, saveToolInputs, loadToolInputs } from '@/lib/shared/profile'
import { runScenario } from '@/lib/ledger/scenario/index'
import { buildScenarioBaseState, buildRetireAssumptions, resolveReference, staleSyncedSlots } from '@/lib/ledger/scenario/adapt'
import { CAR_CATALOG_ENDPOINT } from '@/lib/drive/endpoints'
import { MoneyInput, PercentInput, NumberInput, SectionDivider } from '@/components/ledger/ui'
import ScenarioColumn from '@/components/ledger/ScenarioColumn'
import BundleEditor from '@/components/ledger/BundleEditor'
import ComparisonRow from '@/components/ledger/ComparisonRow'
import ShellHeader from '@/components/shared/ShellHeader'
import TrustBadges from '@/components/shared/TrustBadges'
import Button from '@/components/shared/Button'
import AutosaveIndicator from '@/components/shared/AutosaveIndicator'

const num = parseMoney
const MAX_SCENARIOS = 3 // baseline + up to 2 what-ifs

const DEFAULT_ASSUMPTIONS = {
  currentAge: '', retirementAge: '65', lifeExpectancy: '90',
  salary: '', investmentMonthly: '', salaryGrowthRate: '2.0',
  swr: '3', startingCash: '', reference: '',
}
const DEFAULT_BUNDLES = {
  conservative: { equityReturn: 3, propertyAppreciation: 1, inflation: 3 },
  base: { equityReturn: 5, propertyAppreciation: 2.5, inflation: 2.5 },
  optimistic: { equityReturn: 7, propertyAppreciation: 4, inflation: 2 },
}

let idSeq = 0
const nextScenarioId = () => { idSeq += 1; return `sc-${idSeq}` }

// A move as edited on the surface -> the { type, year, inputs } shape
// runScenario expects. buy-car needs its car object resolved from the
// catalogue and the household salary threaded in.
function toEngineMove(move, carsById, salary) {
  const year = num(move.year)
  const i = move.inputs || {}
  switch (move.type) {
    case 'sell-property':
      return { type: move.type, year, inputs: {
        propertyType: i.propertyType || 'private',
        purchasePrice: num(i.purchasePrice), purchaseDate: i.purchaseDate || undefined,
        salePrice: num(i.salePrice), saleDate: i.saleDate || undefined,
        loanTaken: num(i.loanTaken), mortgageRate: num(i.mortgageRate), loanTenure: num(i.loanTenure),
        cpfOutlay: num(i.cpfOutlay),
      } }
    case 'buy-property':
      return { type: move.type, year, inputs: {
        newPrice: num(i.newPrice), newLoanAmount: num(i.newLoanAmount),
        newLoanTenure: num(i.newLoanTenure), newMortgageRate: num(i.newMortgageRate),
        absd: num(i.absd), otherFees: num(i.otherFees),
      } }
    case 'cash-to-investments':
      return { type: move.type, year, inputs: { amount: num(i.amount), direction: i.direction || 'in' } }
    case 'buy-car':
      return { type: move.type, year, inputs: {
        car: carsById[i.carId] || null, salary, down: num(i.down), tenure: num(i.tenure),
      } }
    case 'have-child':
      return { type: move.type, year, inputs: {
        annualCost: num(i.annualCost), lumpAmount: num(i.lumpAmount),
        lumpYear: i.lumpYear === '' ? undefined : num(i.lumpYear),
      } }
    default:
      return { type: move.type, year, inputs: {} }
  }
}

export default function MyLedgerPage() {
  const [myNumbers, setMyNumbers] = useState(null)
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS)
  const [bundles, setBundles] = useState(DEFAULT_BUNDLES)
  const [scenarios, setScenarios] = useState([{ id: 'baseline', label: 'Baseline', moves: [] }])
  const [cars, setCars] = useState([])
  const [results, setResults] = useState({})
  const [hasRestored, setHasRestored] = useState(false)
  const [restoredNote, setRestoredNote] = useState(false)
  const [stale, setStale] = useState([])
  const [savedTick, setSavedTick] = useState(0)
  const [justSaved, setJustSaved] = useState(false)

  const cache = useRef(new Map())
  const debounce = useRef(null)

  // ── Mount: read the store, restore a saved planner state ──────────────
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time localStorage read on mount */
    const mn = loadMyNumbers()
    setMyNumbers(mn)
    setStale(staleSyncedSlots(mn))
    const saved = loadToolInputs('ledger')
    if (saved && saved.assumptions) {
      setAssumptions({ ...DEFAULT_ASSUMPTIONS, ...saved.assumptions })
      if (saved.bundles) setBundles(saved.bundles)
      if (Array.isArray(saved.scenarios)) {
        setScenarios([
          { id: 'baseline', label: 'Baseline', moves: [] },
          ...saved.scenarios.slice(0, MAX_SCENARIOS - 1).map((s) => ({
            id: nextScenarioId(), label: s.label || 'Scenario', moves: Array.isArray(s.moves) ? s.moves : [],
          })),
        ])
      }
      setRestoredNote(true)
    } else if (saved && !saved.assumptions) {
      // A legacy assumptions-only payload from the old dashboard.
      setAssumptions((a) => ({
        ...a,
        currentAge: saved.currentAge ?? a.currentAge,
        retirementAge: saved.retirementAge ?? a.retirementAge,
        lifeExpectancy: saved.lifeExpectancy ?? a.lifeExpectancy,
        swr: saved.swr ?? a.swr,
      }))
    }
    setHasRestored(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    // Via the catalog route (Supabase, with the bundled snapshot as its
    // own fallback) — same source DriveReady's own picker uses.
    fetch(CAR_CATALOG_ENDPOINT)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.cars)) setCars(d.cars) })
      .catch(() => {})
  }, [])

  const carsById = useMemo(() => Object.fromEntries(cars.map((c) => [c.id, c])), [cars])

  // ── Autosave the whole planner state in one write (KTD9) ──────────────
  useEffect(() => {
    if (!hasRestored) return
    const ok = saveToolInputs('ledger', {
      assumptions,
      bundles,
      scenarios: scenarios.filter((s) => s.id !== 'baseline').map((s) => ({ label: s.label, moves: s.moves })),
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator
    if (ok) setSavedTick((t) => t + 1)
  }, [hasRestored, assumptions, bundles, scenarios])

  useEffect(() => {
    if (savedTick === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator
    setJustSaved(true)
    const t = setTimeout(() => setJustSaved(false), 1400)
    return () => clearTimeout(t)
  }, [savedTick])

  const parsedSalary = num(assumptions.salary) || Number(myNumbers?.retire?.salary) || 0
  const retireYears = Math.max(0, Math.round(num(assumptions.retirementAge) - num(assumptions.currentAge)))
  const isReady = num(assumptions.currentAge) > 0 && num(assumptions.retirementAge) > num(assumptions.currentAge) && parsedSalary > 0 && myNumbers != null

  const referenceInfo = myNumbers ? resolveReference(myNumbers, num(assumptions.reference)) : { reference: 0, source: 'none' }

  // ── Debounced + memoised recompute (KTD3) ────────────────────────────
  const recompute = useCallback(() => {
    if (!isReady) { setResults({}); return }
    const baseState = buildScenarioBaseState(myNumbers, { startingCash: num(assumptions.startingCash) })
    const retireAssumptions = buildRetireAssumptions(myNumbers, {
      currentAge: num(assumptions.currentAge),
      retirementAge: num(assumptions.retirementAge),
      lifeExpectancy: num(assumptions.lifeExpectancy) || 90,
      salary: num(assumptions.salary),
      investmentMonthly: assumptions.investmentMonthly === '' ? undefined : num(assumptions.investmentMonthly),
      salaryGrowthRate: num(assumptions.salaryGrowthRate),
      swr: num(assumptions.swr),
    })
    const reference = referenceInfo.reference
    const sharedSig = JSON.stringify({ baseState, retireAssumptions, bundles, reference })

    const t0 = performance.now()
    const next = {}
    for (const sc of scenarios) {
      const engineMoves = sc.moves.map((m) => toEngineMove(m, carsById, parsedSalary))
      const key = JSON.stringify([sc.id === 'baseline' ? [] : engineMoves, sharedSig])
      let res = cache.current.get(key)
      if (!res) {
        res = runScenario(baseState, { label: sc.label, moves: sc.id === 'baseline' ? [] : engineMoves }, bundles, retireAssumptions, reference)
        cache.current.set(key, res)
        if (cache.current.size > 60) cache.current.clear()
      }
      next[sc.id] = res
    }
    const elapsed = performance.now() - t0
    if (typeof console !== 'undefined' && elapsed > 16) console.log(`[ledger] recompute ${elapsed.toFixed(1)}ms (${scenarios.length} scenarios x 3 bundles)`)
    setResults(next)
  }, [isReady, myNumbers, assumptions, bundles, scenarios, carsById, parsedSalary, referenceInfo.reference])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(recompute, 150)
    return () => debounce.current && clearTimeout(debounce.current)
  }, [recompute])

  // ── Scenario list handlers ──────────────────────────────────────────
  const updateScenario = (id, next) => setScenarios((s) => s.map((sc) => (sc.id === id ? next : sc)))
  const removeScenario = (id) => setScenarios((s) => s.filter((sc) => sc.id !== id))
  const addScenario = () => {
    if (scenarios.length >= MAX_SCENARIOS) return
    const used = new Set(scenarios.map((s) => s.label))
    const label = ['Scenario A', 'Scenario B'].find((l) => !used.has(l)) || 'Scenario B'
    setScenarios((s) => [...s, { id: nextScenarioId(), label, moves: [] }])
  }

  const today = useMemo(() => {
    if (!myNumbers) return null
    const state = buildBaselineState(myNumbers)
    return { netWorth: calcNetWorth(state), tdsr: calcTDSR(state) }
  }, [myNumbers])

  const comparisonColumns = isReady
    ? scenarios.filter((s) => results[s.id]).map((s) => ({ label: s.label, result: results[s.id] }))
    : []

  const setField = (k) => (e) => setAssumptions((a) => ({ ...a, [k]: e.target.value }))

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="MyLedger" links={[{ href: '/ledger/the-math', label: 'The Math' }]} />

      <div style={{ background: C.ndtm, padding: '44px 32px 48px', textAlign: 'center' }}>
        <div style={{ fontFamily: C.fontNdtm, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
          Timed Scenario Planner
        </div>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 'clamp(28px, 5vw, 44px)', color: '#fff', marginBottom: 10, lineHeight: 1.2 }}>
          Sell, buy, upgrade, add a car — see the whole path.
        </h1>
        <p style={{ fontFamily: C.fontDisplay, fontSize: 17, color: 'rgba(255,255,255,0.5)', marginBottom: 22, fontStyle: 'italic' }}>
          A dated sequence of moves, projected against doing nothing, across three sets of assumptions.
        </p>
        <TrustBadges tone="dark" items={['Pulls from your other ndtm tools', 'Compare up to 3 paths', 'Zero data collected', 'Free, forever']} />
      </div>

      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '8px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>Educational tool only · Not financial advice · Not affiliated with CPF Board or MAS</p>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 20px 80px' }}>
        {stale.length > 0 && (
          <div style={{ background: C.amberBg, border: `1px solid ${C.amber}`, borderRadius: C.rL, padding: '12px 16px', marginBottom: 16, fontSize: C.xs, color: C.amberText, lineHeight: 1.5 }}>
            Your {stale.map((s) => s.slot).join(', ')} figures were last synced over {Math.max(...stale.map((s) => s.months))} months ago — re-run those tools so the baseline here matches what they now show.
          </div>
        )}
        {restoredNote && (
          <div style={{ background: C.accentBg, border: `1px solid ${C.accent}55`, borderRadius: C.rL, padding: '12px 16px', marginBottom: 16, fontSize: C.xs, color: C.accent, fontWeight: 600 }}>
            Restored the scenarios and assumptions you last saved to this profile.
          </div>
        )}

        <SectionDivider label="Assumptions (shared across every path)" />
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: 22, boxShadow: C.shadow }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            <NumberInput id="a-age" label="Current age" value={assumptions.currentAge} onChange={setField('currentAge')} />
            <NumberInput id="a-retire" label="Retirement age" value={assumptions.retirementAge} onChange={setField('retirementAge')} />
            <NumberInput id="a-life" label="Plan until age" value={assumptions.lifeExpectancy} onChange={setField('lifeExpectancy')} />
            <MoneyInput id="a-salary" label="Monthly salary" value={assumptions.salary} onChange={setField('salary')} hint={myNumbers?.retire?.salary ? `RetireWell has S$${Math.round(myNumbers.retire.salary).toLocaleString('en-SG')}` : undefined} />
            <MoneyInput id="a-contrib" label="Monthly invested" value={assumptions.investmentMonthly} onChange={setField('investmentMonthly')} hint={myNumbers?.retire?.monthlyContribution ? `RetireWell has S$${Math.round(myNumbers.retire.monthlyContribution).toLocaleString('en-SG')}` : undefined} />
            <PercentInput id="a-growth" label="Salary growth" value={assumptions.salaryGrowthRate} onChange={setField('salaryGrowthRate')} />
            <PercentInput id="a-swr" label="Safe withdrawal rate" value={assumptions.swr} onChange={setField('swr')} />
            <MoneyInput id="a-cash" label="Starting cash" value={assumptions.startingCash} onChange={setField('startingCash')} />
            <MoneyInput
              id="a-ref" label="Monthly spend in retirement" value={assumptions.reference} onChange={setField('reference')}
              hint={referenceInfo.source === 'flow' ? `FlowState measured S$${Math.round(referenceInfo.reference).toLocaleString('en-SG')}` : referenceInfo.source === 'none' ? 'Needed for the enough / tight / short verdict' : undefined}
            />
          </div>
        </div>

        <SectionDivider label="Assumption bundles — low · base · high" />
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: 22, boxShadow: C.shadow }}>
          <BundleEditor bundles={bundles} onChange={setBundles} />
        </div>

        <SectionDivider label={`Paths (${scenarios.length}/${MAX_SCENARIOS})`} />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${scenarios.length}, minmax(300px, 1fr))`, gap: 16, overflowX: 'auto' }}>
          {scenarios.map((sc) => (
            <ScenarioColumn
              key={sc.id}
              scenario={sc}
              isBaseline={sc.id === 'baseline'}
              onChange={(next) => updateScenario(sc.id, next)}
              onLabelChange={(label) => updateScenario(sc.id, { ...sc, label })}
              onRemove={() => removeScenario(sc.id)}
              retireYears={retireYears}
              cars={cars}
              salary={parsedSalary}
              result={results[sc.id]}
            />
          ))}
        </div>

        {scenarios.length < MAX_SCENARIOS && (
          <div style={{ marginTop: 14 }}>
            <Button variant="outline" onClick={addScenario}>+ Add a what-if path</Button>
          </div>
        )}

        <AutosaveIndicator justSaved={justSaved} C={C} style={{ textAlign: 'left' }} />
        <p style={{ marginTop: 4, fontSize: C.xs, color: C.faint, lineHeight: 1.5 }}>
          Your moves and assumptions are saved to this profile. Baseline balances always re-derive from your other tools&apos; latest numbers.
        </p>

        {!isReady && (
          <p style={{ marginTop: 24, fontSize: C.sm, color: C.faint }}>
            Fill in current age, retirement age, and monthly salary above to see the comparison.
          </p>
        )}

        {isReady && comparisonColumns.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <SectionDivider label="Side by side" />
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: 20, boxShadow: C.shadow }}>
              <ComparisonRow columns={comparisonColumns} today={today} />
              <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 16 }}>
                The headline is the inflation-adjusted monthly withdrawal your liquid assets (CPF OA/SA + investments + residual cash) sustain to your plan-until age, solved against RetireWell&apos;s own depletion model. Property equity feeds net worth and the asset mix but never the withdrawal figure. See <a href="/ledger/the-math" style={{ color: C.accent }}>the math</a>.
              </p>
              {referenceInfo.source === 'none' && (
                <p style={{ fontSize: C.xs, color: C.amberText, marginTop: 8 }}>
                  Set a monthly retirement spend above to turn the headline into a comfortably&nbsp;enough / tight / short verdict.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
