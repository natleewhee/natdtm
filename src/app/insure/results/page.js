'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScoreCircle from '@/components/insure/ScoreCircle'
import InsightCard from '@/components/insure/InsightCard'
import ScoreHistorySparkline from '@/components/insure/ScoreHistorySparkline'
import WhatIfExplorer from '@/components/insure/WhatIfExplorer'
import PrintSummary from '@/components/insure/PrintSummary'
import { getBandColor, explainPillar, computeGaps, generateActionPlan, formatSGD, BENCHMARKS } from '@/lib/insure/engine/scorer'
import { SITE_URL } from '@/lib/shared/site'
import { loadScoreHistory } from '@/lib/insure/scoreHistory'
import { downloadRecheckReminder } from '@/lib/insure/recheckReminder'
import ShellHeader from '@/components/shared/ShellHeader'

const PILLAR_ROWS = (result) => {
  const { hosp, resilience, life, premium } = result.pillars
  return [
    {
      id: 'hosp',
      label: 'Hospitalisation',
      sublabel: hosp.passed ? 'Covered' : hosp.isUnsure ? 'Not sure' : 'Not covered',
      score: hosp.passed ? 100 : hosp.isUnsure ? 25 : 0,
      color: hosp.passed ? 'teal' : 'red',
      isGate: true,
    },
    {
      id: 'ci',
      label: 'Critical illness',
      sublabel: resilience.ci.amount > 0
        ? `S$${resilience.ci.amount.toLocaleString('en-SG')}${resilience.ci.isEstimated ? ' (est.)' : ''}`
        : 'Not covered',
      score: resilience.ci.score,
      color: resilience.ci.score >= 80 ? 'teal' : resilience.ci.score >= 50 ? 'blue' : resilience.ci.score > 0 ? 'amber' : 'red',
      isOverInsured: resilience.ci.amount >= resilience.ci.target * BENCHMARKS.OVER_INSURED_MULTIPLE,
    },
    {
      id: 'eci',
      label: 'Early critical illness',
      sublabel: resilience.eci.boost > 0
        ? `+${resilience.eci.boost} pts boost${resilience.eci.isEstimated ? ' (est.)' : ''}`
        : 'None detected',
      score: (resilience.eci.boost / 20) * 100,
      color: resilience.eci.boost >= 20 ? 'teal' : resilience.eci.boost > 0 ? 'blue' : 'red',
      isGap: resilience.eci.boost === 0 && result.inputs.hasCI === 'yes',
      maxLabel: '/ 20 pts',
    },
    {
      id: 'life',
      label: 'Life / TPD',
      sublabel: life.amount > 0
        ? `S$${life.amount.toLocaleString('en-SG')}${life.isEstimated ? ' (est.)' : ''}`
        : 'Not covered',
      score: life.score,
      color: life.score >= 80 ? 'teal' : life.score >= 50 ? 'blue' : life.score > 0 ? 'amber' : 'red',
      isOverInsured: life.amount >= life.target * BENCHMARKS.OVER_INSURED_MULTIPLE,
    },
    {
      id: 'premium',
      label: 'Premium efficiency',
      sublabel: premium.annualPremium
        ? `S$${Math.round(premium.annualPremium / 12).toLocaleString('en-SG')}/month · ${(premium.ratio * 100).toFixed(1)}% of income`
        : 'Not provided',
      score: premium.score,
      color: premium.score >= 70 ? 'teal' : premium.score >= 40 ? 'blue' : 'amber',
      isSkipped: premium.score === null,
    },
  ]
}

function PillarRow({ row, index, result }) {
  const [width, setWidth] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const t = setTimeout(
      () => setWidth(row.isSkipped ? 0 : (row.score ?? 0)),
      100 + index * 120
    )
    return () => clearTimeout(t)
  }, [row, index])

  const barColor = row.isGap ? '#ef4444' : getBandColor(row.color).arc
  const textColor = row.isGap ? '#fca5a5' : getBandColor(row.color).text
  const scoreLabel = row.isGate
    ? (row.score === 100 ? 'Covered' : row.score === 25 ? 'Unsure' : 'Not covered')
    : row.isGap ? 'Gap flagged'
    : row.isSkipped ? 'Not provided'
    : row.maxLabel ? `+${Math.round((row.score / 100) * 20)} pts`
    : `${Math.round(row.score ?? 0)} / 100`

  return (
    <div style={{
      padding: '14px 0',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'block',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
        aria-expanded={expanded}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)' }}>
              {row.label}
            </span>
            {row.sublabel && (
              <span style={{ fontSize: '12px', color: 'var(--color-faint)', marginLeft: '8px' }}>
                {row.sublabel}
              </span>
            )}
            {row.isOverInsured && (
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--color-green-text)',
                background: 'var(--color-green-bg)',
                borderRadius: '100px',
                padding: '1px 8px',
                marginLeft: '8px',
              }}>
                Possibly over-insured
              </span>
            )}
          </div>
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'var(--font-mono)',
            color: textColor,
            whiteSpace: 'nowrap',
            marginLeft: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            {scoreLabel}
            <span style={{
              display: 'inline-block',
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              color: 'var(--color-faint)',
              fontSize: '10px',
            }}>
              ▸
            </span>
          </span>
        </div>
        <div style={{
          height: '6px',
          background: 'var(--color-border)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: row.isSkipped ? '100%' : `${width}%`,
            background: row.isSkipped ? 'var(--color-border)' : barColor,
            borderRadius: '3px',
            transition: 'width 0.7s ease-out',
            opacity: row.isSkipped ? 0.3 : 1,
          }} />
        </div>
      </button>

      {expanded && (
        <p style={{
          margin: '10px 0 0',
          fontSize: '13px',
          color: 'var(--color-muted)',
          lineHeight: 1.6,
          animation: 'fadeSlideUp 0.25s ease both',
        }}>
          {explainPillar(row.id, result)}
        </p>
      )}
    </div>
  )
}

