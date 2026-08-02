// ─── ETF DATABASE ─────────────────────────────────────────────────────────────
// ter = total expense ratio (annual fund cost, %) — published by the fund
// managers on their factsheets. Used only to illustrate blended portfolio cost.
export const ETFS = {
  VWRA: { ticker:'VWRA', name:'Vanguard FTSE All-World UCITS ETF',      region:'Global',             ter:0.22, description:'Broad diversification across developed and emerging markets globally — 3,700+ companies.' },
  CSPX: { ticker:'CSPX', name:'iShares Core S&P 500 UCITS ETF',         region:'United States',      ter:0.07, description:'Exposure to the 500 largest US companies. The bedrock of most growth portfolios.' },
  EIMI: { ticker:'EIMI', name:'iShares Core MSCI EM IMI UCITS ETF',     region:'Emerging Markets',   ter:0.18, description:'Broad exposure to emerging market companies across Asia, Latin America, and beyond.' },
  VJPW: { ticker:'VJPW', name:'Vanguard FTSE Japan UCITS ETF',          region:'Japan',              ter:0.15, description:'Focused exposure to the Japanese stock market — the world\'s third-largest economy.' },
  WSML: { ticker:'WSML', name:'iShares MSCI World Small Cap UCITS ETF', region:'Global Small Cap',   ter:0.35, description:'Small-cap companies in developed markets. Higher growth potential, higher volatility.' },
  HMCH: { ticker:'HMCH', name:'HSBC MSCI China UCITS ETF',              region:'China / Hong Kong',  ter:0.28, description:'Exposure to large and mid-cap Chinese companies. High growth potential, elevated risk.' },
  VUSA: { ticker:'VUSA', name:'Vanguard S&P 500 UCITS ETF',             region:'United States',      ter:0.07, description:'Low-cost S&P 500 exposure. Slightly lower TER than CSPX. Distributing version available.' },
  AGGU: { ticker:'AGGU', name:'iShares Core Global Aggregate Bond UCITS ETF', region:'Global Bonds', ter:0.10, description:'Broad investment-grade government and corporate bonds, USD-hedged. Ballast that cushions equity drawdowns.' },
}

// ─── LOOK-THROUGH COMPOSITION ─────────────────────────────────────────────────
// Approximate regional breakdown of each fund's underlying holdings, so we can
// show the TRUE de-duplicated exposure of a portfolio rather than naive fund
// weights. VWRA already contains the US, Japan, EM and China — stacking regional
// satellites on top double-counts, and this surfaces that.
const COMPOSITION = {
  VWRA: { 'United States':0.60, 'Other Developed':0.235, 'Japan':0.06, 'Emerging Markets':0.07, 'China / Hong Kong':0.035 },
  CSPX: { 'United States':1.0 },
  VUSA: { 'United States':1.0 },
  EIMI: { 'Emerging Markets':0.73, 'China / Hong Kong':0.27 },
  VJPW: { 'Japan':1.0 },
  WSML: { 'United States':0.60, 'Other Developed':0.29, 'Japan':0.11 },
  HMCH: { 'China / Hong Kong':1.0 },
  AGGU: { 'Global Bonds':1.0 },
}

