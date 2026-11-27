// src/lib/shared/profile.ts
// Shared "My Numbers" store — lets HouseMuch, DriveReady and RetireWell
// hand off their numbers to each other (RetireWell prefills) and to
// MyLedger (the holistic dashboard), so numbers aren't re-typed across
// tools. Client-side only (localStorage), never sent anywhere. Same
// pattern as src/lib/insure/scoreHistory.js, which already persists
// locally alongside a "No data stored" trust badge — the badges are
// about not sending data to a server, not about the browser never
// remembering anything.
//
// v2 adds the fuller per-module state (outstanding balances, rates,
// remaining tenure, current values) that MyLedger needs for net worth
// and TDSR — v1 only carried one-shot snapshot fields for the RetireWell
// prefill. migrateV1 upgrades old stored data into the v2 shape rather
// than discarding it.
//
// Named profiles (up to MAX_PROFILES) wrap this same per-module shape —
// each profile holds one full copy of it, so "Me" and "Joint with
// Alex" can hold entirely different numbers without either one
// overwriting the other. loadMyNumbers/saveXNumbers/clearXNumbers all
// operate on whichever profile is ACTIVE, so every existing call site
// across every tool keeps working unchanged — only the storage layer
// underneath it changed. A browser that has never seen profiles has its
// existing flat data migrated into a single profile named "My Numbers".


/** One profile's tool data, keyed by tool slot (house, drive, ...). */
export type ProfileData = Record<string, any> & { version?: number }
export type Profile = { id: string; name: string; createdAt: number; updatedAt: number; data: ProfileData }
export type Store = { schemaVersion: number; activeProfileId: string | null; profiles: Profile[] }

const STORAGE_KEY = 'ndtm_my_numbers_v1' // key name predates the v2 schema bump and the profiles wrapper; left as-is, the `version`/`schemaVersion` fields inside are what's versioned
export const MAX_PROFILES = 3
const DEFAULT_PROFILE_NAME = 'My Numbers'

const EMPTY: ProfileData = {
  version: 7,
  // { source: 'auto'|'manual', savedAt,
  //   outstandingBalance, rate, tenureRemaining, monthlyInstalment, propertyValue, cpfServicing,
  //   cashProceeds, totalCPFRefund, salePrice, saleDate }
  house: null,
  // { source, savedAt, loanOutstanding, rate, tenureRemaining, monthlyInstalment, carValue, carLabel, salary }
  // NOTE: drive.rate is a FLAT rate (how car loans are quoted in
  // Singapore), unlike house.rate above, which is a reducing-balance
  // annual rate. Don't feed drive.rate into amortization math written
  // for house.rate's convention without converting it first.
  drive: null,
  // { source, savedAt, salary, oaBalance, saBalance, maBalance, investmentBalance, monthlyContribution }
  retire: null,
  // { source, savedAt, monthlyPremium, score } — insurance premiums are a
  // real recurring obligation, so MyLedger counts them against income.
  insure: null,
  // { source, savedAt, monthlyTakeHome, annualTax, marginalRate, age } —
  // lets MyLedger use an exact after-tax take-home instead of a flat 80%.
  tax: null,
  // { source, savedAt, portfolioValue, monthlyContribution } — WhatETF's
  // DCA plan and (if the rebalance tool has been used) actual current
  // holdings, so MyLedger's net worth isn't missing money invested there.
  etf: null,
  // { source, savedAt, livingExpenses, monthlySurplus, trueSavingsRate,
  //   cashSavingsRate } — FlowState's measured monthly living spend.
  // MyLedger's own investment-capacity math used to assume this was
  // zero (take-home minus loans and insurance, nothing else); once
  // FlowState has run, MyLedger subtracts the real figure instead.
  flow: null,
  // MyLedger has no metrics of its own to hand to other tools — this
  // slot only ever holds `inputs` (via saveToolInputs/loadToolInputs
  // below), so its own retirement-planning fields can be restored.
  ledger: null,
  // v7: InsureCheck's score history, oldest-first [{ score, date }], capped
  // at 24 by src/lib/insure/scoreHistory.js. Its own slot (not inside
  // `insure`) so clearing InsureCheck's synced numbers keeps the history,
  // as it did when history lived under its own localStorage key.
  insureHistory: null,
}

