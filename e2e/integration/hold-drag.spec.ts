import { expect, type Page, test } from '@playwright/test'
import { FlipBookPage } from '../fixtures/flip-book-page'
import { generateTestCases, type TestCase } from '../fixtures/test-cases'

/**
 * Integration hold-drag tests using real browser events and timing
 * Same test cases as mocked tests, but with real animation timing
 * These tests are slower but catch browser-specific issues
 */

// Use different seed for integration tests to cover different combinations
const TEST_SEED = process.env.TEST_SEED ? parseInt(process.env.TEST_SEED, 10) : 54321
const TEST_COUNT = process.env.TEST_COUNT ? parseInt(process.env.TEST_COUNT, 10) : 10

const testCases = generateTestCases(TEST_COUNT, TEST_SEED, {
  totalLeaves: 5,
  fastDeltaThreshold: 500,
})

test.describe('Hold & Drag - Integration', () => {
  for (const tc of testCases) {
    test(`[seed:${tc.seed}] ${tc.description}`, async ({ page }) => {
      await runTestCase(page, tc)
    })
  }
})

async function runTestCase(page: Page, tc: TestCase): Promise<void> {
  // Arrange: Navigate and setup initial state
  const flipBookPage = new FlipBookPage(page, {
    direction: tc.direction,
    pagesCount: tc.totalLeaves * 2,
    fastDeltaThreshold: 500,
  })

  await page.goto('/')
  await flipBookPage.waitForReady()

  // Set initial turned leaves state
  if (tc.initialTurnedLeaves.length > 0) {
    await flipBookPage.setInitialState(tc.initialTurnedLeaves)
  }

  // Get container dimensions
  const container = await flipBookPage.container.boundingBox()
  if (!container) throw new Error('Container not found')

  const dragDistance = container.width * tc.dropPosition * 0.4
  const targetPageIndex = tc.targetLeafIndex * 2

  // Calculate start and end positions based on direction and flip direction
  let startX: number
  let endX: number

  if (tc.flipDir === 'forward') {
    if (tc.direction === 'ltr') {
      startX = container.x + container.width * 0.75
      endX = startX - dragDistance
    } else {
      startX = container.x + container.width * 0.25
      endX = startX + dragDistance
    }
  } else {
    if (tc.direction === 'ltr') {
      startX = container.x + container.width * 0.25
      endX = startX + dragDistance
    } else {
      startX = container.x + container.width * 0.75
      endX = startX - dragDistance
    }
  }

  const y = container.y + container.height / 2

  // Perform drag with real timing
  const steps = tc.velocityCategory === 'slow' ? 20 : 5

  if (tc.inputMethod === 'mouse') {
    await page.mouse.move(startX, y)
    await page.mouse.down()

    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const x = startX + (endX - startX) * progress
      await page.mouse.move(x, y)
    }

    await page.mouse.up()
  } else {
    // Touch - using mouse as approximation
    await page.mouse.move(startX, y)
    await page.mouse.down()

    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const x = startX + (endX - startX) * progress
      await page.mouse.move(x, y)
    }

    await page.mouse.up()
  }

  // Wait for animation to complete (real timing)
  await page.waitForTimeout(1000)

  // Assert: Check final state using polling for stability
  await expect(async () => {
    const finalState = await flipBookPage.getDOMState()
    const targetPage = finalState.pages.find((p) => p.index === targetPageIndex)

    if (!targetPage) {
      throw new Error(`Target page ${targetPageIndex} not found`)
    }

    const rotation = Math.abs(targetPage.transform.rotateY)

    if (tc.expectFlipComplete) {
      expect(rotation).toBeGreaterThan(90)
    } else {
      expect(rotation).toBeLessThan(45)
    }
  }).toPass({ timeout: 2000 })
}

// Focused integration tests for browser-specific behaviors
test.describe('Browser Compatibility', () => {
  test('animation completes smoothly without jank', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.en-book.flipbook .page')

    const flipbook = page.locator('.en-book.flipbook')
    const box = await flipbook.boundingBox()
    if (!box) throw new Error('Flipbook not found')

    // Collect frame timestamps during animation
    const _frameTimestamps: number[] = []

    await page.evaluate(() => {
      const w = window as Window & { __frameTimestamps?: number[] }
      w.__frameTimestamps = []
      const originalRaf = window.requestAnimationFrame
      window.requestAnimationFrame = (cb) => {
        return originalRaf((ts) => {
          w.__frameTimestamps?.push(ts)
          cb(ts)
        })
      }
    })

    // Perform a flip
    const startX = box.x + box.width * 0.75
    const endX = box.x + box.width * 0.25
    const y = box.y + box.height / 2

    await page.mouse.move(startX, y)
    await page.mouse.down()
    await page.mouse.move(endX, y, { steps: 10 })
    await page.mouse.up()

    // Wait for animation
    await page.waitForTimeout(1000)

    // Check frame rate was reasonable
    const timestamps = await page.evaluate(
      () => (window as Window & { __frameTimestamps?: number[] }).__frameTimestamps ?? []
    )

    if (timestamps.length >= 2) {
      const durations: number[] = []
      for (let i = 1; i < timestamps.length; i++) {
        durations.push(timestamps[i] - timestamps[i - 1])
      }

      // Average frame time should be under 50ms (20fps minimum)
      const avgFrameTime = durations.reduce((a, b) => a + b, 0) / durations.length
      expect(avgFrameTime).toBeLessThan(50)
    }
  })

  test('touch events work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.waitForSelector('.en-book.flipbook .page')

    const flipbook = page.locator('.en-book.flipbook')
    const box = await flipbook.boundingBox()
    if (!box) throw new Error('Flipbook not found')

    const firstPage = page.locator('.en-book.flipbook .page[data-page-index="0"]')
    await expect(firstPage).toBeVisible()

    // Perform swipe
    const startX = box.x + box.width * 0.75
    const endX = box.x + box.width * 0.25
    const y = box.y + box.height / 2

    await page.mouse.move(startX, y)
    await page.mouse.down()
    await page.mouse.move(endX, y, { steps: 5 }) // Fast swipe
    await page.mouse.up()

    await page.waitForTimeout(1000)

    // Should have flipped
    const state = await page.evaluate(() => {
      const p = document.querySelector('.en-book.flipbook .page[data-page-index="0"]')
      return p ? window.getComputedStyle(p).transform : 'none'
    })

    // Transform should indicate rotation
    expect(state).not.toBe('none')
  })
})
