// A small "label: value" chip for a horizontal stat row — the shared shape
// behind Insure's "gap in numbers" summary, Drive's inline stat chips, and
// similar rows in ETF's portfolio cards. `tone` picks a semantic color;
// leave it at 'default' for a neutral stat.
const TONES = {
  default: { bg: 'var(--color-surface)', border: 'var(--color-border)', color: 'var(--color-text)' },
  accent: { bg: 'var(--color-accent-bg)', border: 'transparent', color: 'var(--color-accent)' },
  red: { bg: 'var(--color-red-bg)', border: 'transparent', color: 'var(--color-red-text)' },
  amber: { bg: 'var(--color-amber-bg)', border: 'transparent', color: 'var(--color-amber-text)' },
  blue: { bg: 'var(--color-blue-bg)', border: 'transparent', color: 'var(--color-blue-text)' },
}

export default function InsightPill({ label, value, tone = 'default' }) {
  const t = TONES[tone] || TONES.default
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 100,
        background: t.bg,
        border: t.border !== 'transparent' ? `1px solid ${t.border}` : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: t.color, fontFamily: 'var(--font-mono)' }}>
        {value}
      </span>
    </span>
  )
}
