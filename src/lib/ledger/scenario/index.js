// src/lib/ledger/scenario/index.js
// Scenario orchestrator: resolves a scenario's moves through the owning
// engines (U4), runs the segmented projection (U1) and the sustainable-
// withdrawal solver (U2) once per assumption bundle, projects property
// alongside (U3), and returns the full comparison payload for one
// scenario. Pure — no React, no fetch.

import { projectSegmented } from './project.js'
import { solveSustainableWithdrawal } from './solve.js'
import { projectProperty } from './property.js'
import { resolveMove } from './moves.js'

export const BUNDLE_KEYS = ['conservative', 'base', 'optimistic']

// Order within a year: a sell resolves before a buy so its proceeds and
// CPF refund can fund the purchase. Everything else keeps input order.
const TYPE_RANK = { 'sell-property': 0, 'buy-property': 1 }

// Resolve every move to a dated delta in projectSegmented's input shape,
// threading same-year sale proceeds into a same-year buy. `retireYears`
// bounds when a move still takes effect: a dated delta or a property-state
// change at or past retirement is dropped by the projector, so it is
// dropped (with a warning) here too, or the asset-mix line would diverge
// from the liquid projection.
function resolveTimeline(moves = [], retireYears = Infinity) {
  const sorted = [...moves].sort((a, b) => {
    const dy = (Number(a.year) || 0) - (Number(b.year) || 0)
    return dy !== 0 ? dy : (TYPE_RANK[a.type] ?? 2) - (TYPE_RANK[b.type] ?? 2)
  })
  const proceedsByYear = new Map()
  const dated = []
  const warnings = []
  let property = undefined // undefined = unchanged from baseline; null = sold, no replacement
  let mortgage = undefined

  for (const move of sorted) {
    const year = Math.max(0, Math.trunc(Number(move.year) || 0))
    if (year >= retireYears) {
      warnings.push({ year, type: move.type, warning: 'after-retirement' })
      continue
    }
    const context = { saleProceeds: proceedsByYear.get(year) }
    const d = resolveMove(move, context)
    if (d.warning) warnings.push({ year, type: move.type, warning: d.warning })
    if (d.saleProceeds) proceedsByYear.set(year, d.saleProceeds)

    const payoffYear = d.payoff ? Math.max(0, Math.trunc(Number(d.payoff.year) || 0)) : null
    if (payoffYear != null && payoffYear >= retireYears) {
      warnings.push({ year: payoffYear, type: move.type, warning: 'payoff-after-retirement' })
    }
    dated.push({
      year,
      investmentLump: d.investmentLumpDelta || 0,
      cash: d.cashDelta || 0,
      cpfOa: d.cpfOaDelta || 0,
      monthlyContribution: d.monthlyContributionDelta || 0,
      payoff: payoffYear != null && payoffYear < retireYears
        ? { year: payoffYear, monthlyContribution: d.payoff.monthlyContributionDelta || 0 }
        : undefined,
    })
    for (const extra of (d.datedExtras || [])) {
      const ey = Math.max(0, Math.trunc(Number(extra.year) || 0))
      if (ey >= retireYears) {
        warnings.push({ year: ey, type: move.type, warning: 'lump-after-retirement' })
        continue
      }
      dated.push({
        year: ey,
        investmentLump: extra.investmentLumpDelta || 0,
        cash: extra.cashDelta || 0,
        cpfOa: 0,
        monthlyContribution: extra.monthlyContributionDelta || 0,
      })
    }

    if (d.propertyChange?.type === 'removed') { property = null; mortgage = null }
    if (d.propertyChange?.type === 'set') {
      property = { value: d.propertyChange.value, boughtYear: year }
      mortgage = d.mortgageChange?.type === 'set' ? d.mortgageChange : null
    }
  }

  return { dated, warnings, property, mortgage }
}

// The enough / tight / short verdict. Exposed so the surface can re-label
// an already-solved band against a live reference without re-running the
// solver (the reference never enters runScenario's memoised path).
export function labelRead(bandBase, bandConservative, reference) {
  if (!(reference > 0)) return 'no-reference'
  if (bandConservative < reference) return 'short'
  if (bandBase >= reference * 1.1) return 'comfortably enough'
  if (bandBase >= reference) return 'tight'
  return 'short'
}

