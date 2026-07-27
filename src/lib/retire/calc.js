// src/lib/retire/calc.js
// Single source of truth for the retirement projection: CPF accumulation,
// money-market investment accumulation, the inflation-escalated
// withdrawal target, the safe-withdrawal-rate nest-egg requirement, and a
// year-by-year depletion simulation. Pure functions — no React, no
// fetch. Covered by calc.test.js.

import { monthlyCpfContribution, monthlyCpfInterest } from './cpf.js'

// ─── Accumulation: now → retirement age ─────────────────────────────────
// Salary is held flat in nominal terms — no wage-growth assumption is
// modeled, which is a deliberately conservative simplification (real
// salaries usually grow, so this likely understates CPF savings, not
// overstates them). CPF's actual Retirement Account/FRS sweep at 55 is
// also not modeled — OA/SA continue compounding at their own rates
// throughout, since the CPF LIFE payout itself is taken as a manual
// input rather than derived from an RA balance (see the-math page).
export function simulateAccumulation(inputs) {
  const {
    currentAge = 0, retirementAge = 0,
    salary = 0,
    startingOA = 0, startingSA = 0, startingMA = 0,
    housingOaMonthly = 0, housingOaMonths = Infinity,
    investmentStart = 0, investmentMonthly = 0, investmentReturn = 0,
  } = inputs

  const months = Math.max(0, Math.round((retirementAge - currentAge) * 12))
  let oa = Number(startingOA) || 0
  let sa = Number(startingSA) || 0
  let ma = Number(startingMA) || 0
  let investment = Number(investmentStart) || 0
  const monthlyInvReturn = (Number(investmentReturn) || 0) / 100 / 12
  const housingMonths = Number.isFinite(housingOaMonths) ? housingOaMonths : Infinity

  const timeline = []

  for (let m = 0; m < months; m++) {
    const ageNow = currentAge + m / 12
    const contrib = monthlyCpfContribution(salary, ageNow)
    oa += contrib.oa
    sa += contrib.sa
    ma += contrib.ma

    if (m < housingMonths && (Number(housingOaMonthly) || 0) > 0) {
      oa = Math.max(0, oa - housingOaMonthly)
    }

    const interest = monthlyCpfInterest({ oa, sa, ma }, ageNow)
    oa += interest.oa
    sa += interest.sa
    ma += interest.ma

    investment = investment * (1 + monthlyInvReturn) + (Number(investmentMonthly) || 0)

    if ((m + 1) % 12 === 0 || m === months - 1) {
      timeline.push({
        age: Math.round((currentAge + (m + 1) / 12) * 10) / 10,
        oa, sa, ma, cpfTotal: oa + sa + ma, investment,
      })
    }
  }

  return {
    months,
    oaFinal: oa, saFinal: sa, maFinal: ma, cpfTotalFinal: oa + sa + ma,
    investmentFinal: investment,
    timeline,
  }
}

