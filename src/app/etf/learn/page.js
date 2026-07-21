'use client'

import SubNav from '@/components/shared/SubNav'
import styles from './learn.module.css'

function Section({ title, children, noBorder }) {
  return (
    <div className={noBorder ? `${styles.section} ${styles.sectionNoBorder}` : styles.section}>
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

export default function LearnPage() {
  return (
    <div className={styles.page}>
      <SubNav title="Learn" breadcrumb="WhatETF" backHref="/etf" links={[{ href: '/etf/the-math', label: 'The Math' }]} />

      <main className={styles.main}>
        <div className={styles.content}>

          <Section noBorder>
            <div className={styles.hero}>
              <div className={styles.heroHeader}>
                <span className={styles.heroLabel}>COAH</span>
                <span className={styles.heroSub}>Learn</span>
              </div>
              <h1 className={styles.heroTitle}>Investing basics for Singapore</h1>
              <Body>The parts of DIY ETF investing that trip people up most — mechanics, not opinions. Not financial advice; always verify current terms with your own broker, bank, or a licensed adviser.</Body>
            </div>
          </Section>

          <Section title="Can I use my SRS account for this?">
            <Body>Supplementary Retirement Scheme (SRS) funds can only be invested through products your <strong>SRS-approved bank</strong> (DBS, OCBC, or UOB) specifically offers under the scheme — you generally can&apos;t use SRS funds to buy whatever you like at any brokerage.</Body>
            <Body>Whether a specific UCITS ETF like VWRA or CSPX is SRS-eligible depends entirely on your SRS bank&apos;s current approved investment list, which changes over time and differs by bank. Check your SRS bank&apos;s list directly before assuming an ETF from this tool is SRS-eligible — this is one of the most common points of confusion for new investors.</Body>
          </Section>

          <Section title="Accumulating vs Distributing ETFs">
            <Body>Every ETF handles dividends one of two ways.</Body>
            <InfoCard title="Accumulating" body="Dividends are automatically reinvested inside the fund — the share price reflects this. You never see cash hit your account. Simpler for DCA: no manual reinvestment, no small idle cash balances, generally more tax- and cost-efficient since there's no repeated buy-sell friction." />
            <InfoCard title="Distributing" body="Dividends are paid out to you in cash on a schedule (often quarterly). Useful if you want income from your portfolio, but for pure long-term growth it just adds a manual step — you have to reinvest that cash yourself or it sits idle." />
            <Body>Most of the funds this tool suggests (like VWRA) are the accumulating share class specifically because DCA investors rarely want the extra step.</Body>
          </Section>

          <Section title="LSE order types: limit vs market">
            <Body>UCITS ETFs bought on the London Stock Exchange (LSE) are usually quoted in a currency (GBP, USD, or EUR depending on the listing) with a bid-ask spread, just like any exchange-traded security.</Body>
            <InfoCard title="Market order" body="Executes immediately at whatever the best available price is right now. Simple, but on a less liquid ETF or during volatile periods the fill price can be meaningfully worse than what you saw a moment ago." />
            <InfoCard title="Limit order" body="You set the maximum price you're willing to pay (or minimum to sell). It won't execute above that price, but it also might not execute at all if the market never reaches it. Generally the safer default for ETF purchases, especially for larger amounts." />
            <Body>For a monthly DCA buy of a liquid fund like VWRA or CSPX, a limit order set close to the current price is a reasonable default — it protects against a bad fill without much risk of never executing.</Body>
          </Section>

          <Section title="What UCITS means, and why domicile matters">
            <Body><strong>UCITS</strong> (Undertakings for Collective Investment in Transferable Securities) is an EU regulatory framework for retail investment funds. In practice, &quot;UCITS ETF&quot; almost always means the fund is domiciled in Ireland or Luxembourg rather than the US.</Body>
            <Body>For Singapore investors, domicile changes the dividend withholding tax rate: Ireland-domiciled funds pay 15% US withholding tax on US-sourced dividends under Ireland&apos;s tax treaty, versus 30% for US-domiciled funds bought directly (like VOO or SPY). See <a href="/etf/the-math">The Math</a> for the full breakdown.</Body>
          </Section>

          <Section title="Total cost of ownership: it's more than TER">
            <Body>The published Total Expense Ratio (TER) is a real, guaranteed cost — but it&apos;s not the only one. A fund&apos;s true annual cost also includes:</Body>
            <InfoCard title="Bid-ask spread" body="The gap between what you can buy at and sell at, paid every time you trade. Wider on smaller or less-traded ETFs." />
            <InfoCard title="FX conversion" body="If your brokerage account is in SGD and the ETF trades in GBP or USD, converting currency costs money — either an explicit fee or a spread baked into the exchange rate. See the Broker Cost Comparison on your portfolio page." />
            <InfoCard title="Tracking difference" body="A fund's actual return can differ slightly from its underlying index even after accounting for TER, due to how well it replicates the index, cash drag, and securities lending income (which can sometimes offset costs)." />
            <Body>None of this means TER doesn&apos;t matter — it&apos;s the largest and most predictable of these costs — just that the number on the factsheet isn&apos;t the whole story.</Body>
          </Section>

          <Section title="Dollar-cost averaging vs lump sum">
            <Body>If you already have a lump sum, the maths (on average, across most historical periods) mildly favours investing it immediately rather than spreading it out — markets rise more often than they fall, so time in the market usually beats waiting.</Body>
            <Body>Dollar-cost averaging (DCA) exists for a different reason: it&apos;s not about maximising expected returns, it&apos;s about behaviour. Investing a fixed amount every month regardless of price removes the temptation to time the market, smooths out the emotional experience of volatility, and matches how most people actually receive income — a salary, not a windfall. For anyone investing from ongoing income rather than a lump sum, DCA isn&apos;t really an alternative strategy — it&apos;s just how investing works.</Body>
          </Section>

          <Section title="Rebalancing: why and how often">
            <Body>Over time, funds that perform well become a larger share of your portfolio than you originally intended, and funds that lag shrink — your actual risk profile drifts away from the one you chose. Rebalancing brings it back.</Body>
            <Body>You don&apos;t need to sell anything to rebalance a growing DCA portfolio: simply steering new contributions toward whichever fund has drifted below target — <a href="/etf/rebalance">the Rebalancing Helper does this math for you</a> — gets you back to target without triggering any realised gains or extra transaction costs. Once a year is a reasonable check-in cadence for most people; more often adds cost and effort without much benefit.</Body>
          </Section>

          {/* Disclaimer */}
          <div className={styles.disclaimerBlock}>
            <p className={styles.disclaimerText}>
              This page is educational only and does not constitute financial, tax, or legal advice. Rules around SRS, withholding tax, and brokerage products change — always verify current terms directly with your bank, broker, or a MAS-licensed financial adviser before acting.
            </p>
          </div>
        </div>
      </main>

    </div>
  )
}
