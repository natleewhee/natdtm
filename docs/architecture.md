# Architecture

How the eight verticals share one app. Companion to the top-level
`README.md`.

## The shell

One root layout (`src/app/layout.js`) sets the permanent dark theme
(`data-theme` on `<html>`), loads the self-hosted fonts, and provides the
title template (`%s · nat does the math`). The home page (`src/app/page.js`)
renders the eight tool cards from a local `TOOLS` array.

`src/components/shared/ShellHeader.js` is the one header for every page:
the `ndtm` wordmark, a tool switcher (shown only on a tool route), the
`ProfileSwitcher`, and an optional context row a page passes props for
(back link, title, step count, "the math" link). `src/components/shared/Footer.js`
is the one footer: wordmark, blurb, "the math" links, and a per-vertical
regulatory disclaimer keyed off the pathname. The footer also shows the
build stamp (`NEXT_PUBLIC_APP_VERSION` / `_BUILD_SHA` / `_BUILD_TIME`,
injected by `next.config.mjs`).

Each vertical's route tree is wrapped in a `.v-<tool>` container div (in
its `layout.js`) — a leftover from when each tool had an independent
palette. All verticals now read the same tokens from `src/app/globals.css`.

## Per-vertical module layout (canonical)

Every vertical follows this shape. Divergences are drift to be aligned,
not intentional variation.

```
src/app/<tool>/
  page.js            'use client' — the tool's screen(s)
  layout.js          route metadata export (title, description, openGraph);
                     wraps children in <div className="v-<tool>">
  <tool>.css         animations / utility classes with no shared-token home
  the-math/page.js   the methodology page (see "the math convention")
  <sub-route>/       optional (drive/api, drive/renew-or-replace, etf/rebalance…)

src/components/<tool>/
  <Feature>.js       presentational components for this tool
  ui.js              the tool's small input/layout primitives

src/lib/<tool>/
  calc.js            the pure calculation engine — no React, no fetch
  calc.test.js       node --test coverage for calc.js
  theme.js           re-exports src/lib/shared/theme.js, spread with any
                     vertical-specific keys (drive: iceBg/iceText; flow: surface2)
```

`insure` and `etf` predate this and vary (`insure/engine/scorer.js`,
`etf/logic.js` instead of `calc.js`; no `theme.js` — they read tokens
directly). New verticals should match the canonical layout.

## The "My Numbers" store

`src/lib/shared/profile.js` is a `localStorage`-only store (key
`ndtm_my_numbers_v1`) that lets tools hand figures to each other and to
MyLedger, so a number typed in one tool is not re-typed in another. Never
sent to a server.

- **Shape.** A wrapper `{ schemaVersion, activeProfileId, profiles: [...] }`.
  Each profile is `{ id, name, createdAt, updatedAt, data }` where `data`
  is the per-module slot set: `house`, `drive`, `retire`, `insure`, `tax`,
  `etf`, `flow`, `ledger`. Up to `MAX_PROFILES` (3) named profiles.
- **Schema history.** The inner `data.version` has migrated v1 → v6 in
  place (`migrateV1`…`migrateV5`): v1 carried one-shot snapshot fields for
  the RetireWell prefill; v2 added fuller per-module state for MyLedger's
  net-worth/TDSR math; v3 added `insure`/`tax`; v4 added `etf`; v5 added
  `flow`; v6 added `ledger`. A browser that has never seen profiles has
  its old flat payload migrated into one profile named "My Numbers".
- **API.** `loadMyNumbers()` / `save<Module>Numbers()` / `clear<Module>Numbers()`
  operate on the active profile; `listProfiles` / `createProfile` /
  `renameProfile` / `deleteProfile` / `setActiveProfile` manage the set;
  `saveToolInputs` / `loadToolInputs` persist a tool's raw form state.
- **Switching.** `src/components/shared/ProfileSwitcher.js` (in the shell
  header) changes the active profile and reloads the page so every tool
  re-reads on mount. It is keyboard-operable — Escape closes the menu and
  returns focus to the trigger.

## The "math" convention

Every vertical has a `/<tool>/the-math` page that walks through its
formulas and names its sources. In the tools themselves, `ExploreSection`
(a terminal-style `[ + ]` / `[ − ]` collapsible) shows the working for a
result inline. Statutory numbers cited on these pages trace back to
`docs/statutory-sources.md`.

## DriveReady data pipeline

DriveReady is the only vertical with live data.

- `src/app/drive/api/coe/route.js` fetches COE premiums from
  [data.gov.sg](https://data.gov.sg/)'s mirror of LTA's COE Bidding
  Results dataset (keyless). `src/app/drive/api/cars/route.js` parses the
  public OneMotoring Car Cost Update PDF (`runtime: 'nodejs'` — the parser
  needs `node:zlib` for `/FlateDecode` inflation, unavailable on edge).
- `src/lib/drive/lta-parse.js` holds the pure parsing (`extractPdfText`,
  `parseLTARows`, `matchToId`, `buildPriceMaps`, `isLowCoverage`,
  `getPdfNumbers`), covered by `lta-parse.test.js` against a committed
  synthetic `/FlateDecode` fixture in `src/lib/drive/__fixtures__/`.
- `scripts/refresh-cars.mjs` and `scripts/refresh-coe-history.mjs`, run
  weekly by `.github/workflows/refresh-data.yml`, open a PR against
  `public/data/*.json` — scraped data is reviewed, never written straight
  to prod. Both optionally dual-write to a Supabase mirror when
  `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set (CI secrets only;
  `src/lib/shared/supabase.js` reads `SUPABASE_ANON_KEY` for the
  browser-side read path).
- `/drive/data-status` renders the live health of each feed.

## Design tokens

`src/app/globals.css` is the source of truth for the `--color-*` /
`--l-*` / `--font-*` custom properties and the box-sizing reset, the
`prefers-reduced-motion` guard, and the shared `fadeUp` / `spin`
keyframes. `src/lib/shared/theme.js` mirrors the palette as a literal-hex
`C` object plus `SGD` and `parseMoney` helpers, because components build
alpha-transparent variants by concatenating a hex suffix (`${C.accent}44`),
which `var()` cannot do. The `--l-*` prefix and `coah`-named identifiers
are residue from the "Coah" era (see README "Brand history").

## CI

`.github/workflows/ci.yml` runs on every push and PR:

- `unit` — `npm ci`, `npm run lint`, `npm test`
- `build` — `npm run build` (needs `unit`)
- `e2e` — Playwright browser install (cached) then `npm run test:e2e`
  (page smoke + one keyboard path; needs `unit`)

`workflow_dispatch` additionally regenerates the `visual` project's
screenshot baselines on the runner image. Branch protection should
require `unit` and `build`.
