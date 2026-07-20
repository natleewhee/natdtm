# coah

A single Next.js app consolidating three previously-separate Singapore
financial-decision calculators — **InsureCheck** (`/insure`), **DriveReady**
(`/drive`), and **WhatETF** (`/etf`) — under one shell, one domain, and one
shared "Ledger" design system.

This is the **Stage 1–2 MVP** of the consolidation: each tool's internal
calculator logic and UI is ported as-is (lift-and-shift), wrapped in a new
shared shell (nav, footer, home page, typography) built around a calm,
statement-like design language. Reskinning each tool's *internals* to match
is later-stage work — see "Known gaps" below.

## Structure

```
src/app/
  layout.js, page.js, globals.css   — the coah shell: nav, footer, home page,
                                       Ledger design tokens (self-hosted
                                       Fraunces/IBM Plex fonts)
  insure/                           — InsureCheck, ported from sginsurecheck
  drive/                            — DriveReady, ported from sgdriveready
                                       (the only vertical with a live backend:
                                       /drive/api/cars, /drive/api/coe)
  etf/                              — WhatETF, ported from sgwhatetf
src/components/{shared,insure,drive,etf}/
src/lib/{shared,insure,drive,etf}/
src/styles/legacy-brand.css         — the navy/teal token set InsureCheck and
                                       DriveReady already shared before this
                                       merge, scoped to .v-insure/.v-drive
```

Each vertical's route tree is wrapped in a `.v-insure` / `.v-drive` / `.v-etf`
container div (see each vertical's `layout.js`). That's what lets three
different legacy token systems — including WhatETF's completely different
dark "Arcade Quest" palette, which reuses the *same* CSS variable names with
different values — coexist in one build without colliding. See the comments
in `src/app/etf/legacy.css` for the specifics.

## What changed from the three source repos

- **Routing**: everything is namespaced (`/check` → `/insure/check`,
  `/coe-explained` → `/drive/coe-explained`, `/preferences` →
  `/etf/preferences`, etc). All internal links, `router.push` calls, and the
  WhatETF service worker's cached-shell URL list were updated to match.
- **Cross-app links**: the "more tools from Coah" sections that already
  existed in all three source apps (linking out to each other's `.vercel.app`
  domains) now link to the internal `/insure`, `/drive`, `/etf` paths instead.
- **Fonts**: no more third-party font CDN (`api.fontshare.com`) — the shell's
  Fraunces/IBM Plex fonts are self-hosted from `public/fonts/`, and
  `next/font/google` (which self-hosts at build time) covers DM Sans/DM Serif
  Display for insure/drive, same as before.
- **Tailwind**: dropped. Auditing InsureCheck (the only app with it
  configured) found no actual Tailwind utility classes in use — everything
  is inline `style={{}}`, same as the other two apps — so the dependency and
  `@tailwind` directives were dead weight.
- **`next.config.mjs`**: merged into one config using the strictest CSP of
  the three (self-only — no external font/style allowances needed anymore)
  and WhatETF's build-version-stamping pattern, now applied site-wide.
- **DriveReady's data pipeline is untouched in shape**: `scripts/refresh-cars.mjs`,
  `scripts/refresh-coe-history.mjs`, and `.github/workflows/refresh-data.yml`
  still open a PR against `public/data/*.json` rather than writing scraped
  data straight to prod — ported as-is, just pointed at the new `lib/drive/`
  path for its imports.
- **WhatETF's service worker** is now explicitly scoped to `/etf/`
  (`register('/sw.js', { scope: '/etf/' })`) so it can never intercept
  navigation for Insure/Drive or the shell.

## Known gaps (deliberately out of scope for this MVP)

- **Visual reskin**: only the shell (nav/footer/home) uses the new Ledger
  design system. Each vertical still looks like its old self internally.
  Stage 2.5+ work if/when that's wanted.
- **Version drift**: Next.js and React versions are now reconciled
  (16.2.1 / 19.2.3 across the board), but React Compiler (only enabled in
  the old InsureCheck) was **not** turned on repo-wide yet — flagged as a
  risk to verify carefully before enabling across all three verticals' worth
  of components at once.
- **Lint debt inherited from WhatETF**: `npm run lint` has 7 pre-existing
  `react-hooks/set-state-in-effect` / immutability findings in the ported
  ETF pages (state set synchronously inside `useEffect`). These predate the
  merge and weren't touched, since fixing them risks changing portfolio
  calculation behavior without dedicated testing — left as-is intentionally.
- **PNG manifest icons**: WhatETF's own backlog already flagged that its PWA
  manifest is SVG-icon-only, which iOS wants as PNG for home-screen install
  polish. Unchanged by this merge.
- **`LTA_API_KEY`**: not configured in this environment, so `/drive/api/coe`
  correctly 500s (that's the source app's own intentional behavior when the
  key is missing — the calculator page itself still works off
  `COE_FALLBACK` constants).

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run lint     # eslint
npm test         # unit tests (node --test)
```

Copy `.env.example`-style config for `LTA_API_KEY` (from
[LTA DataMall](https://datamall.lta.gov.sg/)) to enable live COE premiums
under `/drive`; without it, DriveReady falls back to hardcoded constants.
