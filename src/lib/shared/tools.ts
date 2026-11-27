// src/lib/shared/tools.ts
// The single source of truth for which tools natdtm ships. The home page,
// the shell header's tool switcher, the shell footer (the-math links and
// per-vertical disclaimers) and the sitemap all read from here; no other
// shell file lists the tools (enforced by tools.test.js).
//
// Plain data only — no JSX, no React — so it is safe to import from server
// components, route handlers (sitemap.js) and the pure calc engines alike.
// Icons are referenced by `id` and drawn by components/shared/ToolIcon.js.

/**
 * @typedef {Object} Tool
 * @property {string} id         stable key; also the "My Numbers" profile slot name
 * @property {string} name       product name (InsureCheck, DriveReady, …)
 * @property {string} label      short label used in the switcher and footer
 * @property {string} eyebrow    home-card eyebrow
 * @property {string} route      landing route
 * @property {string} mathRoute  methodology page route
 * @property {string} desc       one-paragraph home-card description
 * @property {string} disclaimer the vertical's regulatory disclaimer (footer)
 * @property {{path: string, priority: number}[]} sitemap  routes beyond
 *           the landing (0.9) and the-math (0.8) pages
 */
export type Tool = {
  id: string
  name: string
  label: string
  eyebrow: string
  route: string
  mathRoute: string
  desc: string
  disclaimer: string
  sitemap: {path: string, priority: number}[]
  [key: string]: any
}

/** @type {Tool[]} */
export const TOOLS = [
  {
    id: 'insure',
    name: 'InsureCheck',
    label: 'Insure',
    eyebrow: 'Insure',
    route: '/insure',
    mathRoute: '/insure/the-math',
    desc: 'A free, 3-minute Insurance Score. See your critical illness, life/TPD, and hospitalisation gaps in real dollars, not jargon.',
    disclaimer: 'InsureCheck: educational tool only, not financial advice. Coverage benchmarks are based on general Singapore financial planning guidelines. Consult a MAS-licensed financial adviser for personal recommendations. Not affiliated with any insurer or MAS-licensed entity.',
    sitemap: [{ path: '/insure/check', priority: 0.9 }],
  },
  {
    id: 'drive',
    name: 'DriveReady',
    label: 'Drive',
    eyebrow: 'Drive',
    route: '/drive',
    mathRoute: '/drive/the-math',
    desc: 'Singapore car affordability calculator. Know your true monthly cost (instalment, PARF/COE depreciation and TDSR) before you commit.',
    disclaimer: 'DriveReady: educational tool only, not financial advice. Car prices are sourced monthly from the LTA Car Cost Update and are indicative only, so always verify with the dealer. COE premiums are sourced from data.gov.sg\'s mirror of LTA\'s COE Bidding Results dataset. Not affiliated with any insurer or MAS-licensed entity.',
    sitemap: [
      { path: '/drive/coe-explained', priority: 0.7 },
      { path: '/drive/renew-or-replace', priority: 0.7 },
    ],
  },
  {
    id: 'etf',
    name: 'WhatETF',
    label: 'Invest',
    eyebrow: 'Invest',
    route: '/etf',
    mathRoute: '/etf/the-math',
    desc: 'Build an illustrative ETF portfolio for Singapore investors. UCITS-aware, tax-efficient and DCA-ready. It runs entirely in your browser.',
    disclaimer: 'WhatETF: educational tool only, not financial advice. Portfolios shown are illustrative examples. Consult a MAS-licensed financial adviser before making investment decisions. Not affiliated with any broker or MAS-licensed entity.',
    sitemap: [
      { path: '/etf/preferences', priority: 0.9 },
      { path: '/etf/compare', priority: 0.6 },
      { path: '/etf/portfolio', priority: 0.6 },
      { path: '/etf/rebalance', priority: 0.6 },
      { path: '/etf/learn', priority: 0.7 },
    ],
  },
  {
    id: 'house',
    name: 'HouseMuch',
    label: 'House',
    eyebrow: 'House',
    route: '/house',
    mathRoute: '/house/the-math',
    desc: 'What did your house really make you? True profit/loss after CPF refund, mortgage interest and stamp duties, not just sale minus purchase.',
    disclaimer: 'HouseMuch: educational tool only, not financial or legal advice. Stamp duty and CPF accrued interest figures are estimates based on public formulas and may not reflect the latest rates. Verify with IRAS, CPF Board, and a conveyancing lawyer before making any property decision. Not affiliated with HDB, CPF Board, or IRAS.',
    sitemap: [],
  },
  {
    id: 'retire',
    name: 'RetireWell',
    label: 'Retire',
    eyebrow: 'Retire',
    route: '/retire',
    mathRoute: '/retire/the-math',
    desc: 'Will you actually have enough? CPF contributions projected properly, your investments stress-tested against a safe withdrawal rate, not a rule of thumb.',
    disclaimer: 'RetireWell: educational tool only, not financial advice. CPF contribution/interest figures are estimates based on public formulas and may not reflect the latest rates. Safe withdrawal rate and investment return assumptions are not guaranteed. Consult a MAS-licensed financial adviser before making any retirement decision. Not affiliated with CPF Board or MAS.',
    sitemap: [],
  },
  {
    id: 'tax',
    name: 'TaxWise',
    label: 'Tax',
    eyebrow: 'Tax',
    route: '/tax',
    mathRoute: '/tax/the-math',
    desc: 'What you actually owe IRAS, and what each relief is really worth. CPF, SRS and CPF top-up relief priced in dollars saved, not percentages.',
    disclaimer: 'TaxWise: educational tool only, not tax advice. Rates and relief caps are entered by hand from public IRAS schedules and may not reflect the latest Budget changes or any Personal Income Tax Rebate. Non-residents are not modeled. Verify at iras.gov.sg or consult a tax adviser before filing. Not affiliated with IRAS or CPF Board.',
    sitemap: [],
  },
  {
    id: 'ledger',
    name: 'MyLedger',
    label: 'MyLedger',
    eyebrow: 'Everything',
    route: '/ledger',
    mathRoute: '/ledger/the-math',
    desc: 'Your whole picture at once: net worth, debt servicing across every loan, and what buying a car or upgrading your house does to your retirement.',
    disclaimer: 'MyLedger: educational tool only, not financial advice. Net worth, TDSR, retirement projections, and the built-in Capacity module\'s CPF/cash split and living-expense figures are estimates built from figures you enter or sync from the other tools, and may not reflect your actual financial position. Consult a MAS-licensed financial adviser before making any financial decision.',
    sitemap: [],
  },
]

/** Number of tools, for copy such as "Seven calculators". */
export const TOOL_COUNT = TOOLS.length

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

/** "Seven" for 7 — keeps hero copy in step with the registry. */
export function toolCountWord(n = TOOL_COUNT) {
  return NUMBER_WORDS[n] ?? String(n)
}

/** @param {string} id */
export function getTool(id: string) {
  return TOOLS.find((t) => t.id === id) ?? null
}

/**
 * The tool whose route tree contains `pathname`, or null (home, /lab, 404).
 * @param {string | null | undefined} pathname
 */
export function getToolByPath(pathname: string | null | undefined) {
  if (!pathname) return null
  return TOOLS.find((t) => pathname === t.route || pathname.startsWith(t.route + '/')) ?? null
}

/** Every tool route the sitemap should list, home first. */
export function sitemapRoutes() {
  return [
    { path: '/', priority: 1 },
    ...TOOLS.flatMap((t) => [
      { path: t.route, priority: 0.9 },
      ...t.sitemap,
      { path: t.mathRoute, priority: 0.8 },
    ]),
  ]
}
