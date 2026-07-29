'use client'

import { C, SGD } from '@/lib/flow/theme'
import { findTightestMonth } from '@/lib/flow/calc'
import { CPF_OW_CEILING, CPF_ANNUAL_CEILING } from '@/lib/retire/cpf'
import { calcInvestmentCapacity } from '@/lib/ledger/calc'
import Sankey from './Sankey'
import TroughChart from './TroughChart'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function pct(n) { return `${Math.round((n || 0) * 100)}%` }

function Metric({ label, value, tone, note }) {
  const color = tone === 'green' ? C.greenText : tone === 'red' ? C.redText : tone === 'amber' ? C.accentText : C.text
  return (
    <div style={{ background: C.surface2 || C.bg, padding: '15px 16px 14px', display: 'grid', gap: 3 }}>
      <span style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.faint, fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: C.fontMono, fontSize: 25, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15, color }}>{value}</span>
      {note && <span style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.45 }}>{note}</span>}
    </div>
  )
}

function Callout({ tone, title, children }) {
  const bg = tone === 'fix' ? C.greenBg : tone === 'watch' ? C.amberBg : C.blueBg
  const border = tone === 'fix' ? C.green : tone === 'watch' ? C.amber : C.blue
  const titleColor = tone === 'fix' ? C.greenText : tone === 'watch' ? C.amberText : C.blueText
  return (
    <div style={{ background: bg, border: `1px solid ${border}44`, borderRadius: C.rL, padding: '15px 17px', margin: '16px 0' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: titleColor, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

export default function FlowResults({ flow, metrics, scheduleCompare, liquidSavings, gap, house, annualBonus, salary, age }) {
  const trueSavingsPct = pct(metrics.trueSavings)
  const cashSavingsPct = pct(metrics.cashSavings)
  const fixedCostPct = pct(metrics.fixedCost)
  const runwayText = metrics.runway === Infinity ? '∞' : `${metrics.runway.toFixed(1)} mo`

  const lumpTrough = scheduleCompare ? findTightestMonth(scheduleCompare.lump) : null
  const giroTrough = scheduleCompare ? findTightestMonth(scheduleCompare.giro) : null
  const isTight = lumpTrough && lumpTrough.shortfall > 0

  const capacityBefore = calcInvestmentCapacity({
    salary, monthlyTakeHome: flow.cash,
    house: house ? { monthlyInstalment: house.monthlyInstalment } : null,
    car: flow.nodes.car ? { monthlyInstalment: flow.nodes.car.value } : null,
    insurancePremium: flow.nodes.insurance ? flow.nodes.insurance.value : 0,
  })
  const capacityAfter = calcInvestmentCapacity({
    salary, monthlyTakeHome: flow.cash,
    house: house ? { monthlyInstalment: house.monthlyInstalment } : null,
    car: flow.nodes.car ? { monthlyInstalment: flow.nodes.car.value } : null,
    insurancePremium: flow.nodes.insurance ? flow.nodes.insurance.value : 0,
    livingExpenses: flow.nodes.living.value,
  })

  const atCeiling = salary >= CPF_OW_CEILING
  const annualSalaryWages = Math.min(salary, CPF_OW_CEILING) * 12
  const bonusCeiling = Math.max(0, CPF_ANNUAL_CEILING - annualSalaryWages)
  const bonusCpfAble = Math.min(annualBonus, bonusCeiling)

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, boxShadow: C.shadow, padding: '26px 26px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <span style={{
            fontFamily: C.fontMono, fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
            borderRadius: 100, padding: '5px 12px',
            color: isTight ? C.accentText : C.greenText,
            background: isTight ? C.accentBg : C.greenBg,
            border: `1px solid ${isTight ? C.amber : C.green}44`,
          }}>
            {isTight ? `Watch ${MONTHS[lumpTrough.month].slice(0, 3)}` : 'Cash stays positive'}
          </span>
          <span style={{ fontSize: 12, color: C.faint }}>Typical month · no bonus</span>
        </div>

        <p style={{ fontFamily: C.fontDisplay, fontSize: 'clamp(19px, 3vw, 25px)', lineHeight: 1.35, fontWeight: 600, margin: '0 0 20px', textWrap: 'balance' }}>
          You keep <span style={{ color: C.accentText }}>{trueSavingsPct}</span> of what you earn
          {metrics.trueSavings > metrics.cashSavings * 1.3 && <> — far more than the <span style={{ color: C.accentText }}>{cashSavingsPct}</span> your bank balance suggests</>}.
          {isTight
            ? <> But you run out of cash in <span style={{ color: C.accentText }}>{MONTHS[lumpTrough.month]}</span>, and the fix costs nothing.</>
            : <> Your cash never goes negative across the year, even with every lumpy item you&apos;ve added.</>}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: C.border, borderRadius: C.rL, overflow: 'hidden' }}>
          <Metric label="True savings rate" value={trueSavingsPct} tone="green" note={`${SGD(metrics.trueSavings * (flow.nodes.salary.value + flow.nodes.employer.value))} of ${SGD(flow.nodes.salary.value + flow.nodes.employer.value)} total comp kept or invested`} />
          <Metric label="Cash savings rate" value={cashSavingsPct} tone="amber" note={`${SGD(Math.max(0, flow.surplus))} of ${SGD(flow.cash)} take-home`} />
          <Metric label="Fixed costs" value={fixedCostPct} tone="amber" note="of take-home, cash only" />
          <Metric label="Runway" value={runwayText} tone={metrics.runway < 3 ? 'red' : metrics.runway < 6 ? 'amber' : 'green'} note={`${SGD(liquidSavings)} liquid`} />
          {lumpTrough && (
            <Metric label="Tightest month" value={isTight ? `−${SGD(lumpTrough.shortfall)}` : SGD(lumpTrough.balance)} tone={isTight ? 'red' : 'green'} note={MONTHS[lumpTrough.month]} />
          )}
        </div>
      </div>

      {gap > 0 && (
        <Callout tone="watch" title={`${SGD(gap)}/month you can't account for`}>
          What you said you spend and what your bank balance implies you actually spend don&apos;t match by <strong style={{ color: C.text }}>{SGD(gap)}</strong> a month. That&apos;s usually the single most useful number here — it&apos;s going somewhere real.
        </Callout>
      )}

      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 8px' }}>Two pipes, and they cross</h2>
        <p style={{ fontSize: C.sm, color: C.muted, lineHeight: 1.6, margin: '0 0 16px', maxWidth: '68ch' }}>
          Your salary splits before you ever see it, and part of a mortgage is often paid from CPF-OA — never touching your bank account. Hover any flow to see which tool it came from.
        </p>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, boxShadow: C.shadow }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
            <Legend color={C.green} label="Kept — still yours" />
            <Legend color={C.blue} label="Invested" />
            <Legend color={C.red} label="Gone — spent or paid away" />
            <Legend dashed label="Employer CPF — outside your salary" />
          </div>
          <Sankey flow={flow} />
          {house && (
            <Callout tone="watch" title="The bit a naive budget gets wrong">
              <strong style={{ color: C.text }}>{SGD(flow.mortgage.cpfInterest + flow.mortgage.cpfPrincipal)}</strong> of your <strong style={{ color: C.text }}>{SGD(flow.mortgage.interest + flow.mortgage.principal)}</strong> mortgage is paid straight from CPF-OA — never touching your bank account. A tool that lumps the whole instalment into &quot;expenses&quot; overstates your fixed-cost ratio by counting money that was never yours to spend in the first place.
            </Callout>
          )}
        </div>
      </div>

      {(house || annualBonus > 0 || atCeiling) && (
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
          {house && (
            <InsightCard title={`${SGD(flow.mortgage.interest)} a month never comes back`}>
              Your instalment isn&apos;t one thing. <strong style={{ color: C.text }}>{SGD(flow.mortgage.principal)}</strong> moves into equity you own; <strong style={{ color: C.text }}>{SGD(flow.mortgage.interest)}</strong> is interest, gone forever. Splitting them is part of why your true savings rate is {trueSavingsPct}, not lower.
            </InsightCard>
          )}
          {annualBonus > 0 && (
            <InsightCard title={`Your bonus is only ${Math.round((bonusCpfAble / annualBonus) * 100)}% CPF-able`}>
              Twelve months at {SGD(salary)} uses {SGD(Math.min(annualSalaryWages, CPF_ANNUAL_CEILING))} of the {SGD(CPF_ANNUAL_CEILING)} annual CPF ceiling. So of a {SGD(annualBonus)} bonus, only <strong style={{ color: C.text }}>{SGD(bonusCpfAble)}</strong> attracts CPF — the rest lands as cash, whole.
            </InsightCard>
          )}
          {atCeiling && (
            <InsightCard title="You're at the CPF wage ceiling">
              Every dollar you earn above {SGD(CPF_OW_CEILING)}/month is <strong style={{ color: C.text }}>100% cash, 0% CPF</strong>. A raise from here hits your bank account harder than you&apos;d expect — and your CPF/retirement projections softer.
            </InsightCard>
          )}
        </div>
      )}

      {scheduleCompare && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 8px' }}>Twelve months, not one average</h2>
          <p style={{ fontSize: C.sm, color: C.muted, lineHeight: 1.6, margin: '0 0 16px', maxWidth: '68ch' }}>
            A monthly average hides the shape of a year. Everything lumpy you&apos;ve added, plus the tax bill, land somewhere specific — before a bonus (if any) arrives to smooth it back out.
          </p>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, boxShadow: C.shadow }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
              <Legend color={C.red} label="As planned — tax paid as one bill" />
              <Legend color={C.green} dashLine label="With tax on GIRO instalments" />
              <Legend color={C.accent} label="Tightest month" />
            </div>
            <TroughChart lump={scheduleCompare.lump} giro={scheduleCompare.giro} troughMonth={lumpTrough.month} />
            {isTight && giroTrough && giroTrough.shortfall < lumpTrough.shortfall && (
              <Callout tone="fix" title={`Move your tax to GIRO — ${MONTHS[lumpTrough.month]} goes from ${lumpTrough.balance < 0 ? '−' : ''}${SGD(Math.abs(lumpTrough.balance))} to ${giroTrough.balance >= 0 ? '+' : '−'}${SGD(Math.abs(giroTrough.balance))}`}>
                Both paths end the year at roughly <strong style={{ color: C.text }}>{SGD(scheduleCompare.yearEndGiro)}</strong> — identical annual outcome. Spreading the tax bill over twelve instalments instead of one lump sum costs nothing and removes the trough. Alternatively, set aside <strong style={{ color: C.text }}>{SGD((flow.tax.monthly * 12) / 12)}</strong>/month from January so the lump-sum month doesn&apos;t bite.
              </Callout>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontFamily: C.fontDisplay, fontSize: 22, color: C.primary, margin: '0 0 8px' }}>What changes in MyLedger</h2>
        <p style={{ fontSize: C.sm, color: C.muted, lineHeight: 1.6, margin: '0 0 16px', maxWidth: '68ch' }}>
          MyLedger&apos;s investment capacity used to assume you spend nothing on living. Now that FlowState has measured it, MyLedger uses the real figure — <a href="/ledger" style={{ color: C.accent }}>see it there</a>.
        </p>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rXL, boxShadow: C.shadow, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr>
                <th style={thStyle}>Monthly investment capacity</th>
                <th style={thStyle}>Before FlowState</th>
                <th style={thStyle}>With FlowState</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Assumed living expenses</td>
                <td style={{ ...tdStyle, ...tdNum, color: C.faint }}>not modeled</td>
                <td style={{ ...tdStyle, ...tdNum, color: C.redText }}>−{SGD(flow.nodes.living.value)}</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 700, borderBottom: 'none' }}>Capacity handed to RetireWell</td>
                <td style={{ ...tdStyle, ...tdNum, fontSize: 16, color: C.accentText, borderBottom: 'none' }}>{SGD(capacityBefore)}</td>
                <td style={{ ...tdStyle, ...tdNum, fontSize: 16, color: C.greenText, borderBottom: 'none' }}>{SGD(capacityAfter)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const thStyle = {
  textAlign: 'left', padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
  fontFamily: C.fontMono, fontSize: 10.5, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.faint, fontWeight: 600,
}
const tdStyle = { textAlign: 'left', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 13.5 }
const tdNum = { fontFamily: C.fontMono, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }

function Legend({ color, label, dashed, dashLine }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.muted }}>
      {dashed ? (
        <span style={{ width: 11, height: 11, borderRadius: 3, border: `1.5px dashed ${C.muted}` }} />
      ) : dashLine ? (
        <span style={{ width: 16, height: 0, borderTop: `2px dashed ${color}` }} />
      ) : (
        <span style={{ width: 11, height: 11, borderRadius: 3, background: color }} />
      )}
      {label}
    </span>
  )
}

function InsightCard({ title, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, borderRadius: C.rL, padding: '16px 18px', display: 'grid', gap: 6 }}>
      <h3 style={{ fontFamily: C.fontDisplay, fontSize: 14, fontWeight: 700, margin: 0, color: C.primary }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.62 }}>{children}</p>
    </div>
  )
}
