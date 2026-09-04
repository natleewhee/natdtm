'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { C, loadPortfolio, savePortfolio } from '@/components/etf/shared'
import ShellHeader from '@/components/shared/ShellHeader'
import VerdictBadge from '@/components/shared/VerdictBadge'
import {
  generateIllustrativePerformance, computeLookThrough, computeBacktest,
  computeBlendedTER, decodePrefsFromParams, generatePortfolio, RETURNS_AS_OF,
  projectGoal, computeStressTest, computeBrokerCosts, BROKER_DATA_AS_OF,
  computeFeeComparison, FEE_BENCHMARK_AS_OF, encodeComparePrefs,
} from '@/lib/etf/logic'
import { checkFreshness, freshnessLabel, FRESHNESS_WINDOWS } from '@/lib/shared/freshness'
import { saveEtfNumbers } from '@/lib/shared/profile'
import styles from './portfolio.module.css'

const FUND_PALETTE = ['#e0763f', '#d9a441', '#5b9bd1', '#c4b5fd', '#e2564a', '#4caf7d', '#f0cf8f', '#ab9a8c']

const RISK_BADGE_COLORS = {
  Conservative: { bg: 'var(--color-blue-bg)', color: 'var(--color-blue-text)' },
  Balanced: { bg: 'var(--color-accent-bg)', color: 'var(--color-accent)' },
  Growth: { bg: 'var(--color-amber-bg)', color: 'var(--color-amber-text)' },
}

