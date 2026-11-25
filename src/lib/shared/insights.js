// src/lib/shared/insights.js
// Cross-tool insights for the home dashboard (super-app plan U10).
//
// Each rule is pure: it looks at the active profile's numbers, decides
// whether it applies, and states ONE calculated fact with a link to the
// tool that shows the working. Rules never recommend a product or tell
// the user what to do (KD3: arithmetic, not advice); insights.test.js
// fails on advice wording.

import { buildBaselineState, calcTDSR, TDSR_LIMIT } from '../ledger/calc.js'
import { SRS_CAP_CITIZEN_PR } from '../tax/calc.js'

const DAY = 86_400_000
const money = (n) => `S$${Math.round(n).toLocaleString('en-SG')}`

/**
 * @typedef {Object} Insight
 * @property {string} id
 * @property {number} priority   higher shows first
 * @property {string} title      short headline
 * @property {string} fact       one sentence of arithmetic
 * @property {string} toolId     registry id, for the icon
 * @property {string} href       where the working is shown
 * @property {string} linkLabel
 */

export const RULES = [
  {
    id: 'tdsr-headroom',
    applies: (d, s) => calcTDSR(s).tdsr != null && calcTDSR(s).obligations > 0,
    build: (d, s) => {
      const { tdsr, obligations } = calcTDSR(s)
      const headroom = TDSR_LIMIT * s.salary - obligations
      const pct = Math.round(tdsr * 100)
      if (headroom <= 0) {
        return {
          priority: 90,
          title: `Loans take ${pct}% of your gross income`,
          fact: `That is above the ${Math.round(TDSR_LIMIT * 100)}% TDSR limit banks apply, so a new loan would not pass their check at today's numbers.`,
        }
      }
      return {
        priority: tdsr > 0.4 ? 80 : 40,
        title: `${money(headroom)}/mo of TDSR room left`,
        fact: `Your loans take ${pct}% of gross income. Banks cap total debt repayments at ${Math.round(TDSR_LIMIT * 100)}%, which leaves about ${money(headroom)} a month for any new loan.`,
      }
    },
    toolId: 'drive', href: '/ledger', linkLabel: 'See every loan together',
  },
  {
    id: 'srs-per-thousand',
    applies: (d) => (d.tax?.marginalRate || 0) > 0,
    build: (d) => {
      const rate = d.tax.marginalRate
      return {
        priority: 60,
        title: `Each S$1,000 of SRS lowers your tax by about ${money(rate * 10)}`,
        fact: `At your ${rate}% marginal rate, SRS contributions reduce chargeable income dollar for dollar, up to ${money(SRS_CAP_CITIZEN_PR)} a year for citizens and PRs. Crossing into a lower bracket changes the figure.`,
      }
    },
    toolId: 'tax', href: '/tax', linkLabel: 'Price every relief in TaxWise',
  },
  {
    id: 'insurance-recheck',
    applies: (d, s, now) => !!d.insure?.savedAt && now - d.insure.savedAt > 365 * DAY,
    build: (d, s, now) => {
      const months = Math.round((now - d.insure.savedAt) / (30.4 * DAY))
      return {
        priority: 70,
        title: 'Your Insurance Score is over a year old',
        fact: `It was last worked out ${months} months ago. Cover needs move with income, loans and dependants, so the gaps may have changed since.`,
      }
    },
    toolId: 'insure', href: '/insure/check', linkLabel: 'Re-run the 3-minute check',
  },
  {
    id: 'living-costs-missing',
    applies: (d, s) => s.salary > 0 && !(s.livingExpenses > 0),
    build: () => ({
      priority: 50,
      title: '"Free to invest" counts no living costs yet',
      fact: 'Until monthly spending is added, the figure is take-home pay minus loans and premiums only, which overstates what is really left each month.',
    }),
    toolId: 'ledger', href: '/ledger', linkLabel: 'Add spending in MyLedger',
  },
]

/**
 * Up to `limit` insights for the profile, highest priority first.
 * @param {object} myNumbers
 * @param {{ now?: number, limit?: number }} [opts]
 * @returns {Insight[]}
 */
export function buildInsights(myNumbers, { now = Date.now(), limit = 3 } = {}) {
  const d = myNumbers || {}
  const s = buildBaselineState(d)
  return RULES
    .filter((r) => r.applies(d, s, now))
    .map((r) => ({ id: r.id, toolId: r.toolId, href: r.href, linkLabel: r.linkLabel, ...r.build(d, s, now) }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
}
