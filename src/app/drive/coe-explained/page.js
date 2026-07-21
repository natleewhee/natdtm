'use client'

import { useState } from 'react'
import Link from 'next/link'
import { calcARF, calcPARF, COE_FALLBACK } from '@/lib/drive/calc'
import { CoeHistoryChart } from '@/components/drive/CoeHistoryChart'
import { CoeTimingSignal } from '@/components/drive/CoeTimingSignal'

const C = {
  coah: '#1b2320', primary: '#1b2320', accent: '#1f6f54', accentBg: '#e4efe9', accentText: '#145c43',
  bg: '#f3f5f2', surface: '#ffffff', border: '#d8ded9',
  text: '#1b2320', muted: '#5f6b64', faint: '#8a948d',
  red: '#c1443f', redBg: '#f7e9e8',
  amber: '#b8863b', amberBg: '#f5ecd9', amberText: '#7a5a26',
  fontCoah: "'Fraunces', system-ui, sans-serif",
  fontDisplay: "'Fraunces', Georgia, serif",
  fontBody: "'IBM Plex Sans', system-ui, sans-serif",
  fontMono: "'IBM Plex Mono', ui-monospace, monospace",
  r: '8px', rL: '14px', rXL: '20px',
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
  xs: '11px', sm: '13px', base: '15px', lg: '17px',
}
const SGD = n => `S$${Math.round(n).toLocaleString('en-SG')}`

// Short car list for the interactive element
const DEMO_CARS = [
  { id: 'corolla', name: 'Toyota Corolla Altis', omv: 27000, rateTier: 'green', tenure: 7, loanCap: 70, basePrice: 145000 },
  { id: 'freed',   name: 'Honda Freed e:HEV',   omv: 20000, rateTier: 'green', tenure: 7, loanCap: 70, basePrice: 168000 },
  { id: 'sealion', name: 'BYD Sealion 7',        omv: 37500, rateTier: 'green', tenure: 7, loanCap: 60, basePrice: 161000 }, // ex-COE ~161k
  { id: 'harrier', name: 'Toyota Harrier',       omv: 42000, rateTier: 'green', tenure: 7, loanCap: 60, basePrice: 127000 },
  { id: 'bmw320',  name: 'BMW 320i',             omv: 42000, rateTier: 'ice',   tenure: 7, loanCap: 60, basePrice: 170000 },
]

const RATES = { ice: 0.0260, green: 0.0208, tesla: 0.0168 }

function calcTotal(car, coe) {
  const totalPrice = car.basePrice + coe
  const arf = calcARF(car.omv)
  const isEV = car.rateTier === 'green'
  const eeai = isEV ? Math.min(arf * 0.45, 7500) : 0
  const netArf = arf - eeai
  const duty = car.omv * 0.308
  const govtExCOE = car.omv + netArf + duty + 350
  const minDown = totalPrice * (1 - car.loanCap / 100)
  const loan = totalPrice - minDown
  const rate = RATES[car.rateTier] || 0.026
  const interest = loan * rate * car.tenure
  const monthly = (loan + interest) / (car.tenure * 12)
  const parfAt7 = calcPARF(netArf, 7)
  const coeRebateAt7 = (Math.max(0, 120 - 84) / 120) * coe
  const totalPaid = minDown + (loan + interest)
  const trueOwnership7yr = totalPaid - parfAt7 - coeRebateAt7
  return { totalPrice, monthly, minDown, loan, trueOwnership7yr, parfAt7, coeRebateAt7, coe, govtExCOE }
}

function Callout({ color = C.accentBg, border = C.accent, children }) {
  return (
    <div style={{ background: color, border: `1px solid ${border}33`, borderRadius: C.rL, padding: '16px 20px', margin: '16px 0' }}>
      {children}
    </div>
  )
}

