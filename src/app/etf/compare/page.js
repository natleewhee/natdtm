'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RISK_OPTIONS, SIMPLICITY_OPTIONS, TILT_OPTIONS } from '@/components/etf/shared'
import { summarizePortfolio, encodeComparePrefs, decodeComparePrefs } from '@/lib/etf/logic'
import ShellHeader from '@/components/shared/ShellHeader'
import styles from './compare.module.css'

const DEFAULT_A = { risk: 'Balanced', simplicity: '2-3 ETFs', tilts: [], monthlyInvestment: '' }
const DEFAULT_B = { risk: 'Balanced', simplicity: '4-5 ETFs', tilts: [], monthlyInvestment: '' }

function PrefsPicker({ label, prefs, onChange }) {
  const isSingle = prefs.simplicity === '1 ETF'
  return (
    <div className={styles.pickerCard}>
      <h2 className={styles.pickerLabel}>{label}</h2>

      <div className={styles.pickerSection}>
        <span className={styles.pickerSectionTitle}>Simplicity</span>
        <div className={styles.chipRow}>
          {SIMPLICITY_OPTIONS.map(o => (
            <button key={o.value} type="button"
              className={`${styles.chip}${prefs.simplicity === o.value ? ` ${styles.chipActive}` : ''}`}
              onClick={() => onChange({ ...prefs, simplicity: o.value })}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.pickerSection}>
        <span className={styles.pickerSectionTitle}>Risk</span>
        <div className={styles.chipRow}>
          {RISK_OPTIONS.map(o => (
            <button key={o.value} type="button" disabled={isSingle}
              className={`${styles.chip}${!isSingle && prefs.risk === o.value ? ` ${styles.chipActive}` : ''}`}
              onClick={() => onChange({ ...prefs, risk: o.value })}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.pickerSection}>
        <span className={styles.pickerSectionTitle}>Regional tilt</span>
        <div className={styles.chipRow}>
          {TILT_OPTIONS.map(o => (
            <button key={o} type="button" disabled={isSingle}
              className={`${styles.chip}${!isSingle && prefs.tilts.includes(o) ? ` ${styles.chipActive}` : ''}`}
              onClick={() => {
                const next = prefs.tilts.includes(o) ? prefs.tilts.filter(t => t !== o) : [...prefs.tilts, o]
                onChange({ ...prefs, tilts: next })
              }}>
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultCard({ summary, isWinnerOnCost }) {
  const { portfolio, ter, cagrPct, stress } = summary
  return (
    <div className={`${styles.resultCard}${isWinnerOnCost ? ` ${styles.winner}` : ''}`}>
      <h3 className={styles.resultTitle}>{portfolio.title}</h3>
      <p className={styles.resultDesc}>{portfolio.description}</p>
      <div className={styles.allocMini}>
        {portfolio.allocations.map(a => (
          <div key={a.etf.ticker} className={styles.allocMiniRow}>
            <span className={styles.allocMiniTicker}>{a.etf.ticker}</span>
            <span className={styles.allocMiniPct}>{a.percentage}%</span>
          </div>
        ))}
      </div>
      <div className={styles.statList}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Blended TER</span>
          <span className={styles.statValue}>{ter.toFixed(2)}%/yr</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>10-year historical CAGR</span>
          <span className={`${styles.statValue} ${cagrPct >= 0 ? styles.positive : styles.negative}`}>{cagrPct}%/yr</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Worst calendar year</span>
          <span className={`${styles.statValue} ${styles.negative}`}>{stress.worstYear.year} · {stress.worstYear.returnPct}%</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Max drawdown</span>
          <span className={`${styles.statValue} ${styles.negative}`}>{stress.maxDrawdownPct}%</span>
        </div>
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareContent />
    </Suspense>
  )
}

function CompareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [prefsA, setPrefsA] = useState(DEFAULT_A)
  const [prefsB, setPrefsB] = useState(DEFAULT_B)
  const [comparison, setComparison] = useState(null)

  useEffect(() => {
    const decoded = decodeComparePrefs(searchParams)
    if (decoded) {
      setPrefsA(decoded.a)
      setPrefsB(decoded.b)
      setComparison({ a: summarizePortfolio(decoded.a), b: summarizePortfolio(decoded.b) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCompare = () => {
    setComparison({ a: summarizePortfolio(prefsA), b: summarizePortfolio(prefsB) })
    const params = encodeComparePrefs(prefsA, prefsB)
    router.push(`/etf/compare?${params.toString()}`)
  }

  const aCheaper = comparison && comparison.a.ter <= comparison.b.ter

  return (
    <div className={styles.page}>
      <ShellHeader title="Compare" backHref="/etf/portfolio" links={[{ href: '/etf/the-math', label: 'The Math' }]} />

      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Compare Two Portfolios</h1>
          <p className={styles.subtitle}>Pick two mixes and see the allocation, cost, and historical risk side by side — often the extra complexity of a &quot;precision&quot; portfolio buys less than it looks like.</p>

          <div className={styles.pickerGrid}>
            <PrefsPicker label="Portfolio A" prefs={prefsA} onChange={setPrefsA} />
            <PrefsPicker label="Portfolio B" prefs={prefsB} onChange={setPrefsB} />
          </div>

          <button onClick={handleCompare} className={`coah-btn ${styles.compareBtn}`}>
            Compare →
          </button>

          {comparison && (
            <>
              <div className={styles.resultGrid}>
                <ResultCard summary={comparison.a} isWinnerOnCost={aCheaper} />
                <ResultCard summary={comparison.b} isWinnerOnCost={!aCheaper} />
              </div>
              <p className={styles.footnote}>
                The highlighted card has the lower blended TER, not necessarily the &quot;better&quot; portfolio — cost is only one factor. CAGR and drawdown figures use the same approximate 2015–2024 index data as the rest of WhatETF; a different historical window would show different numbers.
              </p>
            </>
          )}
        </div>
      </main>

    </div>
  )
}
