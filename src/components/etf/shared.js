'use client'

import styles from './shared.module.css'

// Shared design tokens, components and constants used across all WhatETF routes

// Colors are `var(--color-*)` strings — those custom properties are
// defined once in src/app/globals.css and shared with Insure and Drive.
// Safe here (unlike src/lib/drive/theme.js) because nothing in this
// vertical string-concatenates a hex alpha suffix onto `C.x`.
export const C = {
  coah: 'var(--color-coah)', coahMid: 'var(--color-coah-mid)',
  primary: 'var(--color-primary)', accent: 'var(--color-accent)', accentBg: 'var(--color-accent-bg)', accentText: 'var(--color-accent-text)',
  bg: 'var(--color-bg)', surface: 'var(--color-surface)', border: 'var(--color-border)',
  text: 'var(--color-text)', muted: 'var(--color-muted)', faint: 'var(--color-faint)',
  fontCoah: "var(--font-coah), -apple-system, 'Segoe UI', sans-serif",
  fontDisplay: "var(--font-display), -apple-system, 'Segoe UI', sans-serif",
  fontBody: "var(--font-body), -apple-system, 'Segoe UI', sans-serif",
  fontMono: "var(--font-mono), ui-monospace, monospace",
  r: '5px', rL: '9px', rXL: '13px',
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
}

export const RISK_OPTIONS = [
  { value: 'Conservative', label: 'Conservative', desc: 'Lower volatility, steady growth.' },
  { value: 'Balanced',     label: 'Balanced',     desc: 'A mix of stability and growth.' },
  { value: 'Growth',       label: 'Growth',       desc: 'Higher volatility for higher potential.' },
]
export const SIMPLICITY_OPTIONS = [
  { value: '1 ETF',    label: '1 ETF',    desc: 'Set and forget.' },
  { value: '2-3 ETFs', label: '2-3 ETFs', desc: 'Balanced control.' },
  { value: '4-5 ETFs', label: '4-5 ETFs', desc: 'Maximum precision.' },
]
export const TILT_OPTIONS = ['United States', 'Japan', 'China / Hong Kong', 'Emerging Markets']

// ─── SESSION STORAGE KEYS ─────────────────────────────────────────────────────
export const PREFS_KEY = 'whatetf_prefs'
export const PORTFOLIO_KEY = 'whatetf_portfolio'

export function savePrefs(prefs) {
  try { sessionStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch {}
}
export function loadPrefs() {
  try {
    const raw = sessionStorage.getItem(PREFS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
export function savePortfolio(data) {
  try { sessionStorage.setItem(PORTFOLIO_KEY, JSON.stringify(data)) } catch {}
}
export function loadPortfolio() {
  try {
    const raw = sessionStorage.getItem(PORTFOLIO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
// Matches the plain header idiom Insure and Drive already use (COAH eyebrow
// + serif title, white surface, border-bottom) — the "Arcade Quest" pixel
// sprite, hearts HUD, and bordered nav-button were specific to this
// vertical's retired dark theme and had no equivalent elsewhere.
export function Nav({ backHref, backLabel }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.navLeft}>
        {backHref && (
          <a href={backHref} aria-label={backLabel || 'Back'} className={styles.navBack}>←</a>
        )}
        <div className={styles.navBrandCol}>
          <span className={styles.navBrandLabel}>Coah</span>
          <a href="/etf" className={styles.navTitle}>WhatETF</a>
        </div>
      </div>
      <div className={styles.navRight}>
        <a href="/etf/the-math" className={styles.navMathLink}>The Math</a>
      </div>
    </nav>
  )
}

// ─── VERSION INFO ─────────────────────────────────────────────────────────────
// Baked in at build time (see next.config.mjs) so visitors — and we — can
// tell when the site was last deployed without checking git directly.
function formatBuildDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' })
  } catch { return null }
}
export function BuildInfo() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA
  const date = formatBuildDate(process.env.NEXT_PUBLIC_BUILD_TIME)
  if (!version && !sha && !date) return null
  return (
    <span title={sha ? `Build ${sha}` : undefined}>
      {version ? `v${version}` : null}{date ? ` · Updated ${date}` : null}{sha ? ` · ${sha}` : null}
    </span>
  )
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerGrid}>
          <div>
            <div className={styles.footerBrand}>COAH</div>
            <div className={styles.footerTagline}>Modern Utilities for the Common Good</div>
            <p className={styles.footerBody}>
              WhatETF is a free, no-ads, no-commission tool built by Coah. All calculations run entirely in your browser — no data ever leaves your device.
            </p>
            <p className={styles.footerQuote}>&quot;No grinding, no microtransactions — just the maths, in the open.&quot;</p>
          </div>
          <div>
            <div className={styles.footerLinksTitle}>More from Coah</div>
            <div className={styles.footerLinks}>
              {[
                { name: 'InsureCheck', desc: 'Insurance coverage benchmarking', url: '/insure' },
                { name: 'DriveReady',  desc: 'Car ownership calculator',        url: '/drive' },
              ].map(t => (
                <a key={t.name} href={t.url} target="_blank" rel="noopener noreferrer" className={styles.footerLinkCard}>
                  <div style={{ flex: 1 }}>
                    <div className={styles.footerLinkName}>{t.name}</div>
                    <div className={styles.footerLinkDesc}>{t.desc}</div>
                  </div>
                  <span className={styles.footerLinkLive}>Live</span>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.footerDisclaimerBlock}>
          <div className={styles.footerDisclaimerTitle}>MAS Disclaimer</div>
          <p className={styles.footerDisclaimerText}>
            This tool is for educational purposes only and does not constitute financial advice. Portfolios shown are illustrative examples. Consult a MAS-licensed financial adviser before making investment decisions.
          </p>
        </div>
        <div className={styles.footerBottom}>
          <span className={styles.footerBottomText}>Not affiliated with any broker or MAS-licensed entity. · © 2025 Coah</span>
          <span className={styles.footerBottomLinks}>
            <a href="/etf/learn" className={styles.footerBottomLink}>Learn the basics →</a>
            <a href="/etf/the-math" className={styles.footerBottomLink}>How we calculate →</a>
          </span>
        </div>
        <div className={styles.footerVersion}><BuildInfo /></div>
      </div>
    </footer>
  )
}

// ─── OPTION CARD ─────────────────────────────────────────────────────────────
export function OptionCard({ label, desc, selected, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`${styles.optionCard}${selected ? ` ${styles.selected}` : ''}`}>
      <p className={styles.optionLabel}>{label}</p>
      {desc && <p className={styles.optionDesc}>{desc}</p>}
    </button>
  )
}
