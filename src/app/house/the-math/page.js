'use client'

import { useRouter } from 'next/navigation'
import { C } from '@/lib/house/theme'
import ShellHeader from '@/components/shared/ShellHeader'
import MathTOC from '@/components/shared/MathTOC'
import { BSD_AS_OF, ABSD_AS_OF, SSD_AS_OF, HDB_MOP_YEARS } from '@/lib/house/stampDuty'
import { CPF_OA_RATE } from '@/lib/house/calc'

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

export default function HouseTheMathPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="The Math" breadcrumb="HouseMuch" onBack={() => router.back()} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 32, color: C.primary, margin: '0 0 8px' }}>How I calculate your true profit/loss</h1>
        <p style={{ fontSize: C.base, color: C.muted, margin: '0 0 8px' }}>
          Sale price minus purchase price isn&apos;t your real return — here&apos;s every formula behind the number.
        </p>

        <MathTOC items={[
          { id: 'why-not-just-sale-minus-purchase', label: 'Why not just sale − purchase' },
          { id: 'cash-outlay-derived-not-asked-for', label: 'Cash outlay' },
          { id: 'mortgage-amortization', label: 'Mortgage amortization' },
          { id: 'cpf-accrued-interest', label: 'CPF accrued interest' },
          { id: 'true-profitloss', label: 'True profit/loss' },
          { id: 'buyers-stamp-duty-bsd', label: 'BSD' },
          { id: 'sellers-stamp-duty-ssd', label: 'SSD' },
          { id: 'additional-buyers-stamp-duty-absd', label: 'ABSD' },
          { id: 'hdb-minimum-occupation-period', label: 'HDB MOP' },
          { id: 'buying-your-next-place', label: 'Buying next' },
          { id: 'limitations', label: 'Limitations' },
        ]} />

        <Section noBorder>
          <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 16px' }} id="why-not-just-sale-minus-purchase">Why not just sale − purchase</h2>
          <P>Most people compute their house &quot;profit&quot; as sale price minus purchase price and stop there. Two things that math misses, both of which change the real number a lot:</P>
          <P><strong>Money you paid along the way that never comes back</strong> — mortgage interest, stamp duties, renovation, selling costs. These are real cash out the door that a naive sale-minus-purchase number ignores entirely.</P>
          <P><strong>CPF isn&apos;t cash.</strong> Any CPF used on the property — for the downpayment or the monthly instalments — has to be refunded to your CPF account when you sell, plus the interest it would have earned had it stayed there. That refund is still your money, but it lands back in CPF, not your bank account. A lot of people mentally count it as spendable profit and are surprised when it isn&apos;t.</P>
        </Section>

        <Section title="Cash outlay (derived, not asked for)">
          <P>Cash outlay at purchase isn&apos;t a field you fill in — it&apos;s worked out from numbers you can look up exactly: your purchase price, your loan amount, and your CPF principal used (from your CPF statement). Whatever wasn&apos;t covered by the loan or CPF must have been cash:</P>
          <Formula>{`Cash outlay = (Purchase price + Purchase fees) − Loan taken − CPF used

Purchase fees = BSD (auto-computed) + Legal fees + Agent fees`}</Formula>
          <P>BSD at purchase is computed the same way as BSD on a new purchase in the &quot;buying next&quot; section below — see the BSD formula further down this page. Legal and agent fees are self-reported since they aren&apos;t government-set.</P>
          <Caveat>If your loan + CPF add up to more than the price + fees, cash outlay comes out negative — that&apos;s not a valid real-world result, it&apos;s a signal one of those figures was mistyped. The results page flags this rather than silently showing a wrong number.</Caveat>
        </Section>

        <Section title="Mortgage amortization">
          <P>Standard reducing-balance formula — the same one banks use for your monthly instalment:</P>
          <Formula>{`Monthly instalment = P × r(1+r)ⁿ / ((1+r)ⁿ − 1)

  P = loan principal
  r = monthly interest rate (annual rate ÷ 12)
  n = total number of monthly instalments (tenure × 12)`}</Formula>
          <P>Outstanding balance at any point in time uses the same variables, plus <em>t</em> for months elapsed since the loan started:</P>
          <Formula>{`Outstanding balance = P × [(1+r)ⁿ − (1+r)ᵗ] / [(1+r)ⁿ − 1]`}</Formula>
          <P>Total interest paid to date = (monthly instalment × months elapsed) − (loan taken − outstanding balance).</P>
          <Caveat>This assumes one constant rate for the whole holding period. If you refinanced or made lump-sum prepayments, your real outstanding balance will differ — use the &quot;I know the real number&quot; override on the results page instead of the computed estimate.</Caveat>
        </Section>

        <Section title="CPF accrued interest">
          <P>By law, CPF used for a property (principal used for the downpayment and/or monthly instalments) must be refunded to your CPF Ordinary Account when you sell — plus the interest that money would have earned had it never left CPF. I approximate that as:</P>
          <Formula>{`CPF accrued interest = CPF principal used × [(1 + ${CPF_OA_RATE * 100}%)^(years held) − 1]`}</Formula>
          <P>Any CPF Housing Grant you received (HDB only) is added to the CPF principal for this calculation, since grants are refunded with accrued interest the same way.</P>
          <Caveat>This is a flat-rate approximation. CPF Board actually compounds each individual withdrawal from its own withdrawal date (not from your purchase date as a lump sum), and the Ordinary Account rate has occasionally differed from {CPF_OA_RATE * 100}% historically. Log into your CPF account for the exact figure and use the override field once you have it.</Caveat>
        </Section>

        <Section title="True profit/loss">
          <P>This is the property&apos;s own economic return — deliberately independent of how you financed it:</P>
          <Formula>{`True profit/loss = (Sale price − selling costs) − (Purchase price + purchase fees + sunk costs + total mortgage interest paid)`}</Formula>
          <P>Notice CPF principal doesn&apos;t appear anywhere in that formula. It isn&apos;t a cost — it comes back to you, just into CPF instead of cash. Whether you paid cash, CPF, or a bank loan doesn&apos;t change whether the <em>property</em> made or lost money; it only changes how much of that gain is spendable today versus locked back in CPF. That&apos;s why the results page always shows both true profit/loss <em>and</em> cash proceeds side by side, never collapsed into one number.</P>
          <P>The results page also shows two ROI figures on top of the dollar amount — the same profit, divided two different ways:</P>
          <Formula>{`ROI on purchase price = True profit/loss ÷ Purchase price

ROI on cash + CPF put in = True profit/loss ÷ (Cash outlay + CPF used)`}</Formula>
          <P>The second is usually the bigger number. If you took a loan, your own money (cash + CPF) was smaller than the full purchase price — the same dollar profit spread over that smaller base is a leveraging effect, not a calculation error. Neither figure accounts for the time value of money (a 20% return over 2 years isn&apos;t the same as 20% over 10) — see <em>Limitations</em> below.</P>
        </Section>

        <Section title="Buyer's Stamp Duty (BSD)">
          <P>Tiered on purchase price or market value, whichever is higher — same schedule for HDB and private property. Used twice on this page: auto-computed into your original purchase fees above, and auto-computed again on the new price if you use the &quot;buying next&quot; section:</P>
          <Formula>{`First S$180,000    → 1%
Next S$180,000     → 2%
Next S$640,000     → 3%
Next S$500,000     → 4%
Next S$1,500,000   → 5%
Remaining amount   → 6%`}</Formula>
          <Caveat>Rates as of {BSD_AS_OF}. Government stamp duty schedules change at Budget announcements or ad-hoc cooling measures — verify against IRAS before relying on this for a real transaction.</Caveat>
        </Section>

        <Section title="Seller's Stamp Duty (SSD)">
          <P>Private residential property only — HDB flats are governed by the Minimum Occupation Period instead, not SSD. Applied to sale price based on how long you held the property:</P>
          <Formula>{`Held ≤ 1 year   → 12%
Held 1–2 years  → 8%
Held 2–3 years  → 4%
Held > 3 years  → 0%`}</Formula>
          <Caveat>Rates as of {SSD_AS_OF}, the last confirmed private-property SSD schedule. This is exactly the kind of rate that gets revised in cooling measures — verify against IRAS, especially for a recent purchase.</Caveat>
        </Section>

        <Section title="Additional Buyer's Stamp Duty (ABSD)">
          <P>ABSD only applies when <em>buying</em> your next place, not when selling. I don&apos;t try to compute this one — eligibility depends on citizenship, entity structure, existing property count, and remission schemes (e.g. married couples buying jointly) that would take a lot more input to model correctly. Instead, the &quot;buying next&quot; section shows a reference table of current rates next to a field where you enter your own figure:</P>
          <Formula>{`Singapore Citizen — 1st property   → 0%
Singapore Citizen — 2nd property   → 20%
Singapore Citizen — 3rd+ property  → 30%
Permanent Resident — 1st property  → 5%
Permanent Resident — 2nd+ property → 30%
Foreigner — any property           → 60%
Entity (company / trustee)         → 65%`}</Formula>
          <Caveat>Reference rates as of {ABSD_AS_OF}, before any remission. Verify your exact bracket on IRAS.</Caveat>
        </Section>

        <Section title="HDB Minimum Occupation Period">
          <P>HDB flats legally can&apos;t be sold before {HDB_MOP_YEARS} years from purchase — this is a hard legal restriction, not a cost, so it&apos;s shown as a warning rather than folded into any of the money figures above. If your sale date is less than {HDB_MOP_YEARS} years after your purchase date, the results page flags it clearly; the numbers still calculate for planning purposes.</P>
        </Section>

        <Section title="Buying your next place">
          <P>Funds required = new downpayment (new price − new loan amount) + BSD on the new price + any ABSD you enter + other fees. Funds available = cash proceeds and CPF refund carried forward from the sale above, plus any extra cash or CPF you choose to add.</P>
          <Formula>{`Gap = Funds required − Funds available

Gap > 0  → shortfall (you need to find more)
Gap ≤ 0  → surplus (money left over)`}</Formula>
          <Caveat>Cash and CPF are treated as interchangeable here for simplicity. In practice, some costs may need to be paid in cash specifically depending on your CPF withdrawal limits — confirm the split with your banker or lawyer before relying on this for a real purchase.</Caveat>
        </Section>

        <Section title="Limitations">
          <P>This calculator doesn&apos;t account for: resale levies (if applicable to your HDB situation), rental income if the property was ever tenanted, changes in property tax during your holding period, or agent commission on the purchase side if you used one to buy. The mortgage-rate assumption is a single constant rate for the whole holding period — refinancing isn&apos;t modelled, which is exactly what the outstanding-balance override field on the results page is for. Both ROI figures are simple total returns, not annualized — they don&apos;t account for how long you held the property, so a 20% return over 2 years and a 20% return over 10 years show identically even though the first is a much better outcome per year.</P>
        </Section>

        <div style={{ marginTop: 40, padding: 20, background: C.surface, borderRadius: C.rL, border: `1px solid ${C.border}`, fontSize: C.xs, color: C.faint, lineHeight: 1.7 }}>
          This tool is for educational purposes only. It does not constitute financial or legal advice. All figures are estimates. Consult a MAS-licensed financial adviser, a conveyancing lawyer, and IRAS/CPF Board directly before making any property decision.
        </div>
      </div>
    </div>
  )
}