// ─── DONUT CHART ──────────────────────────────────────────────────────────────
function DonutChart({ allocations }) {
  const size = 160, stroke = 22, r = (size - stroke) / 2, c = 2 * Math.PI * r
  const dashes = allocations.map(a => (a.percentage / 100) * c)
  // Cumulative offset for each segment = sum of the dashes before it.
  const offsets = dashes.map((_, i) => dashes.slice(0, i).reduce((s, d) => s + d, 0))
  return (
    <div className={styles.donutWrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Portfolio allocation by fund">
        <g transform={`rotate(-90 ${size/2} ${size/2})`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#3a2f27" strokeWidth={stroke} />
          {allocations.map((a, i) => {
            const dash = dashes[i]
            return (
              <circle key={a.etf.ticker} cx={size/2} cy={size/2} r={r} fill="none"
                stroke={FUND_PALETTE[i % FUND_PALETTE.length]} strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offsets[i]} />
            )
          })}
        </g>
      </svg>
      <div className={styles.donutLegend}>
        {allocations.map((a, i) => (
          <div key={a.etf.ticker} className={styles.donutLegendRow}>
            <span className={styles.donutDot} style={{ background: FUND_PALETTE[i % FUND_PALETTE.length] }} />
            <span className={styles.donutLegendTicker}>{a.etf.ticker}</span>
            <span className={styles.donutLegendPct}>{a.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ANIMATED BAR ─────────────────────────────────────────────────────────────
function AnimatedBar({ percentage, index }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(percentage), 100 + index * 150)
    return () => clearTimeout(t)
  }, [percentage, index])
  return (
    <div className={styles.barTrack}>
      <div className={styles.barFill} style={{ width: `${width}%` }} />
    </div>
  )
}

// ─── PERFORMANCE CHART ────────────────────────────────────────────────────────
function PerformanceChart({ allocations }) {
  const [timeframe, setTimeframe] = useState('1y')
  const data = useMemo(
    () => generateIllustrativePerformance(allocations, timeframe),
    [allocations, timeframe],
  )

  if (data.length === 0) return null

  const values = data.map(d => d.value)
  const minV = Math.min(...values), maxV = Math.max(...values)
  const range = maxV - minV || 1
  const startVal = data[0]?.value || 10000
  const endVal = data[data.length - 1]?.value || 10000
  const gain = endVal - startVal
  const gainPct = ((gain / startVal) * 100).toFixed(2)
  const isPositive = gain >= 0
  const W = 480, H = 160, padL = 16, padR = 16, padT = 12, padB = 24
  const chartW = W - padL - padR, chartH = H - padT - padB
  const points = data.map((d, i) => {
    const x = padL + (i / (data.length - 1)) * chartW
    const y = padT + chartH - ((d.value - minV) / range) * chartH
    return `${x},${y}`
  })
  const pathD = `M ${points.join(' L ')}`
  const areaD = `${pathD} L ${padL + chartW},${padT + chartH} L ${padL},${padT + chartH} Z`
  const labeledDates = data.filter((d, i) => d.date && i % (timeframe === '1w' ? 1 : 4) === 0)

  return (
    <div className={`${styles.card} ${styles.chartCard}`}>
      <div className={styles.chartHeader}>
        <div>
          <p className={styles.chartTitle}>Illustrative Historical Performance</p>
          <p className={styles.chartSubtitle}>$10,000 starting portfolio · Indicative only · Not actual market data</p>
        </div>
        <div className={styles.timeframeGroup}>
          {['1w', '6m', '1y'].map(tf => (
            <button key={tf} onClick={() => setTimeframe(tf)}
              className={`${styles.timeframeBtn}${timeframe === tf ? ` ${styles.active}` : ''}`}>
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.chartValueRow}>
        <span className={styles.chartValue}>${endVal.toLocaleString('en-SG')}</span>
        <span className={`${styles.chartGainBadge} ${isPositive ? styles.positive : styles.negative}`}>
          {isPositive ? '+' : ''}{gainPct}%
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}
        role="img" aria-label={`Illustrative ${timeframe} performance of a $10,000 portfolio, ending at $${endVal.toLocaleString('en-SG')} (${isPositive ? '+' : ''}${gainPct}%). Indicative only, not actual market data.`}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.accent} stopOpacity="0.15" />
            <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#chartGrad)" />
        <path d={pathD} fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" />
        {labeledDates.map((d, i) => {
          const idx = data.findIndex(p => p === d)
          const x = padL + (idx / (data.length - 1)) * chartW
          return <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill={C.muted}>{d.date}</text>
        })}
      </svg>
      <div className={styles.chartFootnote}>
        <p className={styles.chartFootnoteText}>
          Note: Illustrative returns based on general historical performance as of {RETURNS_AS_OF}. Not actual market data. Past performance is not indicative of future results.
          {checkFreshness(RETURNS_AS_OF, FRESHNESS_WINDOWS.marketData).stale && (
            <> <strong>&#9888; These figures are around {checkFreshness(RETURNS_AS_OF, FRESHNESS_WINDOWS.marketData).months} months old and have not been refreshed since.</strong></>
          )}
        </p>
      </div>
    </div>
  )
}

// ─── HISTORICAL BACKTEST ──────────────────────────────────────────────────────
// Unlike the simulated chart above, this uses each fund's real approximate
// annual index returns for 2015–2024 — an honest sequence of actual up and
// down years, not synthetic noise dressed up to look real.
function BacktestCard({ allocations }) {
  const points = computeBacktest(allocations)
  const values = points.map(p => p.value)
  const minV = Math.min(...values), maxV = Math.max(...values)
  const range = maxV - minV || 1
  const startVal = points[0].value
  const endVal = points[points.length - 1].value
  const totalReturnPct = (((endVal / startVal) - 1) * 100).toFixed(1)
  const years = points.length - 1
  const cagrPct = ((Math.pow(endVal / startVal, 1 / years) - 1) * 100).toFixed(1)

  const W = 480, H = 140, padL = 16, padR = 16, padT = 12, padB = 20
  const chartW = W - padL - padR, chartH = H - padT - padB
  const coords = points.map((p, i) => {
    const x = padL + (i / (points.length - 1)) * chartW
    const y = padT + chartH - ((p.value - minV) / range) * chartH
    return { x, y }
  })
  const pathD = `M ${coords.map(p => `${p.x},${p.y}`).join(' L ')}`

  return (
    <div className={`${styles.card} ${styles.backtestCard}`}>
      <p className={styles.chartTitle}>10-Year Historical Backtest</p>
      <p className={styles.chartSubtitle}>$10,000 lump sum, 2015–2024 · Based on approximate real index annual returns</p>
      <div className={styles.chartValueRow}>
        <span className={styles.chartValue}>${endVal.toLocaleString('en-SG')}</span>
        <span className={`${styles.chartGainBadge} ${endVal >= startVal ? styles.positive : styles.negative}`}>
          {endVal >= startVal ? '+' : ''}{totalReturnPct}% total · {cagrPct}%/yr
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}
        role="img" aria-label={`Ten year backtest of a $10,000 portfolio from 2015 to 2024, ending at $${endVal.toLocaleString('en-SG')}, a total return of ${totalReturnPct}%.`}>
        <path d={pathD} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" />
        {coords.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={i === coords.length - 1 ? C.primary : 'transparent'} />
        ))}
        {points.map((pt, i) => (
          i % 2 === 0 ? <text key={i} x={coords[i].x} y={H - 2} textAnchor="middle" fontSize="9" fill={C.muted}>{pt.year}</text> : null
        ))}
      </svg>
      <div className={styles.chartFootnote}>
        <p className={styles.chartFootnoteText}>
          Note: approximate calendar-year total returns of each fund&apos;s underlying index, not fund NAV. Past performance never guarantees future results — this shows what one specific historical decade looked like, not a forecast.
        </p>
      </div>
    </div>
  )
}

// ─── GOAL PROJECTOR ───────────────────────────────────────────────────────────
// Projects the user's monthly DCA forward under three growth scenarios,
// derived from this specific portfolio's own historical CAGR (so a
// bond-heavy Conservative mix projects lower than an all-equity Growth one).
function GoalProjectorCard({ allocations, monthlyInvestment, blendedTer }) {
  const [years, setYears] = useState(20)
  const [escalator, setEscalator] = useState(0)
  const amount = Number(monthlyInvestment)

  if (!amount || amount <= 0) {
    return (
      <div className={`${styles.card} ${styles.goalCard}`}>
        <p className={styles.chartTitle}>Goal Projector</p>
        <p className={styles.chartSubtitle}>Add a monthly investment amount in your preferences to see how it could grow over time.</p>
        <a href="/etf/preferences" className={styles.goalCta}>Add a monthly amount →</a>
      </div>
    )
  }

  const scenarios = projectGoal(allocations, amount, years, blendedTer, escalator)
  const flatScenarios = escalator > 0 ? projectGoal(allocations, amount, years, blendedTer, 0) : null

  return (
    <div className={`${styles.card} ${styles.goalCard}`}>
      <p className={styles.chartTitle}>Goal Projector</p>
      <p className={styles.chartSubtitle}>Investing ${amount.toLocaleString()}/month, net of this portfolio&apos;s {blendedTer.toFixed(2)}%/yr blended TER</p>
      <div className={styles.timeframeGroup}>
        {[10, 20, 30].map(y => (
          <button key={y} onClick={() => setYears(y)}
            className={`${styles.timeframeBtn}${years === y ? ` ${styles.active}` : ''}`}>
            {y}Y
          </button>
        ))}
      </div>

      <p className={styles.escalatorLabel}>Give yourself a raise every year?</p>
      <div className={styles.timeframeGroup}>
        {[0, 3, 5, 8].map(pct => (
          <button key={pct} onClick={() => setEscalator(pct)}
            className={`${styles.timeframeBtn}${escalator === pct ? ` ${styles.active}` : ''}`}>
            {pct === 0 ? 'Flat' : `+${pct}%/yr`}
          </button>
        ))}
      </div>

      <div className={styles.scenarioList}>
        {scenarios.map((s, i) => (
          <div key={s.key} className={styles.scenarioRow}>
            <div>
              <span className={styles.scenarioLabel}>{s.label}</span>
              <span className={styles.scenarioGrowth}>~{s.growthPct}%/yr</span>
            </div>
            <div className={styles.scenarioValueCol}>
              <span className={styles.scenarioValue}>${s.projected.toLocaleString('en-SG')}</span>
              {flatScenarios && (
                <span className={styles.scenarioDelta}>+${(s.projected - flatScenarios[i].projected).toLocaleString('en-SG')} vs flat</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.chartFootnote}>
        <p className={styles.chartFootnoteText}>
          Illustrative only. &quot;Expected&quot; is derived from this portfolio&apos;s approximate 2015–2024 historical growth rate; pessimistic and optimistic are ±5 percentage-point bands, not statistical confidence intervals. The contribution escalator assumes you actually increase your monthly transfer each year — nothing does that automatically. Real returns will differ, possibly by a lot.
        </p>
      </div>
    </div>
  )
}

// ─── DRAWDOWN STRESS TEST ─────────────────────────────────────────────────────
// A rehearsal, not a prediction: replays this portfolio's real blended
// 2015–2024 sequence to find its actual worst year and largest drawdown.
function StressTestCard({ allocations }) {
  const stress = computeStressTest(allocations)
  return (
    <div className={`${styles.card} ${styles.stressCard}`}>
      <p className={styles.chartTitle}>Could You Stomach The Worst Year?</p>
      <p className={styles.chartSubtitle}>Based on this portfolio&apos;s actual blended returns, 2015–2024</p>
      <div className={styles.stressStats}>
        <div className={styles.stressStat}>
          <span className={styles.stressStatLabel}>Worst calendar year</span>
          <span className={styles.stressStatValue}>{stress.worstYear.year} · {stress.worstYear.returnPct}%</span>
        </div>
        <div className={styles.stressStat}>
          <span className={styles.stressStatLabel}>Max drawdown</span>
          <span className={styles.stressStatValue}>{stress.maxDrawdownPct}%</span>
        </div>
      </div>
      <p className={styles.stressBody}>
        A ${stress.startingValue.toLocaleString()} portfolio would have fallen from ${stress.peakValue.toLocaleString()} to ${stress.troughValue.toLocaleString()} at the worst point in this window. If a drop like that would make you want to sell, consider a larger bond sleeve or a simpler, more conservative mix.
      </p>
      <div className={styles.chartFootnote}>
        <p className={styles.chartFootnoteText}>
          Based on approximate historical index returns, not fund NAV. Past drawdowns don&apos;t bound future ones — a future downturn could be worse than anything in this ten-year window.
        </p>
      </div>
    </div>
  )
}

// ─── BROKER COST COMPARISON ───────────────────────────────────────────────────
// Applies illustrative, dated commission + FX-spread assumptions to the
// user's actual DCA amount so "which broker is cheapest for me" has a
// concrete, if approximate, answer instead of a vague "shop around."
function BrokerCostCard({ monthlyInvestment }) {
  const amount = Number(monthlyInvestment)
  if (!amount || amount <= 0) {
    return (
      <div className={`${styles.card} ${styles.brokerCard}`}>
        <p className={styles.chartTitle}>Broker Cost Comparison</p>
        <p className={styles.chartSubtitle}>Add a monthly investment amount in your preferences to compare broker costs for your actual DCA size.</p>
        <a href="/etf/preferences" className={styles.goalCta}>Add a monthly amount →</a>
      </div>
    )
  }
  const costs = computeBrokerCosts(amount)
  return (
    <div className={`${styles.card} ${styles.brokerCard}`}>
      <p className={styles.chartTitle}>Broker Cost Comparison</p>
      <p className={styles.chartSubtitle}>Illustrative commission + FX conversion cost for a ${amount.toLocaleString()}/month buy · {freshnessLabel(BROKER_DATA_AS_OF, FRESHNESS_WINDOWS.fees) ?? `as of ${BROKER_DATA_AS_OF}`}</p>
      <div className={styles.brokerList}>
        {costs.map((b, i) => (
          <div key={b.id} className={styles.brokerRow}>
            <div className={styles.brokerRowHead}>
              <span className={styles.brokerName}>{b.name}{i === 0 ? <span className={styles.brokerBest}>Cheapest</span> : null}</span>
              <span className={styles.brokerCost}>${b.perTradeCost.toFixed(2)}/mo · ${b.annualCost.toFixed(0)}/yr</span>
            </div>
            <p className={styles.brokerNote}>{b.note}</p>
          </div>
        ))}
      </div>
      <div className={styles.chartFootnote}>
        <p className={styles.chartFootnoteText}>
          Approximate and illustrative only — not live rates. Brokerage pricing, promotions, and product availability change often; verify directly before choosing. WhatETF is not affiliated with, and earns nothing from, any broker.
        </p>
      </div>
    </div>
  )
}

// ─── DIY vs ROBO vs UNIT TRUST ────────────────────────────────────────────────
function FeeComparisonCard({ blendedTer, monthlyInvestment }) {
  const [years, setYears] = useState(20)
  const amount = Number(monthlyInvestment)
  if (!amount || amount <= 0) {
    return (
      <div className={`${styles.card} ${styles.feeCompareCard}`}>
        <p className={styles.chartTitle}>DIY vs Robo-Advisor vs Unit Trust</p>
        <p className={styles.chartSubtitle}>Add a monthly investment amount in your preferences to see the fee gap in dollars.</p>
        <a href="/etf/preferences" className={styles.goalCta}>Add a monthly amount →</a>
      </div>
    )
  }
  const levels = computeFeeComparison(blendedTer, amount, years)
  const maxNet = Math.max(...levels.map(l => l.net), 1)
  return (
    <div className={`${styles.card} ${styles.feeCompareCard}`}>
      <p className={styles.chartTitle}>DIY vs Robo-Advisor vs Unit Trust</p>
      <p className={styles.chartSubtitle}>Same ${amount.toLocaleString()}/month, same assumed growth rate — the only difference is fees · {freshnessLabel(FEE_BENCHMARK_AS_OF, FRESHNESS_WINDOWS.fees) ?? `as of ${FEE_BENCHMARK_AS_OF}`}</p>
      <div className={styles.timeframeGroup}>
        {[10, 20, 30].map(y => (
          <button key={y} onClick={() => setYears(y)}
            className={`${styles.timeframeBtn}${years === y ? ` ${styles.active}` : ''}`}>
            {y}Y
          </button>
        ))}
      </div>
      <div className={styles.scenarioList}>
        {levels.map(l => (
          <div key={l.key}>
            <div className={styles.feeCompareRow}>
              <span className={styles.scenarioLabel}>{l.label} <span className={styles.scenarioGrowth}>{l.terPct.toFixed(2)}%/yr TER</span></span>
              <span className={styles.scenarioValue}>${l.net.toLocaleString('en-SG')}</span>
            </div>
            <div className={styles.lookThroughTrack}>
              <div className={styles.lookThroughFill} style={{ width: `${(l.net / maxNet) * 100}%`, background: l.key === 'diy' ? C.accent : C.faint }} />
            </div>
          </div>
        ))}
      </div>
      <div className={styles.chartFootnote}>
        <p className={styles.chartFootnoteText}>
          Illustrative only. Robo-advisor and unit trust fee levels are rough typical ranges, not quotes from any specific product — actual fees vary widely. Growth rate assumption held constant across all three so the comparison isolates the cost of fees.
        </p>
      </div>
    </div>
  )
}

// ─── LOOK-THROUGH EXPOSURE ────────────────────────────────────────────────────
// Shows the TRUE regional exposure after de-duplicating overlapping funds
// (e.g. VWRA already holds the US, so a CSPX satellite stacks on top).
function LookThroughCard({ allocations }) {
  const buckets = computeLookThrough(allocations)
  const max = Math.max(...buckets.map(b => b.percentage), 1)
  const palette = {
    'United States': '#e0763f', 'Other Developed': '#5b9bd1', 'Japan': '#c4b5fd',
    'Emerging Markets': '#4caf7d', 'China / Hong Kong': '#d9a441', 'Global Bonds': '#ab9a8c',
  }
  return (
    <div className={`${styles.card} ${styles.lookThroughCard}`}>
      <h3 className={styles.lookThroughTitle}>True regional exposure</h3>
      <p className={styles.lookThroughDesc}>
        Your actual weight to each region after looking through every fund&apos;s holdings — because a global fund like VWRA already contains the US, Japan, and emerging markets.
      </p>
      <div className={styles.lookThroughList}>
        {buckets.map(b => (
          <div key={b.region}>
            <div className={styles.lookThroughRow}>
              <span className={styles.lookThroughRegion}>{b.region}</span>
              <span className={styles.lookThroughPct}>{b.percentage}%</span>
            </div>
            <div className={styles.lookThroughTrack}>
              <div className={styles.lookThroughFill} style={{ width: `${(b.percentage / max) * 100}%`, background: palette[b.region] || C.faint }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── EXPANDABLE NOTE ──────────────────────────────────────────────────────────
function ExpandableNote({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.expandableNote}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className={styles.expandableBtn}>
        <span className={styles.expandableQuestion}>{question}</span>
        <span className={`${styles.expandableChevron}${open ? ` ${styles.open}` : ''}`}>▾</span>
      </button>
      {open && <p className={styles.expandableAnswer}>{answer}</p>}
    </div>
  )
}

// ─── COPY LINK ────────────────────────────────────────────────────────────────
function CopyLinkButton() {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <button onClick={handleCopy} className={styles.copyLinkBtn}>
      {copied ? '✓ Link copied' : '🔗 Copy shareable link'}
    </button>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className={styles.loadingPage}><div className={styles.spinner} /></div>}>
      <PortfolioContent />
    </Suspense>
  )
}

function PortfolioContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState(null) // { portfolio, prefs }

  useEffect(() => {
    // A shared/bookmarked link takes priority; otherwise fall back to
    // whatever was generated last in this session.
    const fromUrl = decodePrefsFromParams(searchParams)
    if (fromUrl) {
      const built = { portfolio: generatePortfolio(fromUrl), prefs: fromUrl }
      savePortfolio(built)
      setData(built)
      return
    }
    const saved = loadPortfolio()
    if (saved?.portfolio?.allocations?.length) {
      setData(saved)
    } else {
      // No portfolio in session or URL — redirect to preferences
      router.replace('/etf/preferences')
    }
  }, [router, searchParams])

  useEffect(() => {
    if (!data?.prefs) return
    const monthly = Number(data.prefs.monthlyInvestment) || 0
    if (monthly > 0) saveEtfNumbers({ monthlyContribution: monthly })
  }, [data])

  if (!data) return (
    <div className={styles.loadingPage}>
      <div className={styles.spinner} />
    </div>
  )

  const { portfolio, prefs } = data
  const blendedTer = computeBlendedTER(portfolio.allocations)

  return (
    <div className={styles.page}>
      <ShellHeader title="Your Portfolio" backHref="/etf/preferences" links={[{ href: '/etf/the-math', label: 'The Math' }]} />

      <main className={styles.main}>
        <div className={styles.content}>

          {/* MAS disclaimer */}
          <div className={styles.masDisclaimer}>
            <p className={styles.masDisclaimerText}>
              Educational tool only. Portfolios shown are illustrative examples and do not constitute financial advice. Consult a MAS-licensed financial adviser before making investment decisions. Not affiliated with any broker or fund manager.
            </p>
          </div>

          <div className="pf-grid">

            {/* ── Left Column ── */}
            <div className={styles.leftCol}>

              {/* Allocations */}
              <div className={`${styles.card} ${styles.allocCard}`}>
                <div className={styles.allocEyebrowRow}>
                  <span className={styles.allocEyebrow}>Your Portfolio</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <VerdictBadge
                      label={`${prefs.risk} risk`}
                      size="sm"
                      bg={RISK_BADGE_COLORS[prefs.risk]?.bg}
                      color={RISK_BADGE_COLORS[prefs.risk]?.color}
                    />
                    <span className={styles.terBadge}>Blended TER: {blendedTer.toFixed(2)}%/yr</span>
                  </div>
                </div>
                <h1 className={styles.allocTitle}>{portfolio.title}</h1>
                <p className={styles.allocDesc}>{portfolio.description}</p>

                {portfolio.allocations.length > 1 && <DonutChart allocations={portfolio.allocations} />}

                <div className={styles.allocList}>
                  {portfolio.allocations.map((item, idx) => (
                    <div key={idx}>
                      <div className={styles.allocRow}>
                        <div className={styles.allocRowLeft}>
                          <span className={styles.allocPct}>{item.percentage}%</span>
                          <span className={styles.allocTicker}>{item.etf.ticker}</span>
                          <span className={styles.allocRegion}>{item.etf.region}</span>
                        </div>
                      </div>
                      <AnimatedBar percentage={item.percentage} index={idx} />
                      <p className={styles.allocFundDesc}>
                        <strong className={styles.allocFundName}>{item.etf.name}:</strong> {item.etf.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <LookThroughCard allocations={portfolio.allocations} />

              <PerformanceChart allocations={portfolio.allocations} />

              <BacktestCard allocations={portfolio.allocations} />

              <GoalProjectorCard allocations={portfolio.allocations} monthlyInvestment={prefs.monthlyInvestment} blendedTer={blendedTer} />

              <StressTestCard allocations={portfolio.allocations} />

              <BrokerCostCard monthlyInvestment={prefs.monthlyInvestment} />

              <FeeComparisonCard blendedTer={blendedTer} monthlyInvestment={prefs.monthlyInvestment} />

              {/* Why it works */}
              <div className={`${styles.card} ${styles.whyCard}`}>
                <h3 className={styles.whyTitle}>ℹ Why this works</h3>
                <p className={styles.whyBody}>{portfolio.whyItWorks}</p>
              </div>

              {/* DCA Breakdown */}
              {prefs.monthlyInvestment && Number(prefs.monthlyInvestment) > 0 && (
                <div className={styles.dcaCard}>
                  <h3 className={styles.dcaTitle}>DCA Breakdown</h3>
                  <p className={styles.dcaIntro}>
                    If investing <strong className={styles.dcaIntroAmount}>${Number(prefs.monthlyInvestment).toLocaleString()}</strong> per month:
                  </p>
                  <div className={styles.dcaList}>
                    {portfolio.allocations.map((item, idx) => (
                      <div key={idx} className={styles.dcaRow}>
                        <div>
                          <span className={styles.dcaTicker}>{item.etf.ticker}</span>
                          <span className={styles.dcaPct}>{item.percentage}%</span>
                        </div>
                        <span className={styles.dcaAmount}>
                          ${((item.percentage / 100) * Number(prefs.monthlyInvestment)).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* ── Right Sidebar ── */}
            <div className={styles.rightCol}>

              {/* Why free */}
              <div className={styles.whyFreeCard}>
                <div className={styles.whyFreeHeader}>
                  <span className={styles.whyFreeLabel}>NDTM</span>
                  <span className={styles.whyFreeSub}>No Pay-to-Win</span>
                </div>
                <p className={styles.whyFreeBody}>
                  WhatETF has no ads, no affiliate links, and no referral fees. We don&apos;t earn anything when you use it. Singaporeans deserve honest financial tools without a sales agenda.
                </p>
              </div>

              {/* Educational notes */}
              <div className={`${styles.card} ${styles.sideCard}`}>
                <h4 className={styles.sideCardTitle}>Educational Notes</h4>
                <div className={styles.notesList}>
                  <ExpandableNote question="Why UCITS ETFs?" answer="Ireland-domiciled UCITS ETFs are more tax-efficient for Singaporeans. They benefit from a lower 15% dividend withholding tax compared to 30% for US-domiciled ETFs like VOO." />
                  <ExpandableNote question="Accumulating vs Distributing?" answer="Accumulating ETFs (like VWRA) automatically reinvest dividends. This is generally preferred for DCA as it saves transaction costs and simplifies management." />
                  <ExpandableNote question="What is DCA?" answer="Dollar-Cost Averaging means investing a fixed amount at regular intervals regardless of price. It reduces the impact of volatility over time." />
                </div>
                <a href="/etf/learn" className={styles.learnMoreLink}>More investing basics →</a>
              </div>

              {/* Stage 3 cross-tool nudge: insurance-before-investing is
                  standard financial-planning sequencing — only surface it
                  once there's a real monthly commitment, not while just
                  browsing example allocations. */}
              {prefs.monthlyInvestment && Number(prefs.monthlyInvestment) > 0 && (
                <div className={`${styles.card} ${styles.sideCard}`}>
                  <h4 className={styles.sideCardTitle}>Before You Commit</h4>
                  <p className={styles.stepText} style={{ marginBottom: 10 }}>
                    DCA works best once critical illness, life/TPD, and hospitalisation gaps are covered — so a health event doesn&apos;t force you to sell mid-plan.
                  </p>
                  <a href="/insure" className={styles.learnMoreLink}>Check your coverage first →</a>
                </div>
              )}

              {/* Next steps */}
              <div className={`${styles.card} ${styles.sideCard}`}>
                <h4 className={styles.sideCardTitle}>Next Steps</h4>
                <div className={styles.stepsList}>
                  {[
                    'Choose a low-cost brokerage (e.g. IBKR, Moomoo, Tiger Brokers).',
                    'Search for the tickers (e.g. VWRA) on the London Stock Exchange (LSE) for UCITS versions.',
                    'Set up a recurring monthly buy to automate your DCA.',
                    'Review your allocation annually — rebalance if any holding drifts significantly.',
                  ].map((step, i) => (
                    <div key={i} className={styles.stepRow}>
                      <div className={styles.stepNum}>{i + 1}</div>
                      <p className={styles.stepText}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <CopyLinkButton />

              <a href={`/etf/compare?${encodeComparePrefs(prefs, prefs).toString()}`} className={styles.adjustLink}>
                Compare with another mix →
              </a>

              <a href="/etf/rebalance" className={styles.adjustLink}>
                Rebalancing helper →
              </a>

              <a href="/etf/preferences" className={styles.adjustLink}>
                ← Adjust preferences
              </a>

            </div>
          </div>
        </div>
      </main>

    </div>
  )
}
