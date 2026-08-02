// src/lib/garage.js
// Save & compare scenarios ("garage"): lets a user keep multiple calculated
// scenarios around (different cars, tenures, downpayments) and compare them
// side by side, rather than the tool being purely one-shot / two-car-max.
//
// Storage/list-manipulation functions here are pure and unit-tested; the
// two functions that actually touch localStorage (loadGarage/saveGarage)
// are thin, deliberately untested IO wrappers, following the same split as
// src/lib/persist.js.

import { getActiveProfileId } from '../shared/profile.js'

export const GARAGE_STORAGE_KEY = 'driveready:garage:v1'
export const MAX_GARAGE_ENTRIES = 20

// Scoped per active profile, same as every other tool's saved numbers —
// otherwise switching profiles would show one household's garage of saved
// scenarios while editing another's inputs.
function scopedKey() {
  try {
    const profileId = getActiveProfileId()
    return profileId ? `${GARAGE_STORAGE_KEY}:${profileId}` : GARAGE_STORAGE_KEY
  } catch {
    return GARAGE_STORAGE_KEY
  }
}

export function loadGarage() {
  try {
    const raw = window.localStorage.getItem(scopedKey())
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isValidEntry) : []
  } catch {
    return []
  }
}

export function saveGarage(entries) {
  try {
    window.localStorage.setItem(scopedKey(), JSON.stringify(entries))
  } catch {
    // localStorage unavailable (private browsing quota, etc.) — silently no-op,
    // matches the pattern already used for input persistence.
  }
}

function isValidEntry(e) {
  return e && typeof e === 'object' && typeof e.id === 'string' && typeof e.inputs === 'object'
}

export function makeGarageEntry({ name, inputs, summary }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    name: name || 'Untitled scenario',
    inputs,
    summary,
  }
}

export function addEntry(entries, entry) {
  return [entry, ...entries].slice(0, MAX_GARAGE_ENTRIES)
}

export function removeEntry(entries, id) {
  return entries.filter(e => e.id !== id)
}

export function renameEntry(entries, id, name) {
  return entries.map(e => (e.id === id ? { ...e, name } : e))
}

// Default name for a new entry, derived from whichever car(s) are selected —
// avoids every saved scenario showing up as "Untitled scenario".
export function defaultEntryName(carAName, carBName) {
  if (carAName && carBName) return `${carAName} vs ${carBName}`
  if (carAName) return carAName
  return 'Untitled scenario'
}
