// src/lib/flow/theme.js
// FlowState uses the shared design tokens (src/lib/shared/theme.js) plus
// one extra surface shade and the Sankey's semantic fate palette.
import { C as BASE } from '../shared/theme.js'

export { SGD, parseMoney } from '../shared/theme.js'

export const C = { ...BASE, surface2: '#172033' }

// Fate colors — the Sankey's semantic palette, separate from the brand
// accent (reserved for FlowState's own chrome and the trough marker).
export const FATE_COLOR = {
  kept: C.green,
  gone: C.red,
  invested: C.blue,
  neutral: C.muted,
}