// baseState: { startingOA, startingSA, startingMA, investmentStart, startingCash,
//   property: { value, mortgagePrincipal, mortgageRatePct, mortgageTenureYears } | null }
// scenario: { label, moves: [{ type, year, inputs }] }
// bundles:  { conservative, base, optimistic }, each { equityReturn, propertyAppreciation, inflation }
// retireAssumptions: { currentAge, retirementAge, currentYear, lifeExpectancy, salary,
//   annualBonus, salaryGrowthRate, investmentMonthly, rstuAmount, rstuFrequency,
//   housingOaMonthly, housingOaUntilAge, swr }
export function runScenario(baseState = {}, scenario = {}, bundles = {}, retireAssumptions = {}, reference = 0) {
  const retireYears = Math.max(0, Math.round((retireAssumptions.retirementAge || 0) - (retireAssumptions.currentAge || 0)))
  const { dated, warnings, property: propChange, mortgage: mortChange } = resolveTimeline(scenario.moves || [], retireYears)

  // Which property is held at retirement, and from when.
  let finalProperty = null
  let finalBoughtYear = 0
  if (propChange === undefined && baseState.property) {
    finalProperty = { ...baseState.property }
    finalBoughtYear = 0
  } else if (propChange && propChange.value != null) {
    finalProperty = {
      value: propChange.value,
      mortgagePrincipal: mortChange?.principal || 0,
      mortgageRatePct: mortChange?.ratePct || 0,
      mortgageTenureYears: mortChange?.tenureYears || 0,
    }
    finalBoughtYear = propChange.boughtYear || 0
  }

  const projAssumptions = {
    currentAge: retireAssumptions.currentAge || 0,
    retirementAge: retireAssumptions.retirementAge || 0,
    currentYear: retireAssumptions.currentYear || new Date().getFullYear(),
    salary: retireAssumptions.salary || 0,
    annualBonus: retireAssumptions.annualBonus || 0,
    salaryGrowthRate: retireAssumptions.salaryGrowthRate || 0,
    investmentMonthly: retireAssumptions.investmentMonthly || 0,
    rstuAmount: retireAssumptions.rstuAmount || 0,
    rstuFrequency: retireAssumptions.rstuFrequency || 'monthly',
    housingOaMonthly: retireAssumptions.housingOaMonthly || 0,
    housingOaUntilAge: retireAssumptions.housingOaUntilAge ?? null,
  }

  const band = {}
  let baseLiquid = null
  let baseCash = 0
  let worstMinCash = Infinity
  let worstMinInvestment = Infinity
  for (const key of BUNDLE_KEYS) {
    const bundle = bundles[key] || {}
    const proj = projectSegmented(
      {
        startingOA: baseState.startingOA || 0,
        startingSA: baseState.startingSA || 0,
        startingMA: baseState.startingMA || 0,
        investmentStart: baseState.investmentStart || 0,
        startingCash: baseState.startingCash || 0,
      },
      dated,
      { ...projAssumptions, investmentReturn: Number(bundle.equityReturn) || 0 },
    )
    if (proj.minCash < worstMinCash) worstMinCash = proj.minCash
    if (proj.minInvestment < worstMinInvestment) worstMinInvestment = proj.minInvestment
    const residualCash = Math.max(0, proj.cashFinal)
    const liquidBase = proj.oaFinal + proj.saFinal + proj.investmentFinal + residualCash
    const { monthly } = solveSustainableWithdrawal(liquidBase, {
      currentAge: retireAssumptions.currentAge || 0,
      retirementAge: retireAssumptions.retirementAge || 0,
      lifeExpectancy: retireAssumptions.lifeExpectancy ?? 90,
      inflationRate: Number(bundle.inflation) || 0,
      investmentReturn: Number(bundle.equityReturn) || 0,
      swr: retireAssumptions.swr || 0,
    })
    band[key] = monthly
    if (key === 'base') {
      baseLiquid = { oa: proj.oaFinal, sa: proj.saFinal, investment: proj.investmentFinal, liquidBase }
      baseCash = residualCash
    }
  }

  // Property equity at retirement, on the BASE property-appreciation rate.
  let propertyEquity = 0
  if (finalProperty) {
    const years = Math.max(0, retireYears - finalBoughtYear)
    const rows = projectProperty(finalProperty, Number(bundles.base?.propertyAppreciation) || 0, years)
    propertyEquity = rows[rows.length - 1].equity
  }

  const assetMix = {
    property: propertyEquity,      // never part of liquidBase (KD3)
    liquid: baseLiquid.oa + baseLiquid.sa + baseLiquid.investment,
    cash: baseCash,
  }
  const netWorthAtRetirement = assetMix.liquid + assetMix.cash + assetMix.property

  // A balance that dipped below zero at any point means the moves as laid
  // out are not fundable — surface it rather than let Math.max(0, ...)
  // floor it away into a healthy-looking headline.
  const allWarnings = [...warnings]
  if (worstMinCash < -1) allWarnings.push({ warning: 'cash-shortfall', amount: Math.round(-worstMinCash) })
  if (worstMinInvestment < -1) allWarnings.push({ warning: 'investment-shortfall', amount: Math.round(-worstMinInvestment) })

  return {
    label: scenario.label || 'Scenario',
    band,
    read: labelRead(band.base, band.conservative, reference),
    netWorthAtRetirement,
    assetMix,
    liquidBaseAtRetirement: baseLiquid.liquidBase, // exposed for the R8 structural assertion
    warnings: allWarnings,
  }
}
