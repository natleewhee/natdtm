import { test, expect } from '@playwright/test'

test('the reliefs optimiser fills SRS then CPF and flips order by priority', async ({ page }) => {
  await page.goto('/tax?shared=1&a=34&s=10000')
  const opt = page.getByRole('region', { name: 'Put spare cash to work on this bill' })
  await expect(opt).toBeVisible()

  await opt.getByLabel('Cash you could set aside').fill('20000')
  await expect(opt.getByText(/off this year's tax, from S\$20,000 set aside/)).toBeVisible()
  await expect(opt.getByText('1. SRS contribution')).toBeVisible()
  await expect(opt.getByText('2. CPF top-up to your MediSave')).toBeVisible()
  await expect(opt.getByText(/tax put off, not tax removed/)).toBeVisible()

  await opt.getByRole('button', { name: 'Never taxed later' }).click()
  await expect(opt.getByText('1. CPF top-up to your MediSave')).toBeVisible()
  await expect(opt.getByText('2. SRS contribution')).toBeVisible()
})
