---
title: natdtm Super App - Plan
type: feat
date: 2026-11-24
topic: super-app-consolidation
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# natdtm Super App - Plan

## Goal Capsule

- **Objective:** A Singaporean opening natdtm sees *their money*, not a grid of seven calculators. They enter a few numbers once, the home screen shows their whole position (net worth, monthly capacity, insurance score, tax, retirement readiness), and each tool opens as a module of that one picture, already filled in. It installs on a phone like an app and works offline, and nothing leaves the device.
- **Means:** Two phases. **Phase A (Foundations, PRs 1–2):** collapse the duplication under the merged shell into shared layers: a tool registry, an input kit, finance primitives, a declarative profile store and page templates. No change to any calculator's output. **Phase B (Super app, PR 3 plus U7 in PR 2):** a dashboard home, a one-pass onboarding, cross-tool insights, an app-wide PWA with mobile navigation, local-only device transfer, and shareable results.
- **Product authority:** User is product owner. Settled in session on 2026-11-24: "super app" means *both, phased* (clean foundations, then dashboard home). It stays **local-only** with no accounts. The audience is **the public in Singapore**, so growth, SEO and shareability count.
- **Open blockers:** None for Phase A. Phase B's U7 depends on OQ1 (what happens to `/ledger`). The recommendation is recorded below.

## Product Contract

### Summary

natdtm is already one Next.js 16 app with one shell (`ShellHeader`, `Footer`), one dark design system and one cross-tool store (`src/lib/shared/profile.js`, with 3 profiles, cross-tab sync and export/import). The *shell* is merged. The layers underneath are not, and the product still behaves like seven separate calculators reached from a card grid. MyLedger is the closest thing to a hub, but it is a destination you have to know to visit.

### Problem Frame

Findings from a full read of the repo at the merge of PR #32 (2026-11-24):

