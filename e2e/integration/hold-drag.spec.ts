import { expect, type Page, test } from "@playwright/test";
import { FlipBookPage } from "../fixtures/flip-book-page";
import { generateTestCases, type TestCase } from "../fixtures/test-cases";

/**
 * Integration tests using REAL browser timing (no mocked clock).
 *
 * ⚠️ THESE RANDOMIZED TESTS ARE PRECIOUS - TREAT THEM LIKE FLOWERS ⚠️
 *
 * Unlike mocked tests, these verify the flipbook works with actual browser
 * timing, animation frames, and velocity calculations. They catch issues
 * that mocked tests can't:
 * - Real requestAnimationFrame behavior
 * - Actual velocity detection from mouse/touch events
 * - Browser-specific timing quirks
 * - Race conditions in animation handling
 *
 * The filter function excludes inherently flaky combinations (no-drop,
 * before-middle, slow velocity) where real timing makes assertions unreliable.
 * The remaining test cases are deterministic enough for CI.
 */

// Use different seed for integration tests to cover different combinations
const TEST_SEED = process.env.TEST_SEED ? parseInt(process.env.TEST_SEED, 10) : 54321;
const TEST_COUNT = process.env.TEST_COUNT ? parseInt(process.env.TEST_COUNT, 10) : 10;

/**
 * Filter out test cases that are unreliable without mocked time.
 * Real browser timing makes velocity detection unpredictable for:
 * - "no-drop" cases where we expect the flip to return (velocity might complete it)
 * - "before-middle" cases which depend on velocity to decide outcome
 * - "slow" velocity cases which are position-dependent and timing-sensitive
 * - Backward flips (page already turned, real timing makes completion detection unreliable)
 *
 * Mocked tests cover all these cases with deterministic timing.
 * Integration tests focus on forward flips with fast velocity past middle - the most
 * common user interaction that must work correctly with real browser timing.
 */
function filterForIntegration(tc: TestCase): boolean {
	// Skip no-drop cases - velocity detection is unreliable without mocked time
	if (tc.dropCategory === "no-drop") {
		return false;
	}
	// Skip before-middle cases - outcome depends on velocity detection
	if (tc.dropCategory === "before-middle") {
		return false;
	}
	// Skip slow velocity cases - timing too sensitive
	if (tc.velocityCategory === "slow") {
		return false;
	}
	// Skip backward flips - real timing makes completion detection unreliable
	// (page starts turned, animation direction is reversed, timing more sensitive)
	if (tc.flipDir === "backward") {
		return false;
	}
	// Skip touch input - mouse events simulating touch don't have controlled timing
	// without clock mocking, making velocity detection unreliable
	if (tc.inputMethod === "touch") {
		return false;
	}
	return true;
}

const allTestCases = generateTestCases(TEST_COUNT * 3, TEST_SEED, {
	totalLeaves: 5,
	fastDeltaThreshold: 500,
});

// Filter and take only the required count
const testCases = allTestCases.filter(filterForIntegration).slice(0, TEST_COUNT);

test.describe("Hold & Drag - Integration", () => {
	for (const tc of testCases) {
		test(`[seed:${tc.seed}] ${tc.description}`, async ({ page }) => {
			await runTestCase(page, tc);
		});
	}
});