function migrateV1(parsed: ProfileData) {
  return {
    version: 5,
    house: parsed.house ? {
      source: 'auto', savedAt: parsed.house.savedAt,
      cashProceeds: parsed.house.cashProceeds, totalCPFRefund: parsed.house.totalCPFRefund,
      salePrice: parsed.house.salePrice, saleDate: parsed.house.saleDate,
      outstandingBalance: null, rate: null, tenureRemaining: null, monthlyInstalment: null,
      propertyValue: parsed.house.salePrice ?? null, cpfServicing: null,
    } : null,
    drive: parsed.drive ? {
      source: 'auto', savedAt: parsed.drive.savedAt,
      monthlyInstalment: parsed.drive.monthlyCost, carLabel: parsed.drive.carLabel, salary: parsed.drive.salary,
      loanOutstanding: null, rate: null, tenureRemaining: null, carValue: null,
    } : null,
    retire: null, insure: null, tax: null, etf: null, flow: null,
  }
}

// v2 → v3 only adds the insure/tax slots; everything already stored
// stays exactly as it was.
function migrateV2(parsed: ProfileData) {
  return { ...parsed, version: 3, insure: parsed.insure ?? null, tax: parsed.tax ?? null }
}

// v3 → v4 only adds the etf slot.
function migrateV3(parsed: ProfileData) {
  return { ...parsed, version: 4, etf: parsed.etf ?? null }
}

// v4 → v5 only adds the flow slot.
function migrateV4(parsed: ProfileData) {
  return { ...parsed, version: 5, flow: parsed.flow ?? null }
}

// v5 → v6 only adds the ledger slot.
function migrateV5(parsed: ProfileData) {
  return { ...parsed, version: 6, ledger: parsed.ledger ?? null }
}

// v6 → v7 adds the insureHistory slot. Moving each profile's legacy
// `iga_score_history:<profileId>` key into it needs the profile id, so
// that half happens in loadStore (adoptLegacyScoreHistory).
function migrateV6(parsed: ProfileData) {
  return { ...parsed, version: 7, insureHistory: parsed.insureHistory ?? null }
}

// Migrates one profile's inner per-module data (the shape EMPTY
// describes) up to the current version — same logic that used to run
// directly against the raw localStorage payload, before profiles
// existed, so a single profile's `data` field is exactly what
// loadMyNumbers() used to return wholesale.
function migrateInnerData(parsed: any): ProfileData | null {
  if (!parsed || typeof parsed !== 'object') return null
  if (parsed.version === 7) return parsed
  const steps: Record<number, (d: ProfileData) => ProfileData> = { 1: migrateV1, 2: migrateV2, 3: migrateV3, 4: migrateV4, 5: migrateV5, 6: migrateV6 }
  if (!steps[parsed.version]) return null
  let data = parsed
  // migrateV1 jumps straight to v5; every other step advances one version.
  while (data.version !== 7) data = steps[data.version](data)
  return data
  return null
}

function newProfileId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function makeProfile(name: string, data?: ProfileData): Profile {
  const now = Date.now()
  return { id: newProfileId(), name: name || DEFAULT_PROFILE_NAME, createdAt: now, updatedAt: now, data: data || { ...EMPTY } }
}

function isWrapped(parsed: any): parsed is Store {
  return !!parsed && typeof parsed === 'object' && Array.isArray(parsed.profiles)
}

// Returns whether the write actually landed — callers (autosave
// indicators) use this to only claim "Saved" when it's true, rather than
// showing success on a silently-swallowed quota/private-browsing failure.
function saveStore(store: Store) {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    return true
  } catch {
    // localStorage unavailable (private browsing, quota) — fail silently
    return false
  }
}

// The `storage` event only fires in OTHER tabs, never the one that wrote,
// so a same-tab profile switch also dispatches this synthetic event.
// ProfileScope (src/components/shared/ProfileScope.js) subscribes via
// subscribeToProfileChanges and remounts the tool subtree so its
// "load my numbers" effect re-runs, instead of a full page reload.
const PROFILE_CHANGE_EVENT = 'ndtm:profile-change'

