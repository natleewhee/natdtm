// One shared "reasons to trust this" pill row for hero sections — Insure
// used a plain checkmark list, Drive and Invest used bordered pills with
// no checkmark. Same underlying claim (no sign-up, no data collected,
// etc), three different presentations. `tone` adapts the colors for a
// light paper hero (Insure) vs a dark-ink hero band (Drive, Invest).
export default function TrustBadges({ items, tone = 'light' }) {
  const isDark = tone === 'dark'
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 14px', borderRadius: 100,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'var(--color-border)'}`,
            fontSize: 12, letterSpacing: '0.02em',
            color: isDark ? 'rgba(255,255,255,0.55)' : 'var(--color-muted)',
          }}
        >
          <span style={{ color: isDark ? '#8fe0c4' : 'var(--color-accent)', fontWeight: 700 }}>✓</span>
          {item}
        </span>
      ))}
    </div>
  )
}