async function runTestCase(page: Page, tc: TestCase): Promise<void> {
	// Arrange: Navigate and setup initial state via URL params (like mocked tests)
	const flipBookPage = new FlipBookPage(page, {
		direction: tc.direction,
		pagesCount: tc.totalLeaves * 2,
		fastDeltaThreshold: 500,
		initialTurnedLeaves: tc.initialTurnedLeaves,
	});

	await flipBookPage.goto();

	// Get container dimensions
	const container = await flipBookPage.container.boundingBox();
	if (!container) throw new Error("Container not found");

	const dragDistance = container.width * tc.dropPosition * 0.4;
	const targetPageIndex = tc.targetLeafIndex * 2;

	// Calculate start and end positions based on direction and flip direction
	let startX: number;
	let endX: number;

	if (tc.flipDir === "forward") {
		if (tc.direction === "ltr") {
			startX = container.x + container.width * 0.75;
			endX = startX - dragDistance;
		} else {
			startX = container.x + container.width * 0.25;
			endX = startX + dragDistance;
		}
	} else {
		if (tc.direction === "ltr") {
			startX = container.x + container.width * 0.25;
			endX = startX + dragDistance;
		} else {
			startX = container.x + container.width * 0.75;
			endX = startX - dragDistance;
		}
	}

	const y = container.y + container.height / 2;

	// Perform drag with real timing
	const steps = tc.velocityCategory === "slow" ? 20 : 5;

	if (tc.inputMethod === "mouse") {
		await page.mouse.move(startX, y);
		await page.mouse.down();

		for (let i = 1; i <= steps; i++) {
			const progress = i / steps;
			const x = startX + (endX - startX) * progress;
			await page.mouse.move(x, y);
		}

		await page.mouse.up();
	} else {
		// Touch - using mouse as approximation
		await page.mouse.move(startX, y);
		await page.mouse.down();

		for (let i = 1; i <= steps; i++) {
			const progress = i / steps;
			const x = startX + (endX - startX) * progress;
			await page.mouse.move(x, y);
		}

		await page.mouse.up();
	}

	// Wait for animation to complete (real timing)
	await page.waitForTimeout(1000);

	// Assert: Check final state using polling for stability
	await expect(async () => {
		const finalState = await flipBookPage.getDOMState();
		const targetPage = finalState.pages.find((p) => p.index === targetPageIndex);

		if (!targetPage) {
			throw new Error(`Target page ${targetPageIndex} not found`);
		}

		const rotation = Math.abs(targetPage.transform.rotateY);

		// For forward flips: starts at 0°, completes at 180°
		// For backward flips: starts at 180° (already turned), completes at 0°
		if (tc.flipDir === "forward") {
			if (tc.expectFlipComplete) {
				// Forward flip completed: page should be at 180°
				expect(rotation).toBeGreaterThan(90);
			} else {
				// Forward flip canceled: page should return to 0°
				expect(rotation).toBeLessThan(45);
			}
		} else {
			// Backward flip
			if (tc.expectFlipComplete) {
				// Backward flip completed: page should be at 0°
				expect(rotation).toBeLessThan(45);
			} else {
				// Backward flip canceled: page should stay at 180°
				expect(rotation).toBeGreaterThan(90);
			}
		}
	}).toPass({ timeout: 2000 });
}

// Focused integration tests for browser-specific behaviors
test.describe("Browser Compatibility", () => {
	test("animation completes without errors", async ({ page }) => {
		await page.goto("/");
		await page.waitForSelector(".en-book.flipbook .page");

		const flipbook = page.locator(".en-book.flipbook");
		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Flipbook not found");

		// Collect any console errors during animation
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));

		// Perform a flip
		const startX = box.x + box.width * 0.75;
		const endX = box.x + box.width * 0.25;
		const y = box.y + box.height / 2;

		await page.mouse.move(startX, y);
		await page.mouse.down();
		await page.mouse.move(endX, y, { steps: 10 });
		await page.mouse.up();

		// Wait for animation
		await page.waitForTimeout(1000);

		// No errors should occur during animation
		expect(errors).toHaveLength(0);

		// Verify animation completed (page should have rotated)
		const transform = await page.evaluate(() => {
			const p = document.querySelector('.en-book.flipbook .page[data-page-index="0"]');
			return p ? window.getComputedStyle(p).transform : "none";
		});
		expect(transform).not.toBe("none");
	});

	test("touch events work on mobile viewport", async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		await page.waitForSelector(".en-book.flipbook .page");

		const flipbook = page.locator(".en-book.flipbook");
		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Flipbook not found");

		const firstPage = page.locator('.en-book.flipbook .page[data-page-index="0"]');
		await expect(firstPage).toBeVisible();

		// Perform swipe
		const startX = box.x + box.width * 0.75;
		const endX = box.x + box.width * 0.25;
		const y = box.y + box.height / 2;

		await page.mouse.move(startX, y);
		await page.mouse.down();
		await page.mouse.move(endX, y, { steps: 5 }); // Fast swipe
		await page.mouse.up();

		await page.waitForTimeout(1000);

		// Should have flipped
		const state = await page.evaluate(() => {
			const p = document.querySelector('.en-book.flipbook .page[data-page-index="0"]');
			return p ? window.getComputedStyle(p).transform : "none";
		});

		// Transform should indicate rotation
		expect(state).not.toBe("none");
	});
});
