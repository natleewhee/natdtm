'use client'

import { C, SGD } from '@/lib/house/theme'
import ResultHero from '@/components/shared/ResultHero'
import InsightPill from '@/components/shared/InsightPill'
import ExploreSection from '@/components/shared/ExploreSection'
import { OverrideField } from './ui'

function Row({ label, value, tone, bold, indent }) {
  const color = tone === 'red' ? C.redText : tone === 'green' ? C.greenText : tone === 'blue' ? C.blueText : C.text
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: `1px solid ${C.border}`, paddingLeft: indent ? 16 : 0 }}>
      <span style={{ fontSize: C.sm, color: bold ? C.primary : C.muted, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? C.lg : C.sm, fontFamily: C.fontMono, fontWeight: bold ? 700 : 600, color }}>{value}</span>
    </div>
  )
}

export default function SaleResults({
  result,
  outstandingOverride, onOutstandingOverride,
  cpfInterestOverride, onCpfInterestOverride,
  ssdOverride, onSsdOverride,
}) {
  if (!result) return null
  const {
    propertyType, yearsHeld, mopOk,
    purchasePrice, purchaseFees, sunkCost,
    outstandingBalance, outstandingBalanceComputed, totalInterestPaid,
    cpfPrincipalTotal, cpfAccruedInterest, cpfAccruedInterestComputed, totalCPFRefund,
    ssd, ssdComputed, sellingCosts, cashProceeds,
    trueCostBasis, netSale, trueProfitLoss, isProfit,
    cashOnCashReturn,
  } = result

  return (
    <div style={{ marginTop: 32 }}>
      {propertyType === 'hdb' && !mopOk && (
        <div style={{ background: C.redBg, border: `1px solid ${C.red}55`, borderRadius: C.rL, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontSize: C.sm, fontWeight: 700, color: C.redText }}>This sale is before your Minimum Occupation Period</div>
            <div style={{ fontSize: C.xs, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
              You&apos;ve held this flat for {yearsHeld.toFixed(1)} years — HDB flats can&apos;t legally be sold before 5 years from purchase. The numbers below are shown for planning purposes only.
            </div>
          </div>
        </div>
      )}

      <ResultHero
        verdictLabel={isProfit ? 'Profit' : 'Loss'}
        verdictBg={isProfit ? C.greenBg : C.redBg}
        verdictColor={isProfit ? C.greenText : C.redText}
        value={`${isProfit ? '+' : '−'}${SGD(Math.abs(trueProfitLoss))}`}
        sentence={
          isProfit
            ? `That's your true return on the property itself — sale proceeds minus everything it actually cost you, including the mortgage interest you paid along the way.`
            : `That's the true cost of this property — what you paid in, minus what you got back, including the mortgage interest you paid along the way.`
        }
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '20px 0 8px' }}>
        <InsightPill label="Held for" value={`${yearsHeld.toFixed(1)} yr`} />
        {cashOnCashReturn != null && (
          <InsightPill label="Return on your cash" value={`${cashOnCashReturn >= 0 ? '+' : ''}${(cashOnCashReturn * 100).toFixed(0)}%`} tone={cashOnCashReturn >= 0 ? 'accent' : 'red'} />
        )}
      </div>

      <div style={{ background: C.blueBg, border: `1px solid ${C.blue}44`, borderRadius: C.rL, padding: '16px 18px', margin: '20px 0' }}>
        <div style={{ fontSize: C.sm, fontWeight: 700, color: C.blueText, marginBottom: 4 }}>
          {SGD(totalCPFRefund)} of that goes back to your CPF, not your bank account
        </div>
        <div style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6 }}>
          CPF used on a property (principal + the interest it would&apos;ve earned had it stayed in your Ordinary Account) must be refunded to your CPF, not paid to you as cash. It&apos;s still your money — just locked in CPF instead of spendable today.
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Cash in your hand from this sale
        </div>
        <Row label="Sale price" value={SGD(netSale + sellingCosts)} />
        <Row label="− Selling costs (agent, legal, SSD)" value={`−${SGD(sellingCosts)}`} tone="red" indent />
        <Row label="− Outstanding loan payoff" value={`−${SGD(outstandingBalance)}`} tone="red" indent />
        <Row label="− CPF refund (principal + accrued interest)" value={`−${SGD(totalCPFRefund)}`} tone="blue" indent />
        <Row label="Cash proceeds" value={SGD(cashProceeds)} bold tone={cashProceeds >= 0 ? 'green' : 'red'} />
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          These three are estimates — swap in your real numbers if you have them
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <OverrideField
            id="ov-balance" label="Outstanding loan balance at sale"
            computedValue={outstandingBalanceComputed}
            computedHint="Estimated from your loan amount, rate, and tenure — assumes the rate never changed. If you refinanced or made lump-sum repayments, your bank statement will have the real figure."
            overrideValue={outstandingOverride} onOverrideChange={onOutstandingOverride}
            formatValue={SGD}
          />
          <OverrideField
            id="ov-cpf" label="CPF accrued interest owed"
            computedValue={cpfAccruedInterestComputed}
            computedHint="Estimated at a flat 2.5% p.a. compounded over your full holding period. CPF Board computes this per-withdrawal from each withdrawal's own date — log into your CPF account for the exact figure."
            overrideValue={cpfInterestOverride} onOverrideChange={onCpfInterestOverride}
            formatValue={SGD}
          />
          {propertyType === 'private' && (
            <OverrideField
              id="ov-ssd" label="Seller's Stamp Duty"
              computedValue={ssdComputed}
              computedHint={`Estimated from the current holding-period schedule on your sale price. Verify against IRAS — this figure hasn't been rechecked since the schedule that took effect ${'2017-03-11'}.`}
              overrideValue={ssdOverride} onOverrideChange={onSsdOverride}
              formatValue={SGD}
            />
          )}
        </div>
      </div>

      <ExploreSection title="Show the math" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Row label="Purchase price" value={SGD(purchasePrice)} />
          <Row label="+ Purchase fees (BSD, legal, agent)" value={`+${SGD(purchaseFees)}`} indent />
          {sunkCost > 0 && <Row label="+ Renovation / sunk costs" value={`+${SGD(sunkCost)}`} indent />}
          <Row label="+ Total mortgage interest paid" value={`+${SGD(totalInterestPaid)}`} indent />
          <Row label="True cost basis" value={SGD(trueCostBasis)} bold />
          <div style={{ height: 10 }} />
          <Row label="CPF principal used (incl. any grant)" value={SGD(cpfPrincipalTotal)} />
          <Row label="+ Accrued interest" value={`+${SGD(cpfAccruedInterest)}`} indent />
          <Row label="Total CPF refund due" value={SGD(totalCPFRefund)} bold />
        </div>
        <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 14 }}>
          See <a href="/house/the-math" style={{ color: C.accent }}>the math</a> for the full formulas behind every number on this page.
        </p>
      </ExploreSection>
    </div>
  )
}
