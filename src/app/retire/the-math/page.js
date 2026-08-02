'use client'

import { useRouter } from 'next/navigation'
import { C } from '@/lib/retire/theme'
import ShellHeader from '@/components/shared/ShellHeader'
import MathTOC from '@/components/shared/MathTOC'
import {
  CPF_RATES_AS_OF, CPF_OW_CEILING, CPF_ANNUAL_CEILING, CPF_CONTRIBUTION_TABLE, CPF_OA_RATE, CPF_SA_RATE,
  CPF_EXTRA_BELOW_55_RATE, CPF_EXTRA_BELOW_55_CAP, CPF_EXTRA_OA_CAP, CPF_EXTRA_55_TIER1_RATE, CPF_EXTRA_55_TIER1_CAP,
  CPF_EXTRA_55_TIER2_RATE, CPF_EXTRA_55_TIER2_CAP, CPF_FRS_BASE, CPF_FRS_BASE_YEAR, CPF_FRS_GROWTH_RATE,
  CPF_BHS_BASE, CPF_BHS_BASE_YEAR, CPF_BHS_GROWTH_RATE,
} from '@/lib/retire/cpf'
import { SRS_RETIREMENT_AGE, SRS_WITHDRAWAL_TAXABLE_FRACTION, SRS_MAX_WITHDRAWAL_YEARS, SRS_EARLY_WITHDRAWAL_PENALTY_PCT } from '@/lib/retire/srs'

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
          { id: 'bonus-and-the-annual-wage-ceiling', label: 'Bonus/AWS' },
          { id: 'cpf-interest', label: 'CPF interest' },
          { id: 'medisave-and-the-basic-healthcare-sum', label: 'MediSave cap' },
          { id: 'retirement-sum-topping-up-rstu', label: 'RSTU' },
          { id: 'accumulation-now-retirement-age', label: 'Accumulation' },
          { id: 'the-retirement-target', label: 'Retirement target' },
          { id: 'depletion-simulation', label: 'Depletion simulation' },
          { id: 'supplementary-retirement-scheme-srs', label: 'SRS' },
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
          <P>Ordinary Wage ceiling: S${CPF_OW_CEILING.toLocaleString('en-SG')}/month.</P>
          <Caveat>Contribution rates for ages above 55 are on a multi-year phase-in (announced in Budget 2023) moving toward parity with the below-55 rate by around 2030 — they change periodically. Figures above are a good-faith snapshot as of {CPF_RATES_AS_OF}, not pulled live from CPF Board. Verify against the official CPF contribution rate tables, especially if you&apos;re in the 55+ bands.</Caveat>
        </Section>

        <Section title="Bonus and the annual wage ceiling">
          <P>An annual bonus/AWS is also subject to CPF — but only up to whatever&apos;s left of the total annual wage ceiling after your regular salary has used its share:</P>
          <Formula>{`Total annual CPF wage ceiling: S$${CPF_ANNUAL_CEILING.toLocaleString('en-SG')}

Bonus subject to CPF = min(your bonus, S$${CPF_ANNUAL_CEILING.toLocaleString('en-SG')} − this year's Ordinary Wages already credited)

The CPF-able portion of your bonus is split into OA/SA/MA using
the same age-banded rates as your monthly salary, credited once
a year.`}</Formula>
          <P>A high earner already at the S${CPF_OW_CEILING.toLocaleString('en-SG')}/month Ordinary Wage ceiling for all 12 months has used S${(CPF_OW_CEILING * 12).toLocaleString('en-SG')} of the annual ceiling already — leaving only S${(CPF_ANNUAL_CEILING - CPF_OW_CEILING * 12).toLocaleString('en-SG')} of bonus that&apos;s CPF-able that year. Everything beyond that is still real income, just not CPF income.</P>
          <P>Your bonus escalates every year at the same assumed growth rate as your salary — bonuses are typically proportional to salary in practice, so growing them together (rather than holding the bonus flat while salary compounds) avoids understating your CPF contributions over a long projection.</P>
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

        <Section title="MediSave and the Basic Healthcare Sum">
          <P>MediSave contributions are capped at your applicable Basic Healthcare Sum (BHS). Once your MA balance hits it, contributions that would have gone to MA are redirected to SA (or RA, from 55) instead — the same overflow behavior real CPF applies:</P>
          <Formula>{`Room for MA this contribution = applicable BHS − current MA balance
MA credited = min(MA share of contribution, room)
Overflow (if any) = MA share − MA credited, added to SA instead

Prevailing BHS(year) = S$${CPF_BHS_BASE.toLocaleString('en-SG')} × (1 + ${(CPF_BHS_GROWTH_RATE * 100).toFixed(2)}%)^(year − ${CPF_BHS_BASE_YEAR})`}</Formula>
          <P>Historical BHS figures (S$52,000 in 2017 rising to S$79,000 in 2026) fit a steady ~{(CPF_BHS_GROWTH_RATE * 100).toFixed(2)}% p.a. growth curve within less than 1% at every point along the way — used here instead of a frozen figure, which would badly understate the real cap decades out.</P>
          <P><strong>Your <em>applicable</em> BHS isn&apos;t always the current prevailing figure, though.</strong> Before you turn 65, it is — it moves with the schedule above as you age. But once you turn 65, your BHS locks in for life at whatever the prevailing figure was that year (a &quot;cohort&quot; figure), even as the prevailing figure keeps climbing for everyone younger. Someone who turned 65 in 2022 has a BHS fixed at S$66,000 forever, regardless of what today&apos;s prevailing figure is. This calculator freezes the applicable BHS the month you turn 65 and holds it there for the rest of the projection.</P>
          <P>Once MA is capped, it still earns interest as normal — interest isn&apos;t redirected, only new contributions are, so MA can end up above your applicable BHS over time purely from compounding on an already-capped balance.</P>
        </Section>

        <Section title="Retirement Sum Topping-Up (RSTU)">
          <P>A voluntary top-up straight into SA (or RA, from 55) rather than split across accounts — the standard move for growing your CPF retirement pot faster, since SA/RA earn a higher rate than OA. You can contribute monthly or as a single annual lump sum; either way, CPF only accepts a top-up up to your applicable Full Retirement Sum (FRS), rejecting anything that would push you over:</P>
          <Formula>{`Room for RSTU (at each contribution) = applicable FRS − current SA balance
RSTU credited = min(your top-up, room)

Prevailing FRS(year) = S$${CPF_FRS_BASE.toLocaleString('en-SG')} × (1 + ${(CPF_FRS_GROWTH_RATE * 100).toFixed(1)}%)^(year − ${CPF_FRS_BASE_YEAR})`}</Formula>
          <P>The FRS rises roughly {(CPF_FRS_GROWTH_RATE * 100).toFixed(1)}% a year on a schedule CPF Board announces in advance — modeled as steady growth rather than frozen, same reasoning as BHS above. It has the same cohort-freeze mechanic too, just at a different milestone: <strong>your applicable FRS locks in for life at age 55</strong> (when your Retirement Account is created), not 65. Before 55, it&apos;s the current prevailing figure; from 55 on, it&apos;s frozen at whatever the prevailing figure was the year you turned 55, even as the prevailing figure keeps rising for people younger than you. If your projection shows your top-ups getting capped at some age, that&apos;s either the prevailing ceiling (under 55) or your own frozen ceiling (55+) catching up with your SA balance.</P>
          <P>Choosing annual instead of monthly changes <em>when</em> the same yearly total is credited (once, at year-end, versus spread across 12 months) — spreading it monthly compounds slightly more since each dollar sits in SA longer on average, so annual and monthly aren&apos;t quite equivalent even before either hits the FRS cap.</P>
          <Caveat>RSTU also comes with real income tax relief — up to S$8,000/year for topping up your own account, another S$8,000/year for a family member&apos;s. This calculator doesn&apos;t compute that relief (it would need your marginal tax rate, which this tool doesn&apos;t collect) — treat it as an added incentive on top of the balances shown, not something already baked into the numbers.</Caveat>
        </Section>

        <Section title="Accumulation (now → retirement age)">
          <P>Each month until your retirement age: your salary (escalating annually at your assumed growth rate) generates a CPF contribution, split into OA/SA/MA and credited with the MediSave overflow rule above applied. Any CPF you draw for housing reduces your OA balance, any RSTU top-up is credited to SA (subject to its cap above), then interest is credited on the resulting balances. Once a year, your bonus/AWS contribution (if any) is added the same way, overflow included. In parallel, your money-market investment balance grows from your monthly contribution plus its own assumed return.</P>
          <Formula>{`OA(t+1) = OA(t) + CPF contribution to OA − housing OA draw, then + interest
SA(t+1) = SA(t) + CPF contribution to SA + RSTU credited + MA overflow, then + interest
MA(t+1) = MA(t) + CPF contribution to MA (capped at applicable BHS), then + interest

Investment(t+1) = Investment(t) × (1 + monthly return) + monthly contribution`}</Formula>
          <P>If your OA balance is ever too low to cover the full monthly housing draw you entered, this calculator deducts whatever OA has (down to zero) and flags the age it happened, rather than letting the balance go negative or silently pretending the shortfall didn&apos;t occur — a real mortgage doesn&apos;t partially stop getting paid, so treat that flag as a sign either your housing figures, your CPF starting balances, or your salary assumptions need a second look.</P>
          <Caveat>CPF&apos;s actual Retirement Account sweep at age 55 (moving OA+SA into an RA up to the prevailing Retirement Sum) isn&apos;t modeled — OA and SA simply keep compounding at their own rates straight through and past retirement age.</Caveat>
        </Section>

        <Section title="The retirement target">
          <P>Your desired monthly withdrawal, stated in today&apos;s dollars, is escalated by inflation to your first year of retirement — then that dollar figure keeps escalating with inflation every year after, which is exactly the mechanic the 3–4% rule is built around (withdraw a fixed % of the starting balance, then increase the dollar amount by inflation, not by portfolio performance):</P>
          <Formula>{`Year-1 monthly withdrawal = Desired withdrawal (today's $) × (1 + inflation)^(years to retirement)

Required nest egg = (Year-1 monthly withdrawal × 12) ÷ Safe withdrawal rate`}</Formula>
          <P>That required nest egg is compared against your projected <strong>combined portfolio</strong> at retirement — money-market investments plus CPF Ordinary and Special Account (MediSave excluded — it&apos;s earmarked for healthcare, not withdrawals):</P>
          <Formula>{`Projected combined portfolio = Investment balance + OA balance + SA balance  (at retirement age)`}</Formula>
          <P>A surplus means you&apos;re on track; a gap shows the extra monthly contribution (invested at your same assumed return, starting today) needed to close it, computed from the standard future-value-of-an-annuity formula solved for the payment.</P>
          <Caveat>This deliberately skips modeling CPF LIFE, the actual government-administered lifetime annuity your CPF Retirement Account converts into from age 65 — its real payout formula depends on your RA balance, chosen plan, and cohort interest rate, none of which is published as a simple formula. Treating OA+SA as a self-managed pot you draw down yourself (below) is simpler to reason about, but isn&apos;t how CPF actually pays out in retirement — think of this as an approximation of your total retirement wealth, not a literal simulation of your CPF LIFE income.</Caveat>
        </Section>

        <Section title="Depletion simulation">
          <P>Rather than trusting the safe-withdrawal-rate framing to hold forever, this simulates what actually happens to your combined portfolio, year by year, from retirement age to your planning-until age:</P>
          <Formula>{`Balance(year+1) = Balance(year) × (1 + assumed return) − this year's withdrawal
This year's withdrawal escalates by inflation every year, same as above.`}</Formula>
          <P>If the balance hits zero before your planning-until age, that age is shown as when your money runs out. If it never hits zero, your portfolio lasts the full horizon. For a portfolio that&apos;s mostly money-market funds, this can disagree with the safe-withdrawal-rate check above — and when it does, I&apos;d trust this simulation more, since it doesn&apos;t assume indefinite sustainability the way the 3-4% rule research does.</P>
          <Caveat>The assumed return applied here is your money-market rate, applied to the <em>whole</em> combined balance — including the CPF portion. That&apos;s a conservative simplification: CPF&apos;s guaranteed rates (2.5% OA, 4% SA, plus extra interest tiers) typically run higher than money market funds, so this likely understates how long your CPF portion alone would actually last.</Caveat>
        </Section>

        <Section title="Supplementary Retirement Scheme (SRS)">
          <P>SRS is modeled separately from the CPF/investment accumulation above, since its withdrawal rules are entirely different. Your SRS balance grows the same way your investment balance does — monthly contributions compounding at your assumed investment return — but to age {SRS_RETIREMENT_AGE}, the statutory retirement age that determines penalty-free withdrawal (locked in at the age that applied when you made your <em>first</em> SRS contribution, not whatever&apos;s prevailing when you withdraw):</P>
          <Formula>{`SRS(t+1) = SRS(t) × (1 + monthly return) + monthly contribution, up to age ${SRS_RETIREMENT_AGE}`}</Formula>
          <P>From {SRS_RETIREMENT_AGE} on, only {(SRS_WITHDRAWAL_TAXABLE_FRACTION * 100).toFixed(0)}% of whatever you withdraw each year counts as chargeable income — the rest is tax-exempt. Spread the balance over more years (up to {SRS_MAX_WITHDRAWAL_YEARS}) and each year&apos;s taxable slice shrinks, which matters because Singapore&apos;s income tax is progressive — a smaller slice often lands in a lower band, or the tax-free band entirely:</P>
          <Formula>{`Annual withdrawal = SRS balance at ${SRS_RETIREMENT_AGE} ÷ years chosen (up to ${SRS_MAX_WITHDRAWAL_YEARS})
Taxable portion    = annual withdrawal × ${(SRS_WITHDRAWAL_TAXABLE_FRACTION * 100).toFixed(0)}%
Tax owed           = tax on (other taxable income + taxable portion) − tax on (other taxable income alone)`}</Formula>
          <Caveat>Withdrawing before age {SRS_RETIREMENT_AGE} is 100% taxable AND carries a {SRS_EARLY_WITHDRAWAL_PENALTY_PCT}% penalty — neither is modeled here, since this tool only compares withdrawal strategies from the penalty-free age onward. The balance is assumed to stop growing once withdrawals begin (a conservative simplification — in reality it can stay invested while being drawn down) and &quot;other taxable income&quot; defaults to zero, since CPF LIFE payouts themselves aren&apos;t taxable in Singapore and this tool doesn&apos;t currently collect other retirement income (rental, part-time work).</Caveat>
        </Section>

        <Section title="Limitations">
          <P>This calculator doesn&apos;t model: wage growth or bonus timing beyond the simplified annual assumptions above, the CPF Retirement Account sweep and Retirement Sum mechanics at age 55, CPF LIFE&apos;s actual lifetime-annuity payout (approximated instead by treating OA+SA as a self-managed pot — see above), RSTU income tax relief, sequence-of-returns risk (a bad run of returns early in retirement is riskier than the same average return spread evenly — this simulation uses one constant assumed return throughout), or taxes on anything besides SRS withdrawals (moot in Singapore anyway — CPF withdrawals and capital gains aren&apos;t taxed). The money-market return and inflation rate are both single constant assumptions for the entire horizon, which in reality will fluctuate with interest-rate cycles.</P>
          <Caveat>MediSave is tracked but never counted in the combined portfolio — it&apos;s earmarked for healthcare, not living expenses, even though its balance is capped and overflows into SA the same way real CPF does.</Caveat>
        </Section>

        <div style={{ marginTop: 40, padding: 20, background: C.surface, borderRadius: C.rL, border: `1px solid ${C.border}`, fontSize: C.xs, color: C.faint, lineHeight: 1.7 }}>
          This tool is for educational purposes only. It does not constitute financial advice. All figures are estimates based on public formulas and general research on withdrawal rates — they are not guaranteed and may not reflect the latest CPF Board rates. Consult a MAS-licensed financial adviser before making any retirement decision. Not affiliated with CPF Board or MAS.
        </div>
      </div>
    </div>
  )
}
