// src/lib/shared/transfer.js
// "Send to my phone" without a server (super-app plan U11, KTD6).
//
// The profiles store is compacted, deflate-compressed and base64url-encoded
// into the URL *fragment* (/import#v1.<payload>). Browsers never send the
// fragment in an HTTP request, so the numbers go from one screen to the
// other (by QR code or a copied link) without reaching any server,
// natdtm's included. Import goes through importProfiles(), the same
// validation path as a restored backup file.

export const TRANSFER_VERSION = 'v1'
export const IMPORT_PATH = '/import'

// A QR code scanned from a screen is reliable up to roughly this many
// characters of URL at error-correction level L; past it, only the link
// is offered (OQ2).
export const QR_MAX_URL_CHARS = 2_300

function toBase64Url(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream))
  return new Uint8Array(await res.arrayBuffer())
}

/**
 * Compact a store JSON string, optionally keeping only the active profile.
 * @param {string} storeJson - exportProfiles() output
 * @param {{ activeOnly?: boolean }} [opts]
 * @returns {string} compact JSON
 */
export function compactStore(storeJson, { activeOnly = false } = {}) {
  const store = JSON.parse(storeJson)
  if (activeOnly && Array.isArray(store.profiles)) {
    const active = store.profiles.find((p) => p.id === store.activeProfileId) || store.profiles[0]
    store.profiles = active ? [active] : []
    store.activeProfileId = active?.id ?? null
  }
  return JSON.stringify(store)
}

/** @param {string} json @returns {Promise<string>} "v1.<base64url>" */
export async function encodeTransfer(json) {
  const bytes = new TextEncoder().encode(json)
  const packed = await pipe(bytes, new CompressionStream('deflate-raw'))
  return `${TRANSFER_VERSION}.${toBase64Url(packed)}`
}

/**
 * @param {string} fragment - location.hash, with or without the leading '#'
 * @returns {Promise<string>} the JSON text to hand to importProfiles()
 * @throws {Error} with a user-facing message on a damaged or unknown link
 */
export async function decodeTransfer(fragment) {
  const raw = String(fragment || '').replace(/^#/, '')
  const dot = raw.indexOf('.')
  if (dot === -1 || raw.slice(0, dot) !== TRANSFER_VERSION) {
    throw new Error('This link is not a natdtm transfer link, or it was made by a newer version.')
  }
  let text
  try {
    const bytes = await pipe(fromBase64Url(raw.slice(dot + 1)), new DecompressionStream('deflate-raw'))
    text = new TextDecoder().decode(bytes)
    JSON.parse(text)
  } catch {
    throw new Error('This link looks damaged or incomplete. Try copying it again, or scan the QR code.')
  }
  return text
}

/**
 * Build the transfer link, falling back to the active profile only when
 * every profile together would be too large for a QR code.
 * @param {string} storeJson
 * @param {string} origin - e.g. location.origin
 * @returns {Promise<{ url: string, activeOnly: boolean, qrOk: boolean }>}
 */
export async function buildTransferLink(storeJson, origin) {
  for (const activeOnly of [false, true]) {
    const url = `${origin}${IMPORT_PATH}#${await encodeTransfer(compactStore(storeJson, { activeOnly }))}`
    if (url.length <= QR_MAX_URL_CHARS || activeOnly) {
      return { url, activeOnly, qrOk: url.length <= QR_MAX_URL_CHARS }
    }
  }
  throw new Error('unreachable')
}

/**
 * A short, human summary of what a transfer would bring over, for the
 * confirm screen: profile names and which tools hold numbers.
 * @param {string} json
 */
export function describeTransfer(json) {
  const store = JSON.parse(json)
  const profiles = Array.isArray(store.profiles) ? store.profiles : [{ name: 'My Numbers', data: store }]
  return profiles.map((p) => ({
    name: p.name || 'My Numbers',
    tools: ['insure', 'drive', 'etf', 'house', 'retire', 'tax', 'flow', 'ledger'].filter((k) => p.data?.[k]),
  }))
}

// ─── Backup nudge ──────────────────────────────────────────────────────
// Local-only means this browser holds the only copy. Remember when the
// user last backed up or sent their numbers, so the dashboard can nudge.

const BACKUP_KEY = 'ndtm_last_backup_at'
export const BACKUP_NUDGE_DAYS = 30

export function markBackedUp(now = Date.now()) {
  try { window.localStorage.setItem(BACKUP_KEY, String(now)) } catch { /* ignore */ }
}

export function lastBackedUpAt() {
  try {
    const v = Number(window.localStorage.getItem(BACKUP_KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

/** True when there is data worth protecting and no recent backup. */
export function needsBackup(hasData, now = Date.now(), last = lastBackedUpAt()) {
  if (!hasData) return false
  return last == null || now - last > BACKUP_NUDGE_DAYS * 86_400_000
}
