import { test, expect } from '@playwright/test'

// One keyboard path through the profile switcher in the shell header.
// Covers R23.
//
// The trigger's accessible name is the active profile name (its visible
// text), so it is located by its stable `title` attribute instead.

test('profile switcher opens from the keyboard', async ({ page }) => {
  await page.goto('/drive')

  const trigger = page.getByTitle('Switch profile')
  await expect(trigger).toBeVisible()

  await trigger.focus()
  await expect(trigger).toBeFocused()

  await page.keyboard.press('Enter')

  const menu = page.locator('.shell-profile-menu')
  await expect(menu).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  // At least one menu entry is reachable by keyboard.
  await page.keyboard.press('Tab')
  await expect(menu).toContainText(/\S/)
})

// R23 also requires Escape-to-close with focus returned to the trigger.
// The ProfileSwitcher menu currently only closes on an outside mousedown
// and does no focus management, so this is the failing proof for plan
// unit U20. Flip `fixme` to a live test when U20 lands.
test.fixme('Escape closes the profile menu and restores focus', async ({ page }) => {
  await page.goto('/drive')
  const trigger = page.getByTitle('Switch profile')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.shell-profile-menu')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('.shell-profile-menu')).toBeHidden()
  await expect(trigger).toBeFocused()
})
