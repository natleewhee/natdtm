# Architecture

How the seven verticals share one app. Companion to the top-level
`README.md`.

## The shell

One root layout (`src/app/layout.js`) sets the permanent dark theme
(`data-theme` on `<html>`), loads the self-hosted fonts, and provides the
title template (`%s · nat does the math`). The home page (`src/app/page.js`)
renders one card per tool from the tool registry.

## The tool registry

`src/lib/shared/tools.ts` is the only list of tools. Each entry is plain
data (`id`, `name`, `label`, `eyebrow`, `route`, `mathRoute`, `desc`,
`disclaimer`, extra `sitemap` routes); icons are drawn by
`src/components/shared/ToolIcon.js`, keyed by `id`. The home page, the
header's tool switcher (`getToolByPath`), the footer's the-math links and
disclaimers, and `sitemap.js` (`sitemapRoutes()`) all read it, and
`tools.test.js` fails if one of those files hard-codes a tool route
again. Adding a vertical starts with a registry entry.

`src/components/shared/ShellHeader.js` is the one header for every page:
the `ndtm` wordmark, a tool switcher (shown only on a tool route), the
`ProfileSwitcher`, and an optional context row a page passes props for
(back link, title, step count, "the math" link). `src/components/shared/Footer.js`
is the one footer: wordmark, blurb, "the math" links, and a per-vertical
regulatory disclaimer from the registry entry matching the pathname. The footer also shows the
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
  ui.js              optional: primitives only this tool uses (form fields
                     come from src/components/shared/inputs.js)

src/lib/<tool>/
  calc.js            the pure calculation engine — no React, no fetch
  calc.test.js       node --test coverage for calc.js
  theme.js           only when the vertical has tokens of its own (drive:
                     RATE_TIERS, brandTier); otherwise import C from
                     src/lib/shared/theme.ts directly
```

All seven verticals now match this shape (`insure/calc.js`, `etf/calc.js`;
MyLedger's Capacity engine, formerly FlowState, is
`src/lib/ledger/capacity/calc.ts`). WhatETF keeps CSS modules (they
already read the shared `--color-*` tokens) and its `.v-etf` wrapper,
which scopes a few WhatETF-only custom properties.

## Shared engine core

- `src/lib/shared/money.ts`: `SGD`, `SGDCompact`, `parseMoney` (0 for
  empty) and `parseMoneyOrNull` (rounded, null for empty; DriveReady's
  convention). `theme.js` files hold design tokens only.
- `src/lib/shared/loan.ts`: `monthlyPayment`, `balanceAfter`,
  `interestPaid` (reducing-balance) and `fvAnnuityFactor`. HouseMuch,
  MyLedger and RetireWell use it; `loan.test.js` pins it to the formulas
  it replaced. Car loans are flat-rate and stay in `drive/calc.js`.
- `src/lib/shared/tieredTax.ts`, `jointShare.js`, `freshness.js` as before.

## The "My Numbers" store

`src/lib/shared/profile.ts` is a `localStorage`-only store (key
`ndtm_my_numbers_v1`) that lets tools hand figures to each other and to
MyLedger, so a number typed in one tool is not re-typed in another. Never
sent to a server.

- **Shape.** A wrapper `{ schemaVersion, activeProfileId, profiles: [...] }`.
  Each profile is `{ id, name, createdAt, updatedAt, data }` where `data`
  is the per-module slot set: `house`, `drive`, `retire`, `insure`, `tax`,
  `etf`, `flow` (MyLedger's Capacity module), `ledger`, `insureHistory`.
  Up to `MAX_PROFILES` (3) named profiles.
- **Schema history.** The inner `data.version` has migrated v1 → v7 in
  place (`migrateV1`…`migrateV6`, table-driven): v1 carried one-shot snapshot fields for
  the RetireWell prefill; v2 added fuller per-module state for MyLedger's
  net-worth/TDSR math; v3 added `insure`/`tax`; v4 added `etf`; v5 added
  `flow`; v6 added `ledger`; v7 added `insureHistory`, adopting each
  profile's legacy `iga_score_history[:profileId]` key (removed only after
  the store write lands) so export/import carries score history. A browser that has never seen profiles has
  its old flat payload migrated into one profile named "My Numbers".
- **API.** `MODULE_SCHEMA` declares each synced slot's fields and their
  coercion; `saveModule(tool, values)` / `clearModule(slot)` /
  `loadSlot` / `writeSlot` operate on the active profile (the old
  `save<Module>Numbers` / `clear<Module>Numbers` names remain as
  deprecated wrappers); `listProfiles` / `createProfile` /
  `renameProfile` / `deleteProfile` / `setActiveProfile` manage the set;
  `saveToolInputs` / `loadToolInputs` persist a tool's raw form state.
- **Switching.** `src/components/shared/ProfileSwitcher.js` (in the shell
  header) changes the active profile and reloads the page so every tool
  re-reads on mount. It is keyboard-operable — Escape closes the menu and
  returns focus to the trigger.

## The super app layer

- **Dashboard** (`components/shared/dashboard/HomeDashboard.js`) reads the
  raw store string through `useSyncExternalStore` (`readStoreSnapshot` +
  `subscribeToNumbers`), so it re-renders only on a real change and never
  flashes the empty state for a returning user. Tiles come from
  `lib/ledger/summary.js`, which calls MyLedger's own engine, so `/` and
  `/ledger` cannot disagree.
- **Insights** (`lib/shared/insights.js`): rules of
  `{ applies, build, priority }`; at most three shown. Copy is
  arithmetic, never advice (enforced by `insights.test.js`).
- **Onboarding** (`lib/shared/onboarding.js`): `planOnboarding(answers,
  existing)` is pure and returns `MODULE_SCHEMA` writes plus tool form
  inputs to fill only where still empty; `/start` applies it.
- **Transfer** (`lib/shared/transfer.js`): store → compact JSON →
  `deflate-raw` (`CompressionStream`) → base64url in `/import#v1.…`.
  Falls back to the active profile alone past `QR_MAX_URL_CHARS`. Import
  uses `importProfiles`, the same validation path as a backup file.
