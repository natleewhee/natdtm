// src/lib/retire/calc.js
// Single source of truth for the retirement projection: CPF accumulation,
// money-market investment accumulation, the inflation-escalated
// withdrawal target, the safe-withdrawal-rate nest-egg requirement, and a
// year-by-year depletion simulation. Pure functions — no React, no
// fetch. Covered by calc.test.js.

import {
  monthlyCpfContribution, monthlyCpfInterest, splitContribution, creditWithMaOverflow,
  CPF_OW_CEILING, CPF_ANNUAL_CEILING, prevailingFRS, prevailingBHS,
} from './cpf.js'

// ─── Accumulation: now → retirement age ─────────────────────────────────
// CPF's actual Retirement Account sweep at 55 and the CPF LIFE annuity
// it eventually funds are out of scope — OA/SA simply keep compounding
// at their own rates straight through retirement age, and the
// retirement target check (below) treats OA+SA as part of one combined,
// self-managed portfolio alongside investments rather than modeling CPF
// LIFE's real lifetime-annuity payout mechanics (see the-math page).
// RSTU top-ups are credited to SA throughout for the same reason
// (standing in for "SA or RA, whichever applies"), gated by the
// applicable Full Retirement Sum — which, like the Basic Healthcare Sum,
// is a cohort figure: it rises with the general schedule until you hit
// the milestone age (55 for FRS, 65 for BHS), then freezes for life.
// MediSave contributions beyond the applicable BHS overflow into SA the
// same way real CPF contributions do.
export function simulateAccumulation(inputs) {
  const {
    currentAge = 0, retirementAge = 0,
    currentYear = new Date().getFullYear(),
    salary = 0, salaryGrowthRate = 0, annualBonus = 0,
    startingOA = 0, startingSA = 0, startingMA = 0,
    housingOaMonthly = 0, housingOaMonths = Infinity,
    rstuAmount = 0, rstuFrequency = 'monthly',
    investmentStart = 0, investmentMonthly = 0, investmentReturn = 0,
  } = inputs

  const months = Math.max(0, Math.round((retirementAge - currentAge) * 12))
  const balances = { oa: Number(startingOA) || 0, sa: Number(startingSA) || 0, ma: Number(startingMA) || 0 }
  let investment = Number(investmentStart) || 0
  let currentSalary = Number(salary) || 0
  let currentBonus = Number(annualBonus) || 0
  const monthlyInvReturn = (Number(investmentReturn) || 0) / 100 / 12
  const housingMonths = Number.isFinite(housingOaMonths) ? housingOaMonths : Infinity
  const growthRate = (Number(salaryGrowthRate) || 0) / 100
  const rstuMonthlyAmount = rstuFrequency === 'annual' ? 0 : (Number(rstuAmount) || 0)
  const rstuAnnualAmount = rstuFrequency === 'annual' ? (Number(rstuAmount) || 0) : 0

  const timeline = []
  let ordinaryWagesThisYear = 0
  let rstuCappedAtAge = null
  let maCappedAtAge = null
  let oaHousingShortfallAge = null
  // Once you turn 65, your Basic Healthcare Sum locks in for life at
  // whatever the prevailing figure was that year — it doesn't keep
  // rising with the general schedule the way it did before 65. Your
  // Retirement Sum (FRS) works the same way, but locks in at 55 instead
  // (when your Retirement Account would be created) — both modeled with
  // the same freeze pattern.
  let frozenBHS = null
  let frozenFRS = null
  let bhsApplicableAtEnd = prevailingBHS(currentYear)

  for (let m = 0; m < months; m++) {
    const ageNow = currentAge + m / 12
    const yearNow = currentYear + Math.floor(m / 12)
    if (ageNow >= 65 && frozenBHS == null) frozenBHS = prevailingBHS(yearNow)
    if (ageNow >= 55 && frozenFRS == null) frozenFRS = prevailingFRS(yearNow)
    const effectiveBHS = frozenBHS ?? prevailingBHS(yearNow)
    const effectiveFRS = frozenFRS ?? prevailingFRS(yearNow)
    bhsApplicableAtEnd = effectiveBHS

    // Salary and bonus both escalate once per year (not on month 0,
    // which uses the starting figures as given) — bonuses are typically
    // proportional to salary, so grown at the same assumed rate.
    if (m > 0 && m % 12 === 0) {
      currentSalary *= (1 + growthRate)
      currentBonus *= (1 + growthRate)
    }

    const contrib = monthlyCpfContribution(currentSalary, ageNow)
    if (contrib.ma > Math.max(0, effectiveBHS - balances.ma) && maCappedAtAge == null) {
      maCappedAtAge = Math.round(ageNow * 10) / 10
    }
    creditWithMaOverflow(balances, contrib, effectiveBHS)
    ordinaryWagesThisYear += Math.min(Math.max(0, currentSalary), CPF_OW_CEILING)

    // Bonus/AWS and an annual RSTU top-up are both credited once a year.
    const isYearEnd = (m + 1) % 12 === 0 || m === months - 1
    if (isYearEnd && currentBonus > 0) {
      const awCeiling = Math.max(0, CPF_ANNUAL_CEILING - ordinaryWagesThisYear)
      const bonusSubjectToCpf = Math.min(currentBonus, awCeiling)
      const bonusContrib = splitContribution(bonusSubjectToCpf, ageNow)
      if (bonusContrib.ma > Math.max(0, effectiveBHS - balances.ma) && maCappedAtAge == null) {
        maCappedAtAge = Math.round(ageNow * 10) / 10
      }
      creditWithMaOverflow(balances, bonusContrib, effectiveBHS)
    }
    if (isYearEnd) ordinaryWagesThisYear = 0

    if (m < housingMonths && (Number(housingOaMonthly) || 0) > 0) {
      if (balances.oa < housingOaMonthly && oaHousingShortfallAge == null) {
        oaHousingShortfallAge = Math.round(ageNow * 10) / 10
      }
      balances.oa = Math.max(0, balances.oa - housingOaMonthly)
    }

    const rstuThisMonth = rstuMonthlyAmount > 0 ? rstuMonthlyAmount : (isYearEnd ? rstuAnnualAmount : 0)
    if (rstuThisMonth > 0) {
      const room = Math.max(0, effectiveFRS - balances.sa)
      const credited = Math.min(rstuThisMonth, room)
      balances.sa += credited
      if (credited < rstuThisMonth && rstuCappedAtAge == null) rstuCappedAtAge = Math.round(ageNow * 10) / 10
    }

    const interest = monthlyCpfInterest(balances, ageNow)
    balances.oa += interest.oa
    balances.sa += interest.sa
    balances.ma += interest.ma

    investment = investment * (1 + monthlyInvReturn) + (Number(investmentMonthly) || 0)

    if ((m + 1) % 12 === 0 || m === months - 1) {
      timeline.push({
        age: Math.round((currentAge + (m + 1) / 12) * 10) / 10,
        oa: balances.oa, sa: balances.sa, ma: balances.ma,
        cpfTotal: balances.oa + balances.sa + balances.ma, investment,
      })
    }
  }

  return {
    months,
    oaFinal: balances.oa, saFinal: balances.sa, maFinal: balances.ma,
    cpfTotalFinal: balances.oa + balances.sa + balances.ma,
    investmentFinal: investment,
    rstuCappedAtAge,
    maCappedAtAge, bhsApplicableAtEnd,
    oaHousingShortfallAge,
    timeline,
  }
}

