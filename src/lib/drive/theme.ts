// src/lib/drive/theme.ts
// DriveReady's tokens are the shared set (src/lib/shared/theme.ts) —
// `iceBg`/`iceText` live in the shared DARK/LIGHT dictionaries since
// they're just another semantic pair, not a Drive-only key.
// Pure data — safe to import from both client components and the calc engine.
import { C as BASE, applyMode as applyBaseMode } from '../shared/theme.ts'

// `accent` (clay) is the BRAND/chrome color; `green` is a separate
// SEMANTIC color for positive outcomes (affordable, eco rate tier,
// savings) — keep the two apart.
export const C = { ...BASE }

/** @param {'light'|'dark'} mode */
export function applyMode(mode: 'light'|'dark') {
  applyBaseMode(mode)
  Object.assign(C, BASE)
}

// `color`/`bg` are getters, not values: applyMode() mutates `C` in place,
// so a hex read here at module-evaluation time would freeze whichever mode
// loaded first and never follow a light/dark switch. Every other field is
// a plain value — the calc engine reads `.rate`/`.id` and is unaffected.
export const RATE_TIERS = [
  { id:'ice',   label:'Standard ICE',       sub:'Petrol & diesel',   rate:0.0260, display:'2.60%', get color(){return C.iceText},   get bg(){return C.iceBg} },
  { id:'green', label:'Green EV / Hybrid',  sub:'Electric & hybrid', rate:0.0208, display:'2.08%', get color(){return C.greenText}, get bg(){return C.greenBg} },
  { id:'tesla', label:'Tesla Preferential', sub:'Tesla models only', rate:0.0168, display:'1.68%', color:'#c4b5fd',   bg:'#241c33' },
]

// SGD formatting and the k/m money parser live in src/lib/shared/money.ts
// (`SGD`, `parseMoneyOrNull`).

// Coarse Singapore-market popularity by brand — a transparent heuristic for
// ordering the long tail of search results, NOT sourced registration/sales
// figures (we only have real rank data for the 5 tagged best-sellers). Lower
// number = more common on SG roads. Used only to keep search results from
// falling back to raw/alphabetical order; the 5 ranked best-sellers still
// lead. Revisit if per-model sales data is ever added to cars.json.
const BRAND_TIER: Record<string, number> = {
  Toyota: 1, Honda: 1, BYD: 1, Hyundai: 1, Kia: 1, Mazda: 1,
  Tesla: 2, Nissan: 2, Mitsubishi: 2, Subaru: 2, Suzuki: 2,
  Volkswagen: 2, Skoda: 2, MG: 2, MG4: 2,
  BMW: 3, 'Mercedes-Benz': 3, Audi: 3, Volvo: 3, Lexus: 3, MINI: 3, Polestar: 3,
}
export function brandTier(name: string) {
  return BRAND_TIER[name.split(' ')[0]] ?? 4
}
