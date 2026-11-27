// src/lib/shared/privacy.ts
// Privacy mode for the home dashboard: masks every figure (dollar
// amounts, percentages, scores) so the snapshot can be open on a screen
// other people can see. Off by default; the choice is remembered per
// device (localStorage) and shared live between tabs.
//
// Pure helpers (maskFigures) plus a tiny store for React's
// useSyncExternalStore.

import { TDSR_LIMIT } from '../ledger/calc.ts'
import { SRS_CAP_CITIZEN_PR } from '../tax/calc.ts'

const KEY = 'ndtm_privacy_v1'
const EVENT = 'ndtm:privacy-change'

export const MASK = '••••••'

// S$1,155,000 · −S$2,500 · S$4,050/mo · 32.0% · 72/100 · S$1.2m · S$850k
const MONEY = /[−-]?S\$\s?[\d,]+(?:\.\d+)?(?:[km]\b)?/gi
const PERCENT = /\b\d+(?:\.\d+)?\s?%/g
const SCORE = /\b\d+\/100\b/g
const MONTHS = /\b\d+ months? ago\b/g // ages are not sensitive; keep them

// Public rules, not the user's numbers: the bank's TDSR limit, the SRS
// cap and the "per S$1,000" unit. Masking these would only make the copy
// unreadable ("Bank limit ••••••%") without hiding anything about you.
const sgd = (n: number) => `S$${n.toLocaleString('en-SG')}`
export const PUBLIC_FIGURES = [
  `${Math.round(TDSR_LIMIT * 100)}%`,
  sgd(SRS_CAP_CITIZEN_PR),
  'S$1,000',
]
const escape = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const PUBLIC = new RegExp(`(?<![\\d,.])(?:${PUBLIC_FIGURES.map(escape).join('|')})(?![\\d,.]*\\d)`, 'g')

/**
 * Replace every figure in a string with a mask, keeping the words around
 * it so labels still read ("Premiums S$•••••• /mo").
 * @param {string|null|undefined} text
 * @returns {string|null|undefined}
 */
export function maskFigures(text: string|null|undefined): string|null|undefined {
  if (typeof text !== 'string') return text
  const keep: any[] = []
  const hold = (m: any) => { keep.push(m); return `\u0000${keep.length - 1}\u0000` }
  const protectedText = text.replace(MONTHS, hold).replace(PUBLIC, hold)
  return protectedText
    .replace(MONEY, `S$${MASK}`)
    .replace(SCORE, `${MASK}/100`)
    .replace(PERCENT, `${MASK}%`)
    .replace(/\u0000(\d+)\u0000/g, (_, i) => keep[Number(i)])
}

/** @returns {boolean} */
export function readPrivacy(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem(KEY) === '1' } catch { return false }
}

/** @param {boolean} on */
export function setPrivacy(on: boolean) {
  if (typeof window === 'undefined') return
  try {
    if (on) window.localStorage.setItem(KEY, '1')
    else window.localStorage.removeItem(KEY)
  } catch { /* storage blocked: the switch still works for this page view */ }
  window.dispatchEvent(new Event(EVENT))
}

/** Subscribe to privacy changes in this tab or another. */
export function subscribeToPrivacy(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) callback() }
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}
