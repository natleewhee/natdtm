// src/lib/shared/money.js
// The one home for money formatting and money-input parsing. Pure — no
// React, no DOM — so engines, components and tests all import it.
// (These used to live in src/lib/shared/theme.js beside the colour tokens,
// plus a second SGD/parser pair in src/lib/drive/theme.js.)

/**
 * Format a number as Singapore dollars, rounded, with thousands separators.
 * Non-numeric input renders as S$0 rather than S$NaN.
 * @param {number|null|undefined} n
 * @returns {string}
 */
export const SGD = (n) => `S$${Math.round(Number(n) || 0).toLocaleString('en-SG')}`

/**
 * Compact SGD for chips and summaries: S$1.2m, S$850k. Returns null for
 * zero, negative or missing amounts so callers can omit the chip.
 * @param {number|null|undefined} n
 * @returns {string|null}
 */
export function SGDCompact(n) {
  if (!n || n <= 0) return null
  if (n >= 1_000_000) return `S$${(n / 1_000_000).toFixed(1)}m`
  return `S$${(n / 1000).toFixed(0)}k`
}

// Shared parse core: returns a finite number or null.
function parseCore(raw) {
  if (raw == null) return null
  let s = String(raw).trim().toLowerCase().replace(/,/g, '')
  if (!s) return null
  let mult = 1
  if (s.endsWith('k')) { mult = 1_000; s = s.slice(0, -1) }
  else if (s.endsWith('m')) { mult = 1_000_000; s = s.slice(0, -1) }
  // Strip anything that isn't a digit or decimal point — a pasted
  // "$1,500,000" (leading $ survives the comma strip) or a
  // space-separated "1 500 000" would otherwise make parseFloat choke on
  // the first non-numeric character and silently truncate.
  s = s.replace(/[^0-9.]/g, '')
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n * mult : null
}

/**
 * Parse a money input string, honoring `k` (thousand) and `m` (million)
 * suffixes: `"800k"` → 800000, `"1.2m"` → 1200000. Strips currency
 * symbols, commas, and stray characters. Returns 0 for empty or
 * unparseable input.
 * @param {string|number|null|undefined} raw
 * @returns {number}
 */
export function parseMoney(raw) {
  return parseCore(raw) ?? 0
}

/**
 * Same parsing as {@link parseMoney}, but rounded to whole dollars and
 * returning null (not 0) for empty/unparseable input, so callers can tell
 * "nothing typed yet" apart from "typed zero". DriveReady's convention.
 * @param {string|number|null|undefined} raw
 * @returns {number|null}
 */
export function parseMoneyOrNull(raw) {
  const n = parseCore(raw)
  return n == null ? null : Math.round(n)
}
