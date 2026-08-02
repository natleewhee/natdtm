'use client'

import { useRouter } from 'next/navigation'
import { C, SGD } from '@/lib/propinvest/theme'
import { PROPERTY_TAX_NOO_AS_OF, TDSR_LIMIT, MSR_LIMIT } from '@/lib/propinvest/calc'
import { BSD_AS_OF, ABSD_AS_OF, ABSD_REFERENCE } from '@/lib/house/stampDuty'
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

export default function PropInvestTheMathPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="The Math" breadcrumb="Investment Property Calculator" onBack={() => router.back()} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 32, color: C.primary, margin: '0 0 8px' }}>How the cash flow is computed</h1>
        <p style={{ fontSize: C.base, color: C.muted, margin: '0 0 8px' }}>
          Upfront cost, financing, non-owner-occupied property tax, and whether a bank would actually approve the loan.
        </p>

        <MathTOC items={[
          { id: 'upfront-cost', label: 'Upfront cost' },
          { id: 'non-owner-occupied-property-tax', label: 'Property tax' },
          { id: 'monthly-cash-flow', label: 'Cash flow' },
          { id: 'rental-yield', label: 'Rental yield' },
          { id: 'can-you-actually-get-the-loan', label: 'TDSR / MSR' },
          { id: 'limitations', label: 'Limitations' },
        ]} />

        <Section noBorder>
          <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 16px' }} id="upfront-cost">Upfront cost</h2>
          <P>Buyer&apos;s Stamp Duty is computed by HouseMuch&apos;s own <code>calcBSD</code> — the exact same tiered schedule, not a reimplementation (verified as of {BSD_AS_OF}):</P>
          <Formula>{`Downpayment  = price × downpayment%
Loan amount  = price − downpayment
Upfront cost = downpayment + BSD + ABSD (your figure) + other fees`}</Formula>
          <P>ABSD is <strong>not</strong> auto-computed — real eligibility depends on citizenship, entity structure, and existing property count, which this tool doesn&apos;t collect. A reference table is shown instead, next to a field where you enter your own figure:</P>
          <Table rows={[
            ['Profile', 'ABSD rate'],
            ...ABSD_REFERENCE.map(r => [r.profile, r.rate]),
          ]} />
          <Caveat>Reference rates as of {ABSD_AS_OF}, before any remission. An investment property is virtually always a 2nd+ property for a Singapore Citizen or PR — verify your exact bracket on IRAS.</Caveat>
        </Section>

        <Section title="Non-owner-occupied property tax">
          <P>A separate, steeper progressive schedule from the owner-occupied one, since this tool is specifically for a property you don&apos;t live in — tiered on Annual Value (AV), IRAS&apos;s estimate of the annual rent the property could fetch:</P>
          <Formula>{`First S$30,000 of AV   → 12%
Next S$15,000 (30k–45k) → 20%
Next S$15,000 (45k–60k) → 28%
Above S$60,000          → 36%`}</Formula>
          <P>If you leave Annual Value blank — the common case for a prospective buyer, since AV is only knowable to an existing owner — it&apos;s estimated as your expected annual rent (monthly rent × 12), which is IRAS&apos;s own basis for AV in the first place:</P>
          <Formula>{`AV (if blank) = expected monthly rent × 12`}</Formula>
          <Caveat>Confirmed against IRAS&apos;s published schedule as of {PROPERTY_TAX_NOO_AS_OF} — these specific non-owner-occupied bands and rates have been unchanged since 2015 (only the owner-occupied schedule has seen recent Budget revisions). Verify against your actual Property Tax bill, which can differ from a rent-based estimate.</Caveat>
        </Section>

        <Section title="Monthly cash flow">
          <P>Rent isn&apos;t collected every month of the year, so a vacancy assumption between tenants is spread evenly across all 12 months rather than shown as a cliff in one specific month — the point is a representative monthly figure, not a specific month&apos;s actual:</P>
          <Formula>{`Effective monthly rent = monthly rent × (12 − vacancy months) ÷ 12`}</Formula>
          <P>Agent&apos;s commission (typically ~half a month&apos;s rent per year of lease in Singapore) is an annual cost, amortized monthly the same way, and scaled down by the same occupied fraction — no tenant, no lease, no commission:</P>
          <Formula>{`Monthly agent commission = monthly rent × agent commission months ÷ 12 × (12 − vacancy months) ÷ 12

Monthly cash flow = effective monthly rent
                   − monthly instalment
                   − monthly property tax
                   − monthly maintenance
                   − monthly agent commission`}</Formula>
          <P>Break-even rent — the rent that would exactly cover the instalment plus every modeled operating cost, before vacancy — is shown as a quick &quot;is my asking rent realistic&quot; sanity check:</P>
          <Formula>{`Break-even monthly rent = monthly instalment + monthly property tax + monthly maintenance + monthly agent commission`}</Formula>
        </Section>

        <Section title="Rental yield">
          <Formula>{`Gross rental yield = (monthly rent × 12) ÷ price
Net rental yield    = ((effective monthly rent − monthly operating costs) × 12) ÷ price`}</Formula>
          <Caveat>Both yields are computed against purchase price, the standard convention — not against the cash you actually put in (downpayment + fees + ABSD). On a property where ABSD alone is 20–30% of price, the return on your actual capital deployed can look very different from the yield shown here.</Caveat>
        </Section>

        <Section title="Can you actually get the loan?">
          <P>A cash-flow-positive verdict is meaningless if a bank wouldn&apos;t approve the loan in the first place. This reuses the exact limits DriveReady and MyLedger already check elsewhere in this app:</P>
          <Formula>{`TDSR = (this instalment + your existing monthly debt) ÷ your gross monthly income
        Exceeded if TDSR > ${(TDSR_LIMIT * 100).toFixed(0)}% — applies to every property type

MSR  = this instalment ÷ your gross monthly income
        Exceeded if MSR > ${(MSR_LIMIT * 100).toFixed(0)}% — HDB loans only, counts ONLY the mortgage`}</Formula>
          <Caveat>A real bank&apos;s calculation also counts credit facilities this tool has no way to know about (credit cards, personal loans, guarantor obligations), applies haircuts to variable income, and stress-tests the mortgage at a floor rate above what you&apos;re actually paying. Treat this as a directional check, not a substitute for what your bank will compute. Also note: HDB flats have their own Minimum Occupation Period and whole-flat rental eligibility rules that aren&apos;t modeled here at all — verify with HDB before relying on rental income from an HDB flat.</Caveat>
        </Section>

        <Section title="Limitations">
          <P>This calculator doesn&apos;t model: rental income tax (a real, often four-figure annual bill on top of everything shown), fire insurance, repairs or white-goods replacement, capital appreciation, or refinancing. Downpayment/loan-tenure defaults assume a straightforward purchase — the actual LTV cap for a 2nd+ property loan (45%, i.e. 55%+ down) is flagged as a warning but not enforced as a hard limit, since some buyers genuinely qualify for exceptions this tool can&apos;t evaluate.</P>
        </Section>

        <div style={{ marginTop: 40, padding: 20, background: C.surface, borderRadius: 13, border: `1px solid ${C.border}`, fontSize: 11, color: C.faint, lineHeight: 1.7 }}>
          This tool is for educational purposes only. It does not constitute financial or legal advice. All figures are estimates. Consult a MAS-licensed financial adviser, a conveyancing lawyer, and IRAS directly before making any property decision. Not affiliated with IRAS or HDB.
        </div>
      </div>
    </div>
  )
}