// ─── Retirement target: how big a nest egg do you need? ─────────────────
// The classic safe-withdrawal-rate approach: withdraw a fixed % of the
// nest egg in year 1, then escalate that DOLLAR amount by inflation each
// year after — same mechanics the 3-4% "rule" is built around. CPF LIFE
// (if you supply an expected payout) is netted off first since it's a
// separate, largely-guaranteed income stream, not part of the withdrawable
// investment pool.
export function calcRetirementTarget(inputs, accumulation) {
  const {
    currentAge = 0, retirementAge = 0,
    desiredMonthlyWithdrawal = 0, inflationRate = 2.5, swr = 3,
    cpfLifeMonthlyPayout = 0,
    investmentReturn = 0,
  } = inputs

  const yearsToRetirement = Math.max(0, retirementAge - currentAge)
  const inflationMultiplier = Math.pow(1 + (Number(inflationRate) || 0) / 100, yearsToRetirement)
  const inflatedMonthlyWithdrawal = (Number(desiredMonthlyWithdrawal) || 0) * inflationMultiplier

  const monthlyFromInvestments = Math.max(0, inflatedMonthlyWithdrawal - (Number(cpfLifeMonthlyPayout) || 0))
  const annualFromInvestments = monthlyFromInvestments * 12
  const swrRate = (Number(swr) || 0) / 100
  const requiredNestEgg = swrRate > 0 ? annualFromInvestments / swrRate : null

  const projectedInvestment = accumulation.investmentFinal
  const gap = requiredNestEgg != null ? requiredNestEgg - projectedInvestment : null
  const onTrack = gap != null ? gap <= 0 : null

  // Extra monthly contribution needed, from today, to close a gap by
  // retirement — future-value-of-an-ordinary-annuity, inverted for the
  // payment: C = FV × r / [(1+r)^n − 1].
  const monthlyInvReturn = (Number(investmentReturn) || 0) / 100 / 12
  const months = accumulation.months
  let extraMonthlyNeeded = null
  if (gap != null && gap > 0 && months > 0) {
    if (monthlyInvReturn > 0) {
      const fvFactor = (Math.pow(1 + monthlyInvReturn, months) - 1) / monthlyInvReturn
      extraMonthlyNeeded = gap / fvFactor
    } else {
      extraMonthlyNeeded = gap / months
    }
  }

  return {
    desiredMonthlyWithdrawal: Number(desiredMonthlyWithdrawal) || 0,
    cpfLifeMonthlyPayout: Number(cpfLifeMonthlyPayout) || 0,
    swr: Number(swr) || 0,
    yearsToRetirement, inflatedMonthlyWithdrawal, monthlyFromInvestments, annualFromInvestments,
    requiredNestEgg, projectedInvestment, gap, onTrack, extraMonthlyNeeded,
  }
}

// ─── Depletion simulation ────────────────────────────────────────────────
// Given your projected investment balance at retirement, simulate the
// drawdown year by year: withdraw the inflation-escalated amount, grow
// the remainder at the assumed money-market return. This is the more
// honest check for a money-market-only portfolio, where the "3% forever"
// framing (built for equity-inclusive portfolios) may not actually hold —
// see the-math page.
export function simulateDepletion(inputs, startingBalance, firstYearMonthlyWithdrawal) {
  const {
    retirementAge = 0, lifeExpectancy = 90, inflationRate = 2.5, investmentReturn = 0,
  } = inputs

  let balance = Number(startingBalance) || 0
  let monthlyWithdrawal = Number(firstYearMonthlyWithdrawal) || 0
  const annualReturn = (Number(investmentReturn) || 0) / 100
  const inflation = (Number(inflationRate) || 0) / 100
  const maxYears = Math.max(0, Math.round(lifeExpectancy - retirementAge))

  const rows = []
  let depletedAtAge = null

  for (let y = 0; y < maxYears; y++) {
    const annualWithdrawal = monthlyWithdrawal * 12
    balance = balance * (1 + annualReturn) - annualWithdrawal
    const age = retirementAge + y + 1
    if (balance <= 0 && depletedAtAge == null) {
      depletedAtAge = age
      balance = 0
    }
    rows.push({ age, balance: Math.max(0, balance) })
    monthlyWithdrawal *= (1 + inflation)
    if (balance <= 0) break
  }

  return { depletedAtAge, rows, lastsToLifeExpectancy: depletedAtAge == null }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────
export function calcRetirement(inputs) {
  const {
    currentAge = 0, retirementAge = 0, lifeExpectancy = 90,
    housingOaUntilAge = null,
  } = inputs

  const housingOaMonths = housingOaUntilAge != null
    ? Math.max(0, Math.round((housingOaUntilAge - currentAge) * 12))
    : Infinity

  const accumulation = simulateAccumulation({ ...inputs, housingOaMonths })
  const target = calcRetirementTarget(inputs, accumulation)
  const depletion = simulateDepletion(
    { retirementAge, lifeExpectancy, inflationRate: inputs.inflationRate, investmentReturn: inputs.investmentReturn },
    accumulation.investmentFinal,
    target.monthlyFromInvestments,
  )

  return {
    currentAge, retirementAge, lifeExpectancy,
    accumulation, target, depletion,
  }
}
