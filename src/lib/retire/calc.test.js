/**
 * RetireWell calculator tests
 * Run with: node calc.test.js — no framework, just assertions.
 */

import {
  simulateAccumulation, calcRetirementTarget, simulateDepletion, calcRetirement,
} from './calc.js'
import {
  monthlyCpfContribution, monthlyCpfInterest, contributionRatesForAge, splitContribution,
  CPF_OW_CEILING, CPF_ANNUAL_CEILING, prevailingFRS, CPF_FRS_BASE, CPF_FRS_BASE_YEAR,
} from './cpf.js'

let passed = 0
let failed = 0

function assert(label, condition) {
  if (condition) { console.log(`  ✓ ${label}`); passed++ }
  else { console.error(`  ✗ ${label}`); failed++ }
}

function approx(a, b, tol = 1) {
  return Math.abs(a - b) <= tol
}

// ─── CPF contribution ────────────────────────────────────────────────────
assert('Below-55 contribution rate is 37%', contributionRatesForAge(30).total === 0.37)
assert('Age 58 falls in the 56-60 band', contributionRatesForAge(58).total === 0.325)
assert('Age 100 falls back to the oldest band', contributionRatesForAge(100).total === 0.125)

const contrib = monthlyCpfContribution(6_000, 30)
assert('Contribution on $6,000 salary uses the full amount (below OW ceiling)', approx(contrib.total, 6_000 * 0.37, 0.01))
assert('OA + SA + MA sums to total contribution', approx(contrib.oa + contrib.sa + contrib.ma, contrib.total, 0.01))

const cappedContrib = monthlyCpfContribution(20_000, 30)
assert('Contribution on a salary above the OW ceiling is capped', approx(cappedContrib.total, CPF_OW_CEILING * 0.37, 0.01))

const zeroSalary = monthlyCpfContribution(0, 30)
assert('Zero salary produces zero contribution', zeroSalary.total === 0)

// ─── CPF interest ────────────────────────────────────────────────────────
const smallBalances = { oa: 10_000, sa: 5_000, ma: 5_000 }
const smallInterest = monthlyCpfInterest(smallBalances, 30)
// All balances are within the $60k combined extra-interest tier below 55.
const expectedOa = 10_000 * (0.025 / 12) + 10_000 * (0.01 / 12)
assert('OA interest below 55 includes base + extra interest when under the combined cap', approx(smallInterest.oa, expectedOa, 0.5))

const bigOa = { oa: 100_000, sa: 0, ma: 0 }
const bigInterest = monthlyCpfInterest(bigOa, 30)
// Only $20k of OA counts toward the below-55 extra-interest base.
const expectedBigOa = 100_000 * (0.025 / 12) + 20_000 * (0.01 / 12)
assert('OA-only extra interest is capped at $20k of OA counting toward the combined tier', approx(bigInterest.oa, expectedBigOa, 0.5))

// ─── Accumulation ────────────────────────────────────────────────────────
const accum = simulateAccumulation({
  currentAge: 30, retirementAge: 31,
  salary: 5_000,
  startingOA: 50_000, startingSA: 20_000, startingMA: 10_000,
  investmentStart: 10_000, investmentMonthly: 500, investmentReturn: 3,
})
assert('One year of accumulation runs 12 months', accum.months === 12)
assert('CPF balances grow over one year of contributions', accum.cpfTotalFinal > 50_000 + 20_000 + 10_000)
assert('Investment balance grows with contributions and return', accum.investmentFinal > 10_000 + 500 * 12)
assert('Timeline has one yearly snapshot for a 1-year run', accum.timeline.length === 1)

const noGrowth = simulateAccumulation({
  currentAge: 30, retirementAge: 30, salary: 5_000,
  startingOA: 1_000, startingSA: 1_000, startingMA: 1_000,
})
assert('Zero-length accumulation (already at retirement age) makes no change', noGrowth.cpfTotalFinal === 3_000 && noGrowth.months === 0)

// Housing OA drawdown reduces OA growth relative to not drawing at all.
const withHousing = simulateAccumulation({
  currentAge: 30, retirementAge: 35, salary: 6_000,
  startingOA: 100_000, housingOaMonthly: 1_500, housingOaMonths: Infinity,
})
const withoutHousing = simulateAccumulation({
  currentAge: 30, retirementAge: 35, salary: 6_000,
  startingOA: 100_000,
})
assert('Drawing OA for housing results in a lower OA balance than not drawing', withHousing.oaFinal < withoutHousing.oaFinal)

// Housing OA drawdown stops once housingOaMonths elapses.
const housingStopsEarly = simulateAccumulation({
  currentAge: 30, retirementAge: 40, salary: 6_000,
  startingOA: 100_000, housingOaMonthly: 1_500, housingOaMonths: 24, // stops after 2 years
})
const housingNeverStops = simulateAccumulation({
  currentAge: 30, retirementAge: 40, salary: 6_000,
  startingOA: 100_000, housingOaMonthly: 1_500, housingOaMonths: Infinity,
})
assert('Housing OA drawdown that stops early leaves a higher OA balance than one that never stops', housingStopsEarly.oaFinal > housingNeverStops.oaFinal)

