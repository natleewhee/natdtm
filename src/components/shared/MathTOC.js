// A jump-nav for the-math pages, which run long with no way to find one
// specific formula without scrolling the whole page. Same component used
// by Insure, Drive, and Invest's the-math pages so it's one visual
// pattern, not three.
export default function MathTOC({ items }) {
  if (!items?.length) return null
  return (
    <nav aria-label="Sections on this page" style={{
      display: 'flex', flexWrap: 'wrap', gap: 8,
      padding: '14px 0 28px', borderBottom: '1px solid var(--color-border)', marginBottom: 28,
    }}>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          style={{
            fontSize: 12.5, color: 'var(--color-muted)', textDecoration: 'none',
            padding: '6px 12px', borderRadius: 999, border: '1px solid var(--color-border)',
            whiteSpace: 'nowrap',
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}
