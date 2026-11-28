'use client'

import { useEffect } from 'react'

// Registers the site-wide service worker (/sw.js, scope "/") so natdtm
// installs as one app and works offline. Progressive enhancement only:
// silently no-ops where unsupported, and stays off in development so a
// cached page never hides a code change.
//
// Until PR 2 of the super-app plan the worker was registered with scope
// "/etf/". A browser keeps that registration and prefers it for /etf pages
// (the narrower scope wins), so it is removed here first.
export default function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(
        regs.filter((r) => new URL(r.scope).pathname !== '/').map((r) => r.unregister())
      ))
      .catch(() => {})
      .finally(() => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
      })
  }, [])
  return null
}
