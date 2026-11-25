import { test, expect } from '@playwright/test'

// Super-app plan PR 3: dashboard home (U8), onboarding (U9), insights
// (U10), device transfer (U11) and share links (U12).

async function fillStep(page, fields) {
  for (const [label, value] of Object.entries(fields)) {
    await page.getByLabel(label, { exact: true }).fill(value)
  }
}

test('a new visitor sees the setup card and the tools, not empty tiles', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'See your whole picture in one place' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Set up my numbers/ })).toHaveAttribute('href', '/start')
  await expect(page.locator('a.home-tool-card')).toHaveCount(7)
  await expect(page.getByRole('heading', { name: /^Your money/ })).toHaveCount(0)
})

test('onboarding fills the dashboard and pre-fills the tools', async ({ page }) => {
  await page.goto('/start')
  await expect(page.getByText('Step 1 of 6')).toBeVisible()
  await fillStep(page, { Age: '34' })
  await page.getByRole('button', { name: 'Next' }).click()
  await fillStep(page, { 'Monthly gross salary': '8000' })
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Skip' }).click() // CPF
  await page.getByRole('button', { name: 'HDB' }).click()
  await fillStep(page, { 'What it would sell for today': '650000', 'Loan still outstanding': '300000', 'Monthly instalment (optional)': '1400' })
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Skip' }).click() // car
  await fillStep(page, { 'Invested today (stocks, ETFs, funds)': '40000' })
  await page.getByRole('button', { name: 'Save and see my picture' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: /^Your money/ })).toBeVisible()
  const tiles = page.locator('.dash-tiles')
  // 350k home equity + 40k invested
  await expect(tiles.getByRole('link', { name: /Net worth\s*S\$390,000/ })).toBeVisible()
  await expect(tiles.getByRole('link', { name: /Debt servicing \(TDSR\)\s*17\.5%/ })).toBeVisible()
  await expect(tiles.getByRole('link', { name: /Income tax this year/ })).toContainText('S$')
  // Insights: TDSR headroom, SRS per S$1,000, living costs not counted.
  await expect(page.getByLabel('What your numbers say').locator('.dash-insight')).toHaveCount(3)
  await expect(page.getByText(/S\$3,000\/mo of TDSR room left/)).toBeVisible()

  await page.goto('/tax')
  await expect(page.getByLabel('Age', { exact: true })).toHaveValue('34')
  await expect(page.getByLabel('Monthly salary', { exact: true })).toHaveValue('8000')
})

test('a TaxWise share link opens view-only and does not touch the visitor\'s profile', async ({ page }) => {
  await page.goto('/tax?shared=1&a=40&s=12000')
  await expect(page.getByText(/viewing numbers someone shared/)).toBeVisible()
  await expect(page.getByLabel('Monthly salary', { exact: true })).toHaveValue('12000')
  const stored = await page.evaluate(() => window.localStorage.getItem('ndtm_my_numbers_v1'))
  const tax = stored ? JSON.parse(stored).profiles[0].data.tax : null
  expect(tax?.inputs ?? null).toBeNull()
  expect(tax?.annualTax ?? null).toBeNull()

  await page.getByRole('button', { name: 'Keep these as mine' }).click()
  await expect(page).toHaveURL(/\/tax$/)
  await expect.poll(async () => page.evaluate(() => JSON.parse(window.localStorage.getItem('ndtm_my_numbers_v1')).profiles[0].data.tax?.inputs?.monthlySalary)).toBe('12000')
})

test('Send to my phone: the link restores the numbers on another device, and the payload never reaches the server', async ({ page, browser }) => {
  await page.goto('/start')
  await page.getByRole('button', { name: 'Next' }).click()
  await fillStep(page, { 'Monthly gross salary': '9100' })
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Save and see my picture' }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.goto('/me')
  await page.getByRole('button', { name: 'Make a transfer link' }).click()
  await expect(page.getByRole('img', { name: 'QR code for the transfer link' })).toBeVisible()
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy link' }).click()
  const url = await page.evaluate(() => navigator.clipboard.readText())
  expect(url).toMatch(/\/import#v1\./)

  const phone = await browser.newContext()
  const p2 = await phone.newPage()
  const requested = []
  p2.on('request', (r) => requested.push(r.url()))
  await p2.goto(url)
  await expect(p2.getByText('This link carries:')).toBeVisible()
  await expect(p2).toHaveURL(/\/import$/) // fragment cleared from the address bar
  await p2.getByRole('button', { name: 'Replace and import' }).click()
  await expect(p2).toHaveURL(/\/$/)
  await expect(p2.getByRole('heading', { name: /^Your money/ })).toBeVisible()
  const payload = url.split('#')[1]
  expect(requested.some((u) => u.includes(payload.slice(3, 40)))).toBe(false)
  await phone.close()
})

test('a damaged transfer link is refused without changing anything', async ({ page }) => {
  await page.goto('/import#v1.not-a-real-payload')
  await expect(page.locator('.me-msg--error')).toContainText(/damaged or incomplete/)
})

test('tool pages carry JSON-LD and a share-preview image', async ({ page, request }) => {
  await page.goto('/tax/the-math')
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(ld.join(' ')).toContain('"TechArticle"')
  const og = await page.locator('meta[property="og:image"]').first().getAttribute('content')
  expect(og).toBeTruthy()
  const img = await request.get(new URL(og).pathname)
  expect(img.status()).toBe(200)
  expect(img.headers()['content-type']).toContain('image/png')
})

test('privacy mode masks every figure on the dashboard and is remembered', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const now = Date.now()
    localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify({ schemaVersion: 1, activeProfileId: 'p1', profiles: [{ id: 'p1', name: 'Me', createdAt: 1, updatedAt: 2, data: { version: 7,
      house: { outstandingBalance: 400000, monthlyInstalment: 2000, propertyValue: 1200000, savedAt: now },
      retire: { salary: 10000, oaBalance: 120000, saBalance: 80000, maBalance: 50000, savedAt: now },
      tax: { annualTax: 6200, marginalRate: 11.5, monthlyTakeHome: 7600, savedAt: now } } }] }))
  })
  await page.reload()
  const dash = page.locator('section.dash')
  await expect(dash).toContainText('S$1,050,000')
  const toggle = page.getByRole('button', { name: 'Hide numbers' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  await toggle.click()
  await expect(page.getByRole('button', { name: 'Show numbers' })).toHaveAttribute('aria-pressed', 'true')
  await expect(dash).toContainText('Numbers hidden')
  // No amount, rate or score digit is left in the tiles or insights.
  // Public rules (the 55% TDSR limit, the S$15,300 SRS cap, "per S$1,000")
  // stay readable; nothing of the user's own is left.
  const raw = (await dash.locator('.dash-tiles, .dash-insights').allInnerTexts()).join(' ')
  const text = raw.replace(/55%|S\$15,300|S\$1,000(?![\d,])/g, '')
  expect(text).not.toMatch(/S\$\s?\d/)
  expect(text).not.toMatch(/\d+(\.\d+)?%/)
  expect(raw).toContain('S$••••••')
  expect(raw).toContain('Bank limit 55%')

  await page.reload()
  await expect(page.getByRole('button', { name: 'Show numbers' })).toBeVisible()
  await page.getByRole('button', { name: 'Show numbers' }).click()
  await expect(dash).toContainText('S$1,050,000')
})