- **Share links** (`lib/shared/share.js`): per-tool whitelists of short
  query params; values must be plain decimals or known enum values.
- **SEO**: `lib/shared/structuredData.js` (WebApplication, TechArticle,
  BreadcrumbList from the registry) rendered by `components/shared/JsonLd.js`
  in layouts; `components/shared/OgCard.js` draws each tool's
  `opengraph-image`.

## The "math" convention

Every vertical has a `/<tool>/the-math` page that walks through its
formulas and names its sources. In the tools themselves, `ExploreSection`
(a terminal-style `[ + ]` / `[ − ]` collapsible) shows the working for a
result inline. Statutory numbers cited on these pages trace back to
`docs/statutory-sources.md`.

## DriveReady data pipeline

DriveReady has one genuinely live feed (COE premiums) and one weekly-refreshed
one (car prices) — not two live feeds, which is a deliberate change from an
earlier version of this pipeline (see below).

- `src/app/drive/api/coe/route.js` fetches COE premiums live, per request,
  from [data.gov.sg](https://data.gov.sg/)'s mirror of LTA's COE Bidding
  Results dataset (keyless).
- `src/app/drive/api/car-catalog/route.js` serves car prices/OMV from the
  `cars` Supabase table when configured, else the bundled
  `public/data/cars.json` snapshot — never a live per-request fetch. An
  earlier version of this route (`src/app/drive/api/cars/route.js`, since
  deleted) fetched LTA's Car Cost Update PDF fresh on every visitor
  request; `onemotoring.lta.gov.sg` reliably blocked that traffic (no
  browser-like headers, a shared serverless IP range) and it never
  actually worked in production. `/drive/data-status` reports the
  catalog's source and freshness (`updatedAt`) rather than a live/dead
  verdict for this feed.
- `src/lib/drive/lta-parse.ts` holds the pure parsing (`extractPdfText`,
  `parseLTARows`, `matchToId`, `buildPriceMaps`, `isLowCoverage`,
  `getPdfNumbers`), covered by `lta-parse.test.js` against a committed
  synthetic `/FlateDecode` fixture in `src/lib/drive/__fixtures__/`. It
  needs `node:zlib` for `/FlateDecode` inflation, which is why it can
  only run from `scripts/refresh-cars.mjs` (plain Node, via GitHub
  Actions) rather than an edge runtime route.
- `scripts/refresh-cars.mjs` and `scripts/refresh-coe-history.mjs`, run
  weekly by `.github/workflows/refresh-data.yml`, open a PR against
  `public/data/*.json` when the parse passes its coverage sanity check
  and there's an actual diff, and that PR **auto-merges** once CI passes
  (`gh pr merge --auto --squash`) — so `cars.json` stays at most about a
  week stale without needing a human to review and merge it. Both
  scripts optionally dual-write to a Supabase mirror when
  `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set (CI secrets only;
  `src/lib/shared/supabase.ts` reads `SUPABASE_ANON_KEY` for the
  browser-side read path).

## Design tokens

`src/app/globals.css` is the source of truth for the `--color-*` /
`--font-*` custom properties and the box-sizing reset, the
`prefers-reduced-motion` guard, and the shared `fadeUp` / `spin`
keyframes. `src/lib/shared/theme.ts` mirrors the palette as a literal-hex
`C` object plus `SGD` and `parseMoney` helpers, because components build
alpha-transparent variants by concatenating a hex suffix (`${C.accent}44`),
which `var()` cannot do.

**Brand history:** the app was formerly "Coah". All brand identifiers and
strings have since been renamed to "ndtm" / "nat does the math". The last
leftover, the `--l-*` CSS custom-property prefix, was retired on
2026-11-27: each theme block now defines the `--color-*` / `--font-*`
tokens directly, and `kit-guard.test.js` fails if `--l-` comes back.

## CI

`.github/workflows/ci.yml` runs on every push and PR:

- `unit` — `npm ci`, `npm run lint`, `npm test`
- `build` — `npm run build` (needs `unit`)
- `e2e` — Playwright browser install (cached) then `npm run test:e2e`
  (page smoke + one keyboard path; needs `unit`)

`workflow_dispatch` additionally regenerates the `visual` project's
screenshot baselines on the runner image. Branch protection should
require `unit` and `build`.