// A real browser window is required. The test harness stubs `window` with
// just a localStorage shim, so feature-detect dispatchEvent rather than
// assuming a full event target.
const hasEventTarget = () =>
  typeof window !== 'undefined' && typeof window.dispatchEvent === 'function'

function notifyProfileChange() {
  if (hasEventTarget()) window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT))
}

// Fired after any successful write of a profile's numbers in this tab.
// Separate from PROFILE_CHANGE_EVENT so ProfileScope's remount logic is
// untouched; the dashboard subscribes to both via subscribeToNumbers.
const NUMBERS_CHANGE_EVENT = 'ndtm:numbers-change'

/**
 * Subscribe to any change in the active profile's numbers: a write in
 * this tab, a profile switch, or a change from another tab.
 */
export function subscribeToNumbers(callback: () => void) {
  if (!hasEventTarget()) return () => {}
  const off = subscribeToProfileChanges(callback)
  window.addEventListener(NUMBERS_CHANGE_EVENT, callback)
  return () => { off(); window.removeEventListener(NUMBERS_CHANGE_EVENT, callback) }
}

/**
 * The raw stored string, for React's useSyncExternalStore: a string
 * snapshot compares by value, so components re-render only when the
 * store really changed. null on the server or without storage.
 */
export function readStoreSnapshot() {
  if (typeof window === 'undefined') return null
  try { return window.localStorage.getItem(STORAGE_KEY) } catch { return null }
}

/** Display name of the active profile ("My Numbers"). */
export function getActiveProfileName() {
  if (typeof window === 'undefined') return null
  const id = getActiveProfileId()
  return listProfiles().find((p) => p.id === id)?.name ?? null
}

