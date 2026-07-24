const WIDTH = 280
const HEIGHT = 56
const PAD = 6

function formatShortDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function ScoreHistorySparkline({ history }) {
  if (!history || history.length < 2) return null

  const scores = history.map(h => h.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1

  const points = history.map((h, i) => {
    const x = PAD + (i / (history.length - 1)) * (WIDTH - PAD * 2)
    const y = HEIGHT - PAD - ((h.score - min) / range) * (HEIGHT - PAD * 2)
    return { x, y, score: h.score }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const trendUp = scores[scores.length - 1] >= scores[0]
  const lineColor = trendUp ? '#10b981' : '#ef4444'

  return (
    <div style={{
      marginTop: '14px',
      padding: '14px 16px',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      width: '100%',
      maxWidth: '320px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', color: 'var(--color-faint)', textTransform: 'uppercase' }}>
          Score history
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-faint)' }}>
          {formatShortDate(history[0].date)} – {formatShortDate(history[history.length - 1].date)}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 3.5 : 2}
            fill={i === points.length - 1 ? lineColor : '#334155'}
          />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-faint)' }}>{history.length} checks</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: lineColor }}>
          {last.score}/100 now
        </span>
      </div>
    </div>
  )
}
