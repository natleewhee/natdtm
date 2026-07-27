'use client'

import { C, SGD } from '@/lib/retire/theme'
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

export default function RetireResults({ result }) {
  if (!result) return null
  const { retirementAge, lifeExpectancy, accumulation, target, depletion } = result
  const { oaFinal, saFinal, maFinal, cpfTotalFinal, investmentFinal, rstuCappedAtAge } = accumulation
  const {
    desiredMonthlyWithdrawal, yearsToRetirement, inflatedMonthlyWithdrawal,
    requiredNestEgg, projectedPortfolio, gap, onTrack, extraMonthlyNeeded, swr,
  } = target
  const { depletedAtAge, lastsToLifeExpectancy } = depletion

  return (
    <div style={{ marginTop: 32 }}>
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
            That&apos;s when your Special Account is projected to hit the prevailing Full Retirement Sum — CPF rejects (returns) top-ups beyond that ceiling, so contributions after this age aren&apos;t credited in this projection.
          </div>
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
