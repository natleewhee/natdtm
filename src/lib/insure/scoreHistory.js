// InsureCheck's score history, kept in the active profile's
// `insureHistory` slot of the "My Numbers" store (src/lib/shared/profile.js,
// schema v7). It used to live under its own `iga_score_history[:profileId]`
// localStorage key, which profile export/import never carried; the v7
// migration moves any such key into the profile on first load.
import { loadSlot, writeSlot } from '../shared/profile.js'

const MAX_ENTRIES = 24

/**
 * Append a score entry to the active profile's history, capped at
 * MAX_ENTRIES most recent. Safe no-op if storage is unavailable.
 * @param {number} score
 */
export function appendScoreHistory(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return
  const history = loadScoreHistory()
  history.push({ score, date: new Date().toISOString() })
  writeSlot('insureHistory', history.slice(-MAX_ENTRIES))
}

/**
 * @returns {{score:number,date:string}[]} oldest-first
 */
export function loadScoreHistory() {
  try {
    const stored = loadSlot('insureHistory')
    return Array.isArray(stored) ? stored.filter((e) => e && typeof e.score === 'number') : []
  } catch {
    return []
  }
}

export function clearScoreHistory() {
  writeSlot('insureHistory', null)
}
