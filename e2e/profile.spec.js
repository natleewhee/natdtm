import { test, expect } from '@playwright/test'

// Switching / creating / deleting a profile must not reload the page —
// profile.js broadcasts a change event and the tools re-read via
// ProfileScope + the useActiveProfile hook.

test('creating and switching a profile does not reload the page', async ({ page }) => {
  await page.goto('/tax')
  await expect(page.getByTitle('Switch profile')).toBeVisible()

  // A value on window survives an in-place update but not a reload.
  await page.evaluate(() => { window.__noReloadSentinel = 'here' })

  // Open the switcher and create a second profile.
  await page.getByTitle('Switch profile').click()
  await page.getByRole('button', { name: '+ New profile' }).click()
  await page.getByPlaceholder(/^Profile \d$/).fill('Test B')
  await page.getByRole('button', { name: 'Add', exact: true }).click()

  // The trigger now shows the new active profile, and the page never reloaded.
  await expect(page.getByTitle('Switch profile')).toContainText('Test B')
  expect(await page.evaluate(() => window.__noReloadSentinel)).toBe('here')
  expect(page.url()).toContain('/tax')

  // Switch back to the original profile — still no reload.
  await page.getByTitle('Switch profile').click()
  await page.getByRole('menuitemradio', { name: /my numbers/i }).click()
  await expect(page.getByTitle('Switch profile')).toContainText(/my numbers/i)
  expect(await page.evaluate(() => window.__noReloadSentinel)).toBe('here')
})
