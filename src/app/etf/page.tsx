'use client'

import { generatePortfolio } from '@/lib/etf/calc'
import ShellHeader from '@/components/shared/ShellHeader'
import TrustBadges from '@/components/shared/TrustBadges'
import Button from '@/components/shared/Button'
import styles from './page.module.css'

// A real, deterministic example — built from the same logic every generated
// portfolio uses — so visitors see actual output before clicking through.
const SAMPLE = generatePortfolio({ risk: 'Balanced', simplicity: '2-3 ETFs', tilts: ['United States'], monthlyInvestment: '' })
const SAMPLE_COLORS = ['#e0763f', '#d9a441', '#5b9bd1']

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context':'https://schema.org','@type':'WebApplication',
        name:'WhatETF · nat does the math', url:'https://natdtm.vercel.app/etf',
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
            Answer three questions about risk and simplicity, and I&apos;ll hand you a real fund allocation with the math shown, right there. Runs entirely in your browser.
          </p>
          <Button href="/etf/preferences">
            Start the 3 questions
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
            <span className={styles.sampleLabel}>What you&apos;ll get: a real example</span>
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
          <section className={styles.why} aria-labelledby="etf-why">
            <div className={styles.whyIntro}>
              <h2 id="etf-why" className={styles.whyTitle}>Why these funds, and not others</h2>
              <p className={styles.whyLede}>Three rules decide every allocation. None of them pays me anything.</p>
            </div>
            <dl className={styles.whyList}>
              <div className={styles.whyRow}>
                <dt className={styles.whyTerm}>
                  <span className={styles.whyFigure}>15%</span>
                  <span>not 30%</span>
                </dt>
                <dd className={styles.whyBody}>
                  <strong>Ireland-domiciled UCITS funds only.</strong> US-domiciled ETFs lose 30% of every dividend to US withholding tax; the Irish versions lose 15%. Over decades that gap compounds.
                </dd>
              </div>
              <div className={styles.whyRow}>
                <dt className={styles.whyTerm}>
                  <span className={styles.whyFigure}>Monthly</span>
                  <span>not market-timed</span>
                </dt>
                <dd className={styles.whyBody}>
                  <strong>Built for dollar-cost averaging.</strong> Pick a monthly amount, buy on schedule, and let time do the work. The plan never asks you to guess the market.
                </dd>
              </div>
              <div className={styles.whyRow}>
                <dt className={styles.whyTerm}>
                  <span className={styles.whyFigure}>$0</span>
                  <span>in commissions</span>
                </dt>
                <dd className={styles.whyBody}>
                  <strong>Neutral math, shown in full.</strong> No affiliate links and no sales agenda. Every weight and fee is on <a href="/etf/the-math">the math page</a> for anyone to check.
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </main>

    </div>
  )
}
