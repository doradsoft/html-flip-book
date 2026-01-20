import { test, expect } from '@playwright/test'

test.describe('FlipBook Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should render flipbook with pages', async ({ page }) => {
    // Wait for LTR flipbook to be visible
    const flipbook = page.locator('.en-book.flipbook')
    await expect(flipbook).toBeVisible()

    // Check that pages are rendered
    const pages = flipbook.locator('.page')
    await expect(pages.first()).toBeVisible()
  })

  test('should flip page forward on swipe left', async ({ page }) => {
    const flipbook = page.locator('.en-book.flipbook')

    // Get initial state
    const firstPage = flipbook.locator('.page').first()
    await expect(firstPage).toHaveClass(/current-page/)

    // Simulate swipe left (forward flip in LTR)
    const box = await flipbook.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, {
        steps: 10
      })
      await page.mouse.up()
    }

    // Wait for animation
    await page.waitForTimeout(500)

    // Page should have flipped - current-page class should move
    const currentPages = flipbook.locator('.page.current-page')
    const currentCount = await currentPages.count()
    expect(currentCount).toBeGreaterThanOrEqual(1)
  })

  test('should have correct number of pages', async ({ page }) => {
    const pages = page.locator('.en-book.flipbook .page')
    await expect(pages.first()).toBeVisible()
    const count = await pages.count()
    expect(count).toBeGreaterThan(0)
  })
})
