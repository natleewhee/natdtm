'use client'

import { useState } from 'react'
import { C } from '@/lib/house/theme'
import { calcSale } from '@/lib/house/calc'
import { MoneyInput, PercentInput, NumberInput, DateInput, Segmented, SectionDivider } from '@/components/house/ui'
import SaleResults from '@/components/house/SaleResults'
import NextPurchase from '@/components/house/NextPurchase'
import ShellHeader from '@/components/shared/ShellHeader'
import TrustBadges from '@/components/shared/TrustBadges'
import Button from '@/components/shared/Button'
import ExploreSection from '@/components/shared/ExploreSection'

const num = raw => {
  const n = parseFloat(String(raw ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

export default function HouseMuchPage() {
  const [propertyType, setPropertyType] = useState('private')

  // Purchase
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [cashOutlay, setCashOutlay] = useState('')
  const [cpfOutlay, setCpfOutlay] = useState('')
  const [loanTaken, setLoanTaken] = useState('')
  const [mortgageRate, setMortgageRate] = useState('2.60')
  const [loanTenure, setLoanTenure] = useState('25')
  const [purchaseFees, setPurchaseFees] = useState('')
  const [sunkCost, setSunkCost] = useState('')
  const [hasGrant, setHasGrant] = useState(false)
  const [housingGrant, setHousingGrant] = useState('')

  // Sale
  const [salePrice, setSalePrice] = useState('')
  const [saleDate, setSaleDate] = useState('')
  const [agentCommission, setAgentCommission] = useState('')
  const [legalFeesAtSale, setLegalFeesAtSale] = useState('')

  // Overrides (raw strings; empty = use computed default)
  const [outstandingOverride, setOutstandingOverride] = useState('')
  const [cpfInterestOverride, setCpfInterestOverride] = useState('')
  const [ssdOverride, setSsdOverride] = useState('')

  const [calculated, setCalculated] = useState(false)

  const isReady = num(purchasePrice) > 0 && purchaseDate && num(salePrice) > 0 && saleDate

  const result = calculated && isReady ? calcSale({
    propertyType,
    purchasePrice: num(purchasePrice), purchaseDate, purchaseFees: num(purchaseFees),
    cashOutlay: num(cashOutlay), cpfOutlay: num(cpfOutlay),
    housingGrant: hasGrant ? num(housingGrant) : 0,
    loanTaken: num(loanTaken), mortgageRate: num(mortgageRate), loanTenure: num(loanTenure),
    sunkCost: num(sunkCost),
    salePrice: num(salePrice), saleDate,
    agentCommission: num(agentCommission), legalFeesAtSale: num(legalFeesAtSale),
    outstandingBalanceOverride: outstandingOverride !== '' ? num(outstandingOverride) : null,
    cpfAccruedInterestOverride: cpfInterestOverride !== '' ? num(cpfInterestOverride) : null,
    ssdOverride: ssdOverride !== '' ? num(ssdOverride) : null,
  }) : null

  const handleCalc = () => setCalculated(true)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontBody }}>
      <ShellHeader title="HouseMuch" links={[{ href: '/house/the-math', label: 'The Math' }]} />

      {/* Hero */}
      <div style={{ background: C.coah, padding: '48px 32px 52px', textAlign: 'center' }}>
        <div style={{ fontFamily: C.fontCoah, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
          Singapore Property Profit/Loss Calculator
        </div>
        <h1 style={{ fontFamily: C.fontDisplay, fontSize: 'clamp(30px, 5.5vw, 48px)', color: '#fff', marginBottom: 10, lineHeight: 1.2 }}>
          What did this house really make you?
        </h1>
        <p style={{ fontFamily: C.fontDisplay, fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 24, fontStyle: 'italic' }}>
          Sale price minus purchase price is a myth. I&apos;ll show you the real number — CPF and all.
        </p>
        <TrustBadges tone="dark" items={['CPF accrued interest, done right', 'BSD/SSD auto-computed', 'Zero data collected', 'Free, forever']} />
      </div>

      {/* Compliance line */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '8px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>
          Educational tool only · Not financial or legal advice · Not affiliated with HDB, CPF Board, or IRAS
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: '28px 24px', boxShadow: C.shadow }}>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: C.sm, fontWeight: 600, color: C.primary, marginBottom: 10 }}>Property type</label>
            <Segmented
              value={propertyType}
              onChange={v => { setPropertyType(v); setCalculated(false) }}
              options={[{ value: 'hdb', label: 'HDB' }, { value: 'private', label: 'Private' }]}
            />
            <p style={{ marginTop: 8, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
              {propertyType === 'hdb'
                ? 'HDB flats have a 5-year Minimum Occupation Period before you can sell, and may need a CPF Housing Grant refund. No Seller\'s Stamp Duty applies.'
                : 'Private property may owe Seller\'s Stamp Duty if sold within 3 years of purchase.'}
            </p>
          </div>

          <SectionDivider label="The house you're selling" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="purchase-price" label="Purchase price" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
            <DateInput id="purchase-date" label="Purchase date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            <MoneyInput id="cash-outlay" label="Cash outlay at purchase" hint="Downpayment cash + fees paid in cash" value={cashOutlay} onChange={e => setCashOutlay(e.target.value)} />
            <MoneyInput id="cpf-outlay" label="Total CPF used" hint="From your CPF statement — principal only" value={cpfOutlay} onChange={e => setCpfOutlay(e.target.value)} />
            <MoneyInput id="loan-taken" label="Loan taken" value={loanTaken} onChange={e => setLoanTaken(e.target.value)} />
            <PercentInput id="mortgage-rate" label="Mortgage rate (p.a.)" value={mortgageRate} onChange={e => setMortgageRate(e.target.value)} />
            <NumberInput id="loan-tenure" label="Loan tenure" value={loanTenure} onChange={e => setLoanTenure(e.target.value)} suffix="years" />
            <MoneyInput id="purchase-fees" label="Purchase fees" hint="BSD, legal, agent — total" value={purchaseFees} onChange={e => setPurchaseFees(e.target.value)} />
            <MoneyInput id="sunk-cost" label="Renovation / sunk costs" hint="Optional" value={sunkCost} onChange={e => setSunkCost(e.target.value)} />
          </div>

          {propertyType === 'hdb' && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button" onClick={() => setHasGrant(h => !h)} aria-pressed={hasGrant}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                  background: hasGrant ? C.accentBg : C.bg, border: `1.5px solid ${hasGrant ? C.accent : C.border}`,
                  borderRadius: 100, cursor: 'pointer', fontSize: C.xs, fontWeight: 700,
                  color: hasGrant ? C.accent : C.muted, fontFamily: C.fontBody,
                }}
              >
                {hasGrant ? '✓ ' : ''} I received a CPF Housing Grant
              </button>
              {hasGrant && (
                <div style={{ marginTop: 12, maxWidth: 260 }}>
                  <MoneyInput id="housing-grant" label="Grant amount" hint="Also refunded to CPF with accrued interest on sale" value={housingGrant} onChange={e => setHousingGrant(e.target.value)} />
                </div>
              )}
            </div>
          )}

          <SectionDivider label="Selling it" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MoneyInput id="sale-price" label="Sale price" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
            <DateInput id="sale-date" label="Sale date" hint="Or your expected date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
            <MoneyInput id="agent-commission" label="Selling agent commission" hint="Typically 1–2% of sale price" value={agentCommission} onChange={e => setAgentCommission(e.target.value)} />
            <MoneyInput id="legal-fees-sale" label="Legal fees at sale" value={legalFeesAtSale} onChange={e => setLegalFeesAtSale(e.target.value)} />
          </div>

          <div style={{ marginTop: 24 }}>
            <Button variant="accent" fullWidth onClick={handleCalc} disabled={!isReady}>
              {isReady ? 'Calculate my true profit/loss' : 'Fill in the fields above'}
            </Button>
          </div>
        </div>

        {result && (
          <>
            <SaleResults
              result={result}
              outstandingOverride={outstandingOverride} onOutstandingOverride={e => setOutstandingOverride(e.target.value)}
              cpfInterestOverride={cpfInterestOverride} onCpfInterestOverride={e => setCpfInterestOverride(e.target.value)}
              ssdOverride={ssdOverride} onSsdOverride={e => setSsdOverride(e.target.value)}
            />

            <div style={{ marginTop: 32, background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, padding: '4px 24px', boxShadow: C.shadow }}>
              <ExploreSection title="Planning to buy your next place?" defaultOpen={false}>
                <NextPurchase saleResult={result} />
              </ExploreSection>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
