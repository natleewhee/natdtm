'use client'

import { useSyncExternalStore } from 'react'
import { getEffectiveMode, setThemeMode, subscribeToThemeChange } from '@/lib/shared/themeMode'

function getServerSnapshot() { return 'dark' }

// A sun/moon pill switch — same shape as the one sketched in the
// palette mockup. `aria-pressed` reflects "is light mode on" so a
// screen reader hears the toggle's actual state, not just a label.
export default function ThemeToggle() {
  const mode = useSyncExternalStore(subscribeToThemeChange, getEffectiveMode, getServerSnapshot)
  const isLight = mode === 'light'

  return (
    <button
      type="button"
      className="shell-theme-toggle"
      onClick={() => setThemeMode(isLight ? 'dark' : 'light')}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      aria-pressed={isLight}
      title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
      </svg>
      <span className="shell-theme-toggle-track" aria-hidden="true">
        <span className="shell-theme-toggle-thumb" />
      </span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
      </svg>
    </button>
  )
}
