'use client'

import { useRouter } from 'next/navigation'
import { C } from '@/lib/ledger/theme'
import { TDSR_LIMIT, TAKE_HOME_RATE, MSR_LIMIT } from '@/lib/ledger/calc'
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

export default function LedgerTheMathPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="The Math" breadcrumb="MyLedger" onBack={() => router.back()} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 32, color: C.primary, margin: '0 0 8px' }}>How MyLedger puts everything together</h1>
        <p style={{ fontSize: C.base, color: C.muted, margin: '0 0 8px' }}>
          Every number here comes from HouseMuch, DriveReady, and RetireWell&apos;s own formulas — this page only covers how they&apos;re combined.
        </p>

        <MathTOC items={[
          { id: 'where-the-numbers-come-from', label: 'Where the numbers come from' },
          { id: 'net-worth', label: 'Net worth' },
          { id: 'monthly-commitments-tdsr-and-msr', label: 'Commitments, TDSR & MSR' },
          { id: 'investment-capacity-and-why-it-rises', label: 'Investment capacity' },
          { id: 'retirement-projection', label: 'Retirement projection' },
          { id: 'scenarios', label: 'Scenarios' },
          { id: 'limitations', label: 'Limitations' },
        ]} />

        <Section noBorder>
          <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 16px' }} id="where-the-numbers-come-from">Where the numbers come from</h2>
          <P>MyLedger doesn&apos;t reimplement HouseMuch, DriveReady, or RetireWell&apos;s math — it calls into their own calculation engines directly, so a formula fix in one of those tools is automatically reflected here too. Its own job is purely combining what those tools compute (or what you type in directly) into one picture, and running that combined picture through a few extra checks: total leverage across every debt, and what&apos;s actually left over to invest each month.</P>
        </Section>

        <Section title="Net worth">
          <P>Sum of the equity in every module you&apos;ve filled in:</P>
          <Formula>{`Net worth = (home value − mortgage outstanding)
          + (car value − car loan outstanding)
          + CPF Ordinary + CPF Special + CPF MediSave
          + investment portfolio value
          + cash savings`}</Formula>
          <P>A module left empty (no mortgage, no car) simply contributes zero — it&apos;s never treated as a missing/unknown value.</P>
          <P>For a joint loan, a scenario&apos;s mortgage section has its own &quot;This is a joint loan&quot; toggle. Home value, outstanding balance, and monthly instalment are all scaled together by your share, so what lands in net worth is your equity share (your share of the asset minus your share of the debt) — scaling only the debt would overstate net worth by leaving the full asset value in place against a smaller liability. If a mortgage was auto-synced from a HouseMuch sale that already had its own joint-loan share applied, it arrives here already scaled — MyLedger&apos;s toggle is for a scenario&apos;s own mortgage split, independent of that.</P>
        </Section>

        <Section title="Monthly commitments, TDSR and MSR">
          <P>Two different numbers matter here, and conflating them is a good way to get a loan rejected. <strong>What actually leaves your account</strong> each month includes insurance premiums. <strong>What a bank counts</strong> against you does not — premiums aren&apos;t debt:</P>
          <Formula>{`Total commitments = mortgage + car instalment + insurance premiums
Debt obligations  = mortgage + car instalment          (banks count this)

TDSR = debt obligations ÷ gross monthly salary
Flagged when TDSR > ${(TDSR_LIMIT * 100).toFixed(0)}%`}</Formula>
          <P>For HDB flats (and ECs bought from a developer) a second, tighter limit applies — the <strong>Mortgage Servicing Ratio</strong>, which counts only the property loan:</P>
          <Formula>{`MSR = mortgage instalment ÷ gross monthly salary
Flagged when MSR > ${(MSR_LIMIT * 100).toFixed(0)}%

Applies to HDB only. Does not apply to private property.`}</Formula>
          <P>Because MSR is {(MSR_LIMIT * 100).toFixed(0)}% against TDSR&apos;s {(TDSR_LIMIT * 100).toFixed(0)}% and counts fewer debts, it is very often the binding constraint on an HDB purchase — an HDB loan can fail MSR while passing TDSR comfortably.</P>
          <Caveat>A real bank&apos;s calculation also counts credit facilities this tool has no way to know about (credit cards, personal loans, guarantor obligations), applies haircuts to variable income, and stress-tests the mortgage at a floor rate above what you&apos;re actually paying. Treat both ratios as directional checks, not a substitute for what your bank will compute.</Caveat>
        </Section>

        <Section title="Investment capacity, and why it rises">
          <P>What&apos;s realistically left to invest each month, after take-home pay covers every commitment — this replaces the guessed monthly-contribution figure RetireWell would otherwise ask for:</P>
          <Formula>{`Investment capacity = max(0, take-home pay − total commitments)`}</Formula>
          <P>Take-home comes from TaxWise when you&apos;ve run it, which nets off both your age-banded CPF employee share and income tax. Without it, a flat approximation is used:</P>
          <Formula>{`Exact (TaxWise):  gross − employee CPF − income tax
Fallback:         gross × ${(TAKE_HOME_RATE * 100).toFixed(0)}%`}</Formula>
          <P><strong>Crucially, capacity is not constant.</strong> Loans end. A seven-year car loan does not keep draining a thirty-year projection, so each commitment drops out of the schedule once its remaining tenure is up and capacity steps up accordingly:</P>
          <Formula>{`For each month m until retirement:
  capacity(m) = take-home
              − (mortgage, if m < months left on the mortgage)
              − (car instalment, if m < months left on the car loan)
              − insurance premiums   (no tenure — assumed ongoing)`}</Formula>
          <Caveat>Leaving a &quot;years left&quot; field blank means that loan is assumed to run all the way to retirement — the conservative reading. Insurance premiums are assumed to continue indefinitely, which is right for whole-life and hospitalisation cover but overstates the cost of a term policy that expires.</Caveat>
        </Section>

        <Section title="Retirement projection">
          <P>Each scenario&apos;s CPF balances, investment balance, and salary feed straight into RetireWell&apos;s own accumulation and depletion engine — the exact same projection RetireWell itself would produce.</P>
          <P>That engine takes a single flat monthly contribution, but real capacity steps up as loans end. Rather than average the schedule (which would misprice the compounding — early contributions have decades longer to grow), this solves for the <strong>level contribution whose future value at retirement exactly equals</strong> that of the real, time-varying schedule:</P>
          <Formula>{`FV of the real schedule = Σ capacity(m) × (1 + r)^(n − m − 1)

annuity factor          = ((1 + r)^n − 1) ÷ r

level contribution      = FV of the real schedule ÷ annuity factor

where r = monthly return, n = months to retirement`}</Formula>
          <P>The flat figure handed to RetireWell therefore produces exactly the answer the varying schedule would — it is a reformulation, not an approximation.</P>
          <P>See RetireWell&apos;s <a href="/retire/the-math" style={{ color: C.accent }}>the math</a> page for the full CPF contribution, interest, and depletion-simulation formulas — nothing about that engine changes here.</P>
        </Section>

        <Section title="Scenarios">
          <P>A scenario is a complete, independent copy of your numbers — starting from your baseline, then edited freely (add a car, swap in a bigger mortgage, bump your salary). Each scenario runs through every formula above completely independently; nothing about one scenario affects another. Up to three scenarios (baseline plus two what-ifs) can be compared side by side.</P>
          <P>A scenario&apos;s mortgage can either be an existing loan (plain balance/instalment fields) or &quot;buying a new house&quot; — the same math HouseMuch&apos;s NextPurchase uses:</P>
          <Formula>{`Downpayment = new house price × downpayment %  (defaults to 25%, i.e. a 75% loan)
Loan amount = price − downpayment
Monthly instalment = standard reducing-balance formula, at your entered rate and tenure
BSD = computed from the public stamp duty schedule (same as HouseMuch)

Cash needed upfront = downpayment + BSD + other fees you enter
Cash savings after the purchase = max(0, cash savings entered − cash needed)`}</Formula>
          <Caveat>If cash needed exceeds what you&apos;ve entered as cash savings, that scenario flags a shortfall rather than going negative — cash savings floors at zero in the net worth and comparison figures, since a real purchase in that situation would need financing you haven&apos;t modeled (a bridging loan, selling other assets, etc.) rather than silently going into debt.</Caveat>
        </Section>

        <Section title="Limitations">
          <P>This tool only knows what you&apos;ve told it — either synced from the other ndtm tools or typed in directly. It has no way to detect other debts, income sources, or major assets you haven&apos;t entered, so net worth and TDSR here can understate your actual financial position. Numbers synced from another tool reflect whatever was last saved there, which can go stale as balances change — re-run that tool and revisit this page for a current picture.</P>
        </Section>
      </div>
    </div>
  )
}
