# ndtm — nat does the math

A single Next.js app hosting three free Singapore financial-decision
calculators under one shell, one domain, and one shared dark design
system:

- **InsureCheck** (`/insure`) — a 3-minute Insurance Score: hospitalisation,
  critical illness, life/TPD, and premium-efficiency checked against
  Singapore financial-planning benchmarks.
- **DriveReady** (`/drive`) — true monthly cost of a car in Singapore,
  including COE, PARF/ARF, loan-tier interest rates, and real depreciation —
  not just the sticker price.
- **WhatETF** (`/etf`) — illustrative ETF portfolio allocations for
  Singapore investors (UCITS-first, tax-efficient), with the math shown,
  not just a recommendation.

All three are free, run entirely client-side (no accounts, no data sent to
a server beyond DriveReady's own COE/car-price API routes), and every
number shown is traceable to a "the math" page that explains exactly how
it was calculated.

Originally three separate apps (consolidated from `sginsurecheck`,
`sgdriveready`, `sgwhatetf`) under a "Coah" brand; the whole shell and each
tool's home/result screens have since been rebranded to a personal,
casual-voiced "ndtm" identity with a permanent dark "Digital Workbench"
theme. Some internal code comments and CSS custom-property names (`--l-*`,
`--color-coah`, `.coah-button`, etc.) still carry the old "Ledger"/"Coah"
naming as historical residue from that migration — harmless, but worth
knowing if you go looking for "Ledger" or "Coah" in the source and don't
find it in the UI anymore.

## Structure

```
src/app/
  layout.js, page.js, globals.css   — the shell: root layout, home page,
                                       and the single source of truth for
                                       the dark palette + type system
  not-found.js, error.js            — themed 404 / runtime-error screens
  insure/                           — InsureCheck (check wizard, results,
                                       the-math, loading)
  drive/                            — DriveReady (the only vertical with a
                                       live backend: /drive/api/cars,
                                       /drive/api/coe; also renew-or-replace
                                       and coe-explained sub-tools)
  etf/                              — WhatETF (preferences, portfolio,
                                       compare, rebalance, learn, the-math)
src/components/
  shared/                           — ShellHeader, Footer, Button,
                                       VerdictBadge, InsightPill, ResultHero,
                                       ExploreSection, TrustBadges, MathTOC —
                                       the cross-tool UI vocabulary
  insure/, drive/, etf/             — each tool's own components
src/lib/
  shared/site.js                    — SITE_URL etc., shared across tools
  insure/engine/                    — scoring engine, band/severity colors
  drive/                            — calc.js (the affordability/loan/
                                       depreciation math), theme.js (Drive's
                                       own literal-hex copy of the palette
                                       — see the comment at the top of that
                                       file for why it can't use var())
  etf/logic.js                      — portfolio generation, backtest,
                                       stress test, fee comparison
public/fonts/                       — self-hosted variable-weight WOFF2:
                                       Space Grotesk (display), Inter
                                       (body), JetBrains Mono (numbers/code)
scripts/                            — refresh-cars.mjs, refresh-coe-history.mjs
                                       (DriveReady's data pipeline)
```

Each vertical's route tree is wrapped in a `.v-insure` / `.v-drive` /
`.v-etf` container div (see each vertical's `layout.js`), a leftover from
when each tool had its own independent legacy palette. All three now pull
their colors from the same `--color-*` / `--l-*` custom properties defined
once in `src/app/globals.css`; each vertical's `legacy.css` only holds a
handful of animations/utility classes that don't have a shared-token
equivalent yet.

## Design system

One theme, permanently dark — no light/dark toggle, pinned via
`data-theme` on `<html>`. Core palette (defined in `globals.css`, mirrored
as literal hex in `src/lib/drive/theme.js` and
`src/lib/insure/engine/scorer.js` where CSS variables can't be used — see
the in-file comments for why):

- **Background** `#0b1120` / **surface** `#1e293b` — near-black with a
  slightly lighter card tone
- **Accent** `#eab308` (gold) — primary CTAs, active states, focus rings
- **Secondary** `#ff5722` (orange) — reserved for warning/mid-severity
  states, never used decoratively alongside the accent
- **Semantic** green `#10b981` / red `#ef4444` / blue `#38bdf8` — positive,
  negative, and neutral-informational states respectively, kept distinct
  from the brand accent
- **Type**: Space Grotesk for headings/display, Inter for body text,
  JetBrains Mono for all numeric data (prices, scores, dates) — self-hosted
  variable-weight WOFF2, no external font CDN

Shared components (`src/components/shared/`) carry the same visual
language across all three tools: `Button` (tactile press feedback),
`VerdictBadge` (mono, uppercase, "stamped label" treatment),
`ExploreSection` (a "show the math" terminal-style collapsible — `[ + ]` /
`[ − ]` bracket toggle), `ResultHero` (verdict pill + big mono number +
plain-English sentence), `InsightPill`, `TrustBadges`, `MathTOC`, and the
site-wide `ShellHeader` / `Footer`.

## What changed from the three source repos

- **Routing**: everything is namespaced (`/check` → `/insure/check`,
  `/coe-explained` → `/drive/coe-explained`, `/preferences` →
  `/etf/preferences`, etc).
- **One header, one footer**: `ShellHeader` replaced each tool's own
  nav+subnav stack; `Footer` replaced three separate per-vertical footers
  (each with its own brand signature and cross-links) with one shell
  footer that only varies by its regulatory disclaimer text per tool.
- **Fonts**: no third-party font CDN — Space Grotesk/Inter/JetBrains Mono
  are self-hosted from `public/fonts/`.
- **Tailwind**: dropped. Auditing InsureCheck (the only source app with it
  configured) found no actual Tailwind utility classes in use — everything
  is inline `style={{}}` or CSS Modules, same as the other two apps.
- **`next.config.mjs`**: one config using a strict self-only CSP (no
  external font/style allowances needed) and build-version-stamping
  (`NEXT_PUBLIC_APP_VERSION` / `_BUILD_SHA` / `_BUILD_TIME`, shown in the
  shell footer) applied site-wide.
- **DriveReady's data pipeline is untouched in shape**:
  `scripts/refresh-cars.mjs`, `scripts/refresh-coe-history.mjs`, and
  `.github/workflows/refresh-data.yml` still open a PR against
  `public/data/*.json` rather than writing scraped data straight to prod.
- **WhatETF's service worker** is scoped to `/etf/`
  (`register('/sw.js', { scope: '/etf/' })`) so it can never intercept
  navigation for Insure/Drive or the shell.

## Known gaps

- **React Compiler**: Next.js and React versions are reconciled across all
  three verticals (16.2.1 / 19.2.3), but React Compiler (only enabled in
  the old InsureCheck) has not been turned on repo-wide — flagged as a risk
  to verify carefully before enabling across all three verticals' worth of
  components at once.
- **Lint debt inherited from WhatETF**: a handful of pre-existing
  `react-hooks/set-state-in-effect` findings in the ported ETF pages (state
  set synchronously inside `useEffect`). Left as-is intentionally — fixing
  them risks changing portfolio calculation behavior without dedicated
  testing.
- **PNG manifest icons**: WhatETF's PWA manifest is SVG-icon-only, which
  iOS wants as PNG for home-screen install polish. Unchanged by the merge.
- **`LTA_API_KEY`**: not configured in every environment, so
  `/drive/api/coe` correctly 500s when it's missing — DriveReady falls back
  to hardcoded `COE_FALLBACK` constants in `src/lib/drive/calc.js`, and the
  calculator page itself still works.
- **Copy voice pass**: the home-page heroes and footer blurb have been
  rewritten into a casual first-person voice; deeper pages (wizard
  microcopy, results screens, the-math pages) still read in the older,
  more institutional tone in places.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run lint     # eslint
npm test         # unit tests (node --test)
```

Copy `.env.example` to `.env.local` and set `LTA_API_KEY` (from
[LTA DataMall](https://datamall.lta.gov.sg/)) to enable live COE premiums
under `/drive`; without it, DriveReady falls back to hardcoded constants.
