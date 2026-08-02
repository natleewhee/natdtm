'use client'

import { useRouter } from 'next/navigation'
import { C, SGD } from '@/lib/flow/theme'
import { CPF_CONTRIBUTION_TABLE, CPF_OW_CEILING, CPF_ANNUAL_CEILING } from '@/lib/retire/cpf'
import { CPF_EMPLOYEE_SHARE } from '@/lib/tax/calc'
import { DEFAULT_MA_HEALTH_PREMIUM, DEFAULT_EMERGENCY_FUND_MONTHS } from '@/lib/flow/calc'
import ShellHeader from '@/components/shared/ShellHeader'
import MathTOC from '@/components/shared/MathTOC'

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

export default function FlowTheMathPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="The Math" breadcrumb="FlowState" onBack={() => router.back()} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 32, color: C.primary, margin: '0 0 8px' }}>How I trace your cashflow</h1>
        <p style={{ fontSize: C.base, color: C.muted, margin: '0 0 8px' }}>
          Why your salary splits into two pipes, how a mortgage crosses back between them, and where the twelve-month trough comes from.
        </p>

        <MathTOC items={[
          { id: 'two-pipes', label: 'Two pipes' },
          { id: 'the-cpf-split', label: 'The CPF split' },
          { id: 'the-mortgage-crossing-back', label: 'The mortgage crossing back' },
          { id: 'income-tax', label: 'Income tax' },
          { id: 'the-headline-numbers', label: 'The headline numbers' },
          { id: 'the-twelve-month-trough', label: 'The twelve-month trough' },
          { id: 'limitations', label: 'Limitations' },
        ]} />

        <Section noBorder>
          <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 16px' }} id="two-pipes">Two pipes</h2>
          <P>A Singapore salary doesn&apos;t reach your bank account as one number. Before you see anything, it splits into a <strong>CPF pipe</strong> (locked away, split further into OA/SA/MA) and a <strong>cash pipe</strong> (spendable, after income tax). Your employer also contributes CPF on top of your salary — compensation you never see as cash, but real money nonetheless.</P>
          <P>Most budgeting tools only look at the cash pipe, which makes a mortgage partly paid from CPF look like it costs more cash than it actually does, and makes your real savings rate look far lower than it is.</P>
        </Section>

        <Section title="The CPF split">
          <P>Total CPF contribution depends on age, and is allocated across OA/SA/MA by the same age-banded table RetireWell uses:</P>
          <Formula>{CPF_CONTRIBUTION_TABLE.map(b =>
            `Age ${b.minAge}${b.maxAge >= 999 ? '+' : `–${b.maxAge}`}:`.padEnd(14) + `${(b.total * 100).toFixed(1)}% total  (OA ${(b.oa * 100).toFixed(1)}% · SA ${(b.sa * 100).toFixed(1)}% · MA ${(b.ma * 100).toFixed(1)}%)`
          ).join('\n')}</Formula>
          <P>Your own share of that total — the part actually deducted from pay — depends on age too:</P>
          <Formula>{CPF_EMPLOYEE_SHARE.map(b =>
            `Age ${b.minAge}${b.maxAge >= 999 ? '+' : `–${b.maxAge}`}:`.padEnd(14) + `${(b.rate * 100).toFixed(1)}% of wages`
          ).join('\n')}</Formula>
          <Formula>{`Employer's share = Total CPF − Employee's share`}</Formula>
          <P>Both are capped at the Ordinary Wage ceiling of {SGD(CPF_OW_CEILING)}/month — every dollar of salary above that is 100% cash, 0% CPF, which is why FlowState calls out anyone sitting right at the ceiling. A separate {SGD(CPF_ANNUAL_CEILING)} <em>annual</em> ceiling caps how much of a bonus is CPF-able, on top of whatever your monthly salary has already used up that year.</P>
          <Caveat>Contribution rates for ages above 55 are on a multi-year phase-in toward parity with the below-55 rate — figures here are a good-faith snapshot, not pulled live from CPF Board. Verify against the official contribution rate tables before relying on this for real planning.</Caveat>
        </Section>

        <Section title="The mortgage crossing back">
          <P>An instalment is really four different flows, not one expense line. First it splits into interest (gone forever) and principal (equity you now own), from the outstanding balance and rate:</P>
          <Formula>{`Interest  = outstanding balance × (rate ÷ 12)
Principal = instalment − interest`}</Formula>
          <P>Separately, HouseMuch&apos;s own &quot;paid from CPF-OA&quot; figure tells FlowState what fraction of the WHOLE instalment came from CPF rather than cash. That fraction is applied evenly across both the interest and principal legs, since CPF isn&apos;t earmarked to pay one before the other:</P>
          <Formula>{`CPF share = min(instalment, CPF-OA portion) ÷ instalment

CPF-funded interest   = interest  × CPF share
CPF-funded principal  = principal × CPF share
Cash-funded interest  = interest  × (1 − CPF share)
Cash-funded principal = principal × (1 − CPF share)`}</Formula>
          <P>Only the two cash-funded legs count toward your fixed-cost ratio and cash burn — the CPF-funded legs never touched your bank account, so charging them against cash would double-count money you never had to begin with.</P>
        </Section>

        <Section title="Income tax">
          <P>When TaxWise has been run, FlowState uses its exact annual figure, divided evenly by twelve. Otherwise it estimates directly from your salary and age using TaxWise&apos;s own tax calculation, with no reliefs applied — closer than a flat percentage, and clearly labeled as an estimate either way.</P>
          <P>Tax is drawn from the cash pipe before it reaches your bank account, the same way it&apos;s drawn from your paycheck in reality — it never appears as a &quot;bank account&quot; expense.</P>
        </Section>

        <Section title="The headline numbers">
          <Formula>{`True savings rate = (kept + invested) ÷ (salary + employer CPF)
Cash savings rate = max(0, cash surplus) ÷ cash reaching the bank
Fixed-cost ratio  = (cash-funded mortgage + car + insurance) ÷ cash reaching the bank
Runway            = liquid savings ÷ (cash-funded mortgage + car + insurance + living expenses)`}</Formula>
          <P>&quot;Kept&quot; means CPF that&apos;s still growing, principal that became equity, and any cash left over at month&apos;s end — every dollar still yours in some form, whether or not you can spend it today. True savings rate is the honest number; cash savings rate is the one that matches what your bank balance actually shows.</P>
          <P>A health insurance premium (Integrated Shield Plan) is estimated as a fixed MediSave-funded figure, defaulting to {SGD(DEFAULT_MA_HEALTH_PREMIUM)}/month, and is editable since it varies enormously by plan and age.</P>
        </Section>

        <Section title="Emergency fund sizing">
          <P>Whenever your liquid savings fall short of {DEFAULT_EMERGENCY_FUND_MONTHS} months of the same real cash burn runway uses, the results page flags the shortfall and estimates how long it&apos;d take to close:</P>
          <Formula>{`Target        = ${DEFAULT_EMERGENCY_FUND_MONTHS} × (cash-funded mortgage + car + insurance + living expenses)
Gap           = max(0, target − liquid savings)
Months to close = ceil(gap ÷ this month's cash surplus)`}</Formula>
          <Caveat>{DEFAULT_EMERGENCY_FUND_MONTHS} months is a general rule of thumb, not tailored to your situation — a dual-income household can often run leaner, while a single income or variable/commission-based one may want more. &quot;Months to close&quot; assumes this exact month&apos;s cash surplus repeats every month, which real life rarely does — treat it as a rough pace-setter, not a plan.</Caveat>
        </Section>

        <Section title="The twelve-month trough">
          <P>A monthly average hides the shape of a year. The twelve-month schedule starts from this month&apos;s cash surplus, then applies whichever tax treatment you&apos;re modeling and any lumpy items (road tax, insurance renewals, a bonus) in the month you say they land:</P>
          <Formula>{`Lump-sum tax: the full annual bill lands once, in the month you choose
GIRO tax:     the annual bill divides evenly across all twelve months

balance[month] = balance[month − 1] + base surplus − tax this month + lumpy items this month`}</Formula>
          <P>The tightest month is whichever one has the lowest running balance. Comparing lump-sum against GIRO isolates exactly one lever: both end the year at the identical total, since GIRO doesn&apos;t change how much tax you pay — only when. If GIRO removes or shrinks the trough, that&apos;s a free fix; if a trough remains even on GIRO, the honest answer is to set cash aside ahead of time.</P>
        </Section>

        <Section title="Limitations">
          <P>This models one salaried income — freelance, rental, or director&apos;s fee income isn&apos;t split into CPF/cash the same way and isn&apos;t handled here. Living expenses, liquid savings, and every lumpy item are figures you enter; the tool is only as accurate as they are, which is exactly why the back-solve mode (working backward from a real bank balance) exists as an alternative to guessing. It is a planning aid for a typical year, not a substitute for tracking actual transactions.</P>
        </Section>
      </div>
    </div>
  )
}
