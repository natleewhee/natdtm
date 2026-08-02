import { getActiveProfileId } from '../shared/profile.js'

const HISTORY_KEY = 'iga_score_history'
const MAX_ENTRIES = 24

// Scoped per active profile, same as every other tool's saved numbers —
// otherwise switching profiles would show one household's score history
// mixed into another's.
function scopedKey() {
  try {
    const profileId = getActiveProfileId()
    return profileId ? `${HISTORY_KEY}:${profileId}` : HISTORY_KEY
  } catch {
    return HISTORY_KEY
  }
}

/**
 * Append a score entry to the persisted history (localStorage), capped at
 * MAX_ENTRIES most recent. Safe no-op if localStorage is unavailable.
 * @param {number} score
 */
export function appendScoreHistory(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return
  try {
    const history = loadScoreHistory()
    history.push({ score, date: new Date().toISOString() })
    const trimmed = history.slice(-MAX_ENTRIES)
    localStorage.setItem(scopedKey(), JSON.stringify(trimmed))
  } catch {}
}

/**
 * @returns {{score:number,date:string}[]} oldest-first
 */
export function loadScoreHistory() {
  try {
    const raw = localStorage.getItem(scopedKey())
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function clearScoreHistory() {
  try { localStorage.removeItem(scopedKey()) } catch {}
}
