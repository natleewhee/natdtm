// src/lib/ledger/scenario/project.js
// Segmented forward projection for the scenario planner. Runs RetireWell's
// simulateAccumulation once per "segment" — the spans between consecutive
// boundary years — carrying the CPF sub-account balances, the investment
// balance, a liquid cash balance, and the frozen FRS/BHS cohort sums
// across every boundary. Boundary years are the sorted union of 0,
// retirement, every move's year, and every loan-payoff year (a move that
// carries a `payoff` step-up, plus any baseline-loan payoff the caller
// passes as a bare {year, monthlyContribution} entry).
//
// A no-op move produces finals identical (to the cent) to one unsplit
// simulateAccumulation run over the same horizon — that equivalence is
// the module's contract and U1's gate (project.test.js). Pure — no React,
// no fetch.

import { simulateAccumulation } from '../../retire/calc.js'

// Move / delta year: a non-negative integer. Fractional input is
// truncated, negatives floor at 0 (KTD1 — a fractional or past-retirement
// boundary would desync simulateAccumulation's once-per-12-months salary
// escalation).
function intYear(v) {
  const n = Math.trunc(Number(v) || 0)
  return n < 0 ? 0 : n
}

// baseState:   { startingOA, startingSA, startingMA, investmentStart, startingCash }
// moves:       [{ year, investmentLump?, cash?, cpfOa?, monthlyContribution?,
//                 payoff?: { year, monthlyContribution } }]
//                - investmentLump / cash / cpfOa: one-off deltas applied at the
//                  segment that starts on `year`
//                - monthlyContribution: change to investmentMonthly from `year` on
//                  (deltas stack across moves)
//                - payoff: an optional second dated monthlyContribution step-up
//                  (a financed purchase freeing its instalment when the loan ends)
// assumptions: { currentAge, retirementAge, currentYear, salary, annualBonus,
//                salaryGrowthRate, investmentReturn, investmentMonthly,
//                rstuAmount?, rstuFrequency?, housingOaMonthly?, housingOaUntilAge? }
export function projectSegmented(baseState = {}, moves = [], assumptions = {}) {
  const {
    currentAge = 0, retirementAge = 0,
    currentYear = new Date().getFullYear(),
    salary = 0, annualBonus = 0, salaryGrowthRate = 0,
    investmentReturn = 0, investmentMonthly = 0,
    rstuAmount = 0, rstuFrequency = 'monthly',
    housingOaMonthly = 0, housingOaUntilAge = null,
  } = assumptions

  const retireYears = Math.max(0, Math.round(retirementAge - currentAge))
  const growthRate = (Number(salaryGrowthRate) || 0) / 100

  // Flatten moves + their payoff step-ups into dated deltas; clamp each
  // year to a non-negative integer and drop anything at or past
  // retirement (it would leave a zero-length final segment while the
  // drawdown still starts at the real retirement age).
  const dated = []
  for (const mv of (moves || [])) {
    const y = intYear(mv.year)
    if (y < retireYears) {
      dated.push({
        year: y,
        investmentLump: Number(mv.investmentLump) || 0,
        cash: Number(mv.cash) || 0,
        cpfOa: Number(mv.cpfOa) || 0,
        monthlyContribution: Number(mv.monthlyContribution) || 0,
      })
    }
    if (mv.payoff) {
      const py = intYear(mv.payoff.year)
      if (py > 0 && py < retireYears) {
        dated.push({
          year: py, investmentLump: 0, cash: 0, cpfOa: 0,
          monthlyContribution: Number(mv.payoff.monthlyContribution) || 0,
        })
      }
    }
  }

  const boundarySet = new Set([0, retireYears])
  for (const d of dated) boundarySet.add(d.year)
  const boundaries = [...boundarySet].sort((a, b) => a - b)

  let oa = Number(baseState.startingOA) || 0
  let sa = Number(baseState.startingSA) || 0
  let ma = Number(baseState.startingMA) || 0
  let investment = Number(baseState.investmentStart) || 0
  let cash = Number(baseState.startingCash) || 0
  let frozenFRS = null
  let frozenBHS = null
  // Advanced by one *= (1 + growthRate) per elapsed year, mirroring
  // simulateAccumulation's own escalation step exactly so a no-op
  // segmented run stays bit-for-bit identical to an unsplit run.
  let salaryCursor = Number(salary) || 0
  let bonusCursor = Number(annualBonus) || 0
  let salaryYear = 0
  let currentMonthly = Number(investmentMonthly) || 0
  // Lowest the tracked balances dip to at any boundary — a negative value
  // means a move (a lump, a down payment, a mortgage bigger than the
  // contribution) made the plan infeasible at some point. The orchestrator
  // turns this into a visible warning rather than silently flooring it.
  let minCash = cash
  let minInvestment = investment

  const segments = []

  for (let i = 0; i < boundaries.length - 1; i++) {
    const a = boundaries[i]
    const b = boundaries[i + 1]

    for (const d of dated) {
      if (d.year !== a) continue
      investment += d.investmentLump
      cash += d.cash
      oa += d.cpfOa
      currentMonthly += d.monthlyContribution
    }
    if (cash < minCash) minCash = cash
    if (investment < minInvestment) minInvestment = investment

    while (salaryYear < a) {
      salaryCursor *= (1 + growthRate)
      bonusCursor *= (1 + growthRate)
      salaryYear++
    }

    if (b > a) {
      const startAge = currentAge + a
      const housingOaMonths = housingOaUntilAge != null
        ? Math.max(0, Math.round((housingOaUntilAge - startAge) * 12))
        : Infinity
      const res = simulateAccumulation({
        currentAge: startAge,
        retirementAge: currentAge + b,
        currentYear: currentYear + a,
        salary: salaryCursor,
        salaryGrowthRate,
        annualBonus: bonusCursor,
        startingOA: oa, startingSA: sa, startingMA: ma,
        housingOaMonthly, housingOaMonths,
        rstuAmount, rstuFrequency,
        investmentStart: investment,
        investmentMonthly: currentMonthly,
        investmentReturn,
        frozenFRS, frozenBHS,
      })
      oa = res.oaFinal
      sa = res.saFinal
      ma = res.maFinal
      investment = res.investmentFinal
      frozenFRS = res.frozenFRS
      frozenBHS = res.frozenBHS
      if (investment < minInvestment) minInvestment = investment
    }

    segments.push({
      startYear: a, endYear: b,
      startAge: currentAge + a, endAge: currentAge + b,
      investmentMonthly: currentMonthly,
      cashBalance: cash,
      oaFinal: oa, saFinal: sa, maFinal: ma, investmentFinal: investment,
    })
  }

  return {
    oaFinal: oa, saFinal: sa, maFinal: ma,
    investmentFinal: investment,
    cashFinal: cash,
    minCash, minInvestment,
    frozenFRS, frozenBHS,
    segments,
  }
}
