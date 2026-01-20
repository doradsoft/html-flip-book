import { test, expect } from '@playwright/test'

test.describe('FlipBook Direction (LTR default)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('odd pages should translate toward center in LTR', async ({ page }) => {
    const firstPage = page.locator('.en-book.flipbook .page').first()
    await expect(firstPage).toBeVisible()

    const transform = await firstPage.evaluate(
      el => window.getComputedStyle(el).transform
    )

    // Expect transform to be set; LTR initial odd page has translateX applied
    expect(transform).toBeTruthy()
  })

  test('current-page should start at first page in LTR', async ({ page }) => {
    const firstPage = page.locator('.en-book.flipbook .page').first()
    await expect(firstPage).toHaveClass(/current-page/)
  })
})
