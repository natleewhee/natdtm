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
  totalInterestOverride, onTotalInterestOverride,
  cpfPrincipalOverride, onCpfPrincipalOverride,
  cpfInterestOverride, onCpfInterestOverride,
  ssdOverride, onSsdOverride,
}) {
  if (!result) return null
  const {
    propertyType, yearsHeld, mopOk,
    purchasePrice, bsdAtPurchase, legalFeesAtPurchase, agentFeesAtPurchase, purchaseFees, sunkCost,
    loanTaken, cpfOutlay, cashOutlay, cashOutlayUnclear,
    outstandingBalance, outstandingBalanceComputed,
    totalInterestPaidComputed, totalInterestPaid,
    cpfPrincipalAtPurchase, cpfPrincipalComputed, cpfPrincipalTotal,
    cpfAccruedInterest, cpfAccruedInterestComputed, totalCPFRefund,
    ssd, ssdComputed, sellingCosts, cashProceeds,
    trueCostBasis, netSale, trueProfitLoss, isProfit,
    cashOnCashReturn, totalOutlay, roiOnPrice, roiOnOutlay, annualizedRoiOnPrice, annualizedRoiOnOutlay,
    saleIsInFuture,
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

      {(roiOnPrice != null || roiOnOutlay != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0' }}>
          {roiOnPrice != null && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rL, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>ROI on purchase price</div>
              <div style={{ fontFamily: C.fontMono, fontSize: 22, fontWeight: 600, color: roiOnPrice >= 0 ? C.greenText : C.redText }}>
                {roiOnPrice >= 0 ? '+' : ''}{(roiOnPrice * 100).toFixed(1)}%
              </div>
              {annualizedRoiOnPrice != null && (
                <div style={{ fontSize: C.xs, color: C.faint, marginTop: 4 }}>
                  ≈ {annualizedRoiOnPrice >= 0 ? '+' : ''}{(annualizedRoiOnPrice * 100).toFixed(1)}%/yr
                </div>
              )}
            </div>
          )}
          {roiOnOutlay != null && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rL, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>ROI on cash + CPF put in</div>
              <div style={{ fontFamily: C.fontMono, fontSize: 22, fontWeight: 600, color: roiOnOutlay >= 0 ? C.greenText : C.redText }}>
                {roiOnOutlay >= 0 ? '+' : ''}{(roiOnOutlay * 100).toFixed(1)}%
              </div>
              {annualizedRoiOnOutlay != null && (
                <div style={{ fontSize: C.xs, color: C.faint, marginTop: 4 }}>
                  ≈ {annualizedRoiOnOutlay >= 0 ? '+' : ''}{(annualizedRoiOnOutlay * 100).toFixed(1)}%/yr
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {roiOnOutlay != null && roiOnPrice != null && (
        <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, textAlign: 'center', margin: '0 0 8px' }}>
          The second number is usually bigger — your loan meant the profit above was earned on a smaller amount of your own money ({SGD(totalOutlay)}), not the full purchase price.
        </p>
      )}

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
          These are estimates — swap in your real numbers if you have them
        </div>
        {saleIsInFuture && (
          <p style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6, margin: '0 0 14px' }}>
            Your sale date is in the future, so the four figures below ask for what&apos;s true <strong style={{ color: C.text }}>today</strong> — check your banking app and CPF portal now, not what you expect at sale. I&apos;ll project them forward to your sale date automatically.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <OverrideField
            id="ov-balance" label="Outstanding loan balance today"
            computedValue={outstandingBalanceComputed}
            computedHint="Estimated from your loan amount, rate, and tenure — assumes the rate never changed and no lump-sum repayments. Your banking app has the real figure as of right now, no matter how long ago you bought."
            overrideValue={outstandingOverride} onOverrideChange={onOutstandingOverride}
            formatValue={SGD}
          />
          <OverrideField
            id="ov-interest" label="Total mortgage interest paid to date"
            computedValue={totalInterestPaidComputed}
            computedHint="Estimated by assuming every dollar of principal came from your regular monthly instalment. If you've ever made a lump-sum repayment, this will read too low — check your bank's mortgage interest statement, or estimate roughly as your monthly interest portion × months held so far."
            overrideValue={totalInterestOverride} onOverrideChange={onTotalInterestOverride}
            formatValue={SGD}
          />
          <OverrideField
            id="ov-cpf-principal" label="CPF principal today"
            computedValue={cpfPrincipalComputed}
            computedHint="Defaults to your CPF used at purchase (+ any grant), assuming it hasn't grown since. If you've been servicing your mortgage via CPF OA, your CPF portal's Property panel shows today's real refundable principal — enter it here."
            overrideValue={cpfPrincipalOverride} onOverrideChange={onCpfPrincipalOverride}
            formatValue={SGD}
          />
          <OverrideField
            id="ov-cpf" label="CPF accrued interest today"
            computedValue={cpfAccruedInterestComputed}
            computedHint="Estimated at a flat 2.5% p.a. compounded since purchase. CPF Board computes this per-withdrawal from each withdrawal's own date — your CPF portal's Property panel has today's exact figure."
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
          <Row label="+ BSD (auto-computed)" value={`+${SGD(bsdAtPurchase)}`} indent />
          {legalFeesAtPurchase > 0 && <Row label="+ Legal fees at purchase" value={`+${SGD(legalFeesAtPurchase)}`} indent />}
          {agentFeesAtPurchase > 0 && <Row label="+ Agent fees at purchase" value={`+${SGD(agentFeesAtPurchase)}`} indent />}
          {sunkCost > 0 && <Row label="+ Renovation / sunk costs" value={`+${SGD(sunkCost)}`} indent />}
          <Row label="+ Total mortgage interest paid" value={`+${SGD(totalInterestPaid)}`} indent />
          <Row label="True cost basis" value={SGD(trueCostBasis)} bold />
          {saleIsInFuture && (
            <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, margin: '2px 0 0' }}>
              Since your sale date is in the future, interest paid = your today&apos;s-figure above + a clean forward projection to your sale date, not one long estimate spanning your whole ownership.
            </p>
          )}
          <div style={{ height: 10 }} />
          <Row label="Purchase price + fees" value={SGD(purchasePrice + purchaseFees)} />
          {loanTaken > 0 && <Row label="− Loan taken" value={`−${SGD(loanTaken)}`} indent />}
          {cpfOutlay > 0 && <Row label="− CPF used" value={`−${SGD(cpfOutlay)}`} indent />}
          <Row label="= Cash outlay (derived)" value={SGD(cashOutlay)} bold tone={cashOutlayUnclear ? 'red' : undefined} />
          {cashOutlayUnclear && (
            <p style={{ fontSize: C.xs, color: C.redText, lineHeight: 1.6, margin: '4px 0 0' }}>
              This came out negative — your loan + CPF add up to more than the price and fees combined. Double-check those figures above.
            </p>
          )}
          <div style={{ height: 10 }} />
          <Row label="CPF used at purchase (incl. any grant)" value={SGD(cpfPrincipalAtPurchase)} />
          {cpfPrincipalTotal !== cpfPrincipalAtPurchase && (
            <Row label="CPF principal to refund (your override)" value={SGD(cpfPrincipalTotal)} indent />
          )}
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
