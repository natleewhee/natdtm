function formatBuildDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' })
  } catch {
    return null
  }
}

export default function Footer() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA
  const date = formatBuildDate(process.env.NEXT_PUBLIC_BUILD_TIME)

  return (
    <footer className="shell-footer">
      <div className="shell-wrap shell-footer-inner">
        <div>
          <p style={{ margin: '0 0 6px', fontFamily: 'var(--l-font-body)', fontWeight: 600, color: 'var(--l-ink)' }}>
            coah
          </p>
          <p style={{ margin: 0, maxWidth: '46ch' }}>
            Free calculators for the big Singapore financial decisions — insurance, cars, ETFs.
            Every number is shown, not just the verdict. Not financial, legal, or insurance advice.
          </p>
        </div>
        <div className="shell-footer-links">
          <a href="/insure/the-math">Insure — the math</a>
          <a href="/drive/the-math">Drive — the math</a>
          <a href="/etf/the-math">Invest — the math</a>
        </div>
      </div>
      <div className="shell-wrap shell-footer-version tnum">
        {version ? `v${version}` : null}
        {date ? ` · Updated ${date}` : null}
        {sha ? ` · ${sha}` : null}
      </div>
    </footer>
  )
}
