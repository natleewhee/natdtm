import ShellHeader from '@/components/shared/ShellHeader'

const TOOLS = [
  {
    href: '/insure',
    eyebrow: 'Insure',
    title: 'InsureCheck',
    desc: 'A free, 3-minute Insurance Score. See your critical illness, life/TPD, and hospitalisation gaps in real dollars — not jargon.',
  },
  {
    href: '/drive',
    eyebrow: 'Drive',
    title: 'DriveReady',
    desc: 'Singapore car affordability calculator. Know your true monthly cost — instalment, PARF/COE depreciation, TDSR — before you commit.',
  },
  {
    href: '/etf',
    eyebrow: 'Invest',
    title: 'WhatETF',
    desc: 'Build an illustrative ETF portfolio for Singapore investors. UCITS-aware, tax-efficient, DCA-ready — runs entirely in your browser.',
  },
  {
    href: '/house',
    eyebrow: 'House',
    title: 'HouseMuch',
    desc: 'What did your house really make you? True profit/loss after CPF refund, mortgage interest, and stamp duties — not just sale minus purchase.',
  },
  {
    href: '/retire',
    eyebrow: 'Retire',
    title: 'RetireWell',
    desc: 'Will you actually have enough? CPF contributions projected properly, your investments stress-tested against a safe withdrawal rate — not a rule of thumb.',
  },
  {
    href: '/tax',
    eyebrow: 'Tax',
    title: 'TaxWise',
    desc: 'What you actually owe IRAS, and what each relief is really worth. CPF, SRS and CPF top-up relief priced in dollars saved — not percentages.',
  },
  {
    href: '/ledger',
    eyebrow: 'Everything',
    title: 'MyLedger',
    desc: 'Your whole picture at once — net worth, debt servicing across every loan, and what buying a car or upgrading your house does to your retirement.',
  },
  {
    href: '/flow',
    eyebrow: 'Cashflow',
    title: 'FlowState',
    desc: 'Where your salary actually goes — CPF split from cash automatically, your mortgage split into what is paid from CPF vs cash, and the one month a year your account runs dry.',
  },
]

export default function HomePage() {
  return (
    <>
    <ShellHeader />
    <div className="shell-wrap" style={{ padding: '56px 24px 80px' }}>
      <p style={{
        fontFamily: 'var(--l-font-mono)', fontSize: 12, letterSpacing: '.12em',
        textTransform: 'uppercase', color: 'var(--l-sub)', margin: '0 0 14px',
      }}>
        Eight calculators, one household
      </p>
      <h1 style={{
        fontFamily: 'var(--l-font-display)', fontWeight: 600, fontSize: 'clamp(28px,4vw,42px)',
        lineHeight: 1.1, letterSpacing: '-0.01em', margin: '0 0 16px', maxWidth: '18ch',
      }}>
        The math behind your biggest Singapore money decisions.
      </h1>
      <p style={{ color: 'var(--l-sub)', maxWidth: '58ch', fontSize: 16, margin: '0 0 40px' }}>
        No accounts, no upsells. Each tool shows exactly how it got to its answer —
        pick the decision you&apos;re facing.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {TOOLS.map((t) => (
          <a
            key={t.href}
            href={t.href}
            style={{
              display: 'block', padding: '24px 22px', border: '1px solid var(--l-line)',
              borderRadius: 4, textDecoration: 'none', color: 'var(--l-ink)',
              background: 'var(--l-surface)',
            }}
          >
            <p style={{
              fontFamily: 'var(--l-font-mono)', fontSize: 11, letterSpacing: '.1em',
              textTransform: 'uppercase', color: 'var(--l-accent)', margin: '0 0 10px',
            }}>
              {t.eyebrow}
            </p>
            <p style={{ fontFamily: 'var(--l-font-display)', fontWeight: 600, fontSize: 20, margin: '0 0 8px' }}>
              {t.title}
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--l-sub)', margin: 0, lineHeight: 1.5 }}>
              {t.desc}
            </p>
          </a>
        ))}
      </div>
    </div>
    </>
  )
}