// ─── ILLUSTRATIVE HISTORICAL RETURNS (for chart simulation) ─────────────────
export const RETURNS_AS_OF = 'mid-2025'
const RETURNS = {
  VWRA: { y1:0.14,  m6:0.06,  w1:0.003  },
  CSPX: { y1:0.22,  m6:0.09,  w1:0.005  },
  EIMI: { y1:0.08,  m6:0.03,  w1:0.001  },
  VJPW: { y1:0.10,  m6:0.04,  w1:0.002  },
  WSML: { y1:0.09,  m6:0.03,  w1:0.001  },
  HMCH: { y1:-0.04, m6:-0.01, w1:-0.001 },
  VUSA: { y1:0.22,  m6:0.09,  w1:0.005  },
  AGGU: { y1:0.03,  m6:0.015, w1:0.0005 },
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
// Guarantee allocations sum to exactly 100, absorbing any rounding remainder
// into the largest holding. Keeps the logic tamper-proof if weights are tweaked.
export function normalizeTo100(allocations) {
  if (!allocations.length) return allocations
  const total = allocations.reduce((s, a) => s + a.percentage, 0)
  if (total !== 100) {
    let idx = 0
    allocations.forEach((a, i) => { if (a.percentage > allocations[idx].percentage) idx = i })
    allocations[idx].percentage += (100 - total)
  }
  return allocations
}

// Weighted average annual expense ratio across all holdings, plus what that
// costs in dollar terms over a horizon assuming a flat monthly contribution.
export function computeBlendedTER(allocations) {
  const pct = allocations.reduce((s, a) => s + (a.percentage / 100) * a.etf.ter, 0)
  return Math.round(pct * 1000) / 1000
}

// escalatorPct raises the monthly contribution by that percentage at the
// start of every subsequent year (a raise-and-invest-it habit), rather than
// holding it flat for the whole horizon.
export function estimateFeeCost(blendedTerPct, monthlyAmount, years, annualGrowthPct = 6, escalatorPct = 0) {
  if (!monthlyAmount || monthlyAmount <= 0) return null
  const months = years * 12
  const grossMonthlyRate = Math.pow(1 + annualGrowthPct / 100, 1 / 12) - 1
  const netMonthlyRate = Math.pow(1 + (annualGrowthPct - blendedTerPct) / 100, 1 / 12) - 1
  let gross = 0, net = 0, currentAmount = monthlyAmount
  for (let i = 0; i < months; i++) {
    if (i > 0 && i % 12 === 0) currentAmount *= (1 + escalatorPct / 100)
    gross = (gross + currentAmount) * (1 + grossMonthlyRate)
    net = (net + currentAmount) * (1 + netMonthlyRate)
  }
  return { gross: Math.round(gross), net: Math.round(net), cost: Math.round(gross - net) }
}

// True regional exposure after looking through each fund's holdings.
export function computeLookThrough(allocations) {
  const buckets = {}
  allocations.forEach(a => {
    const comp = COMPOSITION[a.etf.ticker] || { 'Other Developed': 1 }
    Object.entries(comp).forEach(([region, frac]) => {
      buckets[region] = (buckets[region] || 0) + a.percentage * frac
    })
  })
  return Object.entries(buckets)
    .map(([region, pct]) => ({ region, percentage: Math.round(pct * 10) / 10 }))
    .filter(b => b.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage)
}

// ─── PORTFOLIO GENERATOR ─────────────────────────────────────────────────────
export function generatePortfolio(prefs) {
  let allocations = [], title = '', description = '', whyItWorks = ''

  if (prefs.simplicity === '1 ETF') {
    title = 'The Ultimate Simplicity'
    description = 'A single-fund solution that covers the entire world.'
    allocations = [{ etf: ETFS.VWRA, percentage: 100 }]
    whyItWorks = 'VWRA provides instant diversification across 3,700+ companies globally. It is the gold standard for "set and forget" investing in Singapore due to its tax efficiency (UCITS, Ireland-domiciled) and broad coverage. One fund. One monthly buy. Done. Note: a single all-equity fund cannot be tailored by risk level or region — choose 2–3 ETFs to add a bond cushion or regional tilts.'

  } else if (prefs.simplicity === '2-3 ETFs') {
    title = 'The Core & Satellite Approach'
    description = 'A robust global core with targeted exposure to your preferred regions.'
    const isCons = prefs.risk === 'Conservative'
    const bondWeight = isCons ? 25 : 0
    const coreWeight = isCons ? 55 : prefs.risk === 'Growth' ? 60 : 70
    const satelliteWeight = 100 - bondWeight - coreWeight
    if (bondWeight > 0) allocations.push({ etf: ETFS.AGGU, percentage: bondWeight })
    allocations.push({ etf: ETFS.VWRA, percentage: coreWeight })
    if (prefs.tilts.length > 0) {
      const w = Math.floor(satelliteWeight / prefs.tilts.length)
      prefs.tilts.forEach(tilt => {
        if      (tilt === 'United States')       allocations.push({ etf: ETFS.CSPX, percentage: w })
        else if (tilt === 'Emerging Markets')    allocations.push({ etf: ETFS.EIMI, percentage: w })
        else if (tilt === 'Japan')               allocations.push({ etf: ETFS.VJPW, percentage: w })
        else if (tilt === 'China / Hong Kong')   allocations.push({ etf: ETFS.HMCH, percentage: w })
      })
    } else {
      allocations.push({ etf: ETFS.CSPX, percentage: satelliteWeight })
    }
    const bondNote = bondWeight > 0 ? ` A ${bondWeight}% global bond sleeve (AGGU) cushions drawdowns to match your conservative risk preference.` : ''
    whyItWorks = `By combining a global core (VWRA) with targeted satellites, you maintain broad diversification while tilting towards ${prefs.tilts.length > 0 ? prefs.tilts.join(' and ') : 'the US market'}. This approach balances stability with your specific market convictions.${bondNote}`

  } else {
    title = 'The Precision Portfolio'
    description = 'Granular control over global, regional, and factor exposures.'
    let bondW=0, gW=40, usW=30, emW=15, scW=10, otW=5
    if (prefs.risk === 'Conservative') { bondW=25; gW=40; usW=15; emW=10; scW=5; otW=5 }
    // otW must stay > 0 here too, or a Growth-risk user's Japan/China tilt
    // selection is silently dropped entirely below (the otW > 0 gate never
    // runs) while a Balanced/Conservative user's identical selection is honored.
    if (prefs.risk === 'Growth')       { bondW=0;  gW=25; usW=40; emW=20; scW=10; otW=5 }
    if (bondW > 0) allocations.push({ etf: ETFS.AGGU, percentage: bondW })
    allocations.push({ etf: ETFS.VWRA, percentage: gW })
    allocations.push({ etf: ETFS.CSPX, percentage: usW })
    allocations.push({ etf: ETFS.EIMI, percentage: emW })
    allocations.push({ etf: ETFS.WSML, percentage: scW })
    // Split the "other tilt" slice evenly across every tilt the user
    // selected — an if/else-if chain here would silently honor only the
    // first match, dropping any other selected region with no indication
    // (e.g. selecting both China and Japan used to give the whole slice
    // to Japan alone). US/EM already have their own dedicated usW/emW
    // slots, so their share of otW tops those up rather than creating a
    // separate line; Japan/China get a new line each.
    if (otW > 0) {
      if (prefs.tilts.length > 0) {
        const perTilt = otW / prefs.tilts.length
        prefs.tilts.forEach(tilt => {
          if      (tilt === 'Japan')             allocations.push({ etf: ETFS.VJPW, percentage: perTilt })
          else if (tilt === 'China / Hong Kong') allocations.push({ etf: ETFS.HMCH, percentage: perTilt })
          else if (tilt === 'United States')     allocations.find(a => a.etf.ticker === 'CSPX').percentage += perTilt
          else if (tilt === 'Emerging Markets')  allocations.find(a => a.etf.ticker === 'EIMI').percentage += perTilt
        })
      } else {
        allocations.find(a => a.etf.ticker === 'VWRA').percentage += otW
      }
    }
    const bondNote = bondW > 0 ? ' A global bond sleeve (AGGU) is included to temper volatility for your conservative risk preference.' : ''
    whyItWorks = `This portfolio breaks down global exposure into specific building blocks, allowing you to overweight regions or factors (like small caps) while ensuring no single country dominates your entire wealth.${bondNote}`
  }

  return { title, description, allocations: normalizeTo100(allocations), whyItWorks }
}

// ─── SEEDED PRNG (stable chart noise) ─────────────────────────────────────────
function hashSeed(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h ^= h >>> 16
  return h >>> 0
}
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── ILLUSTRATIVE PERFORMANCE CHART DATA ─────────────────────────────────────
export function generateIllustrativePerformance(allocations, timeframe) {
  const steps = timeframe === '1y' ? 52 : timeframe === '6m' ? 26 : 7
  const volatility = timeframe === '1w' ? 0.005 : 0.015

  // Deterministic noise: same portfolio + timeframe always draws the same line,
  // so toggling ranges doesn't reshuffle the chart.
  const rand = mulberry32(hashSeed(allocations.map(a => a.etf.ticker).join('-') + '|' + timeframe))

  // Weighted return for the period
  let totalPeriodReturn = 1
  allocations.forEach(a => {
    const r = RETURNS[a.etf.ticker] || RETURNS.VWRA
    const periodReturn = timeframe === '1y' ? r.y1 : timeframe === '6m' ? r.m6 : r.w1
    totalPeriodReturn += (a.percentage / 100) * periodReturn
  })

  const startValue = 10000
  const targetEnd = startValue * totalPeriodReturn
  const stepReturn = Math.pow(totalPeriodReturn, 1/steps)
  const points = []
  let current = startValue

  for (let i = 0; i <= steps; i++) {
    const now = new Date()
    let dateLabel = ''
    if (timeframe === '1y') {
      const d = new Date(now); d.setDate(d.getDate() - (52-i)*7)
      dateLabel = i % 4 === 0 ? d.toLocaleString('default',{month:'short'}) : ''
    } else if (timeframe === '6m') {
      const d = new Date(now); d.setDate(d.getDate() - (26-i)*7)
      dateLabel = i % 4 === 0 ? d.toLocaleString('default',{month:'short'}) : ''
    } else {
      const d = new Date(now); d.setDate(d.getDate() - (7-i))
      dateLabel = d.toLocaleString('default',{weekday:'short'})
    }
    points.push({ date: dateLabel, value: Math.round(current) })
    const noise = 1 + (rand() - 0.5) * volatility
    current = current * stepReturn * noise
  }

  // Scale to hit target
  const scale = targetEnd / points[points.length-1].value
  points.forEach(p => p.value = Math.round(p.value * scale))
  return points
}

// ─── HISTORICAL ANNUAL BACKTEST ───────────────────────────────────────────────
// Approximate calendar-year total returns (USD) of each fund's underlying
// index, 2015–2024. These are real historical index sequences (the actual
// up/down pattern markets went through), not synthetic noise — unlike the
// short-term chart above. They're still approximate and for illustration:
// we don't have a live data feed, and fund NAV returns differ slightly from
// the underlying index due to tracking difference and fees.
export const BACKTEST_YEARS = [2015,2016,2017,2018,2019,2020,2021,2022,2023,2024]
const ANNUAL_RETURNS = {
  VWRA: [-0.024, 0.079, 0.240, -0.094, 0.266, 0.163, 0.185, -0.184, 0.222, 0.175],
  CSPX: [ 0.014, 0.120, 0.218, -0.044, 0.315, 0.184, 0.287, -0.181, 0.263, 0.250],
  VUSA: [ 0.014, 0.120, 0.218, -0.044, 0.315, 0.184, 0.287, -0.181, 0.263, 0.250],
  EIMI: [-0.149, 0.112, 0.373, -0.146, 0.184, 0.183, -0.025, -0.201, 0.098, 0.075],
  VJPW: [ 0.096, 0.024, 0.244, -0.126, 0.196, 0.145, 0.017, -0.167, 0.208, 0.083],
  WSML: [-0.006, 0.127, 0.254, -0.142, 0.254, 0.140, 0.162, -0.184, 0.157, 0.090],
  HMCH: [-0.076, 0.011, 0.541, -0.187, 0.235, 0.295, -0.217, -0.219, -0.110, 0.190],
  AGGU: [ 0.006, 0.039, 0.030, -0.005, 0.068, 0.056, -0.014, -0.112, 0.057, 0.030],
}

// Year-by-year portfolio value from a lump sum, using each fund's real
// historical annual sequence weighted by allocation.
export function computeBacktest(allocations, startValue = 10000) {
  let value = startValue
  const points = [{ year: BACKTEST_YEARS[0] - 1, value: startValue }]
  BACKTEST_YEARS.forEach((year, i) => {
    let yearReturn = 0
    allocations.forEach(a => {
      const series = ANNUAL_RETURNS[a.etf.ticker] || ANNUAL_RETURNS.VWRA
      yearReturn += (a.percentage / 100) * series[i]
    })
    value = value * (1 + yearReturn)
    points.push({ year, value: Math.round(value) })
  })
  return points
}

// ─── GOAL PROJECTOR ────────────────────────────────────────────────────────────
// Projects a monthly DCA contribution forward under three growth scenarios,
// net of the portfolio's blended TER. "Expected" is derived from this specific
// portfolio's own approximate 2015–2024 historical CAGR (so a bond-heavy
// Conservative mix projects lower than an all-equity Growth mix); pessimistic
// and optimistic are +/-5 percentage-point bands around that, not statistical
// confidence intervals — there's no way to derive real ones from ten years of
// approximate data, and we say so in the UI.
// escalatorPct (default 0) raises the monthly contribution by that % at the
// start of each subsequent year — modeling "give yourself a raise every
// year and invest the increase" rather than a flat contribution forever.
export function projectGoal(allocations, monthlyAmount, years, blendedTerPct, escalatorPct = 0) {
  if (!monthlyAmount || monthlyAmount <= 0 || !years || years <= 0) return null

  const backtestPoints = computeBacktest(allocations)
  const backtestYears = backtestPoints.length - 1
  const start = backtestPoints[0].value
  const end = backtestPoints[backtestPoints.length - 1].value
  const expectedGrowthPct = (Math.pow(end / start, 1 / backtestYears) - 1) * 100

  const scenarios = [
    { key: 'pessimistic', label: 'Pessimistic', growthPct: Math.max(expectedGrowthPct - 5, 0.5) },
    { key: 'expected',    label: 'Expected',     growthPct: expectedGrowthPct },
    { key: 'optimistic',  label: 'Optimistic',   growthPct: expectedGrowthPct + 5 },
  ]

  return scenarios.map(s => {
    const result = estimateFeeCost(blendedTerPct, monthlyAmount, years, s.growthPct, escalatorPct)
    return { key: s.key, label: s.label, growthPct: Math.round(s.growthPct * 10) / 10, projected: result ? result.net : 0 }
  })
}

// ─── DRAWDOWN STRESS TEST ──────────────────────────────────────────────────────
// Rather than a synthetic "what if the market crashes" number, this replays
// this specific portfolio's real blended 2015–2024 sequence to find its
// actual worst calendar year and largest peak-to-trough drawdown within that
// window. It's a rehearsal, not a prediction — a future downturn could easily
// be worse than anything in this ten-year sample.
export function computeStressTest(allocations, startingValue = 10000) {
  const points = computeBacktest(allocations, startingValue)

  let peakValue = points[0].value
  let troughValue = points[0].value
  let maxDrawdownPct = 0
  points.forEach(p => {
    if (p.value > peakValue) peakValue = p.value
    const drawdownPct = (p.value - peakValue) / peakValue
    if (drawdownPct < maxDrawdownPct) {
      maxDrawdownPct = drawdownPct
      troughValue = p.value
    }
  })

  const yearReturns = BACKTEST_YEARS.map((year, i) => {
    let r = 0
    allocations.forEach(a => {
      const series = ANNUAL_RETURNS[a.etf.ticker] || ANNUAL_RETURNS.VWRA
      r += (a.percentage / 100) * series[i]
    })
    return { year, returnPct: Math.round(r * 1000) / 10 }
  })
  const worstYear = yearReturns.reduce((w, c) => (c.returnPct < w.returnPct ? c : w), yearReturns[0])

  return {
    worstYear,
    maxDrawdownPct: Math.round(maxDrawdownPct * 1000) / 10,
    peakValue: Math.round(peakValue),
    troughValue: Math.round(troughValue),
    startingValue,
  }
}

// ─── BROKER COST COMPARISON ───────────────────────────────────────────────────
// Illustrative, approximate commission + FX conversion assumptions per
// broker, applied to the user's actual DCA amount. These are rough, dated
// estimates for illustration — not live rates, and brokers change pricing
// and product availability often. Always verify directly with the broker.
export const BROKER_DATA_AS_OF = 'mid-2025'
export const BROKERS = [
  { id:'ibkr',   name:'Interactive Brokers', commissionPct:0.05, commissionMin:1,    fxSpreadPct:0.03, note:'Often the lowest all-in cost for regular DCA; tiered/IBKR Lite pricing varies by volume.' },
  { id:'moomoo', name:'moomoo',              commissionPct:0.03, commissionMin:0,    fxSpreadPct:0.05, note:'Frequently runs $0-commission promotions; FX conversion still applies. Check current terms and product availability.' },
  { id:'tiger',  name:'Tiger Brokers',       commissionPct:0.08, commissionMin:2.88, fxSpreadPct:0.05, note:'Commission-free promotions are common for a limited period or trade count.' },
  { id:'saxo',   name:'Saxo Markets',        commissionPct:0.08, commissionMin:5,    fxSpreadPct:0.05, note:'Higher headline commission but broad fund access and SGD-denominated accounts.' },
]

export function computeBrokerCosts(monthlyAmount) {
  if (!monthlyAmount || monthlyAmount <= 0) return null
  return BROKERS.map(b => {
    const commission = Math.max(monthlyAmount * (b.commissionPct / 100), b.commissionMin)
    const fx = monthlyAmount * (b.fxSpreadPct / 100)
    const perTradeCost = Math.round((commission + fx) * 100) / 100
    return { ...b, perTradeCost, annualCost: Math.round(perTradeCost * 12 * 100) / 100 }
  }).sort((a, b) => a.annualCost - b.annualCost)
}

// ─── DIY vs ROBO-ADVISOR vs UNIT TRUST FEE COMPARISON ─────────────────────────
// Compares this portfolio's blended TER against typical all-in fee levels for
// a robo-advisor and an actively-managed unit trust, compounded at the same
// assumed growth rate so the entire gap is attributable to fees, not
// performance — an apples-to-apples cost comparison, not a returns claim.
export const FEE_BENCHMARK_AS_OF = 'mid-2025'
export function computeFeeComparison(blendedTerPct, monthlyAmount, years, annualGrowthPct = 6) {
  if (!monthlyAmount || monthlyAmount <= 0 || !years || years <= 0) return null
  const levels = [
    { key:'diy',        label:'This DIY portfolio',              terPct: blendedTerPct },
    { key:'robo',        label:'Typical robo-advisor',            terPct: 0.75 },
    { key:'unittrust',   label:'Typical actively-managed unit trust', terPct: 1.75 },
  ]
  return levels.map(l => {
    const result = estimateFeeCost(l.terPct, monthlyAmount, years, annualGrowthPct)
    return { key: l.key, label: l.label, terPct: l.terPct, net: result ? result.net : 0 }
  })
}

// ─── PORTFOLIO SUMMARY (for comparison mode) ──────────────────────────────────
// Bundles the numbers used to compare two portfolios side by side.
export function summarizePortfolio(prefs) {
  const portfolio = generatePortfolio(prefs)
  const ter = computeBlendedTER(portfolio.allocations)
  const backtest = computeBacktest(portfolio.allocations)
  const backtestYears = backtest.length - 1
  const cagrPct = (Math.pow(backtest[backtest.length - 1].value / backtest[0].value, 1 / backtestYears) - 1) * 100
  const stress = computeStressTest(portfolio.allocations)
  return { prefs, portfolio, ter, cagrPct: Math.round(cagrPct * 10) / 10, stress }
}

// ─── SHAREABLE URL ENCODING ────────────────────────────────────────────────────
// Prefs are small and fully re-derive the portfolio, so we round-trip them
// through the URL query string instead of requiring sessionStorage — a
// portfolio can be bookmarked, shared, or reopened on another device.
const TILT_CODES = { 'United States':'us', 'Japan':'jp', 'China / Hong Kong':'cn', 'Emerging Markets':'em' }
const TILT_DECODES = Object.fromEntries(Object.entries(TILT_CODES).map(([k, v]) => [v, k]))
const RISK_CODES = { Conservative:'c', Balanced:'b', Growth:'g' }
const RISK_DECODES = Object.fromEntries(Object.entries(RISK_CODES).map(([k, v]) => [v, k]))
const SIMPLICITY_CODES = { '1 ETF':'1', '2-3 ETFs':'2', '4-5 ETFs':'4' }
const SIMPLICITY_DECODES = Object.fromEntries(Object.entries(SIMPLICITY_CODES).map(([k, v]) => [v, k]))

export function encodePrefsToParams(prefs) {
  const params = new URLSearchParams()
  params.set('r', RISK_CODES[prefs.risk] || 'b')
  params.set('s', SIMPLICITY_CODES[prefs.simplicity] || '2')
  if (prefs.tilts?.length) params.set('t', prefs.tilts.map(t => TILT_CODES[t]).filter(Boolean).join(','))
  if (prefs.monthlyInvestment) params.set('m', String(prefs.monthlyInvestment))
  return params
}

export function decodePrefsFromParams(params) {
  if (!params || !params.get('r')) return null
  const risk = RISK_DECODES[params.get('r')]
  const simplicity = SIMPLICITY_DECODES[params.get('s')]
  if (!risk || !simplicity) return null
  const tiltCodes = (params.get('t') || '').split(',').filter(Boolean)
  const tilts = tiltCodes.map(c => TILT_DECODES[c]).filter(Boolean)
  const monthlyInvestment = params.get('m') || ''
  return { risk, simplicity, tilts, monthlyInvestment }
}

// Two portfolios in one URL for comparison mode: each side's params are
// namespaced with an a_/b_ prefix so they can share a single query string.
export function encodeComparePrefs(prefsA, prefsB) {
  const params = new URLSearchParams()
  for (const [k, v] of encodePrefsToParams(prefsA)) params.set(`a_${k}`, v)
  for (const [k, v] of encodePrefsToParams(prefsB)) params.set(`b_${k}`, v)
  return params
}

export function decodeComparePrefs(params) {
  if (!params) return null
  const pa = new URLSearchParams()
  const pb = new URLSearchParams()
  for (const [k, v] of params.entries()) {
    if (k.startsWith('a_')) pa.set(k.slice(2), v)
    else if (k.startsWith('b_')) pb.set(k.slice(2), v)
  }
  const a = decodePrefsFromParams(pa)
  const b = decodePrefsFromParams(pb)
  if (!a || !b) return null
  return { a, b }
}

// ─── REBALANCING ────────────────────────────────────────────────────────────
// Given current $ holdings per ticker and a target allocation, work out how
// to steer the next contribution back toward target — buying only underweight
// funds first, rather than requiring anyone to sell anything.
export function computeRebalance(allocations, currentValues, nextContribution) {
  const currentTotal = Object.values(currentValues).reduce((s, v) => s + (Number(v) || 0), 0)
  const projectedTotal = currentTotal + (Number(nextContribution) || 0)

  const rows = allocations.map(a => {
    const current = Number(currentValues[a.etf.ticker]) || 0
    const targetValue = (a.percentage / 100) * projectedTotal
    const gap = Math.max(0, targetValue - current)
    return { ticker: a.etf.ticker, etf: a.etf, percentage: a.percentage, current, targetValue, gap }
  })

  const totalGap = rows.reduce((s, r) => s + r.gap, 0)
  const contribution = Number(nextContribution) || 0
  rows.forEach(r => {
    r.buy = totalGap > 0
      ? Math.round((r.gap / totalGap) * contribution * 100) / 100
      : Math.round((r.percentage / 100) * contribution * 100) / 100
  })

  // Any rounding remainder goes to the largest buy so amounts sum exactly.
  if (rows.length) {
    const allocated = rows.reduce((s, r) => s + r.buy, 0)
    const remainder = Math.round((contribution - allocated) * 100) / 100
    if (remainder !== 0) {
      let idx = 0
      rows.forEach((r, i) => { if (r.buy > rows[idx].buy) idx = i })
      rows[idx].buy = Math.round((rows[idx].buy + remainder) * 100) / 100
    }
  }

  return { currentTotal, projectedTotal, rows }
}
