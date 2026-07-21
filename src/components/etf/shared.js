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
