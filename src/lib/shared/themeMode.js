// src/lib/shared/themeMode.js
// Light/dark mode resolution and switching. Same shape as
// src/lib/shared/profile.js's change-broadcast pattern: a synthetic
// window event so every subscriber (the toggle, the app-wide remount
// wrapper) hears a switch in the same tab, no React context needed.
//
// Applying a mode does two independent things, both required:
//  1. Sets `data-theme` on <html> — the CSS custom properties in
//     globals.css key off that attribute, so anything styled with
//     var(--color-*) / var(--l-*) updates INSTANTLY, no re-render needed.
//  2. Calls applyMode() on the shared (and per-vertical) token objects —
//     see theme.js's block comment for why those mutate in place rather
//     than getting reassigned. Components that read `C.x` in an inline
//     style only see the new value on their NEXT render, which is why
//     ThemeBoot (src/components/shared/ThemeBoot.js) remounts the app
//     subtree on a mode change.
import { applyMode as applyShared } from './theme.js'
import { applyMode as applyDrive } from '../drive/theme.js'
import { applyMode as applyFlow } from '../flow/theme.js'

const STORAGE_KEY = 'ndtm_theme_mode'
const THEME_CHANGE_EVENT = 'ndtm:theme-change'

const hasWindow = () => typeof window !== 'undefined'

/**
 * Reads the user's explicit choice, if any — `null` means "follow the
 * system preference" (no override stored yet).
 * @returns {'light'|'dark'|null}
 */
export function getStoredMode() {
  if (!hasWindow()) return null
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

/** @returns {'light'|'dark'} The OS/browser preference, defaulting dark. */
export function getSystemMode() {
  if (!hasWindow() || typeof window.matchMedia !== 'function') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * The mode actually in effect: the user's stored choice if they've made
 * one, else the system preference. Safe to call during SSR (`hasWindow`
 * guards it) — always resolves 'dark' there, matching the server-rendered
 * `<html data-theme="dark">` default in src/app/layout.js.
 * @returns {'light'|'dark'}
 */
export function getEffectiveMode() {
  return getStoredMode() ?? getSystemMode()
}

/**
 * Mutates every token object (shared + the verticals that carry their
 * own extra keys) and flips the `data-theme` attribute. Does NOT persist
 * or notify — see setThemeMode() for the user-facing version; this is
 * split out so ThemeBoot can apply the resolved mode on first mount
 * without writing back a "choice" the user never made.
 * @param {'light'|'dark'} mode
 */
export function applyThemeEverywhere(mode) {
  applyShared(mode)
  applyDrive(mode)
  applyFlow(mode)
  if (hasWindow()) document.documentElement.dataset.theme = mode
}

/**
 * The user's explicit action (the toggle). Persists the choice,
 * applies it, and broadcasts to every subscriber in this tab.
 * @param {'light'|'dark'} mode
 */
export function setThemeMode(mode) {
  if (hasWindow()) {
    try { window.localStorage.setItem(STORAGE_KEY, mode) } catch { /* private-browsing quota — mode still applies for this session */ }
  }
  applyThemeEverywhere(mode)
  if (hasWindow()) window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

/**
 * Subscribes to mode changes from this tab (the toggle) or the OS
 * preference (only meaningful while the user has no stored override —
 * once they've picked one explicitly, a system change no longer moves
 * the app). Returns an unsubscribe function.
 * @param {() => void} callback
 * @returns {() => void}
 */
export function subscribeToThemeChange(callback) {
  if (!hasWindow()) return () => {}
  window.addEventListener(THEME_CHANGE_EVENT, callback)
  let mql
  // A system-preference change bypasses setThemeMode (nothing was
  // explicitly chosen), so it must apply the new mode itself before
  // telling subscribers to re-check — otherwise the toggle's own read
  // and ThemeBoot's remount would fire against stale token objects.
  const onSystemChange = () => {
    if (getStoredMode() !== null) return
    applyThemeEverywhere(getSystemMode())
    callback()
  }
  if (typeof window.matchMedia === 'function') {
    mql = window.matchMedia('(prefers-color-scheme: light)')
    mql.addEventListener('change', onSystemChange)
  }
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, callback)
    mql?.removeEventListener('change', onSystemChange)
  }
}
