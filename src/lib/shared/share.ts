// src/lib/shared/share.ts
// Shareable result links (super-app plan U12, KTD7).
//
// A share link carries only the calculator INPUTS needed to reproduce a
// result, as short query parameters on the tool's route, never anything
// from the profile store. Every field is whitelisted and sanitised, both
// when building and when reading a link, so a crafted URL can only ever
// put numbers and known enum values into a form. Opening a link pre-fills
// the tool in a view-only mode that does not save to the visitor's
// profile until they choose to keep the numbers.
//
// DriveReady and WhatETF already encode their state in the URL their own
// way; this module covers the tools that did not.

import { getTool } from './tools.ts'
import { NSMAN_RELIEF } from '../tax/calc.ts'

const num = { kind: 'num' }
const oneOf = (...values: string[]) => ({ kind: 'enum', values })

/** Per tool: short param name → { field, type }. */
export const SHARE_FIELDS: Record<string, Record<string, any>> = {
  tax: {
    a: { field: 'age', ...num },
    r: { field: 'residency', ...oneOf('citizen', 'foreigner') },
    s: { field: 'monthlySalary', ...num },
    b: { field: 'annualBonus', ...num },
    o: { field: 'otherIncome', ...num },
    srs: { field: 'srsContribution', ...num },
    rs: { field: 'rstuSelf', ...num },
    rf: { field: 'rstuFamily', ...num },
    cf: { field: 'courseFees', ...num },
    ns: { field: 'nsmanStatus', ...oneOf(...Object.keys(NSMAN_RELIEF)) },
    ch: { field: 'childCount', ...num },
    pl: { field: 'parentLivingWith', ...num },
    pn: { field: 'parentNotLivingWith', ...num },
    or: { field: 'otherReliefs', ...num },
  },
}

export const SHARE_FLAG = 'shared'

function clean(spec: any, raw: string | number | null | undefined) {
  if (raw == null || raw === '') return null
  if (spec.kind === 'enum') return spec.values.includes(String(raw)) ? String(raw) : null
  // Plain non-negative decimals only (commas allowed). Anything else is
  // dropped rather than "repaired": stripping letters would turn 1e99
  // into 199.
  const s = String(raw).replace(/,/g, '').trim()
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n > 1e9) return null
  return String(Math.round(n * 100) / 100)
}

/**
 * @param {string} toolId
 * @param {Record<string, string|number>} inputs - the tool's form state
 * @param {string} origin - e.g. location.origin
 * @returns {string|null}
 */
export function buildShareUrl(toolId: string, inputs: Record<string, string|number>, origin: string): string|null {
  const fields = SHARE_FIELDS[toolId]
  const tool = getTool(toolId)
  if (!fields || !tool) return null
  const params = new URLSearchParams()
  params.set(SHARE_FLAG, '1')
  for (const [key, spec] of Object.entries(fields)) {
    const v = clean(spec, inputs?.[spec.field])
    // Skip empties and defaults that add nothing ('0', 'none', 'citizen').
    if (v == null || v === '0' || (spec.kind === 'enum' && v === spec.values[0])) continue
    params.set(key, v)
  }
  return `${origin}${tool.route}?${params.toString()}`
}

/**
 * The form values a share link carries, or null when the URL is not a
 * share link for this tool.
 * @param {string} toolId
 * @param {URLSearchParams} searchParams
 * @returns {Record<string, string>|null}
 */
export function parseShare(toolId: string, searchParams: URLSearchParams): Record<string, string>|null {
  const fields = SHARE_FIELDS[toolId]
  if (!fields || searchParams?.get(SHARE_FLAG) !== '1') return null
  const out: Record<string, any> = {}
  for (const [key, spec] of Object.entries(fields)) {
    const v = clean(spec, searchParams.get(key))
    if (v != null) out[spec.field] = v
  }
  return out
}

/**
 * Share via the native share sheet where there is one, else copy.
 * @returns {Promise<'shared'|'copied'|'failed'>}
 */
export async function shareOrCopy(url: string|null, title: string): Promise<'shared'|'copied'|'failed'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, url: url ?? undefined })
      return 'shared'
    }
    await navigator.clipboard.writeText(url ?? '')
    return 'copied'
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'failed'
    try { await navigator.clipboard.writeText(url ?? ''); return 'copied' } catch { return 'failed' }
  }
}
