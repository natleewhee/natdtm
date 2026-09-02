import { test, expect } from '@playwright/test'

// The rebuilt /ledger scenario planner (plan U8). Build a path with two
// moves, see a band + a verdict, reload and confirm the moves persisted,
// and confirm a profile switch does not full-reload the page.

function trackPageErrors(page) {
  const errors = []
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  return errors
}

async function fillAssumptions(page) {
  await page.locator('#a-age').fill('40')
  await page.locator('#a-retire').fill('65')
  await page.locator('#a-life').fill('90')
  await page.locator('#a-salary').fill('8000')
  await page.locator('#pos-cash').fill('200000')
  await page.locator('#pos-inv').fill('300000')
  await page.locator('#a-ref').fill('4000')
}

test('build a two-move path, see a band and a verdict, and it persists across a reload', async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.goto('/ledger')

  await expect(page.getByText('Your current position')).toBeVisible()
  await fillAssumptions(page)
  // A current-position entry that should feed the projection.
  await page.locator('#pos-pv').fill('1000000')
  await page.locator('#pos-mb').fill('300000')

  // Add a what-if path.
  await page.getByRole('button', { name: '+ Add a what-if path' }).click()
  const column = page.locator('div', { hasText: 'Scenario A' }).last()

  // Add a cash-to-investments move.
  await page.getByRole('button', { name: '+ Add a move' }).click()
  await page.getByRole('button', { name: 'Move cash' }).click()
  await page.locator('input[id$="-amt"]').last().fill('120000')

  // Add a car move.
  await page.getByRole('button', { name: '+ Add a move' }).click()
  await page.getByRole('button', { name: 'Buy / change a car' }).click()

  // The comparison shows a three-number band and a verdict chip.
  await expect(page.getByText('Side by side')).toBeVisible()
  await expect(page.getByText('Sustainable monthly withdrawal')).toBeVisible()
  const money = page.getByText(/^S\$[\d,]+$/)
  await expect(money.first()).toBeVisible()
  await expect(
    page.getByText(/Comfortably enough|Tight|Short|Set a monthly spend/).first(),
  ).toBeVisible()

  // Reload — the moves are still there (persisted to the profile).
  await page.reload()
  await expect(page.getByText(/Restored the scenarios and assumptions/)).toBeVisible()
  await expect(page.getByText('Move cash', { exact: false }).first()).toBeVisible()
  await expect(page.locator('input[id$="-amt"]').last()).toHaveValue('120000')
  await expect(page.locator('#pos-pv')).toHaveValue('1000000') // current position persisted too

  expect(errors, 'browser errors on /ledger').toEqual([])
})

test('a profile switch on /ledger does not full-reload the page', async ({ page }) => {
  await page.goto('/ledger')
  await page.evaluate(() => { window.__noReloadSentinel = 'here' })

  await page.getByTitle('Switch profile').click()
  await page.getByRole('button', { name: '+ New profile' }).click()
  await page.getByPlaceholder(/^Profile \d$/).fill('Ledger B')
  await page.getByRole('button', { name: 'Add', exact: true }).click()

  await expect(page.getByTitle('Switch profile')).toContainText('Ledger B')
  expect(await page.evaluate(() => window.__noReloadSentinel)).toBe('here')
  expect(page.url()).toContain('/ledger')
})