// Subscribe to active-profile changes from this tab (create/switch/delete)
// or another tab (the browser's own `storage` event). Returns an
// unsubscribe function; a no-op unsubscribe when there is no window.
export function subscribeToProfileChanges(callback: () => void) {
  if (!hasEventTarget()) return () => {}
  // Only our own key — an unrelated localStorage.clear() in another tab
  // fires `storage` with e.key === null, which must not trigger a re-read
  // (loadStore would then re-persist a blank default over the real store).
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) callback() }
  window.addEventListener(PROFILE_CHANGE_EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(PROFILE_CHANGE_EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}

// Loads the raw wrapper { schemaVersion, activeProfileId, profiles }
// from localStorage, migrating a pre-profiles flat payload (or nothing
// at all) into a single default profile. Never returns an empty
// profiles array — there is always at least one profile to be active.
// Whenever it has to synthesize or migrate a store shape, it persists
// the result immediately (rather than only on the next write) — a
// read-only call like getActiveProfileId() must return the SAME id on
// every call, not mint a fresh, un-persisted profile each time.
// The pre-v7 InsureCheck history keys. `iga_score_history` (unscoped)
// was only written before profiles existed, so it belongs to whichever
// profile is active when it is first found.
const LEGACY_HISTORY_KEY = 'iga_score_history'

function readLegacyHistory(key: string) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

// Moves legacy history keys into each profile's insureHistory slot.
// Returns the keys that were adopted; the caller removes them only after
// the store write succeeds, so a failed write loses nothing.
function adoptLegacyScoreHistory(store: Store) {
  const adopted = []
  for (const p of store.profiles) {
    if (p.data.insureHistory != null) continue
    const key = `${LEGACY_HISTORY_KEY}:${p.id}`
    const hist = readLegacyHistory(key)
    if (hist) { p.data = { ...p.data, insureHistory: hist }; adopted.push(key) }
  }
  const active = store.profiles.find((p) => p.id === store.activeProfileId)
  if (active && active.data.insureHistory == null) {
    const hist = readLegacyHistory(LEGACY_HISTORY_KEY)
    if (hist) { active.data = { ...active.data, insureHistory: hist }; adopted.push(LEGACY_HISTORY_KEY) }
  }
  return adopted
}

function removeKeys(keys: string[]) {
  for (const k of keys) { try { window.localStorage.removeItem(k) } catch { /* ignore */ } }
}

function loadStore(): Store {
  if (typeof window === 'undefined') return { schemaVersion: 1, activeProfileId: null, profiles: [makeProfile(DEFAULT_PROFILE_NAME)] }
  let parsed = null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    parsed = raw ? JSON.parse(raw) : null
  } catch {
    parsed = null
  }

  if (isWrapped(parsed)) {
    const profiles = parsed.profiles
      .map((p) => ({
        id: p.id || newProfileId(),
        name: p.name || DEFAULT_PROFILE_NAME,
        createdAt: p.createdAt || Date.now(),
        updatedAt: p.updatedAt || Date.now(),
        data: { ...EMPTY, ...(migrateInnerData(p.data) || {}) },
      }))
      .slice(0, MAX_PROFILES)
    if (profiles.length === 0) profiles.push(makeProfile(DEFAULT_PROFILE_NAME))
    const activeProfileId = profiles.some((p) => p.id === parsed.activeProfileId) ? parsed.activeProfileId : profiles[0].id
    const store = { schemaVersion: 1, activeProfileId, profiles }
    // profiles.length !== parsed.profiles.length catches a MAX_PROFILES
    // truncation (or the "synthesized a profile because there were zero"
    // case) — without it, every surviving index still lines up with
    // parsed.profiles[i], so the id-by-id comparison below sees no
    // change and a truncated store never gets written back, leaving a
    // 4th+ profile silently un-persisted-away instead of actually gone.
    const adopted = adoptLegacyScoreHistory(store)
    const changed = profiles.length !== parsed.profiles.length
      || profiles.some((p, i) => p.id !== parsed.profiles[i]?.id || parsed.profiles[i]?.data?.version !== p.data.version)
      || activeProfileId !== parsed.activeProfileId
      || adopted.length > 0
    if (changed && saveStore(store)) removeKeys(adopted)
    return store
  }

  // Pre-profiles flat payload (or nothing/garbage) — migrate whatever's
  // there into a single starting profile rather than discarding it.
  const migrated = migrateInnerData(parsed)
  const profile = makeProfile(DEFAULT_PROFILE_NAME, migrated ? { ...EMPTY, ...migrated } : { ...EMPTY })
  const store = { schemaVersion: 1, activeProfileId: profile.id, profiles: [profile] }
  const adopted = adoptLegacyScoreHistory(store)
  if (saveStore(store)) removeKeys(adopted)
  return store
}

function getActiveProfile(store: Store): Profile {
  return store.profiles.find((p) => p.id === store.activeProfileId) || store.profiles[0]
}

export function loadMyNumbers(): ProfileData {
  const store = loadStore()
  const active = getActiveProfile(store)
  return active ? { ...EMPTY, ...active.data } : { ...EMPTY }
}

// Writes into the ACTIVE profile's data — every saveXNumbers/
// clearXNumbers function below is unchanged from before profiles
// existed; only what this function does underneath them changed.
function save(data: any) {
  if (typeof window === 'undefined') return false
  const store = loadStore()
  const idx = store.profiles.findIndex((p) => p.id === store.activeProfileId)
  if (idx === -1) return false
  store.profiles[idx] = { ...store.profiles[idx], data, updatedAt: Date.now() }
  const ok = saveStore(store)
  if (ok && hasEventTarget()) window.dispatchEvent(new Event(NUMBERS_CHANGE_EVENT))
  return ok
}

// ─── Backup / restore ──────────────────────────────────────────────────

// Serialises every profile (the raw wrapper store) to a pretty JSON
// string for a "download my numbers" file. Nothing is sent anywhere.
export function exportProfiles() {
  return JSON.stringify(loadStore(), null, 2)
}

