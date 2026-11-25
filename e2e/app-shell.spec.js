import { test, expect } from '@playwright/test'

// Super-app plan U7: the whole site installs and works offline, and phones
// get a bottom tab bar instead of the header's tool switcher.

test('/sw.js is served site-wide and lists every tool page from the registry', async ({ request }) => {
  const res = await request.get('/sw.js')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('javascript')
  const body = await res.text()
  for (const route of ['/', '/insure', '/drive', '/etf', '/house', '/retire', '/tax', '/ledger', '/tax/the-math']) {
    expect(body).toContain(`"${route}"`)
  }
  expect(body).toContain("CACHE_NAME = 'ndtm-v2'")
})

test('the root manifest makes the whole site installable', async ({ page, request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.status()).toBe(200)
  const m = await res.json()
  expect(m.start_url).toBe('/')
  expect(m.scope).toBe('/')
  expect(m.display).toBe('standalone')
  const sizes = m.icons.filter((i) => i.type === 'image/png').map((i) => i.sizes)
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
  expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true)
  for (const icon of m.icons) {
    expect((await request.get(icon.src)).status(), icon.src).toBe(200)
  }
  await page.goto('/drive')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest')
})

test.describe('phone layout', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true })

  test('tab bar replaces the header switcher and the Tools sheet navigates', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'App' })
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')

    await nav.getByRole('button', { name: 'Tools' }).click()
    const sheet = page.getByRole('dialog', { name: 'All tools' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('link', { name: /TaxWise/ }).click()
    await expect(page).toHaveURL(/\/tax$/)
    await expect(sheet).toBeHidden()

    // On a tool page, the Tools tab names the tool and the header switcher is hidden.
    await expect(nav.getByRole('button', { name: 'Tax' })).toBeVisible()
    await expect(page.locator('.shell-tool-switcher')).toBeHidden()
    // …but the profile switcher (same base class) stays reachable.
    await expect(page.locator('.shell-profile-btn')).toBeVisible()

    await nav.getByRole('link', { name: 'Plan' }).click()
    await expect(page).toHaveURL(/\/ledger$/)
    await expect(nav.getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'page')
  })

  test('Escape closes the Tools sheet and returns focus to the tab', async ({ page }) => {
    await page.goto('/drive')
    const toolsTab = page.getByRole('navigation', { name: 'App' }).getByRole('button', { name: 'Drive' })
    await toolsTab.click()
    await expect(page.getByRole('dialog', { name: 'All tools' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'All tools' })).toBeHidden()
    await expect(toolsTab).toBeFocused()
  })
})

test('desktop keeps the header switcher and shows no tab bar', async ({ page }) => {
  await page.goto('/drive')
  await expect(page.locator('.shell-tool-switcher')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'App' })).toBeHidden()
})

test('a tool page still renders and computes offline once the worker is installed', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // Visit the page online once so it is in the cache, then go offline.
  await page.goto('/tax')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: /owe IRAS/ })).toBeVisible()
  await context.setOffline(false)
})
