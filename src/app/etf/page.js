'use client'

import { generatePortfolio } from '@/lib/etf/logic'
import ShellHeader from '@/components/shared/ShellHeader'
import TrustBadges from '@/components/shared/TrustBadges'
import Button from '@/components/shared/Button'
import styles from './page.module.css'

// A real, deterministic example — built from the same logic every generated
// portfolio uses — so visitors see actual output before clicking through.
const SAMPLE = generatePortfolio({ risk: 'Balanced', simplicity: '2-3 ETFs', tilts: ['United States'], monthlyInvestment: '' })
const SAMPLE_COLORS = ['#eab308', '#ff5722', '#38bdf8']

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context':'https://schema.org','@type':'WebApplication',
        name:'WhatETF — nat does the math', url:'https://coah.vercel.app/etf',
        description:'Illustrative ETF portfolio allocations for Singapore investors.',
        applicationCategory:'FinanceApplication', operatingSystem:'Web',
        offers:{'@type':'Offer', price:'0', priceCurrency:'SGD'},
      }) }} />

      <ShellHeader links={[{ href: '/etf/the-math', label: 'The Math' }]} />

      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.heroEyebrow}>Singapore Edition</div>
          <h1 className={styles.heroTitle}>
            Your ETF portfolio,<br/>worked out for you.
          </h1>
          <p className={styles.heroBody}>
            Answer three questions about risk and simplicity — I&apos;ll hand you a real fund allocation with the math shown, right there. Runs entirely in your browser.
          </p>
          <Button href="/etf/preferences">
            Check my portfolio — it&apos;s free
          </Button>
          <div className={styles.heroBadges}>
            <TrustBadges tone="dark" items={['No sign-up', 'No data stored', 'No ads', 'No commissions']} />
          </div>
        </div>

        <div className={styles.disclaimerStrip}>
          <p className={styles.disclaimerText}>Educational tool only · Portfolios are illustrative · Not financial advice · Not affiliated with any broker or MAS-licensed entity</p>
        </div>

        {/* Sample output — real logic output, so visitors see the actual product before clicking through */}
        <div className={styles.sampleSection}>
          <div className={styles.sampleCard}>
            <span className={styles.sampleLabel}>What you&apos;ll get — a real example</span>
            <h2 className={styles.sampleTitle}>{SAMPLE.title}</h2>
            <div className={styles.sampleBars}>
              {SAMPLE.allocations.map((a, i) => (
                <div key={a.etf.ticker} className={styles.sampleBarRow}>
                  <div className={styles.sampleBarHead}>
                    <span className={styles.sampleBarTicker}>{a.etf.ticker}</span>
                    <span className={styles.sampleBarPct}>{a.percentage}%</span>
                  </div>
                  <div className={styles.sampleBarTrack}>
                    <div className={styles.sampleBarFill} style={{ width: `${a.percentage}%`, background: SAMPLE_COLORS[i % SAMPLE_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
            <a href="/etf/preferences" className={styles.sampleCta}>Build my own portfolio →</a>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.featureGrid}>
            {[
              { icon: '🛡️', title: 'Singapore Optimised', body: 'Focus on Ireland-domiciled UCITS ETFs for tax efficiency. Less withholding tax than US-domiciled funds.' },
              { icon: '📈', title: 'DCA Ready',           body: 'Designed for long-term dollar-cost averaging. Set a monthly amount, buy on schedule, let time do the work.' },
              { icon: '🔢', title: 'Neutral Math',        body: 'No commissions, no sales agenda. Just transparent logic, open for anyone to verify.' },
            ].map(f => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureBody}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

    </div>
  )
}
