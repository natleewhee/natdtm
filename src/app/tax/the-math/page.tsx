'use client'

import { useRouter } from 'next/navigation'
import { C } from '@/lib/shared/theme'
import { SGD } from '@/lib/shared/money'
import { TAX_RATES_AS_OF, TAX_BANDS, PERSONAL_RELIEF_CAP, EARNED_INCOME_RELIEF, SRS_CAP_CITIZEN_PR, SRS_CAP_FOREIGNER, RSTU_RELIEF_CAP_SELF, RSTU_RELIEF_CAP_FAMILY, COURSE_FEES_CAP, PARENT_RELIEF_LIVING_WITH, PARENT_RELIEF_NOT_LIVING_WITH, CHILD_RELIEF, NSMAN_RELIEF, CPF_EMPLOYEE_SHARE } from '@/lib/tax/calc'
import { CPF_OW_CEILING, CPF_ANNUAL_CEILING } from '@/lib/retire/cpf'
import { FAMILY_INCOME_LIMIT, PRIORITY_ORDER, LEVER_INFO } from '@/lib/tax/optimise'
import { SRS_RETIREMENT_AGE } from '@/lib/retire/srs'
import ShellHeader from '@/components/shared/ShellHeader'
import MathTOC from '@/components/shared/MathTOC'

