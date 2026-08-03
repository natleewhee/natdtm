'use client'

import ShellHeader from '@/components/shared/ShellHeader'
import MathTOC from '@/components/shared/MathTOC'
import { C } from '@/lib/drive/theme'

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
function H2({ children }) {
  return <h2 id={slug(children)} style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '36px 0 12px', borderBottom: `2px solid ${C.accent}`, paddingBottom: 8, scrollMarginTop: 80 }}>{children}</h2>
}
function P({ children }) {
  return <p style={{ fontSize: C.base, color: C.text, lineHeight: 1.8, margin: '0 0 14px' }}>{children}</p>
}
function Table({ rows }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 20 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: C.sm }}>
        <thead>
          <tr style={{ background: C.coah }}>
            {rows[0].map((h, i) => <th key={i} style={{ padding: '10px 14px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.bg }}>
              {row.map((cell, j) => <td key={j} style={{ padding: '9px 14px', color: C.text, borderBottom: `1px solid ${C.border}` }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function RenewOrReplaceTheMath() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="The Math" breadcrumb="Renew or Replace" backHref="/drive/renew-or-replace" />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 32, color: C.primary, margin: '0 0 8px' }}>How We Calculate</h1>
        <p style={{ fontSize: C.base, color: C.muted, margin: '0 0 8px' }}>All assumptions behind the Renew or Replace calculator.</p>

        <MathTOC items={[
          { id: 'comparing-different-horizons', label: 'Comparing different horizons' },
          { id: 'renew-option-cost-components', label: 'Renew costs' },
          { id: 'parf-rebate-calculation', label: 'PARF rebate' },
          { id: 'buy-new-option-cost-components', label: 'Buy new costs' },
          { id: 'maintenance-estimates-by-brand', label: 'Maintenance' },
          { id: 'the-annual-cost-formula', label: 'Annual cost formula' },
          { id: 'limitations', label: 'Limitations' },
        ]} />

        <H2>Comparing different horizons</H2>
        <P>The options on offer don&apos;t share one horizon: a 5-year renewal is compared over 5 years, a 10-year renewal (or buying new) over 10 years, and a used car over however many years its COE has left. Because these differ, we don&apos;t compare total cost directly — every option is reduced to <strong>annual cost</strong> (see below), which normalises them to the same per-year unit so a 5-year and a 10-year option are genuinely comparable. All costs are in today&apos;s dollars (no inflation adjustment), which is conservative and standard for short-horizon personal finance calculations.</P>

        <H2>Renew Option — Cost Components</H2>
        <Table rows={[
          ['Renewal Period', 'Cost', 'Can Renew Again?', 'Note'],
          ['5 years', '50% of PQP', 'No — car must be deregistered after', 'Only allowed once for Cat A/B cars'],
          ['10 years', '100% of PQP', 'Yes — indefinitely', 'Full flexibility for ongoing ownership'],
        ]} />
        <P><strong>COE Renewal cost — LTA official rules:</strong> The Prevailing Quota Premium (PQP) is the 3-month moving average of successful COE bids. LTA publishes it monthly. To renew for <strong>5 years, you pay 50% of PQP</strong>. To renew for <strong>10 years, you pay 100% of PQP</strong>. Source: onemotoring.lta.gov.sg/coe-renewal.</P>
        <P><strong>Critical LTA rule for Cars (Cat A/B):</strong> The 5-year renewal can only be done <strong>once</strong>. After the 5-year renewal expires, the car must be deregistered — you cannot renew again. The 10-year renewal can be repeated indefinitely in 10-year blocks.</P>
        <P><strong>Opportunity cost:</strong> By renewing, you give up the PARF rebate and COE rebate you would have received by scrapping now. These are real money you forgo, so we count them as a cost of renewal.</P>
        <P><strong>Recovery at end:</strong> At the end of the renewal period, any remaining PARF value (if car is under 10 years old) is deducted from total cost. The renewed COE is fully consumed so there is no COE rebate at the end.</P>

        <H2>PARF Rebate Calculation</H2>
        <P>PARF (Preferential Additional Registration Fee) rebate is returned when you deregister a car under 10 years old. It is calculated as a percentage of the ARF (Additional Registration Fee) you paid when registering the car.</P>
        <Table rows={[
          ['Car Age at Deregistration', 'PARF Rebate (% of ARF paid)', 'Cap'],
          ['≤ 5 years', '75%', 'S$60,000'],
          ['6 years', '70%', 'S$60,000'],
          ['7 years', '65%', 'S$60,000'],
          ['8 years', '60%', 'S$60,000'],
          ['9 years', '55%', 'S$60,000'],
          ['10 years', '50%', 'S$60,000'],
          ['> 10 years', '0%', '—'],
        ]} />
        <P>ARF is calculated using the current tiered structure (effective Feb 2023): 100% of first S$20,000 OMV, 140% of next S$20,000, 190% of next S$20,000, 250% of next S$20,000, 320% above S$80,000.</P>

        <H2>Buy New Option — Cost Components</H2>
        <P><strong>Loan calculation:</strong> Flat-rate interest. Green/EV rate 2.08%, ICE rate 2.60%, Tesla 1.68% (MAS published rates). Monthly instalment = (loan + total interest) ÷ (tenure × 12).</P>
        <P><strong>Recovered value at the horizon (10 years by default):</strong> There is no flat depreciation percentage — recovery is the same PARF-rebate-plus-COE-rebate model used everywhere else on this page, applied at the chosen horizon. PARF is calculated from net ARF (after any EV rebate) at the schedule above; the COE rebate is the unused-months share of the COE premium paid. Actual recovery varies significantly by car, COE level, and how many years you hold it — the main DriveReady calculator gives the precise per-car figure.</P>

        <H2>Maintenance Estimates by Brand</H2>
        <P>Annual servicing costs are based on Singapore workshop data (2026) from ValuePenguin, Revol Carz, and authorised dealer published schedules. Age-related repair costs follow a curve based on owner community data — costs accelerate non-linearly after year 5.</P>
        <Table rows={[
          ['Category', 'Annual Servicing', 'Age repair yr 1–3', 'yr 4–6', 'yr 7–8', 'yr 9–10'],
          ['Japanese (Toyota, Honda, Nissan)', 'S$620–900', 'S$0', 'S$400–800', 'S$1,500–2,500', 'S$3,500–5,000'],
          ['Korean (Hyundai, Kia)', 'S$800–900', 'S$0', 'S$500–900', 'S$1,800–2,800', 'S$4,000–5,500'],
          ['Chinese EV (BYD, MG, Xpeng)', 'S$380–500', 'S$0', 'S$200–400', 'S$800–1,500', 'S$3,000–6,000*'],
          ['European (VW, Volvo, MINI)', 'S$950–1,400', 'S$0', 'S$600–1,000', 'S$2,000–3,500', 'S$5,000–7,000'],
          ['German Premium (BMW, Merc, Audi)', 'S$2,100–2,400', 'S$0', 'S$800–1,500', 'S$3,000–5,000', 'S$7,500–10,000'],
          ['Tesla', 'S$500', 'S$0', 'S$300–600', 'S$1,200–2,000', 'S$4,000–8,000*'],
        ]} />
        <P>* Chinese EVs and Tesla carry battery replacement risk at age 8–10. Battery replacement costs S$15,000–30,000 and is not included in the above estimates. The calculator flags this risk when applicable.</P>

        <H2>The Annual Cost Formula</H2>
        <P>Every option is reduced to a single comparable number: <strong>annual cost</strong>.</P>
        <Table rows={[
          ['Formula', 'Annual cost = (total money paid out − total money recovered) ÷ years of use'],
          ['Why annual?', 'Options have different time horizons — 5yr renewal vs 10yr renewal vs buying new. Annual cost normalises them to the same unit so comparison is fair.'],
          ['What counts as "paid out"?', 'Renewal cost or purchase price + maintenance over the period + opportunity cost (scrap value given up by not scrapping now)'],
          ['What counts as "recovered"?', 'PARF rebate + COE rebate at the end of the period (when you eventually scrap or sell)'],
        ]} />
        <P>For the <strong>used car</strong> option, we also show cost per remaining COE year — simply the purchase price divided by COE years left. This cuts through everything and shows what you are paying purely for the right to drive that car.</P>

        <H2>Limitations</H2>
        <P>This calculator does not account for: resale value (only scrap value), changes in insurance premiums with car age, road tax differences, petrol/EV charging costs, or financing availability changes. Recovered value at the comparison horizon is estimated from the PARF/COE model above — use the main DriveReady calculator for a more precise per-car depreciation figure.</P>

        <div style={{ marginTop: 40, padding: 20, background: C.surface, borderRadius: C.rL, border: `1px solid ${C.border}`, fontSize: C.xs, color: C.faint, lineHeight: 1.7 }}>
          This tool is for educational purposes only. It does not constitute financial advice. All figures are estimates. Consult a MAS-licensed financial adviser before making any financial decision. Not affiliated with LTA, any car dealer, or any financial institution.
        </div>
      </div>
    </div>
  )
}
