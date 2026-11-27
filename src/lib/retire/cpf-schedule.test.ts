// CPF contribution + allocation schedule, checked against CPF Board's
// "CPF Allocation Rates from 1 January 2026 / 2027" (private sector) and
// "CPF contribution rates" tables. Ratios × total reproduce each band.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CPF_RATE_SCHEDULE, cpfBandsForYear, contributionRatesForAge, monthlyCpfContribution } from './cpf.ts'

const near = (a: any, b: any, tol = 0.0006) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`)

// [minAge, maxAge, total, employee, OA ratio, SA/RA ratio, MA ratio] — official.
const OFFICIAL = {
  2026: [
    [0, 35, 0.37, 0.20, 0.6217, 0.1621, 0.2162],
    [35, 45, 0.37, 0.20, 0.5677, 0.1891, 0.2432],
    [45, 50, 0.37, 0.20, 0.5136, 0.2162, 0.2702],
    [50, 55, 0.37, 0.20, 0.4055, 0.3108, 0.2837],
    [55, 60, 0.34, 0.18, 0.353, 0.3382, 0.3088],
    [60, 65, 0.25, 0.125, 0.14, 0.44, 0.42],
    [65, 70, 0.165, 0.075, 0.0607, 0.303, 0.6363],
    [70, 999, 0.125, 0.05, 0.08, 0.08, 0.84],
  ],
  2027: [
    [0, 35, 0.37, 0.20, 0.6217, 0.1621, 0.2162],
    [35, 45, 0.37, 0.20, 0.5677, 0.1891, 0.2432],
    [45, 50, 0.37, 0.20, 0.5136, 0.2162, 0.2702],
    [50, 55, 0.37, 0.20, 0.4055, 0.3108, 0.2837],
    [55, 60, 0.355, 0.19, 0.3382, 0.3661, 0.2957],
    [60, 65, 0.26, 0.13, 0.1347, 0.4615, 0.4038],
    [65, 70, 0.165, 0.075, 0.0607, 0.303, 0.6363],
    [70, 999, 0.125, 0.05, 0.08, 0.08, 0.84],
  ],
}

for (const [year, rows] of Object.entries(OFFICIAL)) {
  test(`${year} bands match CPF Board's allocation ratios`, () => {
    const bands = cpfBandsForYear(Number(year))
    assert.equal(bands.length, rows.length)
    rows.forEach(([minAge, maxAge, total, employee, oaR, saR, maR], i) => {
      const b = bands[i]
      assert.deepEqual([b.minAge, b.maxAge], [minAge, maxAge])
      near(b.total, total); near(b.employee, employee)
      near(b.oa, oaR * total); near(b.sa, saR * total); near(b.ma, maR * total)
      near(b.oa + b.sa + b.ma, b.total, 1e-9)
    })
  })
}

test('the schedule switches on 1 January 2027 and holds afterwards', () => {
  assert.equal(contributionRatesForAge(58, 2026).total, 0.34)
  assert.equal(contributionRatesForAge(58, 2027).total, 0.355)
  assert.equal(contributionRatesForAge(58, 2040).total, 0.355)
  assert.equal(contributionRatesForAge(58, 2020).total, 0.34) // before the schedule: earliest entry
  assert.deepEqual(CPF_RATE_SCHEDULE.map((e) => e.from), [2026, 2027])
})

test('a 40-year-old on S$5,000 now gets the 35-45 split, not the under-35 one', () => {
  const c = monthlyCpfContribution(5000, 40, 2026)
  near(c.total, 1850, 1e-6); near(c.oa, 1050, 1e-6); near(c.sa, 350, 1e-6); near(c.ma, 450, 1e-6)
})

test('65-70 credits OA 1 / RA 5 / MA 10.5 (was OA 3.5 / SA 2.5)', () => {
  const c = monthlyCpfContribution(4000, 67, 2026)
  near(c.oa, 40, 1e-6); near(c.sa, 200, 1e-6); near(c.ma, 420, 1e-6)
})
