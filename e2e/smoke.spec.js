import { test, expect } from '@playwright/test'

// Every tool and its "the math" page renders without error. Covers R5.

const TOOLS = ['insure', 'drive', 'etf', 'house', 'retire', 'tax', 'ledger', 'flow']

// Fail a page check if the browser logs an uncaught error or a React
// error while the page loads — a 200 with a broken client component
// otherwise passes silently.
function trackPageErrors(page) {
  const errors = []
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return errors
}

test('home page renders all eight tool cards', async ({ page }) => {
  const errors = trackPageErrors(page)
  const res = await page.goto('/')
  expect(res?.status(), 'GET / status').toBe(200)

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  for (const tool of TOOLS) {
    await expect(
      page.locator(`a[href="/${tool}"]`),
      `home card link to /${tool}`,
    ).toBeVisible()
  }

  expect(errors, 'browser errors on /').toEqual([])
})

for (const tool of TOOLS) {
  test(`/${tool} landing renders`, async ({ page }) => {
    const errors = trackPageErrors(page)
    const res = await page.goto(`/${tool}`)
    expect(res?.status(), `GET /${tool} status`).toBe(200)
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page).toHaveTitle(/\S/)
    expect(errors, `browser errors on /${tool}`).toEqual([])
  })

  test(`/${tool}/the-math renders`, async ({ page }) => {
    const errors = trackPageErrors(page)
    const res = await page.goto(`/${tool}/the-math`)
    expect(res?.status(), `GET /${tool}/the-math status`).toBe(200)
    await expect(page.getByRole('heading').first()).toBeVisible()
    expect(errors, `browser errors on /${tool}/the-math`).toEqual([])
  })
}