// Replaces all local profiles with the contents of an exported file.
// Accepts both the wrapped shape exportProfiles() writes and a bare
// pre-profiles flat payload (mirrors loadStore's own dual-shape read).
// Each profile's inner data is migrated to the current version.
//
// Returns { ok, imported, truncated, error }:
//   ok        — whether the store was replaced
//   imported  — how many profiles were kept (<= MAX_PROFILES)
//   truncated — how many were dropped for exceeding MAX_PROFILES
//   error     — a human-readable reason when ok is false
export function importProfiles(text: string) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, imported: 0, truncated: 0, error: 'Not valid JSON.' }
  }

  // migrateInnerData returns null for an unknown/newer schema version. If
  // the source carried real data, that is a genuine failure — silently
  // substituting a blank profile and reporting success would let a file
  // exported from a newer deploy wipe every profile. Reject instead.
  const migrateOrThrow = (raw: Record<string, any>) => {
    const migrated = migrateInnerData(raw)
    if (migrated == null && raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      throw new Error('This file was saved by a newer version of the app and can’t be imported here.')
    }
    return migrated || {}
  }

  let profiles
  let activeIndex = 0
  try {
    if (isWrapped(parsed)) {
      const src = parsed.profiles.filter((p) => p && typeof p === 'object')
      // ids are regenerated on import, so remember which POSITION was active.
      const i = src.findIndex((p) => p.id === parsed.activeProfileId)
      activeIndex = i === -1 ? 0 : i
      profiles = src.map((p) => makeProfile(p.name, { ...EMPTY, ...migrateOrThrow(p.data) }))
    } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // A bare pre-profiles flat payload — wrap it into one profile.
      profiles = [makeProfile(DEFAULT_PROFILE_NAME, { ...EMPTY, ...migrateOrThrow(parsed) })]
    } else {
      return { ok: false, imported: 0, truncated: 0, error: 'Unrecognised file. Expected an exported profiles file.' }
    }
  } catch (err) {
    return { ok: false, imported: 0, truncated: 0, error: (err as Error).message }
  }

  if (profiles.length === 0) {
    return { ok: false, imported: 0, truncated: 0, error: 'No profiles found in the file.' }
  }

  const truncated = Math.max(0, profiles.length - MAX_PROFILES)
  const kept = profiles.slice(0, MAX_PROFILES)
  const active = kept[activeIndex] || kept[0]
  const store = { schemaVersion: 1, activeProfileId: active.id, profiles: kept }
  const ok = saveStore(store)
  if (ok) notifyProfileChange()
  return {
    ok,
    imported: ok ? kept.length : 0,
    truncated,
    error: ok ? null : 'Could not write to local storage (private browsing or quota).',
  }
}

// ─── Profile management ─────────────────────────────────────────────────

export function listProfiles() {
  const store = loadStore()
  return store.profiles.map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, isActive: p.id === store.activeProfileId }))
}

export function getActiveProfileId() {
  return loadStore().activeProfileId
}

// Creates a new empty profile (up to MAX_PROFILES) and makes it active.
// Returns the new profile's id, or null if already at the cap.
export function createProfile(name: string) {
  const store = loadStore()
  if (store.profiles.length >= MAX_PROFILES) return null
  const profile = makeProfile((name || '').trim() || `Profile ${store.profiles.length + 1}`)
  store.profiles.push(profile)
  store.activeProfileId = profile.id
  saveStore(store)
  notifyProfileChange()
  return profile.id
}

export function renameProfile(id: string, name: string) {
  const trimmed = (name || '').trim()
  if (!trimmed) return
  const store = loadStore()
  const profile = store.profiles.find((p) => p.id === id)
  if (!profile) return
  profile.name = trimmed
  saveStore(store)
  notifyProfileChange()
}

// Deletes a profile — refuses to delete the last remaining one, since
// there must always be an active profile for every tool to read/write.
// If the deleted profile was active, switches to whichever is first.
// Returns false if the delete was refused.
export function deleteProfile(id: string) {
  const store = loadStore()
  if (store.profiles.length <= 1) return false
  store.profiles = store.profiles.filter((p) => p.id !== id)
  if (store.activeProfileId === id) store.activeProfileId = store.profiles[0].id
  saveStore(store)
  notifyProfileChange()
  return true
}

export function setActiveProfile(id: string) {
  const store = loadStore()
  if (!store.profiles.some((p) => p.id === id)) return
  store.activeProfileId = id
  saveStore(store)
  notifyProfileChange()
}

