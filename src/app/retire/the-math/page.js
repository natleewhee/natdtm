'use client'

import { useRouter } from 'next/navigation'
import { C } from '@/lib/retire/theme'
import ShellHeader from '@/components/shared/ShellHeader'
import MathTOC from '@/components/shared/MathTOC'
import { CPF_RATES_AS_OF, CPF_OW_CEILING, CPF_CONTRIBUTION_TABLE, CPF_OA_RATE, CPF_SA_RATE, CPF_EXTRA_BELOW_55_RATE, CPF_EXTRA_BELOW_55_CAP, CPF_EXTRA_OA_CAP, CPF_EXTRA_55_TIER1_RATE, CPF_EXTRA_55_TIER1_CAP, CPF_EXTRA_55_TIER2_RATE, CPF_EXTRA_55_TIER2_CAP } from '@/lib/retire/cpf'

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
function Section({ title, children, noBorder }) {
  return (
    <div id={title ? slug(title) : undefined} style={{ paddingTop: 36, borderTop: noBorder ? 'none' : `1px solid ${C.border}`, marginTop: noBorder ? 0 : 8, scrollMarginTop: 80 }}>
      {title && <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 16px', lineHeight: 1.3 }}>{title}</h2>}
      {children}
    </div>
  )
}
function P({ children }) {
  return <p style={{ fontSize: C.base, color: C.text, lineHeight: 1.8, margin: '0 0 14px' }}>{children}</p>
}
function Formula({ children }) {
  return (
    <div style={{ fontFamily: C.fontMono, fontSize: 12, color: C.text, lineHeight: 1.8, margin: '10px 0', padding: '12px 14px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, whiteSpace: 'pre-wrap' }}>
      {children}
    </div>
  )
}
function Caveat({ children }) {
  return (
    <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, padding: '12px 16px', background: C.surface, borderRadius: 8, borderLeft: `3px solid ${C.accent}`, marginTop: 10 }}>
      {children}
    </div>
  )
}

export default function RetireTheMathPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="The Math" breadcrumb="RetireWell" onBack={() => router.back()} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 32, color: C.primary, margin: '0 0 8px' }}>How I check your retirement readiness</h1>
        <p style={{ fontSize: C.base, color: C.muted, margin: '0 0 8px' }}>
          Every CPF contribution, every interest tier, every assumption — laid out so you can judge them yourself.
        </p>

        <MathTOC items={[
          { id: 'why-not-just-the-4-rule', label: 'Why not the 4% rule' },
          { id: 'cpf-contributions', label: 'CPF contributions' },
          { id: 'cpf-interest', label: 'CPF interest' },
          { id: 'accumulation-now-retirement-age', label: 'Accumulation' },
          { id: 'the-retirement-target', label: 'Retirement target' },
          { id: 'depletion-simulation', label: 'Depletion simulation' },
          { id: 'limitations', label: 'Limitations' },
        ]} />

        <Section noBorder>
          <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 16px' }} id="why-not-just-the-4-rule">Why not the 4% rule</h2>
          <P>The commonly-cited &quot;safe withdrawal rate&quot; is 4%, from Bengen&apos;s 1994 study and the Trinity Study (1998) — both based on a 30-year retirement with a <strong>50–75% equity</strong> portfolio. Later research (Kitces, Pfau) suggests 3–3.5% is more prudent for retirements longer than 30 years or lower expected forward returns.</P>
          <P>I default to <strong>3%</strong> here, but with a caveat worth taking seriously: that research assumes a growth-oriented portfolio, where continued appreciation during retirement is what lets withdrawals continue indefinitely without depleting principal. If your investments are <strong>money market funds</strong> — low-volatility, low-return, roughly tracking short-term interest rates — the &quot;withdraw 3% forever&quot; framing doesn&apos;t hold the same way. That&apos;s why this calculator always runs a second check: the <a href="#depletion-simulation" style={{ color: C.accent }}>depletion simulation</a> below, which actually draws down your balance year by year instead of assuming perpetuity.</P>
        </Section>

        <Section title="CPF contributions">
          <P>Monthly CPF contribution = your salary, capped at the Ordinary Wage ceiling, times your age-banded contribution rate. The rate is split into three sub-accounts — Ordinary (OA), Special (SA), and MediSave (MA):</P>
          <Formula>{CPF_CONTRIBUTION_TABLE.map(b =>
            `Age ${b.minAge}${b.maxAge >= 999 ? '+' : `–${b.maxAge}`}: ${(b.total * 100).toFixed(1)}% total  (OA ${(b.oa * 100).toFixed(1)}% · SA ${(b.sa * 100).toFixed(1)}% · MA ${(b.ma * 100).toFixed(1)}%)`
          ).join('\n')}</Formula>
          <P>Ordinary Wage ceiling: S${CPF_OW_CEILING.toLocaleString('en-SG')}/month. Bonuses and other additional wages aren&apos;t modeled — only base salary.</P>
          <Caveat>Contribution rates for ages above 55 are on a multi-year phase-in (announced in Budget 2023) moving toward parity with the below-55 rate by around 2030 — they change periodically. Figures above are a good-faith snapshot as of {CPF_RATES_AS_OF}, not pulled live from CPF Board. Verify against the official CPF contribution rate tables, especially if you&apos;re in the 55+ bands.</Caveat>
        </Section>

        <Section title="CPF interest">
          <P>Base interest: {(CPF_OA_RATE * 100).toFixed(1)}% p.a. on OA, {(CPF_SA_RATE * 100).toFixed(0)}% p.a. on SA and MA, compounded monthly. On top of that, CPF pays extra interest on your combined OA+SA+MA balance:</P>
          <Formula>{`Below 55:  +${(CPF_EXTRA_BELOW_55_RATE * 100).toFixed(0)}% on the first S$${CPF_EXTRA_BELOW_55_CAP.toLocaleString('en-SG')} combined
           (at most S$${CPF_EXTRA_OA_CAP.toLocaleString('en-SG')} of that can come from OA)

55 and above:  +${(CPF_EXTRA_55_TIER1_RATE * 100).toFixed(0)}% on the first S$${CPF_EXTRA_55_TIER1_CAP.toLocaleString('en-SG')} combined
               +${(CPF_EXTRA_55_TIER2_RATE * 100).toFixed(0)}% on the next S$${CPF_EXTRA_55_TIER2_CAP.toLocaleString('en-SG')} combined
               (same S$${CPF_EXTRA_OA_CAP.toLocaleString('en-SG')} OA cap applies to each tier)`}</Formula>
          <P>OA is counted first against these caps, since it&apos;s the sub-account most people have the most of early on — matching how CPF Board actually allocates the extra interest.</P>
        </Section>

        <Section title="Accumulation (now → retirement age)">
          <P>Each month until your retirement age: your salary generates a CPF contribution (above), any CPF you draw for housing reduces your OA balance, then interest is credited on the resulting balances. In parallel, your money-market investment balance grows from your monthly contribution plus its own assumed return.</P>
          <Formula>{`OA(t+1) = OA(t) + CPF contribution to OA − housing OA draw, then + interest
SA(t+1) = SA(t) + CPF contribution to SA, then + interest
MA(t+1) = MA(t) + CPF contribution to MA, then + interest

Investment(t+1) = Investment(t) × (1 + monthly return) + monthly contribution`}</Formula>
          <Caveat>Salary is held flat in nominal terms — no wage-growth assumption is modeled. Since real salaries usually grow over a career, this is a deliberately conservative simplification: it likely understates your real CPF savings, not overstates them. CPF&apos;s actual Retirement Account sweep at age 55 (moving OA+SA into an RA up to the prevailing Retirement Sum) also isn&apos;t modeled — OA and SA simply keep compounding at their own rates throughout, since your CPF LIFE payout is taken as a number you look up yourself rather than derived from an RA balance (the real CPF LIFE payout formula isn&apos;t public).</Caveat>
        </Section>

        <Section title="The retirement target">
          <P>Your desired monthly withdrawal, stated in today&apos;s dollars, is escalated by inflation to your first year of retirement — then that dollar figure keeps escalating with inflation every year after, which is exactly the mechanic the 3–4% rule is built around (withdraw a fixed % of the starting balance, then increase the dollar amount by inflation, not by portfolio performance):</P>
          <Formula>{`Year-1 monthly withdrawal = Desired withdrawal (today's $) × (1 + inflation)^(years to retirement)

Monthly withdrawal from investments = Year-1 withdrawal − Expected CPF LIFE payout

Required nest egg = (Monthly withdrawal from investments × 12) ÷ Safe withdrawal rate`}</Formula>
          <P>Your projected investment balance at retirement is then compared against this required nest egg — a surplus means you&apos;re on track; a gap shows the extra monthly contribution (invested at your same assumed return, starting today) needed to close it, computed from the standard future-value-of-an-annuity formula solved for the payment.</P>
          <Caveat>Expected CPF LIFE payout is a number you supply yourself, from the CPF Retirement dashboard&apos;s own estimator — the actual payout formula depends on your Retirement Account balance, chosen plan (Standard/Basic/Escalating), and your cohort&apos;s effective interest rate, none of which is published as a simple formula I can reproduce here.</Caveat>
        </Section>

        <Section title="Depletion simulation">
          <P>Rather than trusting the safe-withdrawal-rate framing to hold forever, this simulates what actually happens to your investment balance, year by year, from retirement age to your planning-until age:</P>
          <Formula>{`Balance(year+1) = Balance(year) × (1 + assumed return) − this year's withdrawal
This year's withdrawal escalates by inflation every year, same as above.`}</Formula>
          <P>If the balance hits zero before your planning-until age, that age is shown as when your money runs out. If it never hits zero, your investments last the full horizon. For a money-market-only portfolio with a modest return, this can disagree with the safe-withdrawal-rate check above — and when it does, I&apos;d trust this simulation more, since it doesn&apos;t assume indefinite sustainability the way the 3-4% rule research does.</P>
        </Section>

        <Section title="Limitations">
          <P>This calculator doesn&apos;t model: bonus/AWS CPF contributions, wage growth over your career, the CPF Retirement Account sweep and Retirement Sum mechanics at age 55, an exact CPF LIFE payout (taken as your own manual estimate instead), Supplementary Retirement Scheme (SRS) contributions, sequence-of-returns risk (a bad run of returns early in retirement is riskier than the same average return spread evenly — this simulation uses one constant assumed return throughout), or taxes. The money-market return and inflation rate are both single constant assumptions for the entire horizon, which in reality will fluctuate with interest-rate cycles.</P>
          <Caveat>MediSave contributions in real life stop once your MA balance hits the Basic Healthcare Sum (BHS) — excess is redirected to SA (or RA after 55) instead. This calculator doesn&apos;t cap MA, so over a long projection its MA figure will look unrealistically large. Your <em>total</em> CPF figure is unaffected (SA and MA earn the same base rate, so misattributing the account doesn&apos;t change the total), but don&apos;t take the OA/SA/MA split at face value for long horizons — only the total.</Caveat>
        </Section>

        <div style={{ marginTop: 40, padding: 20, background: C.surface, borderRadius: C.rL, border: `1px solid ${C.border}`, fontSize: C.xs, color: C.faint, lineHeight: 1.7 }}>
          This tool is for educational purposes only. It does not constitute financial advice. All figures are estimates based on public formulas and general research on withdrawal rates — they are not guaranteed and may not reflect the latest CPF Board rates. Consult a MAS-licensed financial adviser before making any retirement decision. Not affiliated with CPF Board or MAS.
        </div>
      </div>
    </div>
  )
}
