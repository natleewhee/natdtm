'use client'

import { usePathname } from 'next/navigation'

function formatBuildDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' })
  } catch {
    return null
  }
}

// Each vertical's own regulatory disclaimer — these used to be duplicated
// in a full second footer on every page of every vertical (own "COAH"
// wordmark, own cross-links to the other two tools, own copy of this
// text). The cross-links and wordmark were pure duplication of this one
// shell footer; only the disclaimer text itself is genuinely different
// per vertical, so that's the only thing that varies here.
const DISCLAIMERS = {
  '/insure': 'InsureCheck: educational tool only, not financial advice. Coverage benchmarks are based on general Singapore financial planning guidelines — consult a MAS-licensed financial adviser for personal recommendations. Not affiliated with any insurer or MAS-licensed entity.',
  '/drive': 'DriveReady: educational tool only, not financial advice. Car prices are sourced monthly from the LTA Car Cost Update and are indicative only — always verify with the dealer. COE premiums are sourced from LTA DataMall. Not affiliated with any insurer or MAS-licensed entity.',
  '/etf': 'WhatETF: educational tool only, not financial advice. Portfolios shown are illustrative examples — consult a MAS-licensed financial adviser before making investment decisions. Not affiliated with any broker or MAS-licensed entity.',
}

export default function Footer() {
  const pathname = usePathname()
  const version = process.env.NEXT_PUBLIC_APP_VERSION
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA
  const date = formatBuildDate(process.env.NEXT_PUBLIC_BUILD_TIME)
  const disclaimer = Object.entries(DISCLAIMERS).find(([prefix]) => pathname?.startsWith(prefix))?.[1]

  return (
    <footer className="shell-footer">
      <div className="shell-wrap shell-footer-inner">
        <p className="shell-footer-brand">Nat</p>
        <p className="shell-footer-blurb">
          Free calculators for the big Singapore financial decisions — insurance, cars, ETFs.
          Every number is shown, not just the verdict.
        </p>
        <div className="shell-footer-math">
          <span className="shell-footer-math-label">The math:</span>
          <div className="shell-footer-links">
            <a href="/insure/the-math">Insure</a>
            <a href="/drive/the-math">Drive</a>
            <a href="/etf/the-math">Invest</a>
          </div>
        </div>
      </div>
      {disclaimer && (
        <div className="shell-wrap" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--l-line)' }}>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--l-sub)', maxWidth: '80ch', margin: 0 }}>
            {disclaimer}
          </p>
        </div>
      )}
      <div className="shell-wrap shell-footer-version tnum">
        {version ? `v${version}` : null}
        {date ? ` · Updated ${date}` : null}
        {sha ? ` · ${sha}` : null}
      </div>
    </footer>
  )
}
