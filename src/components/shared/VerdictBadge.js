// The one verdict/status pill shape, used everywhere a screen needs to say
// "here's the category this result falls into" — Insure's score band,
// Drive's affordability verdict, ETF's risk tier. Previously each tool
// copy-pasted its own version of this pill (and Drive's copy used display
// serif italic, which the type system reserves for headlines only — never
// badges). One component, one typographic treatment.
export default function VerdictBadge({ label, bg, color, size = 'md' }) {
  const sizes = {
    sm: { padding: '3px 10px', fontSize: 11 },
    md: { padding: '4px 14px', fontSize: 14 },
    lg: { padding: '5px 16px', fontSize: 17 },
  }
  const s = sizes[size] || sizes.md
  return (
    <span
      style={{
        display: 'inline-block',
        borderRadius: 100,
        background: bg,
        color,
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        lineHeight: 1.3,
        ...s,
      }}
    >
      {label}
    </span>
  )
}
