'use client'

import { useRouter } from 'next/navigation'
import { C, SGD } from '@/lib/child/theme'
import { AGE_BANDS, SUBSIDY_TIERS } from '@/lib/child/calc'
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
function Table({ rows }) {
  return (
    <div style={{ overflowX: 'auto', margin: '10px 0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '8px 12px', color: i === 0 ? C.muted : C.text, fontWeight: i === 0 ? 700 : 400, fontFamily: j > 0 ? C.fontMono : C.fontBody, textTransform: i === 0 ? 'uppercase' : 'none', fontSize: i === 0 ? 11 : 13, letterSpacing: i === 0 ? '0.04em' : 'normal' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ChildTheMathPage() {
  const router = useRouter()
  const infant = AGE_BANDS.find(b => b.key === 'infant')
  const preschool = AGE_BANDS.find(b => b.key === 'preschool')

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="The Math" breadcrumb="Children's Cost Planner" onBack={() => router.back()} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 32, color: C.primary, margin: '0 0 8px' }}>Where every figure comes from</h1>
        <p style={{ fontSize: C.base, color: C.muted, margin: '0 0 8px' }}>
          The stage-by-stage costs, the childcare subsidy math, and the savings-plan formula behind the numbers.
        </p>

        <MathTOC items={[
          { id: 'the-age-bands', label: 'Age bands' },
          { id: 'the-childcare-subsidy', label: 'Childcare subsidy' },
          { id: 'university', label: 'University' },
          { id: 'the-monthly-savings-plan', label: 'Savings plan' },
          { id: 'limitations', label: 'Limitations' },
        ]} />

        <Section noBorder>
          <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 16px' }} id="the-age-bands">The age bands</h2>
          <P>Six stages, each with its own pre-subsidy monthly cost split into four categories — childcare/infant care, tuition &amp; enrichment, daily expenses (food, clothes, misc), and school fees:</P>
          <Table rows={[
            ['Stage', 'Childcare', 'Tuition/enrichment', 'Daily', 'School fees'],
            ...AGE_BANDS.map(b => [b.label, SGD(b.childcare), SGD(b.tuitionEnrichment), SGD(b.dailyExpenses), SGD(b.schoolFees)]),
          ]} />
          <P>Total cost for a horizon is the sum of every year&apos;s monthly total × 12, across every band the horizon touches, × number of children:</P>
          <Formula>{`Total = Σ (monthly cost for that year's band × 12), summed over every year from currentAge to planUntilAge`}</Formula>
          <Caveat>These are rough, good-faith estimates of typical Singapore household spending by stage — not a quote, and not pulled from a single official source. Actual cost varies enormously by lifestyle, school type (neighbourhood vs branded), and how much tuition/enrichment is used.</Caveat>
        </Section>

        <Section title="The childcare subsidy">
          <P>ECDA&apos;s Basic Subsidy (working-mother rate) is a genuinely different published figure for infant care versus childcare/preschool — <strong>{SGD(infant.subsidy.basic)}/mo</strong> for infant care, <strong>{SGD(preschool.subsidy.basic)}/mo</strong> for childcare/preschool — so this is modeled per band rather than as one flat rate applied twice:</P>
          <Table rows={[
            ['Band', 'Basic subsidy'],
            [infant.label, SGD(infant.subsidy.basic) + '/mo'],
            [preschool.label, SGD(preschool.subsidy.basic) + '/mo'],
          ]} />
          <P>Income-tested Additional Subsidy stacks on top, simplified into three household-income tiers rather than the real continuous sliding scale (which needs an exact gross monthly income this tool doesn&apos;t collect):</P>
          <Table rows={[
            ['Tier', 'Infant additional', 'Preschool additional'],
            ...Object.entries(SUBSIDY_TIERS).map(([key, t]) => [t.label, SGD(infant.subsidy.additionalByTier[key]) + '/mo', SGD(preschool.subsidy.additionalByTier[key]) + '/mo']),
          ]} />
          <Formula>{`Subsidy for the month = min(childcare fee, basic subsidy + additional subsidy for your income tier)
Applies only to infant care and preschool bands, and only when "using a registered centre" is on.`}</Formula>
          <Caveat>The subsidy can never exceed the childcare fee itself — a near-zero childcare bill (e.g. a stay-home parent) can&apos;t produce a negative &quot;subsidised&quot; cost.</Caveat>
        </Section>

        <Section title="University">
          <P>The horizon can extend to age 22 to include local, MOE-subsidized public university (NUS/NTU/SMU/SIT/SUTD/SUSS) — the cheapest realistic path. School fees for this band approximate a blended subsidized annual tuition (~S$8,600/yr for most non-medicine courses) spread monthly, plus daily living costs.</P>
          <Caveat>Private or overseas university costs multiples of this and isn&apos;t modeled. If your child is likely to study abroad or at a private institution, treat the university-band figure as a floor, not an estimate.</Caveat>
        </Section>

        <Section title="The monthly savings plan">
          <P>&quot;To save monthly&quot; is deliberately <em>not</em> the payment that accumulates the total cost as a future lump sum — child costs are a pay-as-you-go outflow stream paid monthly starting now, so money already spent in year one can&apos;t keep compounding for the rest of the horizon the way a retirement goal would.</P>
          <P>Instead, it solves for the level monthly deposit — earning your assumed return, starting now — whose future value at the end of the horizon exactly equals the future value of the real, month-by-month cost stream (the same technique MyLedger&apos;s <code>levelEquivalentContribution</code> already uses for RetireWell&apos;s time-varying investment capacity):</P>
          <Formula>{`FV of the real cost stream = Σ cost(month m) × (1 + r)^(N − m − 1), for m = 0 to N−1

annuity factor       = ((1 + r)^N − 1) ÷ r
level monthly saving = FV of the real cost stream ÷ annuity factor`}</Formula>
          <P>At 0% assumed return, this is exactly the simple average — total cost ÷ total months. At a positive return, the direction isn&apos;t guaranteed to go down the way it would for a pure accumulation goal: because these costs are front-loaded (infant care costs more per month than primary school), a higher return doesn&apos;t always reduce the required deposit the way it would for a single future lump-sum goal.</P>
          <Caveat>This assumes a single level deposit funds the whole stream without the running balance ever going negative along the way — true for the default cost shape here, but a plan with a much larger early spike could, in principle, need more than a flat monthly deposit to bridge.</Caveat>
        </Section>

        <Section title="Limitations">
          <P>This calculator doesn&apos;t model: unequal sibling ages (numberOfChildren is a straight multiplier assuming every child is the same age, which is never true for real sibling spacing), healthcare costs beyond what&apos;s folded into &quot;daily expenses&quot;, inflation on the stage costs themselves over a multi-year horizon, or private/overseas university. Subsidy figures approximate MSF/ECDA&apos;s Basic + Additional Subsidy as simplified per-band tiers rather than the real sliding scale.</P>
        </Section>

        <div style={{ marginTop: 40, padding: 20, background: C.surface, borderRadius: 13, border: `1px solid ${C.border}`, fontSize: 11, color: C.faint, lineHeight: 1.7 }}>
          This tool is for educational purposes only. It does not constitute financial advice. All figures are estimates. Not affiliated with MSF, ECDA, or MOE.
        </div>
      </div>
    </div>
  )
}
