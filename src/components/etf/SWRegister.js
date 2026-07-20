'use client'

import { useEffect } from 'react'

// Registers the service worker so the ETF vertical is installable and works
// offline. Silently no-ops if unsupported — this is progressive
// enhancement, not a requirement for the app to function. Explicitly scoped
// to /etf/ so it can never intercept navigation for the Insure/Drive
// verticals or the shell — see public/sw.js.
export default function SWRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/etf/' }).catch(() => {})
    }
  }, [])
  return null
}
