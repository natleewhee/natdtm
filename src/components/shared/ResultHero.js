import VerdictBadge from './VerdictBadge'

// The Reveal-phase header every result screen should lead with: one verdict
// pill, one primary number, one plain-English sentence — above the fold,
// before any chart or table. Insure's score circle and Drive's verdict card
// are today's two concrete instances of this shape (built independently,
// pre-dating this component); new result surfaces should render through
// ResultHero directly rather than re-inventing the header again.
export default function ResultHero({ verdictLabel, verdictBg, verdictColor, value, unit, sentence }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
      {verdictLabel && (
        <div style={{ marginBottom: 14 }}>
          <VerdictBadge label={verdictLabel} bg={verdictBg} color={verdictColor} size="lg" />
        </div>
      )}
      {value != null && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 48,
            fontWeight: 500,
            color: 'var(--color-primary)',
            lineHeight: 1,
            margin: '0 0 10px',
          }}
        >
          {value}
          {unit && <span style={{ fontSize: 18, marginLeft: 4, color: 'var(--color-muted)' }}>{unit}</span>}
        </div>
      )}
      {sentence && (
        <p style={{ fontSize: 15, color: 'var(--color-muted)', maxWidth: 440, margin: '0 auto', lineHeight: 1.6 }}>
          {sentence}
        </p>
      )}
    </div>
  )
}
