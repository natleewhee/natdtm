'use client'

import { useState } from 'react'
import { C, SGD, parseMoney } from '@/lib/house/theme'
import { calcNextPurchase } from '@/lib/house/calc'
import { ABSD_REFERENCE, ABSD_AS_OF } from '@/lib/house/stampDuty'
import { MoneyInput, PercentInput, NumberInput } from './ui'
import Button from '@/components/shared/Button'
import ExploreSection from '@/components/shared/ExploreSection'

const num = parseMoney

export default function NextPurchase({ saleResult }) {
  const [newPrice, setNewPrice] = useState('')
  const [newLoanAmount, setNewLoanAmount] = useState('')
  const [newLoanTenure, setNewLoanTenure] = useState('25')
  const [newMortgageRate, setNewMortgageRate] = useState('2.60')
  const [absd, setAbsd] = useState('')
  const [otherFees, setOtherFees] = useState('')
  const [extraCash, setExtraCash] = useState('')
  const [extraCPF, setExtraCPF] = useState('')
  const [showAbsdRef, setShowAbsdRef] = useState(false)
  const [calculated, setCalculated] = useState(false)

  const result = calculated ? calcNextPurchase({
    newPrice: num(newPrice), newLoanAmount: num(newLoanAmount),
    newLoanTenure: num(newLoanTenure), newMortgageRate: num(newMortgageRate),
    absd: num(absd), otherFees: num(otherFees),
    extraCash: num(extraCash), extraCPF: num(extraCPF),
  }, saleResult) : null

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <MoneyInput id="np-price" label="New house price" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
        <MoneyInput id="np-loan" label="Loan you're planning to take" value={newLoanAmount} onChange={e => setNewLoanAmount(e.target.value)} />
        <NumberInput id="np-tenure" label="Loan tenure" value={newLoanTenure} onChange={e => setNewLoanTenure(e.target.value)} suffix="years" />
        <PercentInput id="np-rate" label="Mortgage rate (p.a.)" value={newMortgageRate} onChange={e => setNewMortgageRate(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
            <label htmlFor="np-absd" style={{ fontSize: C.sm, fontWeight: 600, color: C.primary }}>ABSD (if any)</label>
            <button type="button" onClick={() => setShowAbsdRef(s => !s)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: C.xs, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
              What&apos;s my rate?
            </button>
          </div>
          <MoneyInput id="np-absd" value={absd} onChange={e => setAbsd(e.target.value)} />
          {showAbsdRef && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: C.r }}>
              {ABSD_REFERENCE.map(row => (
                <div key={row.profile} style={{ display: 'flex', justifyContent: 'space-between', fontSize: C.xs, color: C.muted, padding: '3px 0' }}>
                  <span>{row.profile}</span>
                  <span style={{ fontFamily: C.fontMono, color: C.text, fontWeight: 600 }}>{row.rate}</span>
                </div>
              ))}
              <p style={{ fontSize: 10, color: C.faint, marginTop: 8, lineHeight: 1.5 }}>
                Reference rates as of {ABSD_AS_OF}, before any remission (e.g. married couples). Doesn&apos;t account for your specific situation — verify on IRAS and enter your own figure above.
              </p>
            </div>
          )}
        </div>
        <MoneyInput id="np-fees" label="Other fees (legal, agent, moving)" hint="Optional" value={otherFees} onChange={e => setOtherFees(e.target.value)} />
        <MoneyInput id="np-cash" label="Extra cash you're adding" hint="Beyond what the sale gives you" value={extraCash} onChange={e => setExtraCash(e.target.value)} />
        <MoneyInput id="np-cpf" label="Extra CPF you're adding" hint="Beyond what the sale gives you" value={extraCPF} onChange={e => setExtraCPF(e.target.value)} />
      </div>

      <div style={{ marginTop: 20 }}>
        <Button variant="dark" onClick={() => setCalculated(true)}>Check if I can afford it →</Button>
      </div>

      {result && (
        <div style={{ marginTop: 28 }}>
          <div style={{
            background: result.surplus ? C.greenBg : C.redBg,
            border: `1px solid ${result.surplus ? C.green : C.red}55`,
            borderRadius: C.rL, padding: '20px 22px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: C.fontMono, fontSize: 32, fontWeight: 500, color: result.surplus ? C.greenText : C.redText, marginBottom: 6 }}>
              {result.surplus ? `+${SGD(Math.abs(result.gap))} left over` : `−${SGD(result.gap)} short`}
            </div>
            <p style={{ fontSize: C.sm, color: C.muted, margin: 0 }}>
              {result.surplus
                ? `Your sale covers the new purchase with room to spare.`
                : `You'd need to find this much more in cash or CPF to make the move.`}
            </p>
          </div>

          <ExploreSection title="Show the math" defaultOpen={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 8px' }}>Funds required</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: C.sm, color: C.text }}><span>Downpayment</span><span style={{ fontFamily: C.fontMono }}>{SGD(result.downpayment)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: C.sm, color: C.text }}><span>BSD (auto-computed)</span><span style={{ fontFamily: C.fontMono }}>{SGD(result.bsd)}</span></div>
              {num(absd) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: C.sm, color: C.text }}><span>ABSD</span><span style={{ fontFamily: C.fontMono }}>{SGD(num(absd))}</span></div>}
              {num(otherFees) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: C.sm, color: C.text }}><span>Other fees</span><span style={{ fontFamily: C.fontMono }}>{SGD(num(otherFees))}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: C.sm, color: C.text, fontWeight: 700, borderTop: `1px solid ${C.border}` }}><span>Total required</span><span style={{ fontFamily: C.fontMono }}>{SGD(result.fundsRequired)}</span></div>
              <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 8px' }}>Funds available</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: C.sm, color: C.text }}><span>Cash proceeds from sale</span><span style={{ fontFamily: C.fontMono }}>{SGD(saleResult?.cashProceeds || 0)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: C.sm, color: C.text }}><span>CPF refund from sale</span><span style={{ fontFamily: C.fontMono }}>{SGD(saleResult?.totalCPFRefund || 0)}</span></div>
              {num(extraCash) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: C.sm, color: C.text }}><span>Extra cash added</span><span style={{ fontFamily: C.fontMono }}>{SGD(num(extraCash))}</span></div>}
              {num(extraCPF) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: C.sm, color: C.text }}><span>Extra CPF added</span><span style={{ fontFamily: C.fontMono }}>{SGD(num(extraCPF))}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: C.sm, color: C.text, fontWeight: 700, borderTop: `1px solid ${C.border}` }}><span>Total available</span><span style={{ fontFamily: C.fontMono }}>{SGD(result.fundsAvailable)}</span></div>
              {saleResult && (saleResult.personBCashProceeds > 0 || saleResult.personBOutstandingBalance > 0) && (
                <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, margin: '4px 0 0' }}>
                  This carries forward the <strong style={{ color: C.text }}>full household</strong> sale proceeds and CPF refund, on the assumption the next purchase is also joint with the same person. If you&apos;re buying solo, use only your own share of the proceeds and your own CPF refund here instead.
                </p>
              )}
              <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 8px' }}>New monthly instalment</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: C.sm, color: C.text }}><span>At {newMortgageRate || 0}% over {newLoanTenure || 0} years</span><span style={{ fontFamily: C.fontMono, fontWeight: 700 }}>{SGD(result.newMonthlyInstalment)}/mo</span></div>
            </div>
            <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 14 }}>
              Cash and CPF are treated as interchangeable here for simplicity — in practice some costs may need to be cash-only depending on your CPF withdrawal limits, so confirm with your banker or lawyer before relying on this.
            </p>
          </ExploreSection>
        </div>
      )}
    </div>
  )
}
