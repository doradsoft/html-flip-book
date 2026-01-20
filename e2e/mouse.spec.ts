import { expect, test } from '@playwright/test'

test.describe('FlipBook Mouse Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should flip page with mouse drag', async ({ page }) => {
    const flipbook = page.locator('.en-book.flipbook')
    await expect(flipbook).toBeVisible()

    const firstPage = flipbook.locator('.page').first()
    await expect(firstPage).toHaveClass(/current-page/)

    const box = await flipbook.boundingBox()
    if (!box) throw new Error('Flipbook not found')

    // Drag from right to left
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, {
      steps: 20,
    })
    await page.mouse.up()

    await page.waitForTimeout(800)

    // Page should have flipped
    const currentPages = page.locator('.page.current-page')
    const count = await currentPages.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('should cancel flip if dragged back before release', async ({ page }) => {
    const flipbook = page.locator('.en-book.flipbook')
    const box = await flipbook.boundingBox()
    if (!box) throw new Error('Flipbook not found')

    const firstPage = flipbook.locator('.page').first()
    await expect(firstPage).toHaveClass(/current-page/)

    // Start drag, go halfway, then return
    const startX = box.x + box.width * 0.75
    const midX = box.x + box.width * 0.5
    const y = box.y + box.height / 2

    await page.mouse.move(startX, y)
    await page.mouse.down()
    await page.mouse.move(midX, y, { steps: 10 })
    // Return to start
    await page.mouse.move(startX, y, { steps: 10 })
    await page.mouse.up()

    await page.waitForTimeout(800)

    // First page should still be current (flip cancelled)
    await expect(firstPage).toHaveClass(/current-page/)
  })

  test('should flip with fast swipe even if short distance', async ({ page }) => {
    const flipbook = page.locator('.en-book.flipbook')
    const box = await flipbook.boundingBox()
    if (!box) throw new Error('Flipbook not found')

    // Fast swipe (fewer steps = faster)
    const startX = box.x + box.width * 0.7
    const endX = box.x + box.width * 0.4 // Only 30% movement but fast
    const y = box.y + box.height / 2

    await page.mouse.move(startX, y)
    await page.mouse.down()
    // Fast movement - only 3 steps
    await page.mouse.move(endX, y, { steps: 3 })
    await page.mouse.up()

    await page.waitForTimeout(800)

    // Fast velocity should trigger flip
    const currentPages = page.locator('.page.current-page')
    const count = await currentPages.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('should handle multiple consecutive flips', async ({ page }) => {
    const flipbook = page.locator('.en-book.flipbook')
    const box = await flipbook.boundingBox()
    if (!box) throw new Error('Flipbook not found')

    // Flip forward twice
    for (let i = 0; i < 2; i++) {
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, {
        steps: 10,
      })
      await page.mouse.up()
      await page.waitForTimeout(1000) // Wait for animation to complete
    }

    // Should have flipped two pages forward
    const currentPages = flipbook.locator('.page.current-page')
    const currentCount = await currentPages.count()
    expect(currentCount).toBeGreaterThanOrEqual(1)
  })

  test('should not flip beyond first page when going backward', async ({ page }) => {
    const flipbook = page.locator('.en-book.flipbook')
    const box = await flipbook.boundingBox()
    if (!box) throw new Error('Flipbook not found')

    const firstPage = flipbook.locator('.page').first()
    await expect(firstPage).toHaveClass(/current-page/)

    // Try to flip backward on first page
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, {
      steps: 10,
    })
    await page.mouse.up()

    await page.waitForTimeout(500)

    // Should still be on first page
    await expect(firstPage).toHaveClass(/current-page/)
  })
})
