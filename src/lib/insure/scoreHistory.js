const HISTORY_KEY = 'iga_score_history'
const MAX_ENTRIES = 24

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
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
  } catch {}
}

/**
 * @returns {{score:number,date:string}[]} oldest-first
 */
export function loadScoreHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function clearScoreHistory() {
  try { localStorage.removeItem(HISTORY_KEY) } catch {}
}
