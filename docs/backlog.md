# Backlog

Informal running list of known issues and improvement ideas that came up
outside a formal plan (see `docs/plans/` for those). Not prioritized,
not scheduled — just things worth not forgetting. Move an item into a
proper plan doc when it's ready to be worked.

## UI/UX

Surfaced by a full audit of the rendered app (10 pages × light/dark ×
375/1440px) on 2026-09-08. The contrast, control-border, and
mode-reactive-token defects from that audit shipped in PR #11; these are
what's left.

- ~~**MyLedger is a single ~9,200px page of ~20 inputs.**~~ Resolved as a
  side effect of the FlowState-into-MyLedger plan (PRs #21-#22): the
  absorbed Capacity module is a collapsed-by-default section (F1/F2 in
  `docs/plans/2026-09-11-0225-feat-flowstate-into-ledger-plan.md`), which
  is exactly the "collapse-by-default with synced-value previews" option
  this item was waiting on a design decision for.
- ~~**Assumption-bundle table doesn't reflow on mobile.**~~ Fixed earlier: below 480px each bundle row stacks into its own card (`.ledger-bundle-row` in `globals.css`).
- ~~**Car names truncate in DriveReady's best-sellers list.**~~ Fixed in
  PR #17 (`-webkit-line-clamp: 2` instead of ellipsis truncation).
- ~~**~35 uses of 10-11px type in Drive and Flow.**~~ Fixed in the 2026-11-26 rates + mobile PR: 62 sub-12px HTML sizes in DriveReady and the Capacity module raised to the 12px floor (SVG chart text scales with its chart and is left as is).
- ~~**DriveReady's header wraps to two rows at 375px.**~~ Fixed in the 2026-11-26 rates + mobile PR: below 640px a page's links and status move to a scrollable sub-row (`.shell-header-subnav`), so the main header row stays one line.

## Design taste (taste-skill audit, 2026-09-09)

Ran the anti-slop checklist from
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) against
all 8 verticals' landing pages (rendered at 1440px, light + dark). Not
bugs — these are "reads as templated/generic" findings, all evidenced
against the actual source, not just the rubric's hard-ban list.

- ~~**The exact same hero shell is copy-pasted across 6 of 8 verticals.**~~ Fixed in PR #34: `ToolHero` (`center` / `left` layouts) replaces the pasted bands; InsureCheck and WhatETF keep their own heroes.
- ~~**A single shared `TrustBadges` component renders an identical 4-pill trust row under every hero**~~ Fixed in PR #34: each tool lists only its own claims; the shared 'Zero data collected / Free, forever' pair is `TRUST_COMMON`, defined once.
- ~~**Duplicate CTA copy template.**~~ Fixed in the 2026-11-26 design-polish PR: WhatETF's hero CTA is "Start the 3 questions", InsureCheck's is "Score my cover in 3 minutes".
- ~~**~380 visible em-dashes in rendered copy.**~~ Fixed in the 2026-11-26 design-polish PR: every em-dash in rendered copy (pages, components, `lib` message strings, metadata titles) was rewritten sentence by sentence. Brand titles use `·` as the separator. What's left is comments, the `OgCard` trim regex, lone `—` empty-value placeholders, and test names.
- ~~**`etf`'s "what you'll get" section is a literal 3-equal-column feature-card row.**~~ Fixed in the 2026-11-26 design-polish PR: replaced with a ruled "Why these funds" list (heading column plus three rows, each led by a figure: 15% / Monthly / $0).

Not flagged: no AI-purple gradients, no marquees, no Fraunces/Instrument
Serif — the Clay & Cream palette and Space Grotesk/Inter/JetBrains Mono
stack are genuinely distinctive, not defaults. The issue is structural
templating (hero/CTA/badge-row) and copy voice (em-dashes), not the
visual design system itself.

Fixing the hero/badge-row pattern means designing distinct anatomy per
vertical (or at least 2-3 hero shapes to rotate through) and is a real
design pass, not a quick edit — same caliber of change as MyLedger's
form restructure above. Fixing the em-dashes is mechanical but touches
copy voice across the whole site and shouldn't happen without a look at
the rewritten sentences.

## Impeccable critique (2026-09-10)

Ran the detector-rule categories from
[pbakaus/impeccable](https://github.com/pbakaus/impeccable) against the
same 8 verticals — the cleanest of the three reviews. Everything it
checks for (AI-slop markers, side-tab borders, nested cards, gray text
on colored backgrounds, skipped heading hierarchy, line length, cramped
padding, small touch targets) came back clean: either never present, or
already fixed by PR #11's touch-target work. One item, logged rather
than acted on:

- **Decided 2026-11-26: keep Inter.** Inter is named in Impeccable's own "overused font" list (with
  Arial and system defaults), and it's `nat does the math`'s body font
  in the Space Grotesk (display) / Inter (body) / JetBrains Mono
  (numerics) stack. Not treating this as a defect — it's a deliberate,
  well-executed choice (real variable font-face, not a fallback), and
  Impeccable's own bias runs toward its own house aesthetic rather than
  a universal rule. Swapping the body font would be a brand decision,
  not a bug fix — noted here only so it's not re-discovered as "new."