// ─── Per-module numbers (declarative) ──────────────────────────────────

// Field coercers. Each takes (value, existingSlot, key) and returns what is
// stored. A field absent from a save call is still coerced, so omitting it
// stores its default (0 / null) exactly as the hand-written savers did,
// except `keep`, which falls back to the stored value.
const num = (v: any) => Number(v) || 0
const numOrNull = (v: null) => (v != null ? Number(v) || 0 : null)
const strOrNull = (v: any) => v || null
const orDefault = (d: string) => (v: any) => v || d
// Keep the stored value when the caller omits the field — WhatETF's
// portfolio page (DCA plan) and rebalance page (holdings) each know only
// their own half of the etf slot.
const keep = (v: null, existing: { [x: string]: any }, key: string|number) => (v != null ? Number(v) || 0 : (existing[key] ?? 0))

/**
 * What each tool's synced-numbers slot holds and how each field is
 * coerced. The single description of the store's per-module shape: the
 * savers, onboarding and the dashboard all read it.
 * NOTE: drive.rate is a FLAT rate (how car loans are quoted in Singapore),
 * unlike house.rate, which is a reducing-balance annual rate.
 */
export const MODULE_SCHEMA = {
  house: {
    cashProceeds: num, totalCPFRefund: num, salePrice: num, saleDate: strOrNull,
    outstandingBalance: numOrNull, rate: numOrNull, tenureRemaining: numOrNull,
    monthlyInstalment: numOrNull, propertyValue: numOrNull, cpfServicing: numOrNull,
    propertyType: orDefault('private'),
  },
  drive: {
    monthlyInstalment: num, carLabel: strOrNull, salary: num,
    loanOutstanding: numOrNull, rate: numOrNull, tenureRemaining: numOrNull, carValue: numOrNull,
  },
  retire: {
    salary: num, oaBalance: num, saBalance: num, maBalance: num,
    investmentBalance: num, monthlyContribution: num,
  },
  insure: { monthlyPremium: num, score: numOrNull },
  tax: { monthlyTakeHome: num, annualTax: num, marginalRate: num, age: num },
  etf: { portfolioValue: keep, monthlyContribution: keep },
  // FlowState's measured monthly figures, now produced by MyLedger's
  // Capacity module; the slot name is kept so stored data stays valid.
  flow: { livingExpenses: num, monthlySurplus: numOrNull, trueSavingsRate: numOrNull, cashSavingsRate: numOrNull },
}

/**
 * Merge a tool's synced numbers into its slot on the active profile —
 * never a full overwrite, so a saved `inputs` blob survives. Every schema
 * field is coerced; `source` defaults to 'auto'; `savedAt` is stamped.
 * @param {keyof typeof MODULE_SCHEMA} tool
 * @param {Record<string, unknown>} [values]
 * @returns {boolean} whether the write landed
 */
export function saveModule(tool: keyof typeof MODULE_SCHEMA, values: Record<string, unknown> = {}): boolean {
  const schema = MODULE_SCHEMA[tool]
  if (!schema) return false
  const data = loadMyNumbers()
  const existing = data[tool] || {}
  const fields: Record<string, any> = { source: values.source || 'auto' }
  for (const [key, coerce] of Object.entries(schema) as [string, (v: unknown, e: any, k: string) => unknown][]) fields[key] = coerce(values[key], existing, key)
  data[tool] = { ...existing, ...fields, savedAt: Date.now() }
  return save(data)
}

/**
 * Empty a slot on the active profile (synced numbers and saved inputs).
 * @param {string} slot - a MODULE_SCHEMA tool, 'ledger' or 'insureHistory'
 */
export function clearModule(slot: string) {
  if (!(slot in EMPTY) || slot === 'version') return false
  const data = loadMyNumbers()
  data[slot] = null
  return save(data)
}

/** Raw read of one slot on the active profile (null when empty). */
export function loadSlot(slot: string) {
  if (!(slot in EMPTY) || slot === 'version') return null
  return loadMyNumbers()[slot] ?? null
}

