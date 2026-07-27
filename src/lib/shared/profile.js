// src/lib/shared/profile.js
// Shared "My Numbers" store — lets HouseMuch and DriveReady hand off key
// figures to RetireWell so it can prefill a starting point instead of
// asking the user to re-type them. Client-side only (localStorage), never
// sent anywhere. This mirrors the same pattern already used by
// src/lib/insure/scoreHistory.js, which persists locally alongside a
// "No data stored" trust badge — the badges are about not sending data to
// a server, not about the browser never remembering anything.

const STORAGE_KEY = 'ndtm_my_numbers_v1'

const EMPTY = {
  version: 1,
  house: null, // { cashProceeds, totalCPFRefund, salePrice, saleDate, savedAt }
  drive: null, // { monthlyCost, carLabel, salary, savedAt }
}

function safeParse(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export function loadMyNumbers() {
  if (typeof window === 'undefined') return { ...EMPTY }
  const parsed = safeParse(window.localStorage.getItem(STORAGE_KEY))
  return parsed ? { ...EMPTY, ...parsed } : { ...EMPTY }
}

function save(data) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable (private browsing, quota) — fail silently
  }
}

export function saveHouseNumbers({ cashProceeds, totalCPFRefund, salePrice, saleDate }) {
  const data = loadMyNumbers()
  data.house = {
    cashProceeds: Number(cashProceeds) || 0,
    totalCPFRefund: Number(totalCPFRefund) || 0,
    salePrice: Number(salePrice) || 0,
    saleDate: saleDate || null,
    savedAt: Date.now(),
  }
  save(data)
}

export function saveDriveNumbers({ monthlyCost, carLabel, salary }) {
  const data = loadMyNumbers()
  data.drive = {
    monthlyCost: Number(monthlyCost) || 0,
    carLabel: carLabel || null,
    salary: Number(salary) || 0,
    savedAt: Date.now(),
  }
  save(data)
}

export function clearHouseNumbers() {
  const data = loadMyNumbers()
  data.house = null
  save(data)
}

export function clearDriveNumbers() {
  const data = loadMyNumbers()
  data.drive = null
  save(data)
}
