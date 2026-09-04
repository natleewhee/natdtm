// src/lib/flow/theme.js
// FlowState uses the shared design tokens (src/lib/shared/theme.js) —
// `surface2` (one extra inset-panel shade) lives in the shared DARK/LIGHT
// dictionaries alongside it — plus the Sankey's semantic fate palette.
import { C as BASE, applyMode as applyBaseMode } from '../shared/theme.js'

export { SGD, parseMoney } from '../shared/theme.js'

export const C = { ...BASE }

/** @param {'light'|'dark'} mode */
export function applyMode(mode) {
  applyBaseMode(mode)
  Object.assign(C, BASE)
}

// Fate colors — the Sankey's semantic palette, separate from the brand
// accent (reserved for FlowState's own chrome and the trough marker).
// A getter, not a static snapshot, so it tracks `C` across a mode switch.
export function getFateColor() {
  return { kept: C.green, gone: C.red, invested: C.blue, neutral: C.muted }
}
export const FATE_COLOR = getFateColor()