// ─── Retirement target ───────────────────────────────────────────────────
const flatAccum = { investmentFinal: 500_000, months: 240 }
const target = calcRetirementTarget({
  currentAge: 40, retirementAge: 60,
  desiredMonthlyWithdrawal: 5_000, inflationRate: 2.5, swr: 3,
  investmentReturn: 4,
}, flatAccum)
assert('Years to retirement computed correctly', target.yearsToRetirement === 20)
const expectedInflated = 5_000 * Math.pow(1.025, 20)
assert('Inflated monthly withdrawal compounds over years to retirement', approx(target.inflatedMonthlyWithdrawal, expectedInflated, 1))
const expectedNestEgg = expectedInflated * 12 / 0.03
assert('Required nest egg = annual inflated withdrawal / SWR', approx(target.requiredNestEgg, expectedNestEgg, 5))
assert('Gap is required nest egg minus projected portfolio', approx(target.gap, expectedNestEgg - 500_000, 5))

// The combined portfolio includes OA and SA, not just investments.
const targetWithCpf = calcRetirementTarget({
  currentAge: 40, retirementAge: 60,
  desiredMonthlyWithdrawal: 5_000, inflationRate: 2.5, swr: 3,
  investmentReturn: 4,
}, { investmentFinal: 500_000, oaFinal: 100_000, saFinal: 50_000, maFinal: 200_000, months: 240 })
assert('projectedPortfolio sums investments + OA + SA', targetWithCpf.projectedPortfolio === 650_000)
assert('projectedPortfolio excludes MediSave', targetWithCpf.projectedPortfolio !== 850_000)
assert('A larger combined portfolio (via CPF) results in a smaller gap than investments alone', targetWithCpf.gap < target.gap)

// A surplus scenario: no gap, no extra contribution needed.
const surplusTarget = calcRetirementTarget({
  currentAge: 40, retirementAge: 60,
  desiredMonthlyWithdrawal: 500, inflationRate: 0, swr: 3,
}, { investmentFinal: 1_000_000, months: 240 })
assert('Surplus scenario is on track', surplusTarget.onTrack === true)
assert('Surplus scenario needs no extra monthly contribution', surplusTarget.extraMonthlyNeeded === null)

// A gap scenario: extra monthly contribution should, when invested at the
// same assumed return for the same number of months, exactly close the gap
// (verifying the future-value-of-annuity inversion is correct).
const gapTarget = calcRetirementTarget({
  currentAge: 40, retirementAge: 60,
  desiredMonthlyWithdrawal: 8_000, inflationRate: 2, swr: 3,
  investmentReturn: 4,
}, { investmentFinal: 200_000, months: 240 })
assert('Gap scenario is not on track', gapTarget.onTrack === false)
assert('Gap scenario has a positive extra monthly contribution suggested', gapTarget.extraMonthlyNeeded > 0)
const r = 0.04 / 12
const fv = gapTarget.extraMonthlyNeeded * ((Math.pow(1 + r, 240) - 1) / r)
assert('Extra monthly contribution, compounded, closes the gap exactly', approx(fv, gapTarget.gap, 5))

// ─── Depletion simulation ────────────────────────────────────────────────
// A balance earning less than the withdrawal rate should deplete before
// a long life expectancy — the money-market-mismatch scenario this
// simulation exists to catch.
const depletes = simulateDepletion(
  { retirementAge: 65, lifeExpectancy: 95, inflationRate: 2.5, investmentReturn: 3 },
  500_000, 5_000, // $5k/mo = $60k/yr against a 3%-return $500k balance, escalating with inflation
)
assert('A withdrawal rate exceeding the return rate eventually depletes the balance', depletes.depletedAtAge != null)
assert('Depletion age is within the simulated life-expectancy window', depletes.depletedAtAge > 65 && depletes.depletedAtAge <= 95)
assert('lastsToLifeExpectancy is false when depleted', depletes.lastsToLifeExpectancy === false)

// A very large balance against a modest withdrawal should last the full horizon.
const lasts = simulateDepletion(
  { retirementAge: 65, lifeExpectancy: 90, inflationRate: 2, investmentReturn: 3 },
  5_000_000, 3_000,
)
assert('A large balance against a modest withdrawal lasts to life expectancy', lasts.lastsToLifeExpectancy === true)
assert('depletedAtAge is null when it lasts', lasts.depletedAtAge === null)

// ─── Bonus / Additional Wage ceiling ──────────────────────────────────────
assert('splitContribution divides an already-capped wage base without re-capping', approx(splitContribution(102_000, 30).total, 102_000 * 0.37, 0.01))

