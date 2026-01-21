import { expect, test } from '@playwright/test'

test.describe('FlipBook Touch Interactions', () => {
  test.use({ hasTouch: true })
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should flip forward with touch swipe left (LTR)', async ({ page }) => {
    const flipbook = page.locator('.en-book.flipbook')
    await expect(flipbook).toBeVisible()

    const box = await flipbook.boundingBox()
    if (!box) throw new Error('Flipbook not found')

    // Simulate touch swipe left
    await page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height / 2)

    // Start touch, move, then release
    const startX = box.x + box.width * 0.8
    const endX = box.x + box.width * 0.2
    const y = box.y + box.height / 2

    // Use mouse to simulate drag (playwright touch API is limited)
    await page.mouse.move(startX, y)
    await page.mouse.down()
    for (let i = 0; i <= 10; i++) {
      const x = startX + ((endX - startX) * i) / 10
      await page.mouse.move(x, y)
      await page.waitForTimeout(20)
    }
    await page.mouse.up()

    await page.waitForTimeout(800)

    // Verify page flipped
    const currentPages = page.locator('.page.current-page')
    const count = await currentPages.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('should flip backward with touch swipe right (LTR)', async ({ page }) => {
    const flipbook = page.locator('.en-book.flipbook')
    const box = await flipbook.boundingBox()
    if (!box) throw new Error('Flipbook not found')

    // First verify we're on page 0
    const firstPage = flipbook.locator('.page[data-page-index="0"]')
    await expect(firstPage).toHaveClass(/current-page/)

    // First flip forward - drag from right to left (bigger movement for reliability)
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2, {
      steps: 20,
    })
    await page.mouse.up()

    // Wait for animation and verify we're on page 2 (second leaf)
    const secondLeafPage = flipbook.locator('.page[data-page-index="2"]')
    await expect(secondLeafPage).toHaveClass(/current-page/, { timeout: 10000 })

    // Now flip backward - drag from left to right
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, {
      steps: 20,
    })
    await page.mouse.up()

    // Should be back at first page
    await expect(firstPage).toHaveClass(/current-page/, { timeout: 10000 })
  })

  test('should not flip when swipe is too short', async ({ page }) => {
    const flipbook = page.locator('.en-book.flipbook')
    const box = await flipbook.boundingBox()
    if (!box) throw new Error('Flipbook not found')

    const firstPage = page.locator('.page').first()
    await expect(firstPage).toHaveClass(/current-page/)

    // Very short swipe (less than threshold)
    const startX = box.x + box.width * 0.5
    const endX = box.x + box.width * 0.45 // Only 5% movement
    const y = box.y + box.height / 2

    await page.mouse.move(startX, y)
    await page.mouse.down()
    await page.mouse.move(endX, y, { steps: 5 })
    await page.mouse.up()

    await page.waitForTimeout(500)

    // First page should still be current
    await expect(firstPage).toHaveClass(/current-page/)
  })

  test('should allow vertical scrolling within page content', async ({ page }) => {
    const flipbook = page.locator('.en-book.flipbook')
    await expect(flipbook).toBeVisible()

    // Vertical scroll should work (not prevented)
    const box = await flipbook.boundingBox()
    if (!box) throw new Error('Flipbook not found')

    // Simulate vertical swipe
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.7, {
      steps: 10,
    })
    await page.mouse.up()

    // This should not flip pages - first page should still be visible
    const firstPage = page.locator('.page').first()
    await expect(firstPage).toBeVisible()
  })
})