// ─── Retirement target: how big a nest egg do you need? ─────────────────
// The classic safe-withdrawal-rate approach: withdraw a fixed % of the
// nest egg in year 1, then escalate that DOLLAR amount by inflation each
// year after — same mechanics the 3-4% "rule" is built around. Checked
// against your combined portfolio (money-market investments + CPF
// Ordinary + Special Account) rather than a separate CPF LIFE payout —
// simpler to reason about, at the cost of not modeling CPF LIFE's actual
// lifetime-annuity mechanics (see the-math page). MediSave is excluded:
// it's earmarked for healthcare premiums, not everyday withdrawals.
export function calcRetirementTarget(inputs, accumulation) {
  const {
    currentAge = 0, retirementAge = 0,
    desiredMonthlyWithdrawal = 0, inflationRate = 2.5, swr = 3,
    investmentReturn = 0,
  } = inputs

  const yearsToRetirement = Math.max(0, retirementAge - currentAge)
  const inflationMultiplier = Math.pow(1 + (Number(inflationRate) || 0) / 100, yearsToRetirement)
  const inflatedMonthlyWithdrawal = (Number(desiredMonthlyWithdrawal) || 0) * inflationMultiplier

  const annualWithdrawal = inflatedMonthlyWithdrawal * 12
  const swrRate = (Number(swr) || 0) / 100
  const requiredNestEgg = swrRate > 0 ? annualWithdrawal / swrRate : null

  const projectedPortfolio = (accumulation.investmentFinal || 0) + (accumulation.oaFinal || 0) + (accumulation.saFinal || 0)
  const gap = requiredNestEgg != null ? requiredNestEgg - projectedPortfolio : null
  const onTrack = gap != null ? gap <= 0 : null

  // Extra monthly contribution needed, from today, to close a gap by
  // retirement — future-value-of-an-ordinary-annuity, inverted for the
  // payment: C = FV × r / [(1+r)^n − 1]. Solved against your investment
  // return specifically, since topping up investments is the lever you
  // control most directly (CPF contributions are largely mandatory or
  // RSTU-capped).
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
    swr: Number(swr) || 0,
    yearsToRetirement, inflatedMonthlyWithdrawal,
    requiredNestEgg, projectedPortfolio, gap, onTrack, extraMonthlyNeeded,
  }
}

// ─── Depletion simulation ────────────────────────────────────────────────
// Given your projected combined portfolio at retirement, simulate the
// drawdown year by year: withdraw the inflation-escalated amount, grow
// the remainder at your assumed money-market return. Applying that same
// rate to the CPF portion too is a simplifying, conservative assumption —
// CPF's guaranteed rates typically run higher — see the-math page. This
// whole simulation is the more honest check than the safe-withdrawal-rate
// framing above, which assumes indefinite sustainability that a
// money-market-heavy portfolio may not actually deliver.
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
    balance = balance * (1 + annualReturn) - monthlyWithdrawal * 12
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
    target.projectedPortfolio,
    target.inflatedMonthlyWithdrawal,
  )

  return {
    currentAge, retirementAge, lifeExpectancy,
    accumulation, target, depletion,
  }
}
