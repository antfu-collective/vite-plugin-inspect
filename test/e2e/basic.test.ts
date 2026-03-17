import { expect, test } from '@playwright/test'

const BASE = '/__inspect/'

test.beforeEach(async ({ page }) => {
  // Visit the playground app first to trigger module loading
  await page.goto('/')
  await page.waitForLoadState('networkidle')
})

test('page loads and shows module list', async ({ page }) => {
  await page.goto(BASE)
  // Module links point to #/module?id=...
  await expect(page.locator('a[href*="/module"]').first()).toBeVisible({ timeout: 15000 })
})

test('search box filters modules', async ({ page }) => {
  await page.goto(BASE)
  await expect(page.locator('a[href*="/module"]').first()).toBeVisible({ timeout: 15000 })

  const countBefore = await page.locator('a[href*="/module"]').count()

  const input = page.locator('input[placeholder="Search..."]')
  await input.fill('App.vue')
  await page.waitForTimeout(500)

  const countAfter = await page.locator('a[href*="/module"]').count()
  expect(countAfter).toBeLessThan(countBefore)
  expect(countAfter).toBeGreaterThan(0)
})

test('can navigate to metrics page', async ({ page }) => {
  await page.goto(BASE)
  await page.locator('[title="Metrics"]').click()
  await expect(page).toHaveURL(/#\/metric/)
})

test('can navigate to plugins page', async ({ page }) => {
  await page.goto(BASE)
  await page.locator('[title="Plugins"]').click()
  await expect(page).toHaveURL(/#\/plugins/)
})

test('can click a module to open the detail panel', async ({ page }) => {
  await page.goto(BASE)
  const firstModule = page.locator('a[href*="/module"]').first()
  await expect(firstModule).toBeVisible({ timeout: 15000 })
  await firstModule.click()
  await expect(page).toHaveURL(/#\/module\?/)
})
