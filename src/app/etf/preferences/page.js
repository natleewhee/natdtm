'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OptionCard, RISK_OPTIONS, SIMPLICITY_OPTIONS, TILT_OPTIONS, savePrefs, loadPrefs, savePortfolio } from '@/components/etf/shared'
import ShellHeader from '@/components/shared/ShellHeader'
import { generatePortfolio, encodePrefsToParams, decodePrefsFromParams } from '@/lib/etf/logic'
import styles from './preferences.module.css'

const INVESTMENT_CHIPS = [500, 1000, 2000, 5000]

export default function PreferencesPage() {
  return (
    <Suspense fallback={null}>
      <PreferencesForm />
    </Suspense>
  )
}

function PreferencesForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [prefs, setPrefs] = useState({ risk: 'Balanced', simplicity: '2-3 ETFs', tilts: [], monthlyInvestment: '' })
  const [restoredFromSave, setRestoredFromSave] = useState(false)
  const [hasRestored, setHasRestored] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  // A shared link takes priority; otherwise restore prefs from the last
  // visit — durably saved (scoped to the active profile), see savePrefs
  // in components/etf/shared.js.
  useEffect(() => {
    const fromUrl = decodePrefsFromParams(searchParams)
    /* eslint-disable react-hooks/set-state-in-effect */
    if (fromUrl) {
      setPrefs(fromUrl)
    } else {
      const saved = loadPrefs()
      if (saved) { setPrefs(saved); setRestoredFromSave(true) }
    }
    setHasRestored(true)
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isSingle = prefs.simplicity === '1 ETF'
  const preview = useMemo(() => generatePortfolio(prefs), [prefs])

  // Autosave every change, same as DriveReady's own persistence — no
  // need to wait for "Generate My Portfolio" before this is remembered.
  useEffect(() => {
    if (!hasRestored) return
    savePrefs(prefs)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flashes the "Saved" indicator; not a render-affecting state sync
    setJustSaved(true)
    const t = setTimeout(() => setJustSaved(false), 1400)
    return () => clearTimeout(t)
  }, [hasRestored, prefs])

  const handleSubmit = () => {
    const portfolio = generatePortfolio(prefs)
    savePortfolio({ portfolio, prefs })
    const params = encodePrefsToParams(prefs)
    router.push(`/etf/portfolio?${params.toString()}`)
  }

  return (
    <div className={styles.page}>
      <ShellHeader title="Your Preferences" backHref="/etf" links={[{ href: '/etf/the-math', label: 'The Math' }]} />

      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Your Preferences</h1>
          <p className={styles.subtitle}>Help us understand your investing style. No personal data is collected.</p>
          {restoredFromSave && (
            <p className={styles.sectionNote}>Restored what you last had for this profile — edit freely.</p>
          )}
          <p className={styles.sectionNote} style={{ color: justSaved ? 'var(--color-accent)' : undefined, fontWeight: justSaved ? 700 : undefined }}>
            {justSaved ? 'Saved to this profile ✓' : 'Autosaved to this profile as you go — nothing to press.'}
          </p>

          <div className={styles.sections}>

            {/* 1. Simplicity — asked first because it gates risk & tilt below */}
            <section>
              <label className={styles.sectionLabel}>
                1. Portfolio Simplicity
              </label>
              <div className={styles.grid3}>
                {SIMPLICITY_OPTIONS.map(o => (
                  <OptionCard key={o.value} label={o.label} desc={o.desc}
                    selected={prefs.simplicity === o.value}
                    onClick={() => setPrefs({ ...prefs, simplicity: o.value })} />
                ))}
              </div>
            </section>

            {/* 2. Risk */}
            <section>
              <label className={styles.sectionLabel}>
                2. Risk Preference
              </label>
              <div className={styles.grid3}>
                {RISK_OPTIONS.map(o => (
                  <OptionCard key={o.value} label={o.label} desc={o.desc}
                    disabled={isSingle}
                    selected={!isSingle && prefs.risk === o.value}
                    onClick={() => setPrefs({ ...prefs, risk: o.value })} />
                ))}
              </div>
              {isSingle && (
                <p className={styles.sectionNote}>
                  A single all-equity fund can&apos;t be tuned by risk level. Choose <strong>2–3 ETFs</strong> above to add a bond cushion for a more conservative mix.
                </p>
              )}
            </section>

            {/* 3. Regional Tilt */}
            <section>
              <label className={`${styles.sectionLabel} ${styles.sectionLabelTight}`}>
                3. Regional Tilt{' '}
                <span className={styles.sectionLabelOptional}>(optional)</span>
              </label>
              <p className={styles.sectionHint}>Select regions you want to overweight in your portfolio.</p>
              <div className={styles.grid2}>
                {TILT_OPTIONS.map(o => (
                  <OptionCard key={o} label={o}
                    disabled={isSingle}
                    selected={!isSingle && prefs.tilts.includes(o)}
                    onClick={() => {
                      const next = prefs.tilts.includes(o)
                        ? prefs.tilts.filter(t => t !== o)
                        : [...prefs.tilts, o]
                      setPrefs({ ...prefs, tilts: next })
                    }} />
                ))}
              </div>
              {isSingle && (
                <p className={styles.sectionNote}>
                  Regional tilts need satellite funds. Choose <strong>2–3</strong> or <strong>4–5 ETFs</strong> above to overweight specific regions.
                </p>
              )}
            </section>

            {/* 4. Monthly Investment */}
            <section>
              <label className={`${styles.sectionLabel} ${styles.sectionLabelTight}`}>
                4. Monthly Investment{' '}
                <span className={styles.sectionLabelOptional}>(optional)</span>
              </label>
              <p className={styles.sectionHint}>Used only to illustrate your DCA breakdown. Never stored on a server.</p>
              <div className={styles.chipRow}>
                {INVESTMENT_CHIPS.map(amt => (
                  <button key={amt} type="button"
                    className={`${styles.chip}${String(prefs.monthlyInvestment) === String(amt) ? ` ${styles.chipActive}` : ''}`}
                    onClick={() => setPrefs({ ...prefs, monthlyInvestment: String(amt) })}>
                    ${amt.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className={styles.inputWrap}>
                <span className={styles.inputPrefix}>$</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="or enter a custom amount"
                  value={prefs.monthlyInvestment}
                  onChange={e => {
                    const v = e.target.value
                    // Allow empty (optional field); otherwise clamp to non-negative numbers
                    if (v === '' || Number(v) >= 0) setPrefs({ ...prefs, monthlyInvestment: v })
                  }}
                  className={styles.input}
                />
              </div>
            </section>

            {/* Live preview */}
            <div className={styles.previewBox}>
              <span className={styles.previewLabel}>Preview</span>
              <p className={styles.previewText}>
                <strong>{preview.title}</strong> — {preview.allocations.length} fund{preview.allocations.length !== 1 ? 's' : ''}:{' '}
                {preview.allocations.map(a => `${a.etf.ticker} ${a.percentage}%`).join(' · ')}
              </p>
            </div>

          </div>
        </div>

        <div className={styles.stickyBar}>
          <button onClick={handleSubmit} className={`coah-btn ${styles.submitBtn}`}>
            Generate My Portfolio →
          </button>
        </div>
      </main>

    </div>
  )
}