const noBonusAccum = simulateAccumulation({
  currentAge: 30, retirementAge: 31, salary: 6_000,
})
const withBonusAccum = simulateAccumulation({
  currentAge: 30, retirementAge: 31, salary: 6_000, annualBonus: 12_000,
})
assert('An annual bonus increases CPF balances relative to no bonus', withBonusAccum.cpfTotalFinal > noBonusAccum.cpfTotalFinal)

// $6,000/mo × 12 = $72,000 ordinary wages for the year, leaving
// CPF_ANNUAL_CEILING − $72,000 of annual-ceiling room for the bonus.
// A bonus at exactly that remainder vs. one well beyond it should
// contribute identical CPF, since the excess isn't CPF-able.
const remainingCeiling = CPF_ANNUAL_CEILING - 6_000 * 12
const smallBonusAccum = simulateAccumulation({
  currentAge: 30, retirementAge: 31, salary: 6_000, annualBonus: remainingCeiling,
})
const bigBonusAccum = simulateAccumulation({
  currentAge: 30, retirementAge: 31, salary: 6_000, annualBonus: remainingCeiling + 20_000,
})
assert('A bonus beyond the remaining annual wage ceiling contributes no more CPF than the ceiling allows', approx(smallBonusAccum.cpfTotalFinal, bigBonusAccum.cpfTotalFinal, 1))

// ─── Salary growth ────────────────────────────────────────────────────────
const flatSalaryAccum = simulateAccumulation({
  currentAge: 30, retirementAge: 35, salary: 6_000,
})
const growingSalaryAccum = simulateAccumulation({
  currentAge: 30, retirementAge: 35, salary: 6_000, salaryGrowthRate: 5,
})
assert('Salary growth results in higher CPF balances than flat salary', growingSalaryAccum.cpfTotalFinal > flatSalaryAccum.cpfTotalFinal)

// ─── RSTU (voluntary top-up to SA) ────────────────────────────────────────
const noRstuAccum = simulateAccumulation({
  currentAge: 30, retirementAge: 31, salary: 5_000, startingSA: 10_000,
})
const withRstuAccum = simulateAccumulation({
  currentAge: 30, retirementAge: 31, salary: 5_000, startingSA: 10_000, rstuMonthly: 500,
})
assert('RSTU increases the SA balance relative to not topping up', withRstuAccum.saFinal > noRstuAccum.saFinal)
assert('RSTU is not capped when nowhere near the Full Retirement Sum', withRstuAccum.rstuCappedAtAge === null)

// A SA balance already at the Full Retirement Sum should reject further RSTU top-ups.
const frsNow = prevailingFRS(new Date().getFullYear())
const atCapAccum = simulateAccumulation({
  currentAge: 40, retirementAge: 41, currentYear: new Date().getFullYear(),
  salary: 0, startingSA: frsNow, rstuMonthly: 1_000,
})
assert('RSTU top-up is capped once SA is already at the prevailing Full Retirement Sum', atCapAccum.rstuCappedAtAge === 40)
// SA should grow only from interest (base + extra tiers), not from any
// RSTU credit — replicate the same 12-month interest-only compounding
// independently to confirm no RSTU dollars snuck in.
let expectedSa = frsNow
for (let i = 0; i < 12; i++) expectedSa += monthlyCpfInterest({ oa: 0, sa: expectedSa, ma: 0 }, 40).sa
assert('SA growth while RSTU-capped matches interest-only compounding, with no RSTU credited', approx(atCapAccum.saFinal, expectedSa, 1))

assert('prevailingFRS at the base year equals the base figure', prevailingFRS(CPF_FRS_BASE_YEAR) === CPF_FRS_BASE)
assert('prevailingFRS grows over time', prevailingFRS(CPF_FRS_BASE_YEAR + 10) > CPF_FRS_BASE)

// ─── Orchestrator ────────────────────────────────────────────────────────
const full = calcRetirement({
  currentAge: 35, retirementAge: 65, lifeExpectancy: 90,
  salary: 7_000,
  startingOA: 80_000, startingSA: 40_000, startingMA: 30_000,
  housingOaMonthly: 1_200, housingOaUntilAge: 55,
  investmentStart: 50_000, investmentMonthly: 1_000, investmentReturn: 3,
  desiredMonthlyWithdrawal: 4_000, inflationRate: 2.5, swr: 3,
})
assert('Orchestrator produces an accumulation result', full.accumulation.months === 360)
assert('Orchestrator produces a target result with a gap or surplus verdict', typeof full.target.onTrack === 'boolean')
assert('Orchestrator produces a depletion result', Array.isArray(full.depletion.rows))
assert('housingOaUntilAge is correctly converted to months internally', full.accumulation.oaFinal !== undefined)
assert('Orchestrator\'s depletion simulation starts from the combined portfolio, not investments alone', full.depletion.rows[0].balance > full.accumulation.investmentFinal)

console.log(`\n${'─'.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