/** Raw replace of one slot on the active profile. */
export function writeSlot(slot: string, value: unknown) {
  if (!(slot in EMPTY) || slot === 'version') return false
  const data = loadMyNumbers()
  data[slot] = value
  return save(data)
}

// ─── Raw form inputs ───────────────────────────────────────────────────

// Each tool's "Save my inputs" button calls saveToolInputs(tool, {...});
// the tool restores it on mount via loadToolInputs(tool). Merges onto the
// tool's slot so it never clobbers the synced numbers other tools read.
// 'flow' holds the Capacity module's inputs (formerly FlowState's).
const TOOLS_WITH_INPUTS = ['house', 'drive', 'retire', 'insure', 'tax', 'etf', 'flow', 'ledger']

export function saveToolInputs(tool: string, inputs: Record<string, any>) {
  if (!TOOLS_WITH_INPUTS.includes(tool)) return false
  const data = loadMyNumbers()
  const existing = data[tool] || {}
  data[tool] = { ...existing, inputs, inputsSavedAt: Date.now() }
  return save(data)
}

export function loadToolInputs(tool: string) {
  if (!TOOLS_WITH_INPUTS.includes(tool)) return null
  const data = loadMyNumbers()
  return data[tool]?.inputs || null
}

// ─── Named wrappers (deprecated) ───────────────────────────────────────
// Kept for one release so existing call sites keep working; new code
// calls saveModule / clearModule / saveToolInputs directly.

/** @deprecated use saveModule('house', …) */
export const saveHouseNumbers = (v: Record<string,unknown>|undefined) => saveModule('house', v)
/** @deprecated use saveModule('drive', …) */
export const saveDriveNumbers = (v: Record<string,unknown>|undefined) => saveModule('drive', v)
/** @deprecated use saveModule('retire', …) */
export const saveRetireNumbers = (v: Record<string,unknown>|undefined) => saveModule('retire', v)
/** @deprecated use saveModule('insure', …) */
export const saveInsureNumbers = (v: Record<string,unknown>|undefined) => saveModule('insure', v)
/** @deprecated use saveModule('tax', …) */
export const saveTaxNumbers = (v: Record<string,unknown>|undefined) => saveModule('tax', v)
/** @deprecated use saveModule('etf', …) */
export const saveEtfNumbers = (v: Record<string,unknown>|undefined) => saveModule('etf', v)
/** @deprecated use saveModule('flow', …) */
export const saveFlowNumbers = (v: Record<string,unknown>|undefined) => saveModule('flow', v)
/** @deprecated use saveToolInputs('flow', …) */
export const saveFlowInputs = (inputs: { age: string; salary: string; salaryPrefilled: boolean; hasHouse: boolean; houseSource: string; outstandingBalance: string; rate: string; monthlyInstalment: string; cpfServicing: string; hasJointLoan: boolean; yourSharePct: string; hasCar: boolean; carSource: string; carInstalment: string; insuranceSource: string; insurancePremium: string; insuranceFrequency: string; maHealthPremium: string; maHealthFrequency: string; investSource: string; investMonthly: string; taxSource: string; annualTax: string; livingMode: string; quickAmount: string; categories: { [k: string]: string }; backStart: string; backEnd: string; backMonths: string; showReconcile: boolean; liquidSavings: string; taxPaymentMode: string; taxDueMonth: string; lumpyItems: never[] }) => saveToolInputs('flow', inputs)
/** @deprecated use loadToolInputs('flow') */
export const loadFlowInputs = () => loadToolInputs('flow')

/** @deprecated use clearModule('house') */
export const clearHouseNumbers = () => clearModule('house')
/** @deprecated use clearModule('drive') */
export const clearDriveNumbers = () => clearModule('drive')
/** @deprecated use clearModule('retire') */
export const clearRetireNumbers = () => clearModule('retire')
/** @deprecated use clearModule('insure') */
export const clearInsureNumbers = () => clearModule('insure')
/** @deprecated use clearModule('tax') */
export const clearTaxNumbers = () => clearModule('tax')
/** @deprecated use clearModule('etf') */
export const clearEtfNumbers = () => clearModule('etf')
/** @deprecated use clearModule('flow') */
export const clearFlowNumbers = () => clearModule('flow')
