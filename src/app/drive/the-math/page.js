'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function Section({ title, children, noBorder }) {
  return (
    <div style={{ paddingTop: 36, borderTop: noBorder ? 'none' : '1px solid #E5E7EB', marginTop: noBorder ? 0 : 8 }}>
      {title && <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, color: '#0F2D6B', margin: '0 0 16px', lineHeight: 1.3 }}>{title}</h2>}
      {children}
    </div>
  )
}
function BodyText({ children, muted }) {
  return <p style={{ fontSize: 15, color: muted ? '#6B7280' : '#374151', lineHeight: 1.7, margin: '0 0 12px' }}>{children}</p>
}
function Formula({ children }) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#0F2D6B', lineHeight: 1.8, margin: '10px 0', padding: '12px 14px', background: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', whiteSpace: 'pre-wrap' }}>
      {children}
    </div>
  )
}
function Caveat({ children }) {
  return (
    <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, padding: '12px 16px', background: '#F9FAFB', borderRadius: 8, borderLeft: '3px solid #D1D5DB', marginTop: 10 }}>
      {children}
    </div>
  )
}
function PillarCard({ color, emoji, title, badge, summary, expandContent }) {
  const [open, setOpen] = useState(false)
  const colors = {
    teal:  { bg: '#E1F5EE', border: '#1D9E75', badgeBg: '#E1F5EE', badgeText: '#0F6E56' },
    amber: { bg: '#FAEEDA', border: '#EF9F27', badgeBg: '#FAEEDA', badgeText: '#854F0B' },
    blue:  { bg: '#E6F1FB', border: '#378ADD', badgeBg: '#E6F1FB', badgeText: '#185FA5' },
    gray:  { bg: '#F3F4F6', border: '#9CA3AF', badgeBg: '#F3F4F6', badgeText: '#6B7280' },
  }
  const c = colors[color] || colors.gray
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', borderTop: `3px solid ${c.border}`, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17, color: '#0F2D6B', flex: 1 }}>{title}</span>
        <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: c.badgeBg, color: c.badgeText }}>{badge}</span>
      </div>
      <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 8px' }}>{summary}</p>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1D9E75', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none', fontSize: 11 }}>▶</span>
        {open ? 'Hide details' : 'See how we calculate this'}
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: 16, background: '#F9FAFB', borderRadius: 10, borderLeft: '3px solid #1D9E75' }}>
          {expandContent}
        </div>
      )}
    </div>
  )
}

