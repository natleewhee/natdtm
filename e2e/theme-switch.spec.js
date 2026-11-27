import { test, expect } from '@playwright/test'

// Inline styles read the mutable `C` token object at render time, and
// ThemeBoot remounts the app on a mode switch so they re-read it. This
// guards that contract, which the React Compiler's memoization must not
// break: after switching, an inline-styled heading uses the light ink.
test('switching theme recolours inline-styled components', async ({ page }) => {
  await page.goto('/tax?shared=1&a=34&s=10000')
  const heading = page.getByRole('heading', { name: 'Put spare cash to work on this bill' })
  await expect(heading).toBeVisible()
  const before = await heading.evaluate((el) => getComputedStyle(el).color)

  await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).first().click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/)
  await expect.poll(async () => heading.evaluate((el) => getComputedStyle(el).color)).not.toBe(before)
})
