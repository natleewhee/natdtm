# ndtm — nat does the math

One Next.js 16 app hosting seven free Singapore financial-decision
calculators under a single shell, domain, and dark design system, with a
home dashboard that pulls them into one picture of your money. Every
number is traceable to a "the math" page that shows exactly how it was
worked out. No accounts; everything runs client-side except DriveReady's
own keyless data API routes. It installs as an app and works offline.

Deployed at **https://natdtm.vercel.app**. Full architecture notes in
[`docs/architecture.md`](docs/architecture.md); statutory-constant sources
in [`docs/statutory-sources.md`](docs/statutory-sources.md).

## The seven tools

| Tool | Route | What it answers |
|---|---|---|
| **InsureCheck** | `/insure` | A 3-minute Insurance Score — critical illness, life/TPD, and hospitalisation gaps in real dollars against Singapore planning benchmarks. |
| **DriveReady** | `/drive` | True monthly cost of a car — instalment, PARF/COE depreciation, TDSR — before you commit. The only vertical with live data (`/drive/api/*`). |
| **WhatETF** | `/etf` | An illustrative ETF portfolio for Singapore investors — UCITS-aware, tax-efficient, DCA-ready — generated in the browser. |
| **HouseMuch** | `/house` | What a property actually made you: profit/loss after CPF accrued-interest refund, mortgage interest, and stamp duties (BSD/ABSD/SSD). |
| **RetireWell** | `/retire` | Whether you will have enough: CPF contributions and interest projected properly, investments stress-tested against a safe withdrawal rate. |
| **TaxWise** | `/tax` | What you owe IRAS, your marginal vs effective rate, and what each relief (SRS, CPF top-up) is worth in dollars saved. |
| **MyLedger** | `/ledger` | The whole picture: net worth, debt servicing across every loan, monthly investable capacity (CPF/cash split, living expenses, lumpy items), and what a car or a house upgrade does to retirement. |

Each tool has a matching `/<tool>/the-math` page explaining its formulas
and citing its sources.

## The super app layer

| Route | What it does |
|---|---|
| `/` | With numbers saved: a "Your money" dashboard (net worth, free to invest, TDSR, Insurance Score, tax, CPF), each tile linking to its tool with a "checked N days ago" stamp, plus up to three cross-tool insights. Without: a "Set up my numbers" card. The tool grid is always below. |
| `/start` | Six skippable questions that fill every tool's slot at once (`lib/shared/onboarding.js`). Never overwrites a value typed in a tool. |
| `/me` | Profiles, backup download/restore, and **Send to my phone**: a QR code / link carrying the numbers in the URL fragment, which browsers never send to a server. |
| `/import` | The receiving end of a transfer link; confirms before replacing. |

Insights (`lib/shared/insights.js`) state calculated facts and link to the
working; they never recommend a product. TaxWise results can be shared as
a link carrying only the inputs (`lib/shared/share.js`); opening one is
view-only until the visitor keeps the numbers.

## Structure

```
src/app/
  layout.js, page.js, globals.css   the shell: root layout, home page, and
  not-found.js, error.js            the single source of truth for the dark
                                    palette + type system; themed error screens
  robots.js, sitemap.js            derived from src/lib/shared/site.ts
  <tool>/                          one directory per vertical: page.js,
                                    layout.js (route metadata), the-math/,
                                    plus any sub-routes (e.g. drive/api/,
                                    drive/renew-or-replace/, etf/rebalance/)
  <tool>/<tool>.css               per-vertical animations/utility classes
                                    that have no shared-token equivalent

src/components/
  shared/                          ShellHeader, Footer, TabBar, ToolHero,
                                    inputs.js (the one form kit), Button,
                                    VerdictBadge, ResultHero, ExploreSection,
                                    TrustBadges, MathTOC, ProfileSwitcher,
                                    AutosaveIndicator, SWRegister, ToolIcon
  <tool>/                          each tool's own components; ui.js only
                                    where a tool has primitives of its own

src/lib/
  shared/                          tools.js (the tool registry), site.js,
                                    profile.js (the cross-tool "My Numbers"
                                    store), theme.js (design tokens),
                                    money.js, loan.js, freshness.js,
                                    tieredTax.js, supabase.js
  shared/*.test.js                 statutory-currency, golden-masters,
                                    profile, tools, money, loan, freshness,
                                    tieredTax
  <tool>/calc.js (+ .test.js)     the pure calculation engine per vertical
  ledger/capacity/                MyLedger's Capacity engine (ex-FlowState)
  drive/theme.js                  DriveReady's own tokens (RATE_TIERS)
  drive/lta-parse.js, coe-history.js   DriveReady's PDF/CSV parsing
  drive/__fixtures__/             committed LTA PDF fixture for the parser tests

scripts/                          refresh-cars.mjs, refresh-coe-history.mjs,
                                  seed-supabase.mjs (DriveReady data pipeline)
public/fonts/                     self-hosted variable WOFF2: Space Grotesk,
                                  Inter, JetBrains Mono
public/data/                      bundled cars.json / coe-history.json snapshots
.github/workflows/               ci.yml (lint/test/build/e2e), refresh-data.yml
e2e/                             Playwright: smoke.spec.js, keyboard.spec.js,
                                  visual.spec.js
```