export default function TheMathPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 64 }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#0F2D6B', padding: '4px 8px 4px 0' }}>←</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontFamily: "'Clash Display', system-ui, sans-serif", fontSize: 10, fontWeight: 600, color: '#1C2B3A', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>Coah</span>
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17, color: '#0F2D6B', lineHeight: 1 }}>DriveReady</span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px' }}>

        {/* Hero */}
        <Section noBorder>
          <div style={{ paddingTop: 40, paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontFamily: "'Clash Display', system-ui, sans-serif", fontSize: 13, fontWeight: 600, color: '#1C2B3A', letterSpacing: '0.08em' }}>COAH</span>
              <span style={{ fontSize: 12, color: '#9CA3AF', borderLeft: '1px solid #E5E7EB', paddingLeft: 8 }}>Built for Singapore</span>
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(26px,5vw,36px)', color: '#0F2D6B', margin: '0 0 12px', lineHeight: 1.2 }}>How DriveReady calculates your numbers</h1>
            <BodyText>DriveReady doesn&apos;t guess. Every figure — monthly instalment, depreciation, COE rebate, true cost — comes from Singapore&apos;s actual financing and vehicle regulations. Here&apos;s exactly what we do.</BodyText>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {['MAS loan-to-value rules', 'Budget 2026 PARF schedule', 'LTA COE framework', 'ARF tiered structure'].map(tag => (
                <span key={tag} style={{ fontSize: 12, color: '#1D9E75', background: '#E1F5EE', padding: '4px 12px', borderRadius: 100, fontWeight: 500 }}>✓ {tag}</span>
              ))}
            </div>
          </div>
        </Section>

        {/* TL;DR */}
        <Section title="What DriveReady shows you">
          <BodyText>Four things drive the true cost of owning a car in Singapore. DriveReady calculates all of them.</BodyText>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { emoji: '💳', label: 'Monthly instalment',    desc: 'Based on your actual loan amount, the applicable flat rate, and your chosen tenure.' },
              { emoji: '📉', label: 'Affordability verdict', desc: 'We compare your instalment against 30% of your take-home pay (after 20% CPF deduction). Above 45% is flagged as high.' },
              { emoji: '🏚', label: 'Depreciation',          desc: 'True annual and monthly value loss — ARF paid, PARF rebate at sale, COE rebate, and paper value at your tenure.' },
              { emoji: '💰', label: 'Cost of ownership',     desc: 'Total cash out at milestone years — downpayment plus all instalments — net of what you&apos;d recover.' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', gap: 12, padding: 14, background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{item.emoji}</span>
                <div>
                  <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: 14, color: '#0F2D6B' }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Loan & Rate Tiers */}
        <Section title="Loan calculation">
          <BodyText>We use MAS loan-to-value (LTV) rules which depend on the car&apos;s Open Market Value (OMV).</BodyText>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Cat A (OMV ≤ S$20,000)',  loan: '70% max loan', down: '30% min downpayment', example: 'Most sedans, MPVs, smaller SUVs' },
              { label: 'Cat B (OMV > S$20,000)',   loan: '60% max loan', down: '40% min downpayment', example: 'Larger SUVs, performance cars' },
            ].map(row => (
              <div key={row.label} style={{ padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, color: '#0F2D6B' }}>{row.label}</p>
                <p style={{ margin: '0 0 2px', fontSize: 13, color: '#374151' }}>{row.loan} · {row.down}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{row.example}</p>
              </div>
            ))}
          </div>
          <Formula>{`Monthly instalment = (Loan × (1 + flat_rate × tenure)) ÷ (tenure × 12)

Flat rates applied:
  Standard ICE (petrol/diesel):    2.60% p.a.
  Green (EV / hybrid):             2.08% p.a.  ← preferred rate for clean vehicles
  Tesla preferential:              1.68% p.a.

Your loan amount:
  If downpayment > minimum required:
    Loan = min(price − downpayment, max_loan)
  Otherwise:
    Loan = max_loan (and a shortfall is flagged)`}</Formula>
          <Caveat>Tesla preferential rate applies only to Tesla models and is shown for comparison only. All other EVs and hybrids use the 2.08% green rate. Rates are indicative and subject to change by financial institutions.</Caveat>
        </Section>

        {/* Affordability */}
        <Section title="Affordability verdict">
          <BodyText>We use 20% as the CPF employee contribution estimate (standard rate for most Singaporean workers) to arrive at take-home pay.</BodyText>
          <Formula>{`Take-home pay ≈ gross salary × 0.80

Monthly burden ratio = monthly instalment ÷ take-home pay

Verdicts:
  ≤ 30%  → Affordable     (safe zone)
  31–45% → Stretch        (manageable, limited buffer)
  > 45%  → Out of Range   (caution — high financial stress risk)
  
  Also flagged: Insufficient Downpayment
    (when cash on hand < required minimum downpayment)`}</Formula>
          <Caveat>CPF rates vary by age and residency status. The 20% estimate applies to Singapore Citizens and PRs aged 35–55 earning above the CPF wage ceiling. Your actual take-home may differ.</Caveat>
        </Section>

        {/* ARF */}
        <Section title="ARF — Additional Registration Fee">
          <BodyText>ARF is a tax paid at registration, calculated as a percentage of the car&apos;s OMV. It&apos;s part of what you pay at purchase and what you recover (partly) at deregistration.</BodyText>
          <Formula>{`ARF tiers (tiered on OMV):
  OMV up to S$20,000:            100% of OMV
  OMV S$20,001 – S$50,000:      140% on the excess
  OMV S$50,001 – S$80,000:      180% on the excess
  OMV above S$80,000:           220% on the excess

Example (OMV = S$28,000):
  ARF = (20,000 × 100%) + (8,000 × 140%)
      = S$20,000 + S$11,200 = S$31,200`}</Formula>
        </Section>

        {/* PARF */}
        <Section title="PARF — Preferential Additional Registration Fee rebate">
          <BodyText>When you deregister your car (scrap or export), you get back a portion of the ARF you paid. This is the PARF rebate. It decreases the longer you keep the car.</BodyText>
          <Formula>{`Budget 2026 PARF schedule (effective 13 Feb 2026):
  Deregistered at year 1–5:   30% of ARF paid (capped at S$30,000)
  Deregistered at year 6:     25% of ARF paid (capped at S$30,000)
  Deregistered at year 7:     20% of ARF paid (capped at S$30,000)
  Deregistered at year 8:     15% of ARF paid (capped at S$30,000)
  Deregistered at year 9:     10% of ARF paid (capped at S$30,000)
  Deregistered at year 10:     5% of ARF paid (capped at S$30,000)
  After year 10:               0% (no PARF rebate)`}</Formula>
          <Caveat>DriveReady applies the S$30,000 cap introduced in Budget 2026. Cars deregistered before 13 Feb 2026 used an earlier schedule. Always verify current rates on the LTA website.</Caveat>
        </Section>

        {/* COE */}
        <Section title="COE — Certificate of Entitlement rebate">
          <BodyText>Your COE entitles you to use the vehicle for 10 years. If you deregister early, you get back the unused portion pro-rated by remaining months.</BodyText>
          <Formula>{`COE rebate = (remaining months ÷ 120) × COE paid

Estimated COE paid = price − OMV − ARF − registration fee − GST
  (Registration fee ≈ S$220, GST ≈ 9% of OMV, dealer margin ≈ 5% of price)

This is an estimate — actual COE premiums change every bidding exercise.`}</Formula>
        </Section>

        {/* Depreciation */}
        <Section title="True depreciation">
          <BodyText>Depreciation is the difference between what you paid and what you&apos;d get back if you deregistered the car today. It&apos;s the biggest hidden cost most buyers overlook.</BodyText>
          <Formula>{`Paper value at year Y = PARF rebate (Y) + COE rebate (Y)

Total depreciation = price paid − paper value
Annual depreciation = total depreciation ÷ Y
Monthly depreciation = annual depreciation ÷ 12

True effective monthly cost = instalment + monthly depreciation`}</Formula>
          <Caveat>Paper value reflects Singapore regulatory rebates, not resale market value. Actual resale prices may be higher or lower depending on demand, condition, and remaining COE.</Caveat>
        </Section>

        {/* Why free */}
        <div style={{ marginTop: 36, padding: 20, background: '#1C2B3A', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: "'Clash Display', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '0.08em' }}>COAH</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why this is free</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: 0 }}>
            DriveReady has no ads, no affiliate links, and no dealer referral fees. We don&apos;t earn anything when you use it. It&apos;s free because Singaporeans deserve to know the real numbers before they sign a hire-purchase agreement. This is what Coah is built for.
          </p>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, margin: '0 0 6px' }}>
            DriveReady is an educational tool. It does not constitute financial advice. Car prices, COE premiums, and financing rates are indicative and subject to change. All figures should be verified with the relevant dealer, bank, and LTA before making a purchase decision.
          </p>
          <p style={{ fontSize: 11, color: '#C4C9D4', margin: '0 0 20px' }}>Not affiliated with any insurer or MAS-licensed entity.</p>
          <div style={{ paddingTop: 16, borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'Clash Display', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1C2B3A', letterSpacing: '0.08em' }}>COAH</span>
              <span style={{ fontSize: 11, color: '#9CA3AF', borderLeft: '1px solid #E5E7EB', paddingLeft: 8 }}>Modern Utilities for the Common Good</span>
            </div>
            <a href="/drive" style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'none' }}>coah.vercel.app/drive</a>
          </div>
        </div>
      </div>
    </div>
  )
}