// ─── Disability income (supplementary, never part of finalScore) ───────────

function DisabilityIncomeCard({ result }) {
  const di = result.pillars.di
  if (di.score === null) return null // not answered — the insight card nudge covers this

  const barColor = di.score >= 80 ? '#10b981' : di.score >= 50 ? '#38bdf8' : di.score > 0 ? '#ff5722' : '#ef4444'
  const textColor = di.score >= 80 ? '#6ee7b7' : di.score >= 50 ? '#93d9fb' : di.score > 0 ? '#fdba74' : '#fca5a5'

  return (
    <div style={{
      marginTop: '16px',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--color-border)',
      padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)' }}>
            Disability income (bonus check)
          </span>
          <span style={{
            display: 'block',
            fontSize: '11px',
            color: 'var(--color-faint)',
            marginTop: '2px',
          }}>
            Not included in your score above
          </span>
        </div>
        <span style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-mono)', color: textColor, whiteSpace: 'nowrap' }}>
          {di.score} / 100
        </span>
      </div>
      <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ height: '100%', width: `${di.score}%`, background: barColor, borderRadius: '3px' }} />
      </div>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
        {explainPillar('di', result)}
      </p>
    </div>
  )
}

// ─── Gap summary ("your gap in numbers") ────────────────────────────────────

const GAP_COPY = {
  under: { verb: 'Short by', color: 'var(--color-red-text)', bg: 'var(--color-red-bg)' },
  over:  { verb: 'Above target by', color: 'var(--color-green-text)', bg: 'var(--color-green-bg)' },
  ok:    { verb: 'On target', color: 'var(--color-blue-text)', bg: 'var(--color-blue-bg)' },
}

