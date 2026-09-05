'use client'

import ShellHeader from '@/components/shared/ShellHeader'
import MathTOC from '@/components/shared/MathTOC'
import { RETURNS_AS_OF } from '@/lib/etf/logic'
import styles from './theMath.module.css'

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
function Section({ title, children, noBorder }) {
  return (
    <div id={title ? slug(title) : undefined} className={noBorder ? `${styles.section} ${styles.sectionNoBorder}` : styles.section} style={{ scrollMarginTop: 80 }}>
      {title && <h2 className={styles.sectionTitle}>{title}</h2>}
      {children}
    </div>
  )
}
function Body({ children }) {
  return <p className={styles.body}>{children}</p>
}
function InfoCard({ title, body }) {
  return (
    <div className={styles.infoCard}>
      <p className={styles.infoCardTitle}>{title}</p>
      <p className={styles.infoCardBody}>{body}</p>
    </div>
  )
}

export default function TheMathPage() {
  return (
    <div className={styles.page}>
      <ShellHeader title="The Math" backHref="/etf" />

      <main className={styles.main}>
        <div className={styles.content}>

          <Section noBorder>
            <div className={styles.hero}>
              <div className={styles.heroHeader}>
                <span className={styles.heroLabel}>NDTM</span>
                <span className={styles.heroSub}>Built for Singapore</span>
              </div>
              <h1 className={styles.heroTitle}>How we generate your allocations</h1>
              <Body>WhatETF generates illustrative ETF portfolios based on your stated preferences — risk tolerance, simplicity preference, and regional tilts. There is no AI involved. The logic is simple, deterministic, and fully transparent.</Body>
              <div className={styles.heroTags}>
                {['Rule-based allocation', 'No black box', 'UCITS-first approach', 'Educational only'].map(tag => (
                  <span key={tag} className={styles.heroTag}>✓ {tag}</span>
                ))}
              </div>
            </div>
          </Section>

          <MathTOC items={[
            { id: 'how-the-portfolio-is-built', label: 'How it’s built' },
            { id: 'etfs-we-use-and-why', label: 'ETFs we use' },
            { id: 'why-ucits-the-withholding-tax-argument', label: 'Why UCITS' },
            { id: 'two-different-charts-two-different-honesty-levels', label: 'Charts explained' },
            { id: 'fund-cost-ter', label: 'Fund cost (TER)' },
            { id: 'goal-projector-how-the-three-scenarios-are-built', label: 'Goal Projector' },
            { id: 'the-stress-test-rehearsing-the-bad-year', label: 'Stress test' },
          ]} />

          <Section title="How the portfolio is built">
            <Body>Your preferences map directly to a pre-defined allocation strategy. Three inputs drive the output.</Body>

            <InfoCard title="1. Risk preference" body="Conservative → a global bond sleeve (AGGU, ~25%) is added to cushion drawdowns, with a lower equity core. Balanced → all-equity, standard weights (60–70% core). Growth → more concentrated in US or small cap exposure (40–60% VWRA core, no bonds)."/>
            <InfoCard title="2. Portfolio simplicity" body="1 ETF: 100% VWRA. 2-3 ETFs: Core + satellite with your selected tilts. 4-5 ETFs: Full breakdown across global, US, emerging markets, and small cap."/>
            <InfoCard title="3. Regional tilts" body="Your tilts add satellites to the core. Weights are divided equally if multiple tilts are selected. The VWRA core is reduced proportionally to make room."/>

            <div className={styles.codeBlock}>
{`Example (Balanced, 2-3 ETFs, US tilt):
  Core: VWRA @ 70%
  Satellite: CSPX @ 30%
  Total: 100%

Example (Conservative, 2-3 ETFs, no tilt):
  Bonds: AGGU @ 25%
  Core:  VWRA @ 55%
  Satellite: CSPX @ 20%

Example (Growth, 4-5 ETFs, no tilt):
  VWRA @ 30%
  CSPX @ 40%
  EIMI @ 20%
  WSML @ 10%`}
            </div>
          </Section>

          <Section title="ETFs we use and why">
            <Body>All ETFs are Ireland-domiciled UCITS funds. This matters for tax efficiency.</Body>
            {[
              { ticker:'VWRA', name:'Vanguard FTSE All-World UCITS ETF',      why:'The closest thing to owning the entire world. 3,700+ companies. Low 0.22% TER. Accumulating.' },
              { ticker:'CSPX', name:'iShares Core S&P 500 UCITS ETF',         why:'US large-cap exposure. Very low 0.07% TER. Ireland-domiciled for 15% WHT vs 30% for VOO.' },
              { ticker:'EIMI', name:'iShares Core MSCI EM IMI UCITS ETF',     why:'Broad emerging market coverage. High growth potential. Higher volatility.' },
              { ticker:'VJPW', name:'Vanguard FTSE Japan UCITS ETF',          why:'Concentrated Japan exposure for those wanting direct Asian developed market tilt.' },
              { ticker:'WSML', name:'iShares MSCI World Small Cap UCITS ETF', why:'Small-cap factor tilt. Historically higher returns over long periods at the cost of volatility.' },
              { ticker:'HMCH', name:'HSBC MSCI China UCITS ETF',              why:'China/HK exposure for those with conviction in Chinese growth. Carries policy and regulatory risk.' },
              { ticker:'AGGU', name:'iShares Core Global Aggregate Bond UCITS ETF', why:'Investment-grade global bonds, USD-hedged. Added to conservative portfolios as ballast — bonds historically fall less than equities in downturns.' },
            ].map(e => (
              <InfoCard key={e.ticker} title={`${e.ticker} — ${e.name}`} body={e.why}/>
            ))}
          </Section>

          <Section title="Why UCITS? The withholding tax argument">
            <Body>Singapore investors pay withholding tax on dividends from overseas ETFs. The difference between US-domiciled and Ireland-domiciled funds is significant:</Body>
            <div className={styles.whtGrid}>
              {[
                { label:'US-domiciled (e.g. VOO, SPY)', rate:'30% WHT', color:'#f2a99f', bg:'rgba(239,68,68,0.12)', border:'rgba(239,68,68,0.35)' },
                { label:'Ireland-domiciled UCITS (e.g. CSPX)', rate:'15% WHT', color:'#8fd9b2', bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.35)' },
              ].map(item => (
                <div key={item.label} className={styles.whtCard} style={{ '--wht-color': item.color, '--wht-bg': item.bg, '--wht-border': item.border }}>
                  <p className={styles.whtLabel}>{item.label}</p>
                  <p className={styles.whtRate}>{item.rate}</p>
                </div>
              ))}
            </div>
            <p className={styles.calloutBox}>
              At scale, this 15-percentage-point difference compounds significantly. A $200,000 portfolio yielding 2% dividends saves ~$300/year with UCITS — or ~$9,000 over a 30-year horizon at current rates.
            </p>
          </Section>

          <Section title="Two different charts, two different honesty levels">
            <Body>The short-term chart (1w/6m/1y) uses <strong>simulated</strong> returns — a smooth curve generated from broad annual return assumptions plus random day-to-day noise, seeded so it doesn&apos;t reshuffle every time you look at it. It&apos;s a rough illustration of scale, not real market behaviour.</Body>
            <p className={`${styles.calloutBox} ${styles.calloutBoxTight}`}>
              Returns used are based on broad historical performance categories as of {RETURNS_AS_OF} (e.g. global equities ~12–14% p.a., China ~-4% p.a.) and are for illustrative purposes only. They do not reflect any specific time period or guarantee future results.
            </p>
            <Body>The <strong>10-Year Historical Backtest</strong> on your portfolio page is different: it replays each fund&apos;s approximate real annual index returns from 2015–2024 in their actual sequence — the real pattern of up and down years, not synthetic noise. It&apos;s still approximate (we don&apos;t have a live data feed, and fund NAV returns differ slightly from the underlying index), but it&apos;s grounded in what markets actually did, not a random walk.</Body>
          </Section>

          <Section title="Fund cost (TER)">
            <Body>Every portfolio shows a <strong>blended TER</strong> — the weighted-average annual expense ratio across your holdings, taken from each fund&apos;s published factsheet. Lower is better: it&apos;s a direct, guaranteed drag on returns regardless of market performance, which is why the whole ETF strategy here leans on funds with TERs between 0.07% and 0.35%.</Body>
          </Section>

          <Section title="Goal Projector: how the three scenarios are built">
            <Body>If you enter a monthly investment amount, the portfolio page projects it forward under three growth scenarios over 10, 20, or 30 years, net of your blended TER.</Body>
            <InfoCard title="Expected" body="Derived from this specific portfolio's own approximate 2015–2024 historical annual growth rate — a bond-heavy Conservative mix will project a lower expected rate than an all-equity Growth mix, because that's what actually happened to each mix in this window."/>
            <InfoCard title="Pessimistic / Optimistic" body="Simple ±5 percentage-point bands around the expected rate. These are not statistical confidence intervals — we don't have enough historical data to derive real ones — just a rough sense of how sensitive the outcome is to the growth assumption."/>
            <InfoCard title="Contribution escalator" body="An optional +3/5/8%-per-year increase applied to your monthly contribution at the start of each subsequent year, modeling the habit of investing a raise instead of spending it. It's a what-if toggle, not automatic — the tool doesn't (and can't) actually increase your real-world transfers for you."/>
            <p className={styles.calloutBox}>
              This is a projection exercise, not a promise. Markets over your actual investing horizon could easily fall outside all three scenarios.
            </p>
          </Section>

          <Section title="The stress test: rehearsing the bad year">
            <Body>The <strong>&quot;Could You Stomach The Worst Year?&quot;</strong> card replays this portfolio&apos;s real blended 2015–2024 sequence to find its actual worst calendar year and largest peak-to-trough drawdown within that window — using the same approximate index data as the 10-Year Backtest, not a synthetic crash.</Body>
            <p className={styles.calloutBox}>
              A portfolio&apos;s worst historical decade rarely predicts its worst future one. This card exists to help you pick a risk level you can actually hold through, not to bound how bad a future downturn could get.
            </p>
          </Section>

          {/* Disclaimer */}
          <div className={styles.disclaimerBlock}>
            <p className={styles.disclaimerText}>
              WhatETF is an educational tool. Portfolios shown are illustrative examples and do not constitute financial advice. They do not take into account your personal financial situation, risk capacity, tax position, or investment goals. Consult a MAS-licensed financial adviser before making investment decisions.
            </p>
          </div>
        </div>
      </main>

    </div>
  )
}
