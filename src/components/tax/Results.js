'use client'

import { C, SGD } from '@/lib/tax/theme'
import { PERSONAL_RELIEF_CAP } from '@/lib/tax/calc'
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

const RELIEF_LABELS = {
  earnedIncome: 'Earned Income Relief (automatic)',
  cpf: 'CPF relief (your own contributions)',
  srs: 'SRS contributions',
  rstuSelf: 'CPF top-up — your own account',
  rstuFamily: 'CPF top-up — family members',
  courseFees: 'Course fees',
  nsman: 'NSman relief',
  child: 'Qualifying Child Relief',
  parent: 'Parent relief',
  other: 'Other reliefs',
}

export default function TaxResults({ result }) {
  if (!result) return null
  const {
    employmentIncome, reliefs, chargeableIncome, tax, marginal, effectiveRate,
    employeeCpf, annualTakeHome, monthlyTakeHome,
    srsHeadroom, rstuHeadroom, maxSrsSaving, maxRstuSaving, nextThousand,
    capHeadroomSharedBetweenSrsAndRstu,
  } = result

  const claimed = Object.entries(reliefs.breakdown).filter(([, v]) => v > 0)

  return (
    <div style={{ marginTop: 32 }}>
      <ResultHero
        verdictLabel={tax > 0 ? 'Tax payable' : 'No tax payable'}
        verdictBg={tax > 0 ? C.blueBg : C.greenBg}
        verdictColor={tax > 0 ? C.blueText : C.greenText}
        value={SGD(tax)}
        sentence={
          tax > 0
            ? `That's ${(effectiveRate * 100).toFixed(1)}% of everything you earned, even though your next dollar is taxed at ${(marginal * 100).toFixed(1)}%.`
            : `Your reliefs bring your chargeable income below the $20,000 threshold, so nothing is payable.`
        }
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '20px 0 8px' }}>
        <InsightPill label="Chargeable income" value={SGD(chargeableIncome)} />
        <InsightPill label="Marginal rate" value={`${(marginal * 100).toFixed(1)}%`} tone="accent" />
        <InsightPill label="Take-home / month" value={SGD(monthlyTakeHome)} />
      </div>

      {reliefs.cappedOut && (
        <div style={{ background: C.amberBg, border: `1px solid ${C.amber}44`, borderRadius: C.rL, padding: '16px 18px', margin: '20px 0' }}>
          <div style={{ fontSize: C.sm, fontWeight: 700, color: C.amberText, marginBottom: 4 }}>
            You&apos;re past the {SGD(PERSONAL_RELIEF_CAP)} personal relief cap by {SGD(reliefs.raw - PERSONAL_RELIEF_CAP)}
          </div>
          <div style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6 }}>
            Total personal reliefs are capped at {SGD(PERSONAL_RELIEF_CAP)}. Everything above that is claimed but does nothing — further SRS contributions or CPF top-ups would give you no tax saving at all this year, though they may still make sense for retirement reasons.
          </div>
        </div>
      )}

      {!reliefs.cappedOut && tax > 0 && (srsHeadroom > 0 || rstuHeadroom > 0) && (
        <div style={{ background: C.greenBg, border: `1px solid ${C.green}44`, borderRadius: C.rL, padding: '16px 18px', margin: '20px 0' }}>
          <div style={{ fontSize: C.sm, fontWeight: 700, color: C.greenText, marginBottom: 6 }}>
            Reliefs you haven&apos;t used yet
          </div>
          <div style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.7 }}>
            {srsHeadroom > 0 && (
              <div>
                • <strong style={{ color: C.text }}>SRS</strong>: {SGD(srsHeadroom)} of room left → saves <strong style={{ color: C.greenText }}>{SGD(maxSrsSaving.saving)}</strong> in tax if you contribute the lot.
              </div>
            )}
            {rstuHeadroom > 0 && (
              <div>
                • <strong style={{ color: C.text }}>CPF top-up (RSTU)</strong>: {SGD(rstuHeadroom)} of room left → saves <strong style={{ color: C.greenText }}>{SGD(maxRstuSaving.saving)}</strong> in tax.
              </div>
            )}
          </div>
          {capHeadroomSharedBetweenSrsAndRstu && (
            <div style={{ fontSize: C.xs, color: C.amberText, lineHeight: 1.6, marginTop: 8 }}>
              These two are shown at their own individual limits, but they draw from the same {SGD(PERSONAL_RELIEF_CAP)} overall cap — you don&apos;t have enough headroom left to claim both maximums at once, so doing both means splitting this room between them, not adding the two savings together.
            </div>
          )}
          <div style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 8 }}>
            Both lock your money away — SRS until statutory retirement age (withdrawals before that face a 5% penalty and are fully taxable), CPF top-ups permanently. The tax saving is real, but it isn&apos;t free money.
          </div>
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          How the bill is built
        </div>
        <Row label="Total income (salary + bonus + other)" value={SGD(employmentIncome)} />
        {claimed.map(([key, value]) => (
          <Row key={key} label={`− ${RELIEF_LABELS[key] || key}`} value={`−${SGD(value)}`} indent />
        ))}
        {reliefs.cappedOut && (
          <Row label={`Reliefs capped at ${SGD(PERSONAL_RELIEF_CAP)}`} value={`+${SGD(reliefs.raw - PERSONAL_RELIEF_CAP)}`} indent tone="red" />
        )}
        <Row label="Chargeable income" value={SGD(chargeableIncome)} bold />
        <Row label="Tax payable" value={SGD(tax)} bold tone={tax > 0 ? 'blue' : 'green'} />
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          What actually reaches you
        </div>
        <Row label="Total income" value={SGD(employmentIncome)} />
        <Row label="− Your own CPF contribution" value={`−${SGD(employeeCpf)}`} indent />
        <Row label="− Income tax" value={`−${SGD(tax)}`} indent />
        <Row label="Annual take-home" value={SGD(annualTakeHome)} bold />
        <Row label="Monthly take-home" value={SGD(monthlyTakeHome)} bold tone="green" />
        <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 10 }}>
          Tax is spread evenly across twelve months here. IRAS actually bills once a year (or in GIRO instalments), so a real payslip shows the CPF deduction but not the tax — budget for it separately.
        </p>
      </div>

      <ExploreSection title="Show the math" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Row label="Reliefs claimed" value={SGD(reliefs.raw)} />
          <Row label="Reliefs allowed after the cap" value={SGD(reliefs.capped)} indent />
          <Row label="Chargeable income" value={SGD(chargeableIncome)} bold />
          <div style={{ height: 10 }} />
          <Row label="Effective rate (tax ÷ total income)" value={`${(effectiveRate * 100).toFixed(2)}%`} />
          <Row label="Marginal rate (on your next dollar)" value={`${(marginal * 100).toFixed(1)}%`} />
          <Row
            label="What the next $1,000 of relief saves"
            value={nextThousand.blockedByCap ? 'Nothing — cap reached' : SGD(nextThousand.saving)}
            tone={nextThousand.blockedByCap ? 'red' : 'green'}
          />
        </div>
        <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 14 }}>
          See <a href="/tax/the-math" style={{ color: C.accent }}>the math</a> for the full rate schedule, every relief cap, and the assumptions behind the take-home figure.
        </p>
      </ExploreSection>
    </div>
  )
}