function GapSummary({ gaps }) {
  const actionable = gaps.filter(g => g.direction !== 'ok')
  if (actionable.length === 0) return null

  return (
    <div style={{ marginTop: '24px' }}>
      <p style={{
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.08em',
        color: 'var(--color-faint)',
        textTransform: 'uppercase',
        margin: '0 0 8px',
      }}>
        Your gap in numbers
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {actionable.map(gap => {
          const copy = GAP_COPY[gap.direction]
          return (
            <div key={gap.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: copy.bg,
            }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)' }}>
                {gap.label}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: copy.color }}>
                {copy.verb} {formatSGD(gap.amount)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Action plan (checkable, persisted to localStorage) ────────────────────

const ACTION_PLAN_STORAGE_KEY = 'iga_action_plan_checked'

function ActionPlan({ items }) {
  const [checked, setChecked] = useState({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTION_PLAN_STORAGE_KEY)
      // Must run post-mount: localStorage doesn't exist during SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setChecked(JSON.parse(raw))
    } catch {}
  }, [])

  function toggle(id) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem(ACTION_PLAN_STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  if (items.length === 0) return null
  const doneCount = items.filter(i => checked[i.id]).length

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 0 4px' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '20px',
          color: 'var(--color-primary)',
          margin: 0,
          fontWeight: '400',
        }}>
          Your action plan
        </p>
        <span style={{ fontSize: '12px', color: 'var(--color-faint)' }}>
          {doneCount} / {items.length} done
        </span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-faint)', margin: '0 0 12px' }}>
        Check items off as you go — this list is saved on this device.
      </p>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}>
        {items.map((item, i) => {
          const isChecked = !!checked[item.id]
          return (
            <div
              key={item.id}
              role="checkbox"
              aria-checked={isChecked}
              aria-label={item.title}
              tabIndex={0}
              onClick={() => toggle(item.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  toggle(item.id)
                }
              }}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '16px 18px',
                cursor: 'pointer',
                borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none',
                opacity: isChecked ? 0.55 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              <div aria-hidden="true" style={{
                flexShrink: 0,
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                border: `1.5px solid ${isChecked ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: isChecked ? 'var(--color-accent)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '1px',
              }}>
                {isChecked && <span style={{ color: 'var(--l-accent-ink)', fontSize: '12px', fontWeight: '700' }}>✓</span>}
              </div>
              <div>
                <p style={{
                  margin: '0 0 4px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--color-primary)',
                  textDecoration: isChecked ? 'line-through' : 'none',
                }}>
                  {item.title}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
                  {item.detail}
                </p>
                {item.ask && (
                  <p style={{
                    margin: '8px 0 0',
                    fontSize: '12px',
                    color: 'var(--color-accent)',
                    lineHeight: 1.5,
                    padding: '8px 10px',
                    background: 'var(--color-accent-bg)',
                    borderRadius: '8px',
                  }}>
                    Ask your adviser: &quot;{item.ask}&quot;
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [scoreDelta, setScoreDelta] = useState(null)
  const [shareModal, setShareModal] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('iga_result')
      if (!raw) { router.push('/insure/check'); return }
      const parsed = JSON.parse(raw)
      // Must run post-mount: sessionStorage doesn't exist during SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(parsed)

      try {
        const prev = sessionStorage.getItem('iga_prev_score')
        if (prev !== null) {
          const delta = parsed.result.finalScore - parseInt(prev, 10)
          if (delta !== 0) setScoreDelta(delta)
        }
      } catch {}

      setHistory(loadScoreHistory())
    } catch {
      router.push('/insure/check')
    }
  }, [router])

  if (!data) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <div className="coah-spinner" role="status" aria-label="Loading your score" />
    </div>
  )

  const { result, insights } = data
  const gaps = computeGaps(result)
  const actionPlan = generateActionPlan(result)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      fontFamily: 'var(--font-body)',
      paddingBottom: '48px',
    }}>

      <ShellHeader title="Your Score" onBack={() => router.push('/insure/check')} />

      {/* Compliance line */}
      <div style={{
        padding: '10px 24px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '11px', color: 'var(--color-faint)', margin: 0 }}>
          This is an educational tool. It does not constitute financial advice.
        </p>
      </div>

      {/* Score hero */}
      <div style={{
        background: 'var(--color-surface)',
        padding: '40px 24px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <ScoreCircle
          score={result.finalScore}
          band={result.band}
          isEstimated={result.isEstimated}
          animate={true}
        />

        {/* Band-aware context sentence */}
        <p style={{
          marginTop: '16px',
          marginBottom: 0,
          fontSize: '15px',
          color: 'var(--color-muted)',
          textAlign: 'center',
          lineHeight: 1.6,
          maxWidth: '360px',
        }}>
          {result.finalScore <= 39 && "Your coverage has critical gaps that need urgent attention."}
          {result.finalScore >= 40 && result.finalScore <= 59 && "You're partially covered, but there are meaningful gaps worth closing."}
          {result.finalScore >= 60 && result.finalScore <= 79 && "You're in reasonable shape — a few areas to tighten up."}
          {result.finalScore >= 80 && "Your coverage is strong. Here's the full breakdown."}
        </p>

        {/* Score delta */}
        {scoreDelta !== null && (
          <div style={{
            marginTop: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '100px',
            background: scoreDelta > 0 ? 'var(--color-green-bg)' : 'var(--color-red-bg)',
            fontSize: '13px',
            fontWeight: '600',
            color: scoreDelta > 0 ? 'var(--color-green-text)' : 'var(--color-red-text)',
          }}>
            {scoreDelta > 0 ? '↑' : '↓'} {scoreDelta > 0 ? '+' : ''}{scoreDelta} pts since last check
          </div>
        )}

        <ScoreHistorySparkline history={history} />
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0 16px' }}>

        {/* Insight cards */}
        {insights.length > 0 && (
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              color: 'var(--color-faint)',
              textTransform: 'uppercase',
              margin: '0 0 4px',
            }}>
              {insights.some(c => c.severity === 'critical' || c.severity === 'warning') ? 'Your gaps' : 'Worth knowing'}
            </p>
            {insights.map((card, i) => (
              <InsightCard
                key={card.id}
                card={card}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Gap summary */}
        <GapSummary gaps={gaps} />

        {/* Coverage breakdown heading */}
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '20px',
          color: 'var(--color-primary)',
          margin: '28px 0 2px',
          fontWeight: '400',
        }}>
          How each area scores
        </p>
        <p style={{
          fontSize: '12px',
          color: 'var(--color-faint)',
          margin: '0 0 12px',
        }}>
          Tap a row for why it scored that way — including if you might be over-insured.
        </p>

        {/* Coverage breakdown */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: '20px 20px 8px',
        }}>
          {PILLAR_ROWS(result).map((row, i) => (
            <PillarRow key={row.id} row={row} index={i} result={result} />
          ))}
        </div>

        {/* Disability income — supplementary, not part of the score above */}
        <DisabilityIncomeCard result={result} />

        {/* Action plan */}
        <ActionPlan items={actionPlan} />

        {/* What-if explorer */}
        <WhatIfExplorer inputs={result.inputs} />

        {/* CTAs */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => {
              try {
                const raw = sessionStorage.getItem('iga_inputs')
                if (raw) sessionStorage.setItem('iga_recheck', raw)
              } catch {}
              router.push('/insure/check')
            }}
            style={{
              width: '100%',
              padding: '15px',
              background: 'var(--color-accent)',
              color: 'var(--l-accent-ink)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Update my score
          </button>

          <button
            onClick={() => {
              sessionStorage.removeItem('iga_inputs')
              sessionStorage.removeItem('iga_result')
              try { localStorage.removeItem(ACTION_PLAN_STORAGE_KEY) } catch {}
              router.push('/insure/check')
            }}
            style={{
              width: '100%',
              padding: '15px',
              background: 'transparent',
              color: 'var(--color-primary)',
              border: '2px solid var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Start over with a fresh form
          </button>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '4px 14px',
          }}>
            {[
              { label: 'Download my summary', onClick: () => window.print() },
              { label: 'Remind me in 12 months', onClick: () => downloadRecheckReminder(result.finalScore) },
              { label: 'Share my score', onClick: () => setShareModal(true) },
            ].map(link => (
              <button
                key={link.label}
                onClick={link.onClick}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-faint)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  minHeight: '44px',
                  padding: '8px 6px',
                  fontFamily: 'var(--font-body)',
                  textDecoration: 'underline',
                  textDecorationColor: 'var(--color-border)',
                }}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <PrintSummary result={result} gaps={gaps} actionPlan={actionPlan} />

        {/* The full educational/not-affiliated disclaimer lives once in the
            shell Footer (vertical-aware). Here we keep only the link onward
            to the methodology. */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid var(--color-border)',
        }}>
          <a href="/insure/the-math" style={{ fontSize: '13px', color: 'var(--color-accent)', textDecoration: 'none' }}>{'How we calculate your score \u2192'}</a>
        </div>

      </div>

      {/* Share preview modal */}
      {shareModal && (
        <div
          onClick={() => setShareModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-surface)',
              borderRadius: '20px 20px 0 0',
              padding: '28px 24px 40px',
              width: '100%',
              maxWidth: '520px',
            }}
          >
            <div style={{
              width: '40px',
              height: '4px',
              background: 'var(--color-border)',
              borderRadius: '2px',
              margin: '0 auto 20px',
            }} />

            <p style={{
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              color: 'var(--color-faint)',
              textTransform: 'uppercase',
              margin: '0 0 12px',
            }}>
              Share preview
            </p>

            {/* Preview card */}
            <div style={{
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              border: '1px solid var(--color-border)',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{
                  fontFamily: 'var(--font-coah)',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--color-primary)',
                  letterSpacing: '0.1em',
                  opacity: 0.6,
                }}>
                  NAT
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '14px',
                  color: 'var(--color-primary)',
                }}>
                  InsureCheck
                </span>
              </div>
              <p style={{
                fontSize: '28px',
                fontWeight: '700',
                color: 'var(--color-primary)',
                margin: '0 0 4px',
                fontFamily: 'var(--font-display)',
              }}>
                {result.finalScore}/100
              </p>
              <p style={{
                fontSize: '14px',
                color: 'var(--color-muted)',
                margin: '0 0 12px',
              }}>
                {result.band.label}
              </p>
              <p style={{
                fontSize: '13px',
                color: 'var(--color-faint)',
                margin: 0,
                fontStyle: 'italic',
              }}>
                &quot;How covered are you? Check yours free at InsureCheck.&quot;
              </p>
            </div>

            <button
              onClick={() => {
                const text = `My Insurance Score: ${result.finalScore}/100 — ${result.band.label}. How covered are you? Check yours free at InsureCheck — a Nat Does The Math project. ${SITE_URL}`
                if (navigator.share) navigator.share({ text })
                else navigator.clipboard.writeText(text)
                setShareModal(false)
              }}
              style={{
                width: '100%',
                padding: '15px',
                background: 'var(--color-accent)',
                color: 'var(--l-accent-ink)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                marginBottom: '12px',
              }}
            >
              Share this
            </button>

            <button
              onClick={() => setShareModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                color: 'var(--color-faint)',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  )
}