export default function COEExplainerPage() {
  const [selectedCar, setSelectedCar] = useState(DEMO_CARS[0])
  const [coe, setCoe] = useState(COE_FALLBACK.catA)

  const result = calcTotal(selectedCar, coe)
  const resultLow = calcTotal(selectedCar, 80000)
  const resultHigh = calcTotal(selectedCar, 130000)
  const monthlyDiff = resultHigh.monthly - resultLow.monthly

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>

      {/* Nav */}
      <nav className="coah-nav" style={{ background: C.coah, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 0 rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/drive" style={{ textDecoration: 'none' }}>
            <div>
              <span style={{ fontFamily: C.fontCoah, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block' }}>COAH</span>
              <span style={{ fontFamily: C.fontDisplay, fontSize: 17, color: '#fff' }}>DriveReady</span>
            </div>
          </Link>
        </div>
        <Link href="/drive" style={{ fontSize: C.xs, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 1 }}>← Back to calculator</Link>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: C.fontCoah, fontSize: 10, fontWeight: 600, color: C.accent, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Coah Explainer</div>
          <h1 style={{ fontFamily: C.fontDisplay, fontSize: 'clamp(28px,5vw,44px)', color: C.primary, margin: '0 0 16px', lineHeight: 1.2 }}>COE, PARF, and ARF — demystified</h1>
          <p style={{ fontSize: C.lg, color: C.muted, margin: 0, lineHeight: 1.7 }}>You know what a COE is. But do you know what PARF means, why the COE rebate exists, and how it all affects what you actually pay and recover over 10 years?</p>
        </div>

        {/* Section 1: COE */}
        <h2 style={{ fontFamily: C.fontDisplay, fontSize: 24, color: C.primary, margin: '0 0 12px' }}>The COE: what you&apos;re really buying</h2>
        <p style={{ fontSize: C.base, color: C.text, lineHeight: 1.8, margin: '0 0 14px' }}>
          A Certificate of Entitlement is a 10-year right to own and use a car in Singapore. When you buy a new car, the COE price is bundled into the sticker price — but it&apos;s worth understanding it separately, because it&apos;s the single most volatile component of what you pay.
        </p>
        <p style={{ fontSize: C.base, color: C.text, lineHeight: 1.8, margin: '0 0 14px' }}>
          COE prices are set by open bidding, twice a month. LTA releases a fixed quota of certificates; whoever bids above the clearing price wins. If demand is high (lots of people want cars), prices surge. If quota is large or demand is weak, prices fall. This has nothing to do with the car itself — it&apos;s purely a function of how many Singaporeans want to drive that month.
        </p>
        <Callout>
          <p style={{ fontSize: C.sm, color: C.accentText, margin: 0, lineHeight: 1.6 }}>
            <strong>Category A vs B:</strong> Cat A covers cars with OMV ≤ S$20,000 (broadly, mass-market). Cat B covers cars with OMV &gt; S$20,000 (broadly, larger or more premium). Cat B COE is typically more expensive. Most EVs qualify for Cat A despite their price because their OMV (what LTA values the car at, roughly the manufacturer&apos;s export price) is low.
          </p>
        </Callout>

        <div style={{ margin: '0 0 20px' }}>
          <CoeHistoryChart/>
        </div>

        <div style={{ margin: '0 0 20px' }}>
          <CoeTimingSignal/>
        </div>

        {/* Section 2: ARF */}
        <h2 style={{ fontFamily: C.fontDisplay, fontSize: 24, color: C.primary, margin: '32px 0 12px' }}>ARF: the government&apos;s take on your car&apos;s value</h2>
        <p style={{ fontSize: C.base, color: C.text, lineHeight: 1.8, margin: '0 0 14px' }}>
          The Additional Registration Fee (ARF) is a tax paid when you register a new car, calculated as a percentage of the car&apos;s OMV. It&apos;s tiered — the more expensive the car (by OMV), the higher the rate.
        </p>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rL, overflow: 'hidden', marginBottom: 20 }}>
          {[
            ['First S$20,000 of OMV', '100%'],
            ['Next S$20,000 (S$20k–40k)', '140%'],
            ['Next S$20,000 (S$40k–60k)', '190%'],
            ['Next S$20,000 (S$60k–80k)', '250%'],
            ['Above S$80,000', '320%'],
          ].map(([band, rate], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none', background: i % 2 === 0 ? C.surface : C.bg }}>
              <span style={{ fontSize: C.sm, color: C.text }}>{band}</span>
              <span style={{ fontSize: C.sm, fontFamily: C.fontMono, fontWeight: 700, color: C.primary }}>{rate}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: C.base, color: C.text, lineHeight: 1.8, margin: '0 0 14px' }}>
          For EVs, you also get the EEAI (Electric Vehicle Early Adoption Incentive) — 45% off ARF, capped at S$7,500 in 2026. This is why EVs can be surprisingly affordable despite high sticker prices.
        </p>

        {/* Section 3: PARF */}
        <h2 style={{ fontFamily: C.fontDisplay, fontSize: 24, color: C.primary, margin: '32px 0 12px' }}>PARF: money you get back</h2>
        <p style={{ fontSize: C.base, color: C.text, lineHeight: 1.8, margin: '0 0 14px' }}>
          When you deregister a car before it turns 10, you get back a portion of the ARF you paid. This is the PARF (Preferential ARF) rebate. The older the car, the less you get back.
        </p>
        <Callout color={C.amberBg} border={C.amber}>
          <p style={{ fontSize: C.sm, color: C.amberText, margin: 0, lineHeight: 1.6 }}>
            <strong>The 10-year cliff:</strong> Scrap at year 9 and you get 55% of your ARF back. Wait until year 10 (COE expiry) and you get 50%. But if you let the COE expire without renewing or deregistering, you get nothing. This is why owners often scrap slightly before the COE expires.
          </p>
        </Callout>

        {/* Section 4: COE Rebate */}
        <h2 style={{ fontFamily: C.fontDisplay, fontSize: 24, color: C.primary, margin: '32px 0 12px' }}>COE rebate: your unused COE months</h2>
        <p style={{ fontSize: C.base, color: C.text, lineHeight: 1.8, margin: '0 0 14px' }}>
          If you deregister a car before its COE expires, you also get back a pro-rated refund of the COE — proportional to how many months are left. Deregister with 36 months left on a S$110,000 COE, and you get back S$110,000 × (36/120) = S$33,000.
        </p>
        <p style={{ fontSize: C.base, color: C.text, lineHeight: 1.8, margin: '0 0 14px' }}>
          Together, PARF + COE rebate is what you recover when you scrap or export your car. This is why cars don&apos;t depreciate to zero in Singapore — they always retain a floor value equal to their scrap value.
        </p>

        {/* Interactive element */}
        <div style={{ background: C.coah, borderRadius: C.rXL, padding: 32, margin: '40px 0 32px' }}>
          <div style={{ fontFamily: C.fontCoah, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Interactive</div>
          <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: '#fff', margin: '0 0 8px' }}>How does COE price affect what you pay?</h2>
          <p style={{ fontSize: C.sm, color: 'rgba(255,255,255,0.55)', margin: '0 0 24px' }}>Pick a car and drag the COE slider to see how the price and monthly cost change.</p>

          {/* Car selector */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {DEMO_CARS.map(car => (
              <button key={car.id} onClick={() => setSelectedCar(car)}
                style={{ padding: '7px 14px', borderRadius: 100, border: `1.5px solid ${selectedCar.id === car.id ? C.accent : 'rgba(255,255,255,0.2)'}`, background: selectedCar.id === car.id ? C.accent : 'transparent', color: selectedCar.id === car.id ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: C.xs, cursor: 'pointer', fontFamily: C.fontBody, fontWeight: selectedCar.id === car.id ? 700 : 400 }}>
                {car.name}
              </button>
            ))}
          </div>

          {/* COE Slider */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: C.xs, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>COE Price</label>
              <span style={{ fontSize: C.lg, fontFamily: C.fontMono, fontWeight: 700, color: '#fff' }}>{SGD(coe)}</span>
            </div>
            <input type="range" min={60000} max={150000} step={1000} value={coe}
              onChange={e => setCoe(Number(e.target.value))}
              style={{ width: '100%', accentColor: C.accent }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              <span>S$60,000 (historic low)</span><span>S$150,000 (historic high)</span>
            </div>
          </div>

          {/* Results */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
            {[
              { label: 'Total Price (incl. COE)', value: SGD(result.totalPrice), sub: `${SGD(result.coe)} is COE` },
              { label: 'Min. Downpayment', value: SGD(result.minDown), sub: `${selectedCar.loanCap}% max loan` },
              { label: 'Monthly Instalment', value: SGD(result.monthly), sub: `over ${selectedCar.tenure} years` },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: C.r, padding: '12px 14px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                <div style={{ fontSize: C.lg, fontFamily: C.fontMono, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{value}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: C.r, fontSize: C.xs, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Moving COE from S$80,000 to S$130,000 changes the monthly instalment for {selectedCar.name} by <strong style={{ color: '#fff' }}>{SGD(monthlyDiff)}/month</strong> — a S$50,000 swing in COE price adds {SGD(monthlyDiff * selectedCar.tenure * 12)} in total loan repayments.
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '32px 0 0' }}>
          <p style={{ fontSize: C.base, color: C.muted, marginBottom: 20 }}>Ready to run the full numbers for your situation?</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/drive" style={{ padding: '13px 28px', background: C.primary, color: '#fff', borderRadius: C.rL, fontSize: C.sm, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(27,35,32,0.2)' }}>
              Calculate affordability →
            </Link>
            <Link href="/drive/renew-or-replace" style={{ padding: '13px 28px', background: C.surface, color: C.primary, border: `2px solid ${C.primary}`, borderRadius: C.rL, fontSize: C.sm, fontWeight: 700, textDecoration: 'none' }}>
              Renew or Replace? →
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
