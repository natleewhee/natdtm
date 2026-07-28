'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { loadPortfolio } from '@/components/etf/shared'
import ShellHeader from '@/components/shared/ShellHeader'
import { computeRebalance, decodePrefsFromParams, generatePortfolio } from '@/lib/etf/logic'
import { saveEtfNumbers } from '@/lib/shared/profile'
import styles from './rebalance.module.css'

export default function RebalancePage() {
  return (
    <Suspense fallback={<div className={styles.loadingPage}><div className={styles.spinner} /></div>}>
      <RebalanceContent />
    </Suspense>
  )
}

function RebalanceContent() {
  const searchParams = useSearchParams()
  const [portfolio, setPortfolio] = useState(undefined) // undefined = loading, null = none found

  useEffect(() => {
    const fromUrl = decodePrefsFromParams(searchParams)
    if (fromUrl) { setPortfolio(generatePortfolio(fromUrl)); return }
    const saved = loadPortfolio()
    setPortfolio(saved?.portfolio?.allocations?.length ? saved.portfolio : null)
  }, [searchParams])

  const [currentValues, setCurrentValues] = useState({})
  const [contribution, setContribution] = useState('')

  // Reset the current-holdings form whenever the target portfolio changes.
  useEffect(() => {
    if (portfolio) setCurrentValues(Object.fromEntries(portfolio.allocations.map(a => [a.etf.ticker, ''])))
  }, [portfolio])

  const result = useMemo(() => {
    if (!portfolio) return null
    return computeRebalance(portfolio.allocations, currentValues, contribution)
  }, [portfolio, currentValues, contribution])

  useEffect(() => {
    if (result?.currentTotal > 0) saveEtfNumbers({ portfolioValue: result.currentTotal })
  }, [result])

  if (portfolio === undefined) return (
    <div className={styles.loadingPage}><div className={styles.spinner} /></div>
  )

  return (
    <div className={styles.page}>
      <ShellHeader title="Rebalance" backHref="/etf/portfolio" links={[{ href: '/etf/the-math', label: 'The Math' }]} />

      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Rebalancing Helper</h1>
          <p className={styles.subtitle}>
            Enter your current holdings and your next contribution — we&apos;ll show how to split it so your portfolio drifts back toward target, without needing to sell anything.
          </p>

          {!portfolio ? (
            <div className={styles.card}>
              <div className={styles.emptyState}>
                <p className={styles.emptyStateBody}>No portfolio found yet. Generate one first, then come back here to rebalance it.</p>
                <a href="/etf/preferences" className={styles.emptyStateLink}>Build a portfolio →</a>
              </div>
            </div>
          ) : (
            <div className={styles.card}>
              <label className={styles.sectionLabel}>Current holdings</label>
              <p className={styles.sectionHint}>What each fund is worth in your brokerage account today (leave blank if you don&apos;t hold it yet).</p>
              <div className={styles.holdingsList}>
                {portfolio.allocations.map(a => (
                  <div key={a.etf.ticker} className={styles.holdingRow}>
                    <div className={styles.holdingLabel}>
                      <span className={styles.holdingTicker}>{a.etf.ticker}</span>
                      <span className={styles.holdingTarget}>target {a.percentage}%</span>
                    </div>
                    <div className={styles.holdingInputWrap}>
                      <span className={styles.holdingPrefix}>$</span>
                      <input
                        type="number" min="0" step="1" placeholder="0"
                        value={currentValues[a.etf.ticker] ?? ''}
                        onChange={e => {
                          const v = e.target.value
                          if (v === '' || Number(v) >= 0) setCurrentValues({ ...currentValues, [a.etf.ticker]: v })
                        }}
                        className={styles.holdingInput}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <label className={styles.sectionLabel}>Next contribution</label>
              <p className={styles.sectionHint}>How much you&apos;re about to invest this round.</p>
              <div className={styles.contributionRow}>
                <div className={styles.holdingInputWrap} style={{ flex: 1 }}>
                  <span className={styles.holdingPrefix}>$</span>
                  <input
                    type="number" min="0" step="1" placeholder="e.g. 1000"
                    value={contribution}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '' || Number(v) >= 0) setContribution(v)
                    }}
                    className={styles.holdingInput}
                  />
                </div>
              </div>

              <hr className={styles.divider} />

              <h2 className={styles.resultTitle}>How to split it</h2>
              <p className={styles.resultSubtitle}>
                Projected total after this contribution: ${result.projectedTotal.toLocaleString('en-SG', { maximumFractionDigits: 0 })}
              </p>
              <div className={styles.resultList}>
                {result.rows.map(r => (
                  <div key={r.ticker} className={`${styles.resultRow}${r.buy <= 0 ? ` ${styles.resultRowZero}` : ''}`}>
                    <div>
                      <span className={styles.resultTicker}>{r.ticker}</span>
                      <span className={styles.resultDrift}>
                        {r.current > 0 || result.currentTotal > 0
                          ? `now ${result.currentTotal > 0 ? Math.round((r.current / result.currentTotal) * 100) : 0}% → target ${r.percentage}%`
                          : `target ${r.percentage}%`}
                      </span>
                    </div>
                    <span className={styles.resultBuy}>
                      ${r.buy.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <p className={styles.footnote}>
                This buys only underweight funds first with your new money — no selling required, which avoids triggering any realised gains. If a fund is already at or above target, it gets $0 this round until the others catch up.
              </p>
            </div>
          )}
        </div>
      </main>

    </div>
  )
}