1. **Five copies of the same input kit.** `src/components/{drive,house,ledger,retire,tax}/ui.js` (125–242 lines each) all export `SectionDivider`, `MoneyInput`, `PercentInput` and `Segmented`; four also export `NumberInput`. `src/app/drive/renew-or-replace/page.js` defines a sixth inline set (`MoneyInput`, `Slider`, `Card`, …, lines 24–162, already in `docs/backlog.md`). InsureCheck and WhatETF use yet another style (inline and `etf/shared.module.css`).
2. **Finance maths in several places.** Amortisation and annuity formulas are written separately in `lib/house/calc.js:57,74`, `lib/ledger/calc.js:448` and `lib/retire/calc.js:226`. Money parsing (`parseMoneyKM` in `lib/drive/theme.js`, `parseMoney` in `lib/house/theme.js`) and SGD formatting (`SGD` in drive's theme, local `fmtSGD` ×2 in `app/drive/**`, `fmtAmount` in `insure/check`) are scattered, partly inside *theme* files.
3. **The profile store is imperative boilerplate.** `profile.js` (593 lines) has seven `save<Tool>Numbers` and six `clear<Tool>Numbers` that share one read-merge-write skeleton (already in the backlog). InsureCheck keeps score history outside the store, under its own key (`iga_score_history[:profileId]`), so it escapes export/import.
4. **Tool metadata is hard-coded in several places.** The home page has a local `TOOLS` array (`src/app/page.js:3`). `ShellHeader`'s switcher, `sitemap.js` and `Footer`'s per-vertical disclaimers each hold their own idea of the tool list. The 2026-08-30 plan named a `src/lib/shared/tools.js`, but it was never created.
5. **Layout drift.** `insure` (`engine/scorer.js`) and `etf` (`logic.js`, 6 CSS modules) predate the canonical module shape. `lib/flow/` (1,005 lines) survives as a top-level folder although only `/ledger` uses it, and `/flow` returns 410. Five `lib/<tool>/theme.js` files only re-export shared tokens. `.v-<tool>` wrapper divs are leftovers.
6. **Copy-pasted page anatomy.** The same centred hero and `TrustBadges` row appear on 6 landing pages (taste-skill audit, 2026-09-09).
7. **No product-level home.** The home page is a static card grid that never reads `loadMyNumbers()`, so a returning user with five tools filled in sees the same page as a stranger. Cross-tool value (e.g. "this car pushes your TDSR to 58% and delays retirement 3 years") exists only inside `/ledger`.
8. **The PWA covers one tool.** `public/sw.js` and the manifest are scoped to `/etf/` only. The rest of the site can't be installed and doesn't work offline.

### Requirements

#### Phase A: Foundations (no calculator output change)

- R1. One tool registry, `src/lib/shared/tools.js`, holds each tool's id, name, route, tagline, icon, the-math route, disclaimer key and profile slot. The home page, `ShellHeader` switcher, `sitemap.js`, `Footer` and MyLedger all read it, and no other file lists the tools.
- R2. One input kit, `src/components/shared/inputs.js`, provides `MoneyInput`, `PercentInput`, `NumberInput`, `DateInput`, `TextInput`, `SelectInput`, `Segmented`, `Toggle`, `Slider`, `SectionDivider`, `StatBox` and `OverrideField`. The six local copies are deleted, and a per-tool `ui.js` survives only for components that really are specific to that tool (e.g. drive's `GaugeBar`).
- R3. Shared finance primitives: `src/lib/shared/money.js` (`parseMoney` with k/m suffixes, `fmtSGD`, `fmtPct`) and `src/lib/shared/loan.js` (`monthlyPayment`, `balanceAfter`, `fvAnnuity`, `interestPaid`). Every engine imports them, and `theme.js` files hold tokens only.
- R4. The profile store becomes declarative. A `MODULE_SCHEMA` table (`{ tool: { fields: { key: coerce } } }`) and a generic `saveModule(tool, values)` / `clearModule(tool)` replace the 13 hand-written functions. The old names stay as one-line wrappers for one release. InsureCheck score history moves into the profile as its own `insureHistory` slot (inner data v7, with a migration from `iga_score_history*`). It is a separate slot, not `insure.history`, so clearing InsureCheck's synced numbers keeps the history, as it did before.
- R5. Canonical layout everywhere: `lib/insure/calc.js` (from `engine/scorer.js`) and `lib/etf/calc.js` (from `logic.js`), `lib/flow/` moved to `lib/ledger/capacity/`, the five re-export `theme.js` shims deleted, and the `.v-<tool>` wrappers removed. WhatETF's CSS modules are converted to the shared tokens.
- R6. Page templates: a `ToolLanding` component with 2–3 distinct hero shapes replaces the copy-pasted heroes, and `TrustBadges` is shown once in the shell instead of 6–8 times. Copy is unchanged except where a hero shape needs it.

#### Phase B: Super app

- R7. **Dashboard home.** `/` reads the active profile. With no data, it shows a short pitch, the onboarding entry and the tools. With data, it shows a "Your money" summary: net worth, monthly investable capacity, Insurance Score, tax payable and marginal rate, and retirement readiness. Each figure is a tile that links to its module, shows a freshness stamp ("checked 4 months ago", using `lib/shared/freshness.js`) and shows an empty "Add" state for modules not yet filled in. The tiles are computed by MyLedger's engine, not a second engine.
- R8. **One-pass onboarding** ("Set up my numbers", about 2 minutes): age, gross monthly income, CPF balances (optional), home (none / HDB / private, with loan), car (none / own / planning), and savings and investments. It writes to every relevant profile slot so each tool opens pre-filled. Each tool can still be used on its own, without onboarding.
- R9. **Cross-tool insights.** A pure `lib/shared/insights.js` produces up to three ranked cards from the profile, e.g. TDSR headroom, the tax saved by an SRS or CPF top-up, an insurance re-check that is due (`recheckReminder.js` exists), or a COE timing signal for a planned car. Each card states a calculated fact and links to the math. It never recommends a product (see Key Decisions).
- R10. **App-wide PWA and mobile navigation.** The service worker and manifest move to the root scope, so every route is installable and the shell plus engines work offline (DriveReady falls back to its bundled `public/data/*.json`). Below 640px, a bottom tab bar (Home · Plan · Tools · Me) replaces the header tool switcher. PNG manifest icons are added (a known gap in the README).
- R11. **Local-only device transfer.** The "Me" area brings together the profile switcher, export/import (already in `profile.js`) and a new "Send to my phone" option. It encodes the compressed profile into a URL *fragment* (a `#...` that is never sent to a server) and shows it as a QR code. A backup nudge appears after material edits, because local-only means the browser is the only copy.
- R12. **Shareable results.** Each tool can produce a share link that carries anonymised *inputs* in the query string, never the profile. A per-result OG image is drawn server-side from those parameters. `FAQPage`/`HowTo` JSON-LD is added on the-math pages. This picks up the SEO item (R9) deferred on 2026-08-30.

### Key Decisions

- KD1. **Local-only stays.** No accounts, no server storage. Cross-device use is handled by R11 (URL-fragment transfer and file backup), never by a backend. This keeps the 2026-08-30 "Outside this product's identity" line.
- KD2. **Phase A before Phase B, with no overlap.** Phase B's dashboard, onboarding and insights all depend on the registry (R1), the declarative store (R4) and the shared primitives (R3). Building them on today's duplicated layers would mean writing the code twice.
- KD3. **Insights are arithmetic, not advice.** Every R9 card is a calculated consequence of the user's own numbers with a "the math" link, worded as a fact ("An S$8,000 SRS top-up lowers your tax by S$920"), never as an instruction to buy a product. This keeps "no personalised financial advice" intact.
- KD4. **Tool names stay as module names.** InsureCheck, DriveReady and the rest keep their names and routes. They carry SEO value, and public users search for the job ("car affordability calculator Singapore"), not for "natdtm". The home page changes. The URLs do not.
- KD5. **`/lab/*` (WorldHub, DataAvatar, three.js) is out of the super app.** It stays an unlinked experiment. `three` must not enter the main route bundles.

### Scope Boundaries

**Deferred**
- ~~Tax×Retire reliefs optimiser as a standalone module.~~ Shipped 2026-11-27 as a section of TaxWise's results (`src/lib/tax/optimise.ts`), not a separate tool.
- TypeScript migration (`src/lib` done 2026-11-27); ~~`--l-*` token codemod~~ (done 2026-11-27); ~~React Compiler repo-wide~~ (on from 2026-11-27).
- New verticals (e.g. a CPF housing-grant checker). Add them only after R1, as a registry entry plus a canonical module.
- The CPF band fixes already listed in `docs/backlog.md` (2026-10-18). They go through the statutory register as before, separately from this plan.

**Outside this product's identity:** accounts, server-side user data, paid or keyed APIs, product recommendations or affiliate links.

### Open Questions

- OQ1. (Blocks U8 only) **Does `/ledger` stay a tool, or become "Plan"?** Recommendation: the home page shows the *summary*, and `/ledger` becomes the **Plan** tab (scenario planner, capacity, what-ifs). It stays a deep page with its own URL, not a tool card.
- OQ2. (Blocks U11 only) What is the fragment size budget for "Send to my phone"? Measure a full 3-profile payload after compression. If it is over ~2 KB (too dense for a reliable QR scan), send only the active profile.
- OQ3. (Non-blocking) Should onboarding ask for CPF balances, or link out to the CPF app? Recommendation: optional fields with a "find this in the CPF app" hint, and no scraping.

### Success Criteria

- `rg "export function MoneyInput" src` returns exactly one hit; amortisation and annuity formulas exist only in `lib/shared/loan.js`.
- The 13 hand-written save/clear bodies in `profile.js` become one `MODULE_SCHEMA` table and `saveModule`/`clearModule`. `profile.test.js` passes against the wrapper names (only the expected `version` 6 → 7 assertions change), plus new v7 migration tests.
- No tool list exists outside `lib/shared/tools.js` (checked by a test that greps for tool route literals in shell files).
- Every engine's `golden-masters.test.js` and `statutory-currency.test.js` pass with no fixture changes throughout Phase A. Playwright visual diffs stay within the existing tolerance, except for pages R6 deliberately reshapes, which get new baselines in the same PR.
- A returning user with data sees their own figures on `/` within one paint (no flash of the empty state). A new user completes onboarding and opens any tool pre-filled.
- Lighthouse PWA installability passes on `/`, `/drive` and `/insure`. An offline reload of `/tax` renders and computes.
- The main route bundles do not contain `three`.

---

## Planning Contract

### Key Technical Decisions

- KTD1. **Characterisation first, as in the hardening plan.** Before U3/U4 touch an engine or the store, pin the current outputs. Golden masters exist, so add property tests for `loan.js` against the three existing implementations (they must agree to the cent across a grid of P, r and n) before deleting any of them.
- KTD2. **The registry is data, not components.** `tools.js` is plain objects, safe to import from engines, `sitemap.js` and server components. Icons are referenced by key, not imported JSX.
- KTD3. **The store schema drives everything.** `MODULE_SCHEMA` is the single description of what each slot holds. `saveModule`, the v7 migration, export/import validation, onboarding's write-out (R8) and the dashboard's "is this module filled?" check all read it.
- KTD4. **Dashboard = MyLedger engine + `useSyncExternalStore`.** `/` uses `subscribeToProfileChanges` (it exists) through `useSyncExternalStore`, so a profile switch or a write in another tab updates tiles live. Server render shows a neutral skeleton, and the client decides empty versus filled, which prevents a hydration mismatch.
- KTD5. **Service worker: network-first for navigations, cache-first for build assets, one cache.** This extends the existing `/etf` worker's strategy to scope `/` and retires the `whatetf-*` cache name with a version bump. `drive/api/*` is network-first with a fallback to the bundled JSON.
- KTD6. **Fragment transfer uses `CompressionStream('deflate-raw')` + base64url.** There is no server endpoint and no new dependency except a small QR encoder (or draw the QR on canvas in-house). Import goes through the same `importProfiles` validation path as file import.
- KTD7. **Share links carry inputs only.** OG images are drawn with `next/og` from query params on an edge route, with no storage. A test asserts that no profile key ever appears in a generated share URL.

### Sequencing

```
Phase A (foundations)                    Phase B (super app)
U1 registry ─┐                            U7 PWA + mobile nav  (needs U1)
U2 input kit ├─► U5 canonical layout ─►   U8 dashboard home    (needs U1,U3,U4; OQ1)
U3 money/loan┤      U6 page templates     U9 onboarding        (needs U4,U8)
U4 store v7 ─┘                            U10 insights         (needs U3,U4,U8)
                                          U11 device transfer  (needs U4,U7; OQ2)
                                          U12 share + SEO      (needs U1)
```

PR grouping (settled 2026-11-25: the whole plan lands in three PRs):

| PR | Units | Theme | User-visible change |
|---|---|---|---|
| PR 1 | this plan + U1, U3, U4, U5 | Logic foundations: registry, money/loan core, store v7, canonical `lib/` layout | None. Every golden master and visual baseline unchanged |
| PR 2 | U2, U6, U7 | UI foundations + app shell: input kit, page templates, app-wide PWA and mobile tab bar | Reshaped landing heroes, installable site, bottom nav on phones |
| PR 3 | U8, U9, U10, U11, U12 | Super app: dashboard home, onboarding, insights, device transfer, share + SEO | New home, `/start`, `/me`, share links |

U5's WhatETF CSS-module conversion and `.v-<tool>` wrapper removal move to PR 2 (they are visual and belong behind U2/U6's new baselines); PR 1 does U5's `lib/` moves only.

**As built in PR 2 (2026-11-25):**
- WhatETF's CSS modules are *kept*: on inspection they already read the shared `--color-*` / `--font-*` tokens (170+ references, no hard-coded colours bar `#fff`), so converting them would be churn with no consistency gain. `.v-drive` / `.v-insure` are removed (their only job, `min-height`, moved to `<main>`); `.v-etf` stays because it scopes WhatETF-only custom properties.
- R6's "TrustBadges once in the shell" is replaced: most badges are tool-specific product claims ("BSD/SSD auto-computed"), not trust lines. Only the pair every tool repeated ("Zero data collected", "Free, forever") is now defined once (`TRUST_COMMON` in `ToolHero`).
- `ToolHero` ships two layouts (`center`, `left`), not three. InsureCheck and WhatETF keep their own distinct heroes, so there are four hero shapes across the seven tools.
**As built in PR 3 (2026-11-25):**
- OQ1 resolved as recommended: `/` shows the summary; `/ledger` is the **Plan** tab and keeps its URL.
- OQ2 measured: one fully filled profile (every tool, with saved form inputs and score history) compresses to a link of about 1,100 characters. Three fully filled profiles with different numbers will often exceed the 2,300-character QR budget (`QR_MAX_URL_CHARS`), in which case the link carries only the active profile and `/me` says to switch and repeat. Lightly filled stores fit all profiles in one QR.
- OQ3 resolved as recommended: CPF balances are optional fields with a "find these in the CPF app" hint.
- U10 shipped four rules. "Retirement-age impact of a planned car" was replaced by "living costs not yet counted": the profile has no "planned car" slot, and onboarding does not ask for one.
- U12 per-*result* OG images were scoped down to per-*tool* cards: TaxWise is a client page, so a result-specific image would need a server wrapper with `generateMetadata` reading the share params. Share links themselves ship for TaxWise; DriveReady and WhatETF already had URL state.
- R12's `FAQPage`/`HowTo` markup was not added: the site has no FAQ content, and inventing it for markup would misrepresent the pages. `TechArticle` + `BreadcrumbList` describe what the-math pages actually are.
- One new dependency: `qrcode-generator` (MIT, no dependencies) for the transfer QR code.
- The 375px two-row header is deferred: hiding the page title on phones helps, but DriveReady's header carries two links plus a live COE status that cannot fit one row.

## Implementation Units

### U1. Tool registry
- **Goal:** One source of truth for the tool list (R1).
- **Files:** `src/lib/shared/tools.js` (new), `src/app/page.js`, `src/components/shared/ShellHeader.js`, `src/components/shared/Footer.js`, `src/app/sitemap.js`, `src/app/ledger/page.js`, `src/lib/shared/site.js`.
- **Approach:** Move `TOOLS` out of `page.js`. Add `slot`, `mathRoute`, `disclaimerKey` and `order`. Have each listed file read from it. Add `getToolByPath(pathname)` for the header and footer.
- **Test scenarios:** the registry has 7 entries with unique ids and routes; every `route` and `mathRoute` gets a 200 in the Playwright smoke test; the sitemap includes every route; a test fails if a shell file contains a hard-coded `'/drive'`-style literal.

### U2. Shared input kit
- **Goal:** One implementation of each form primitive (R2).
- **Files:** `src/components/shared/inputs/*` (new), the five `components/<tool>/ui.js`, `app/drive/renew-or-replace/page.js`, and the callers in `app/<tool>/page.js`.
- **Approach:** Take the superset API of the five copies (house's `MoneyInput` with k/m parsing via U3's `parseMoney`, plus `OverrideField`). Migrate one tool per commit, deleting that tool's copy as you go. Keep the existing aria and touch-target fixes from PR #11 and the remove-button touch target from the 2026-09-30 backlog item.
- **Test scenarios:** the keyboard e2e still passes; visual diffs stay within tolerance per tool; unit tests cover `parseMoney` for "80k", "1.2m", "" (→ null) and "0" (→ 0).

### U3. Money and loan primitives
- **Goal:** One finance core (R3).
- **Files:** `src/lib/shared/money.js`, `src/lib/shared/loan.js` (new); `lib/{house,ledger,retire,drive}/calc.js`; `lib/drive/theme.js`, `lib/house/theme.js` (parsers moved out); `app/drive/**` local `fmtSGD`; `app/insure/check/page.js` `fmtAmount`.
- **Approach:** KTD1. Write `loan.js`, prove it matches all three existing implementations on a grid, swap the callers in, then delete the old code.
- **Test scenarios:** agreement to the cent on a P×r×n grid, plus r=0 edge cases; golden masters unchanged.

### U4. Declarative profile store (v7)
- **Goal:** Replace the 13 hand-written save/clear functions; bring insure history into the store (R4).
- **Files:** `src/lib/shared/profile.js`, `profile.test.js`, `lib/insure/scoreHistory.js`, `lib/insure/recheckReminder.js`.
- **Approach:** `MODULE_SCHEMA` + `saveModule` / `clearModule`. Old exports become wrappers marked `@deprecated`. `migrateV6` adds `insureHistory`; `loadStore` moves `iga_score_history:<profileId>` (and the unscoped pre-profiles key, to the active profile) into it, deleting an old key only after the store write succeeds.
- **Test scenarios:** all existing `profile.test.js` cases pass; v6→v7 migration with and without legacy history; export→import round-trip includes history; a failed localStorage write leaves the old key intact.

### U5. Canonical module layout
- **Goal:** Every vertical has the same shape (R5).
- **Files:** `lib/insure/engine/scorer.js` → `lib/insure/calc.js`; `lib/etf/logic.js` → `lib/etf/calc.js`; `lib/flow/*` → `lib/ledger/capacity/*`; delete `lib/{house,ledger,retire,tax}/theme.js` re-export shims; `lib/shared/themeMode.js` imports; `app/*/layout.js` `.v-<tool>` wrappers; `app/etf/**/*.module.css`; `docs/architecture.md`.
- **Approach:** Use `git mv` to keep history, then fix imports. Convert the WhatETF CSS modules to shared tokens one page at a time, behind the visual baseline.
- **Test scenarios:** all unit tests pass after the path updates; `/etf/*` visual diffs within tolerance; `rg "lib/flow" src` returns nothing.

### U6. Page templates
- **Goal:** Retire the copy-pasted hero and badge row (R6).
- **Files:** `src/components/shared/ToolLanding.js` (new), `ResultHero.js`, `TrustBadges.js`, `app/<tool>/page.js` ×7, `docs/backlog.md` (close the taste items).
- **Approach:** Three hero shapes (*question-led*, *number-led*, *split with preview*), each assigned in the registry. Trust messaging moves into the shell footer once.
- **Test scenarios:** smoke test confirms each landing page renders its heading; new visual baselines, generated on CI, for the reshaped pages.

### U7. App-wide PWA + mobile navigation
- **Goal:** Installable and offline everywhere; app-like navigation on phones (R10).
- **Files:** `public/sw.js`, `src/app/manifest.js` (new, root), delete `app/etf/manifest.webmanifest`, `components/etf/SWRegister.js` → `components/shared/SWRegister.js` in the root layout, `components/shared/TabBar.js` (new), `ShellHeader.js`, `public/icons/*.png`.
- **Approach:** KTD5. The tab bar is driven by the registry, appears below 640px, respects the safe-area inset, and hides the header tool switcher on mobile. Also fixes the DriveReady 375px header-wrap item in the backlog.
- **Test scenarios:** Playwright offline mode (`context.setOffline(true)`) reloads `/tax` and computes; installability check; tab bar keyboard path; 375px visual baselines.

### U8. Dashboard home
- **Goal:** `/` shows the user's money (R7).
- **Files:** `src/app/page.js`, `components/shared/dashboard/*` (new tiles), `lib/ledger/calc.js` (expose a `summarise(profile)` entry point), `lib/shared/freshness.js`, and `/ledger` as the "Plan" tab per OQ1.
- **Approach:** KTD4. Tiles come from `summarise()`, and empty modules show "Add · 2 min". The empty state keeps the tool grid (now from the registry) plus the onboarding CTA.
- **Test scenarios:** empty profile shows the empty state; a seeded profile shows the correct figures (checked against `/ledger`'s numbers for the same fixture); a profile switch updates tiles without a reload; no hydration warnings.

### U9. One-pass onboarding
- **Goal:** Fill every tool in one short flow (R8).
- **Files:** `src/app/start/page.js` (new), `components/shared/onboarding/*`, `lib/shared/onboarding.js` (pure mapper from answers to `MODULE_SCHEMA` slots).
- **Approach:** 6 steps, each skippable, using the U2 kit. The mapper uses the tax and retire engines to derive take-home pay and CPF split. On finish, go to `/`.
- **Test scenarios:** mapper unit tests per answer combination; e2e completing onboarding then opening `/tax` and `/drive` shows pre-filled values; skipping everything leaves the profile empty.

### U10. Cross-tool insights
- **Goal:** Surface the value of combining tools (R9).
- **Files:** `lib/shared/insights.js` (new, pure), `components/shared/dashboard/InsightCard.js` (reuse `components/insure/InsightCard.jsx` styling), `docs/statutory-sources.md` if a new constant appears.
- **Approach:** Rules are `{ id, applies(profile), compute(profile) → { fact, value, mathHref }, priority }`. Start with 4 rules: TDSR headroom, SRS tax saving, insurance re-check due, and retirement-age impact of a planned car. KD3 wording.
- **Test scenarios:** each rule has applies/does-not-apply fixtures; values match the source engine; a copy test fails on "you should" / "buy" / product names.

### U11. Local-only device transfer
- **Goal:** Move numbers between devices without a server (R11).
- **Files:** `src/app/me/page.js` (new; profile switcher, export/import, transfer), `lib/shared/transfer.js` (new), `src/app/import/page.js` (reads `location.hash`).
- **Approach:** KTD6; OQ2 decides between all profiles and the active one only. Show a confirm screen before an import overwrites anything. The backup nudge appears after N saves since the last export.
- **Test scenarios:** encode→decode round-trip; corrupted fragment shows an error with no write; e2e opens the generated URL in a fresh context and finds the profile restored; the request log shows the fragment never reached the server.

### U12. Shareable results + SEO
- **Goal:** Results that spread, and pages that rank (R12).
- **Files:** `app/<tool>/share/opengraph-image.js` (or one generic `app/og/[tool]/route.js`), a share button in `ResultHero.js`, JSON-LD in `app/<tool>/the-math/page.js`, `lib/shared/share.js`.
- **Approach:** KTD7. The share URL holds only the inputs needed to reproduce the headline number, and opening it pre-fills the tool *without* saving to the profile.
- **Test scenarios:** no profile key appears in any share URL; the OG route renders for each tool; JSON-LD validates (structure test).

### Verification

Each PR: `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`. Visual baselines are regenerated only through the CI `workflow_dispatch`. At the end of Phase A, confirm `docs/architecture.md` and `README.md` describe the registry, input kit, store v7 and canonical layout. At the end of Phase B, update the README's "seven tools" framing to the dashboard + modules model.
