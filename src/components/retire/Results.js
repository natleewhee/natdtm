'use client'

import { C, SGD } from '@/lib/retire/theme'
import { SRS_RETIREMENT_AGE } from '@/lib/retire/srs'
import ResultHero from '@/components/shared/ResultHero'
import InsightPill from '@/components/shared/InsightPill'
import ExploreSection from '@/components/shared/ExploreSection'

function Row({ label, value, tone, bold, indent }) {
  const color = tone === 'red' ? C.redText : tone === 'green' ? C.greenText : tone === 'blue' ? C.blueText : C.text
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: `1px solid ${C.border}`, paddingLeft: indent ? 16 : 0 }}>
      <span style={{ fontSize: C.sm, color: bold ? C.primary : C.muted, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? C.lg : C.sm, fontFamily: C.fontMono, fontWeight: bold ? 700 : 600, color }}>{value}</span>
    </div>
  )
}

export default function RetireResults({ result, srs }) {
  if (!result) return null
  const { retirementAge, lifeExpectancy, accumulation, target, depletion } = result
  const {
    oaFinal, saFinal, maFinal, cpfTotalFinal, investmentFinal,
    rstuCappedAtAge, maCappedAtAge, bhsApplicableAtEnd, oaHousingShortfallAge,
  } = accumulation
  const {
    desiredMonthlyWithdrawal, yearsToRetirement, inflatedMonthlyWithdrawal,
    requiredNestEgg, projectedPortfolio, gap, onTrack, extraMonthlyNeeded, swr,
  } = target
  const { depletedAtAge, lastsToLifeExpectancy } = depletion

  return (
    <div style={{ marginTop: 32 }}>
      {oaHousingShortfallAge != null && (
        <div style={{ background: C.redBg, border: `1px solid ${C.red}55`, borderRadius: C.rL, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontSize: C.sm, fontWeight: 700, color: C.redText }}>Your CPF OA runs out for housing at age {oaHousingShortfallAge}</div>
            <div style={{ fontSize: C.xs, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
              From this age on, your Ordinary Account can&apos;t fully cover the monthly housing draw you entered — this projection just stops deducting once OA hits zero, which isn&apos;t what actually happens with a real mortgage. In reality you&apos;d need to switch to paying cash, or your figures need a second look.
            </div>
          </div>
        </div>
      )}

      <ResultHero
        verdictLabel={onTrack ? 'On track' : 'Gap'}
        verdictBg={onTrack ? C.greenBg : C.redBg}
        verdictColor={onTrack ? C.greenText : C.redText}
        value={`${onTrack ? '+' : '−'}${SGD(Math.abs(gap ?? 0))}`}
        sentence={
          onTrack
            ? `Your projected investments + CPF (OA/SA) at retirement cover your desired withdrawal at a ${swr}% safe withdrawal rate, with room to spare.`
            : `Your projected investments + CPF (OA/SA) at retirement fall short of what a ${swr}% safe withdrawal rate needs to cover your desired monthly withdrawal.`
        }
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '20px 0 8px' }}>
        <InsightPill label="Years to retirement" value={`${yearsToRetirement}`} />
        <InsightPill label="Required nest egg" value={SGD(requiredNestEgg)} />
        <InsightPill label="Projected portfolio" value={SGD(projectedPortfolio)} tone={onTrack ? 'accent' : 'red'} />
      </div>

      {!onTrack && extraMonthlyNeeded != null && (
        <div style={{ background: C.amberBg, border: `1px solid ${C.amber}44`, borderRadius: C.rL, padding: '16px 18px', margin: '20px 0' }}>
          <div style={{ fontSize: C.sm, fontWeight: 700, color: C.amberText, marginBottom: 4 }}>
            Save an extra {SGD(extraMonthlyNeeded)}/month to close the gap
          </div>
          <div style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6 }}>
            That&apos;s on top of what you&apos;re already contributing, invested at the same assumed return, starting today and continuing until retirement.
          </div>
        </div>
      )}

      <div style={{ background: C.blueBg, border: `1px solid ${C.blue}44`, borderRadius: C.rL, padding: '16px 18px', margin: '20px 0' }}>
        <div style={{ fontSize: C.sm, fontWeight: 700, color: C.blueText, marginBottom: 4 }}>
          {depletedAtAge != null
            ? `At this rate, your combined portfolio runs out at age ${depletedAtAge}`
            : `Your combined portfolio lasts through your life expectancy of ${lifeExpectancy}`}
        </div>
        <div style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6 }}>
          This simulates actually drawing down your investments + CPF (OA/SA) year by year — withdrawing, growing the rest at your assumed money-market return, and escalating the withdrawal with inflation — rather than assuming the 3% rule holds forever. Applying your investment return to the CPF portion too is conservative: CPF&apos;s guaranteed rates typically run higher. The two checks can disagree, especially for a low-return asset like money market funds.
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Projected balances at retirement (age {retirementAge})
        </div>
        <Row label="CPF — Ordinary Account" value={SGD(oaFinal)} />
        <Row label="CPF — Special Account" value={SGD(saFinal)} />
        <Row label="CPF — MediSave Account" value={SGD(maFinal)} />
        <Row label="Total CPF" value={SGD(cpfTotalFinal)} bold />
        <Row label="Money market investments" value={SGD(investmentFinal)} bold />
        <Row label="Combined portfolio (investments + OA + SA)" value={SGD(projectedPortfolio)} bold tone={onTrack ? 'green' : 'red'} />
        <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 10 }}>
          MediSave isn&apos;t counted in the combined portfolio above — it&apos;s earmarked for healthcare premiums (MediShield/Integrated Shield Plan), not everyday withdrawals.
        </p>
      </div>

      {rstuCappedAtAge != null && (
        <div style={{ background: C.amberBg, border: `1px solid ${C.amber}44`, borderRadius: C.rL, padding: '16px 18px', margin: '20px 0' }}>
          <div style={{ fontSize: C.sm, fontWeight: 700, color: C.amberText, marginBottom: 4 }}>
            Your RSTU top-ups stop being accepted at age {rstuCappedAtAge}
          </div>
          <div style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6 }}>
            That&apos;s when your Special Account is projected to hit your applicable Full Retirement Sum — CPF rejects (returns) top-ups beyond that ceiling, so contributions after this age aren&apos;t credited in this projection.
          </div>
        </div>
      )}

      <div style={{ background: C.amberBg, border: `1px solid ${C.amber}44`, borderRadius: C.rL, padding: '16px 18px', margin: '20px 0' }}>
        <div style={{ fontSize: C.sm, fontWeight: 700, color: C.amberText, marginBottom: 4 }}>
          MediSave cap assumed: {SGD(bhsApplicableAtEnd)}
          {maCappedAtAge != null ? ` (hit at age ${maCappedAtAge})` : ''}
        </div>
        <div style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6 }}>
          {maCappedAtAge != null
            ? 'From this age on, new CPF contributions that would have gone to MediSave are redirected to your Special Account instead — MediSave itself keeps earning interest, but stops growing from new contributions.'
            : 'Your projected MediSave balance stays below this cap for the whole projection, so no contributions get redirected.'}
          {' '}This is your Basic Healthcare Sum — it rises each year until you turn 65, then locks in for life at whatever it was that year.
        </div>
      </div>

      {srs && srs.balanceAtRetirement > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            SRS withdrawal — spreading it out beats a lump sum
          </div>
          <p style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6, marginBottom: 10 }}>
            Projected SRS balance at age {SRS_RETIREMENT_AGE}: <strong style={{ color: C.text }}>{SGD(srs.balanceAtRetirement)}</strong>. Only half of whatever you withdraw each year counts as taxable income — spread over more years, each year&apos;s taxable slice is smaller, which matters because Singapore&apos;s tax bands are progressive.
          </p>
          {srs.plans.map(plan => (
            <Row
              key={plan.years}
              label={`Over ${plan.years} year${plan.years === 1 ? '' : 's'} (${SGD(plan.annualWithdrawal)}/yr)`}
              value={plan.totalTax === 0 ? 'S$0 tax' : `${SGD(plan.totalTax)} total tax`}
              tone={plan.totalTax === 0 ? 'green' : undefined}
            />
          ))}
          <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 10 }}>
            Assumes no other taxable income in retirement (CPF LIFE payouts aren&apos;t taxable, so they&apos;re not counted here) and that the balance doesn&apos;t keep growing while it&apos;s being drawn down — a conservative simplification. Withdrawing before age {SRS_RETIREMENT_AGE} is 100% taxable and carries a 5% penalty, neither of which this models.
          </p>
        </div>
      )}

      <ExploreSection title="Show the math" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Row label="Desired monthly withdrawal (today's $)" value={SGD(desiredMonthlyWithdrawal)} />
          <Row label="× inflation over years to retirement" value={`→ ${SGD(inflatedMonthlyWithdrawal)}/mo in year 1`} indent />
          <Row label={`× 12, ÷ ${swr}% safe withdrawal rate`} value={SGD(requiredNestEgg)} bold />
          <div style={{ height: 10 }} />
          <Row label="Money market investments" value={SGD(investmentFinal)} />
          <Row label="+ CPF Ordinary Account" value={`+${SGD(oaFinal)}`} indent />
          <Row label="+ CPF Special Account" value={`+${SGD(saFinal)}`} indent />
          <Row label="Projected combined portfolio" value={SGD(projectedPortfolio)} bold />
          <div style={{ height: 10 }} />
          <Row label={onTrack ? 'Surplus' : 'Gap'} value={SGD(Math.abs(gap ?? 0))} bold tone={onTrack ? 'green' : 'red'} />
        </div>
        <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 14 }}>
          See <a href="/retire/the-math" style={{ color: C.accent }}>the math</a> for the full formulas and CPF rate tables behind every number on this page.
        </p>
      </ExploreSection>
    </div>
  )
}