## From earlier code review (2026-09-06)

- `.github/workflows/refresh-data.yml` uses `gh pr merge --admin` to
  bypass branch protection on its own weekly auto-merge PRs. Deliberate
  and already documented at length in the file's own header (bot PRs
  never trigger `pull_request`-scoped CI, so a required check could
  never appear on them) — not a bug, but worth tightening later if
  GitHub adds a narrower bypass mechanism (e.g. an allowlist scoped just
  to this bot) than blanket admin override.

## Performance, maintainability & Capacity-module UX audit (2026-09-30)

Ran a fresh whole-app pass across three lenses at the user's request:
performance, code-quality/maintainability, and design/UX gaps the
earlier three audits (2026-09-08/09/10, above) couldn't have caught
because MyLedger's Capacity module (the FlowState-into-MyLedger merge,
PRs #21-#23) postdates all of them.

**Performance** — the calc-heavy paths already have the memoization an
audit would normally flag as missing: `/ledger`'s `recompute` is
debounced 150ms and keyed-cached (`src/app/ledger/page.js`), and
`Sankey.js`'s `buildLayout` is `useMemo`'d on `flow`. `loadMyNumbers()`
is called often across the codebase but only ever once per mount
effect, never per-render or per-keystroke. No confident, material
performance finding survived verification — noted here so this doesn't
get re-audited from scratch next time.

**Maintainability**

- ~~**Seven near-identical `save<Module>Numbers` functions in `src/lib/shared/profile.ts` (lines 395-536) duplicate the same read-merge-write skeleton.**~~ Fixed in PR #33: `MODULE_SCHEMA` + `saveModule` / `clearModule`; the old names remain as deprecated one-line wrappers.
- ~~**`src/app/drive/renew-or-replace/page.js` (511 lines) defines 9 local presentational components inline**~~ Mostly fixed in PR #34: its form fields (money inputs, sliders, brand selects) now come from `components/shared/inputs.js`. The page's own layout pieces (Card, Label, Hint, SectionTitle) remain local.

**Design/UX — Capacity module** (new since the last UI/UX audit, so
never checked for the same contrast/touch-target/mobile-reflow class of
defect that audit found and fixed elsewhere):

- ~~**The lumpy-items row uses a fixed 5-column grid with no mobile breakpoint**~~ Fixed earlier: below 480px each lumpy item stacks into its own card (`.ledger-lumpy-row` in `globals.css`).
- ~~**The lumpy-item remove button is under the touch-target floor.**~~ Fixed earlier: the remove button is now 44×44px (`minWidth`/`minHeight: 44`).

No other Capacity-module regression found: contrast pairings all route
through the shared `C.*` tokens the light/dark audit already covers,
every other grid in the module uses the safe `auto-fit` pattern, and the
collapsed-section toggle on `/ledger` doesn't introduce a new
interactive pattern outside what PR #11 already audited.

## Rates accuracy follow-ups (2026-10-18)

All items below were verified against CPF Board and LTA sources and fixed
on 2026-11-26; see `docs/statutory-sources.md` "Resolved discrepancies".

Found while fixing PARF, EEAI, the 55–65 CPF rates and the SRS age (see
`docs/statutory-sources.md` "Resolved discrepancies"). These rest on
third-party calculators whose figures reconcile arithmetically with CPF's
published totals, not on the CPF Board allocation PDF itself (`cpf.gov.sg`
wasn't reachable from the session), so verify against the official table
before changing a value. Once verified, a wrong value belongs under *Open
discrepancies* in the register, which fails CI until it is fixed.

- ~~**`CPF_CONTRIBUTION_TABLE` has one "0–55" band using the under-35 split (OA 23 / SA 6 / MA 8).**~~ Fixed in the 2026-11-26 rates + mobile PR: verified against CPF Board's allocation table and split into ≤35 / 35–45 / 45–50 / 50–55 in `CPF_RATE_SCHEDULE`.
- ~~**The 65–70 band allocates OA 3.5 / SA 2.5 / MA 10.5.**~~ Fixed in the 2026-11-26 rates + mobile PR: now OA 1 / RA 5 / MA 10.5.
- ~~**CPF senior-worker rates step up again on 1 Jan 2027**~~ Fixed in the 2026-11-26 rates + mobile PR: `CPF_RATE_SCHEDULE` is date-aware and holds the 2027 rates, which apply automatically. The same PR also corrected TaxWise's 55–65 employee shares (were the 2025 rates).
- ~~**EEAI cap for older EVs.**~~ Fixed in the 2026-11-26 rates + mobile PR: `EEAI_CAPS` by registration date (S$20k 2021–23, S$15k 2024–25, S$7.5k 2026).
- ~~**VES bands were revised for 2026–27 (hybrids lose rebates, only EVs get them).**~~ Fixed in the 2026-11-26 rates + mobile PR: verified against OneMotoring; `VES_SCHEDULE` holds 2026 and 2027 amounts by date, VES is derived from each car's band, and seven C2/C3 cars with stale surcharges were corrected.