## Brand history

Originally three separate apps (`sginsurecheck`, `sgdriveready`,
`sgwhatetf`) under a "Coah" brand, later merged and rebranded to a
personal "ndtm" identity with a permanent dark "Digital Workbench" theme,
then extended to eight tools, later consolidated to seven when FlowState
was absorbed into MyLedger as its Capacity module. Identifiers and strings have been renamed
off the old brand; the one remaining trace is the `--l-*` CSS
custom-property prefix (kept deliberately — a repo-wide rename of every
token was judged higher risk than value). See `docs/architecture.md` for
detail.

## Design system

One theme, permanently dark, pinned via `data-theme` on `<html>`. The
palette is defined once in `src/app/globals.css` and mirrored as literal
hex in `src/lib/shared/theme.ts` (components build alpha variants by
string-concatenating a hex suffix, `${C.accent}44`, which needs real hex).

- **Background** `#0b1120` / **surface** `#1e293b`
- **Accent** `#eab308` (gold) — CTAs, active states, focus rings
- **Secondary** `#ff5722` (orange) — warning / mid-severity only
- **Semantic** green `#10b981` / red `#ef4444` / blue `#38bdf8` — positive,
  negative, informational; kept distinct from the brand accent
- **Type** — Space Grotesk (display), Inter (body), JetBrains Mono
  (all numeric data), self-hosted, no font CDN

Shared components carry one visual language across all seven tools:
`Button` (press feedback), `VerdictBadge` (mono uppercase stamp),
`ExploreSection` (terminal-style "show the math" collapsible),
`ResultHero` (verdict + big mono number + plain sentence), `MathTOC`,
`ToolHero` + `TrustBadges` (landing hero bands, `center` or `left`
layout), the form kit in `inputs.js`, and the site-wide `ShellHeader` /
`Footer` / `TabBar` (bottom navigation below 640px).

## Installable app

The whole site is one PWA: `src/app/manifest.js` (PNG + maskable icons
in `public/icons/`) and a service worker served from
`src/app/sw.js/route.js`, generated at build time from the tool registry
(scope `/`). Pages are network-first with an offline fallback; static
assets cache-first; `/drive/api/*` network-first with a cached copy.
`SWRegister` registers it in production only and removes the pre-2026-11
`/etf/`-scoped registration.

## Cross-tool "My Numbers"

`src/lib/shared/profile.ts` is a client-side (localStorage) store that
lets the tools hand figures to each other, to MyLedger and to the home
dashboard, without re-typing. It holds up to three named profiles
("Me", "Joint with Alex", …), each with a full per-tool slot set, and a
v7 schema with in-place migrations from v1. `ProfileSwitcher` in the
shell header switches the active profile. See `docs/architecture.md` for
the schema history.

## Data (DriveReady only)

Live COE premiums come from [data.gov.sg](https://data.gov.sg/)'s mirror
of LTA's COE Bidding Results dataset; car prices from the public
OneMotoring Car Cost Update PDF. Both keyless. `scripts/refresh-*.mjs`
(run weekly by `.github/workflows/refresh-data.yml`) open a PR against
`public/data/*.json` rather than writing to prod. An optional Supabase
mirror (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, CI secrets only)
receives a dual write. `/drive/data-status` shows live feed health.

## Statutory constants

Every hard-coded Singapore rate, bracket, and cap in the engines is
listed in [`docs/statutory-sources.md`](docs/statutory-sources.md) with
its authoritative source and verification date.
`src/lib/shared/statutory-currency.test.ts` fails CI if that audit is more
than ~3 months old, if any known wrong constant is left under *Open
discrepancies*, or if a *Scheduled changes* entry (for example the 1 Jan
2027 CPF senior-worker step) reaches its effective date still `pending`.
`src/lib/shared/golden-masters.test.ts` checks engine output against
figures IRAS and CPF Board publish.

## Development

```bash
npm install
npm run dev          # dev server
npm run build        # production build
npm run lint         # eslint
npm test             # unit tests (node --test)
npm run test:e2e     # Playwright: page smoke + keyboard path
npm run test:e2e:visual   # screenshot baselines (regenerate on the CI runner)
```

No environment variables are required to run locally. CI
(`.github/workflows/ci.yml`) runs lint, unit tests, the production build,
and the Playwright suite on every push and PR.

## Known gaps

- **React Compiler** is enabled only on the original InsureCheck, not
  repo-wide.
- **`--l-*` CSS token prefix** is a deliberate leftover from the "Coah"
  era; every other brand identifier has been renamed.
- **Visual baselines** for the Playwright `visual` project must be
  generated on the CI runner image (`ci.yml` `workflow_dispatch`), not a
  dev machine — font rendering differs.
- **Engine JSDoc** — `@param`/`@returns` annotations across the `calc.js`
  modules are incomplete.