function slug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
function Section({ title, children, noBorder }: { title?: any; children?: any; noBorder?: any; }) {
  return (
    <div id={title ? slug(title) : undefined} style={{ paddingTop: 36, borderTop: noBorder ? 'none' : `1px solid ${C.border}`, marginTop: noBorder ? 0 : 8, scrollMarginTop: 80 }}>
      {title && <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 16px', lineHeight: 1.3 }}>{title}</h2>}
      {children}
    </div>
  )
}
function P({ children }: { children?: any; }) {
  return <p style={{ fontSize: C.base, color: C.text, lineHeight: 1.8, margin: '0 0 14px' }}>{children}</p>
}
function Formula({ children }: { children?: any; }) {
  return (
    <div style={{ fontFamily: C.fontMono, fontSize: 12, color: C.text, lineHeight: 1.8, margin: '10px 0', padding: '12px 14px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, whiteSpace: 'pre-wrap' }}>
      {children}
    </div>
  )
}
function Caveat({ children }: { children?: any; }) {
  return (
    <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, padding: '12px 16px', background: C.surface, borderRadius: 8, borderLeft: `3px solid ${C.accent}`, marginTop: 10 }}>
      {children}
    </div>
  )
}

function bandLabel(band: Record<string, any>, i: number) {
  const lower = i === 0 ? 0 : TAX_BANDS[i - 1].upTo
  const range = band.upTo === Infinity
    ? `Above ${SGD(lower)}`
    : `${SGD(lower)} – ${SGD(band.upTo)}`
  return `${range.padEnd(26)} ${(band.rate * 100).toFixed(1)}%`
}

export default function TaxTheMathPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="The Math" breadcrumb="TaxWise" onBack={() => router.back()} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 32, color: C.primary, margin: '0 0 8px' }}>How I work out your tax</h1>
        <p style={{ fontSize: C.base, color: C.muted, margin: '0 0 8px' }}>
          Every band, every relief cap, and why the &quot;what would this save me&quot; number is what it is.
        </p>

        <MathTOC items={[
          { id: 'the-rate-schedule', label: 'Rate schedule' },
          { id: 'marginal-vs-effective-rate', label: 'Marginal vs effective' },
          { id: 'cpf-relief-and-take-home-pay', label: 'CPF & take-home' },
          { id: 'reliefs-and-the-80-000-cap', label: 'Reliefs & the cap' },
          { id: 'what-a-relief-is-actually-worth', label: 'What a relief is worth' },
          { id: 'the-reliefs-optimiser', label: 'Reliefs optimiser' },
          { id: 'limitations', label: 'Limitations' },
        ]} />

        <Section noBorder>
          <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 16px' }} id="the-rate-schedule">The rate schedule</h2>
          <P>Singapore taxes resident income progressively. Each rate applies <strong>only to the slice of chargeable income inside its band</strong>. Earning one dollar into a higher band does not re-tax everything below it, which is the single most common misconception about how this works.</P>
          <Formula>{TAX_BANDS.map(bandLabel).join('\n')}</Formula>
          <Caveat>Rates as of {TAX_RATES_AS_OF} (the YA2024-onwards resident schedule), entered by hand rather than pulled live from IRAS. Parliament revises these in Budget statements. Verify at iras.gov.sg before relying on this for an actual filing. Non-residents are taxed on a different basis entirely and this tool does not model them.</Caveat>
        </Section>

        <Section title="Marginal vs effective rate">
          <P>Your <strong>marginal rate</strong> is what the next dollar you earn gets taxed at. Your <strong>effective rate</strong> is your total tax divided by your total income, always lower, because the early bands are taxed at 0% and 2%.</P>
          <Formula>{`Effective rate = tax payable ÷ total income
Marginal rate  = the band your chargeable income currently sits in`}</Formula>
          <P>The distinction matters because <strong>reliefs are worth your marginal rate, not your effective rate</strong>. Someone with a 15% marginal rate saves $150 per $1,000 of relief, even if their effective rate is only 7%.</P>
        </Section>

        <Section title="CPF relief and take-home pay">
          <P>Your own CPF contributions are automatically relieved from tax. You never pay income tax on money that went into CPF. The employer&apos;s share never counts as your income in the first place, so it doesn&apos;t appear here at all.</P>
          <P>The employee share depends on your age:</P>
          <Formula>{CPF_EMPLOYEE_SHARE.map(b =>
            `Age ${b.minAge}${b.maxAge >= 999 ? '+' : `–${b.maxAge}`}:`.padEnd(14) + `${(b.rate * 100).toFixed(1)}% of wages`
          ).join('\n')}</Formula>
          <P>Contributions are capped by the same two ceilings RetireWell uses: {SGD(CPF_OW_CEILING)}/month on salary, and {SGD(CPF_ANNUAL_CEILING)} on total annual wages including bonus:</P>
          <Formula>{`Ordinary wages  = min(monthly salary, ${SGD(CPF_OW_CEILING)}) × 12
Bonus ceiling   = ${SGD(CPF_ANNUAL_CEILING)} − ordinary wages
CPF-able bonus  = min(your bonus, bonus ceiling)

Employee CPF    = (ordinary wages + CPF-able bonus) × your age rate`}</Formula>
          <P>Take-home is then simply what&apos;s left:</P>
          <Formula>{`Take-home = total income − employee CPF − income tax`}</Formula>
          <Caveat>Tax is divided evenly across twelve months to give a monthly figure. IRAS actually assesses annually and bills in a lump sum or GIRO instalments, so your real payslip shows the CPF deduction but not the tax. This smooths it for planning purposes. Elsewhere in the suite (DriveReady, MyLedger) take-home is approximated as a flat 80% of gross, which is right for someone under 55 but overstates CPF for older workers and ignores tax entirely; running this tool feeds the exact figure into MyLedger.</Caveat>
        </Section>

        <Section title="Reliefs and the $80,000 cap">
          <P>Reliefs reduce your <em>chargeable</em> income, not your tax bill directly. Each has its own cap, and then there is a hard ceiling of <strong>{SGD(PERSONAL_RELIEF_CAP)} on total personal reliefs</strong>. Claim more than that and the excess does nothing at all.</P>
          <Formula>{`Earned Income Relief (automatic, by age):
${EARNED_INCOME_RELIEF.map(b => `  ${b.maxAge >= 999 ? 'Age 60+' : `Up to age ${b.maxAge}`}`.padEnd(22) + SGD(b.amount)).join('\n')}

SRS contributions:
  Citizen / PR        ${SGD(SRS_CAP_CITIZEN_PR)}
  Foreigner           ${SGD(SRS_CAP_FOREIGNER)}

CPF cash top-ups (RSTU):
  Your own account    ${SGD(RSTU_RELIEF_CAP_SELF)}
  Family members      ${SGD(RSTU_RELIEF_CAP_FAMILY)}   (separate ceiling)

Qualifying Child       ${SGD(CHILD_RELIEF)} per child
Parent, living with    ${SGD(PARENT_RELIEF_LIVING_WITH)} each
Parent, not living with ${SGD(PARENT_RELIEF_NOT_LIVING_WITH)} each
Course fees            ${SGD(COURSE_FEES_CAP)}
NSman                  ${SGD(NSMAN_RELIEF.nonKeyInactive)} – ${SGD(NSMAN_RELIEF.keyActive)}

TOTAL PERSONAL RELIEFS CAPPED AT ${SGD(PERSONAL_RELIEF_CAP)}`}</Formula>
          <Caveat>Working Mother&apos;s Child Relief is a percentage of earned income rather than a flat sum and depends on birth order, so it isn&apos;t modeled. Enter it under &quot;any other reliefs&quot; if it applies to you. Life insurance relief (only available if your CPF contributions are under $5,000) and the various handicapped-dependant reliefs are likewise not broken out. Personal Income Tax Rebates, which Parliament has granted in some years and not others, are not applied. If one is announced for your Year of Assessment your actual bill will be lower than shown.</Caveat>
        </Section>

        <Section title="What a relief is actually worth">
          <P>This is the number the tool exists to surface. A relief&apos;s value is the difference between the tax you&apos;d pay with and without it, which means it&apos;s priced at your marginal rate, and drops to <strong>exactly zero</strong> once you hit the {SGD(PERSONAL_RELIEF_CAP)} cap:</P>
          <Formula>{`headroom = max(0, ${SGD(PERSONAL_RELIEF_CAP)} − reliefs already claimed)
effective = min(amount you'd contribute, headroom)

saving = tax(chargeable income) − tax(chargeable income − effective)`}</Formula>
          <P>Computing it as a difference of two tax calculations rather than multiplying by a single rate handles the case where a relief straddles a band boundary: the first part comes off at the higher rate, the rest at the lower one.</P>
          <Caveat>A tax saving is not the same as a good decision. SRS money is locked until statutory retirement age, and withdrawing early costs a 5% penalty on top of full taxation of the amount. CPF top-ups are irreversible. That money is never coming back out as cash before your payout age. The tool prices the tax benefit; whether the lock-up is worth it is a separate question, and depends on what else you&apos;d do with the money.</Caveat>
        </Section>

        <Section title="The reliefs optimiser">
          <P>Below your results, the optimiser takes a lump of spare cash and fills four reliefs in order: SRS, a CPF cash top-up to your own MediSave, a CPF cash top-up to your own SA (or RA from 55), and a top-up for a family member. Each one cuts chargeable income dollar for dollar, so they all save tax at the same marginal rate. The order only decides where the money ends up.</P>
          <Formula>{`Keeping access:     ${PRIORITY_ORDER.access.map(k => LEVER_INFO[k].label).join(' → ')}
Never taxed later:  ${PRIORITY_ORDER.taxFree.map(k => LEVER_INFO[k].label).join(' → ')}

each step = min(cash left, that relief's room, ${SGD(PERSONAL_RELIEF_CAP)} cap headroom)
saving    = tax before − tax after (re-run in full after every step)`}</Formula>
          <P>The limits it uses:</P>
          <ul style={{ fontSize: C.base, color: C.text, lineHeight: 1.8, margin: '0 0 14px', paddingLeft: 20 }}>
            <li><strong>SRS:</strong> {SGD(SRS_CAP_CITIZEN_PR)} a year for citizens and PRs, {SGD(SRS_CAP_FOREIGNER)} for foreigners, less what you&apos;ve already put in.</li>
            <li><strong>Your own CPF:</strong> one {SGD(RSTU_RELIEF_CAP_SELF)} limit shared between MediSave and SA/RA top-ups (MediSave joined CPF Cash Top-up Relief from 1 Jan 2022). MediSave is also limited by the room under your Basic Healthcare Sum, and SA/RA by the room under your Full Retirement Sum. Enter those under &quot;Room left in your CPF&quot;, or leave them blank to assume enough room.</li>
            <li><strong>Family:</strong> a further {SGD(RSTU_RELIEF_CAP_FAMILY)} across parents, grandparents (and in-laws), a spouse and siblings. For a spouse or sibling it only counts if they earned {SGD(FAMILY_INCOME_LIMIT)} or less the year before, or have a disability. It&apos;s off by default, because the money becomes theirs.</li>
            <li><strong>Foreigners</strong> have no CPF account, so only SRS applies.</li>
          </ul>
          <P>The &quot;why the later dollars save less&quot; table splits your relief by the tax band it comes out of, top band first. That&apos;s why a big contribution can save a smaller percentage than a small one.</P>
          <Caveat>SRS and CPF are not taxed the same way later. SRS defers tax: from age {SRS_RETIREMENT_AGE}, 50% of each withdrawal is taxable. CPF top-ups are never taxed again, but they stay in CPF for good. Also, from 1 Jan 2026, a MediSave top-up that attracts a Matched MediSave Scheme grant gets no tax relief (YA 2027 onwards). The optimiser assumes yours doesn&apos;t.</Caveat>
        </Section>

        <Section title="Limitations">
          <P>Resident individuals only. Non-residents are taxed on a different basis (flat rates or a 15% employment-income rule) that this doesn&apos;t model. Rental and freelance income are taken as a net figure you supply, with no deduction of allowable expenses. No Personal Income Tax Rebate is applied. Joint filing does not exist in Singapore, so everything here is per-person, but reliefs like Qualifying Child Relief can be shared between spouses in ways this tool doesn&apos;t arbitrate. It is a planning aid, not a filing.</P>
        </Section>
      </div>
    </div>
  )
}
