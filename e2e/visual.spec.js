import { test, expect } from '@playwright/test'

// Screenshot baselines for the brand rename (U2) and the CSS/theme
// consolidation (U18) — both must produce no rendered change. The
// footer build-version stamp is masked because it is regenerated on
// every build.
//
// Run with `npm run test:e2e:visual`. Excluded from the default
// `npm run test:e2e` run (see playwright.config.js): baselines are
// font-rendering sensitive, so U18 owns generating and pinning them on
// the CI runner image. First local run: `npm run test:e2e:visual -- --update-snapshots`.

const PAGES = ['/', '/drive', '/drive/the-math', '/etf', '/tax', '/insure', '/ledger']

for (const path of PAGES) {
  test(`visual: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveScreenshot(`${path.replace(/\//g, '_') || '_home'}.png`, {
      fullPage: true,
      mask: [page.locator('.shell-footer-version')],
      animations: 'disabled',
    })
  })
}
