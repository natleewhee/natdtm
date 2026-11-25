'use client'

import { usePathname } from 'next/navigation'
import { TOOLS, getToolByPath } from '@/lib/shared/tools'

function formatBuildDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' })
  } catch {
    return null
  }
}

// Each vertical's own regulatory disclaimer lives on its registry entry
// (src/lib/shared/tools.js). Only the disclaimer genuinely differs per
// vertical; the wordmark and the-math links are this one shell footer.

export default function Footer() {
  const pathname = usePathname()
  const version = process.env.NEXT_PUBLIC_APP_VERSION
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA
  const date = formatBuildDate(process.env.NEXT_PUBLIC_BUILD_TIME)
  const disclaimer = getToolByPath(pathname)?.disclaimer

  return (
    <footer className="shell-footer">
      <div className="shell-wrap shell-footer-inner">
        <div className="shell-footer-col">
          <p className="shell-footer-brand">ndtm</p>
          <p className="shell-footer-blurb">
            Free calculators I built for the big Singapore financial decisions — insurance, cars, ETFs, property, retirement, tax.
            Every number is shown, not just the verdict.
          </p>
        </div>

        <div className="shell-footer-col shell-footer-col-divided">
          <span className="shell-footer-math-label">The math</span>
          <div className="shell-footer-links">
            {TOOLS.map((t) => (
              <a key={t.id} href={t.mathRoute}>{t.label}</a>
            ))}
          </div>
        </div>

        {disclaimer && (
          <div className="shell-footer-col shell-footer-col-divided shell-footer-col-legal">
            <p className="shell-footer-disclaimer">{disclaimer}</p>
            <p className="shell-footer-version tnum">
              {version ? `v${version}` : null}
              {date ? ` · Updated ${date}` : null}
              {sha ? ` · ${sha}` : null}
            </p>
          </div>
        )}
      </div>
    </footer>
  )
}
