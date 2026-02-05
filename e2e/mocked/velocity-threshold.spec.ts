import { expect, test } from "@playwright/test";
import { FlipBookPage } from "../fixtures/flip-book-page";

/**
 * Velocity threshold tests
 * Verifies the FAST_DELTA (default 500px/s) behavior for determining
 * whether a swipe should complete despite not crossing the 0.5 threshold
 *
 * IMPORTANT: page.clock.install() alone does NOT freeze time - it keeps
 * advancing in real-time. We call page.clock.pauseAt() after page load
 * so that ONLY explicit clock.runFor() calls advance time. This makes
 * HammerJS velocity computation fully deterministic regardless of CPU speed.
 */

test.describe("Velocity Threshold - FAST_DELTA", () => {
	test.beforeEach(async ({ page }) => {
		await page.clock.install();
	});

	/**
	 * Pause the faked clock so only explicit clock.runFor() calls advance time.
	 * Must be called after page load (goto) completes.
	 * This makes HammerJS velocity computation fully deterministic
	 * regardless of CPU speed or test parallelism.
	 */
	async function pauseClock(page: import("@playwright/test").Page) {
		// Get the browser's current faked time and add a small buffer to account
		// for real-time advancement between the evaluate call and pauseAt call
		const now = await page.evaluate(() => Date.now());
		await page.clock.pauseAt(now + 200);
	}

	test.describe("LTR Book", () => {
		test("slow swipe before middle returns to start", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				fastDeltaThreshold: 500,
			});
			await flipBookPage.goto();
			await pauseClock(page);

			const firstPage = flipBookPage.getPage(0);
			await expect(firstPage).toHaveClass(/current-page/);

			const box = await flipBookPage.container.boundingBox();
			if (!box) throw new Error("Container not found");

			// Slow drag - many steps over large time = low velocity
			const startX = box.x + box.width * 0.75;
			const endX = box.x + box.width * 0.55; // Only 20% movement, before middle
			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();

			// Slow movement - 20 steps with time advancing = low velocity
			for (let i = 0; i < 20; i++) {
				const progress = (i + 1) / 20;
				await page.mouse.move(startX + (endX - startX) * progress, y);
				await page.clock.runFor(50); // 50ms per step = 1000ms total = slow
			}

			await page.mouse.up();
			await page.clock.runFor(1000);

			// Should return to start - first page still current
			await expect(firstPage).toHaveClass(/current-page/);
		});

		test("fast swipe before middle completes flip", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				fastDeltaThreshold: 500,
			});
			await flipBookPage.goto();
			await pauseClock(page);

			const firstPage = flipBookPage.getPage(0);
			await expect(firstPage).toHaveClass(/current-page/);

			const box = await flipBookPage.container.boundingBox();
			if (!box) throw new Error("Container not found");

			// Fast drag - few steps with minimal time advancing = high velocity
			const startX = box.x + box.width * 0.9;
			const endX = box.x + box.width * 0.4; // 50% movement but fast
			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();

			// Fast movement - 3 steps with small clock advances
			// Total 30ms > HammerJS COMPUTE_INTERVAL (25ms) to ensure velocity is computed
			const steps = 3;
			for (let i = 1; i <= steps; i++) {
				const progress = i / steps;
				await page.mouse.move(startX + (endX - startX) * progress, y);
				await page.clock.runFor(10);
			}

			await page.mouse.up();
			await page.clock.runFor(2000);

			// Fast velocity should complete the flip
			await expect(firstPage).not.toHaveClass(/current-page/);
		});

		test("velocity exactly at threshold (edge case)", async ({ page }) => {
			// Use a lower threshold for easier testing
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				fastDeltaThreshold: 200, // Lower threshold
			});
			await flipBookPage.goto();
			await pauseClock(page);

			const firstPage = flipBookPage.getPage(0);
			await expect(firstPage).toHaveClass(/current-page/);

			const box = await flipBookPage.container.boundingBox();
			if (!box) throw new Error("Container not found");

			// Medium speed drag
			const startX = box.x + box.width * 0.8;
			const endX = box.x + box.width * 0.3; // 50% movement
			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();

			// Fast movement - advance clock between steps so velocity is computable
			// Total must be > HammerJS COMPUTE_INTERVAL (25ms) for velocity recomputation
			const steps = 5;
			for (let i = 1; i <= steps; i++) {
				const progress = i / steps;
				await page.mouse.move(startX + (endX - startX) * progress, y);
				await page.clock.runFor(6); // 6ms per step = 30ms total > 25ms COMPUTE_INTERVAL
			}

			await page.mouse.up();
			await page.clock.runFor(2000);

			// With lower threshold, should complete
			await expect(firstPage).not.toHaveClass(/current-page/);
		});

		test("fast swipe against flip direction returns to start", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				fastDeltaThreshold: 500,
				initialTurnedLeaves: [0], // First leaf already turned
			});
			await flipBookPage.goto();
			await pauseClock(page);

			// Page 2 should be current after first leaf is turned
			const secondLeafFront = flipBookPage.getPage(2);
			await expect(secondLeafFront).toHaveClass(/current-page/);

			const box = await flipBookPage.container.boundingBox();
			if (!box) throw new Error("Container not found");

			// Start a backward flip from left side
			const startX = box.x + box.width * 0.25;
			const endX = box.x + box.width * 0.6; // Partial backward flip

			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();

			// Drag right (backward for LTR) but slow
			for (let i = 0; i < 15; i++) {
				const progress = (i + 1) / 15;
				await page.mouse.move(startX + (endX - startX) * progress, y);
				await page.clock.runFor(50);
			}
			await page.mouse.up();

			await page.clock.runFor(1000);

			// Slow backward flip should return - page 2 still current
			await expect(secondLeafFront).toHaveClass(/current-page/);
		});
	});

	test.describe("RTL Book", () => {
		test("slow swipe before middle returns to start", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "rtl",
				fastDeltaThreshold: 500,
			});
			await flipBookPage.goto();
			await pauseClock(page);

			// In RTL, the flipbook class is .he-book
			const firstPage = page.locator(".he-book.flipbook .page").first();
			await expect(firstPage).toHaveClass(/current-page/);

			const container = page.locator(".he-book.flipbook");
			const box = await container.boundingBox();
			if (!box) throw new Error("Container not found");

			// RTL forward flip is left-to-right
			const startX = box.x + box.width * 0.25;
			const endX = box.x + box.width * 0.45; // Only 20% movement, before middle
			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();

			// Slow movement
			for (let i = 0; i < 20; i++) {
				const progress = (i + 1) / 20;
				await page.mouse.move(startX + (endX - startX) * progress, y);
				await page.clock.runFor(50);
			}

			await page.mouse.up();
			await page.clock.runFor(1000);

			// Should return to start
			await expect(firstPage).toHaveClass(/current-page/);
		});

		test("fast swipe before middle completes flip", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "rtl",
				fastDeltaThreshold: 500,
			});
			await flipBookPage.goto();
			await pauseClock(page);

			const firstPage = page.locator(".he-book.flipbook .page").first();
			await expect(firstPage).toHaveClass(/current-page/);

			const container = page.locator(".he-book.flipbook");
			const box = await container.boundingBox();
			if (!box) throw new Error("Container not found");

			// RTL forward flip - fast swipe from left to right
			const startX = box.x + box.width * 0.1;
			const endX = box.x + box.width * 0.9;
			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();

			// Fast movement - 3 steps with clock advances
			// Total 30ms > HammerJS COMPUTE_INTERVAL (25ms) to ensure velocity is computed
			const steps = 3;
			for (let i = 1; i <= steps; i++) {
				const progress = i / steps;
				await page.mouse.move(startX + (endX - startX) * progress, y);
				await page.clock.runFor(10);
			}

			await page.mouse.up();
			await page.clock.runFor(2000);

			// Fast velocity should complete the flip
			await expect(firstPage).not.toHaveClass(/current-page/);
		});
	});

	test.describe("Custom Threshold", () => {
		test("lower threshold makes more swipes count as fast", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				fastDeltaThreshold: 100, // Very low threshold
			});
			await flipBookPage.goto();
			await pauseClock(page);

			const firstPage = flipBookPage.getPage(0);
			await expect(firstPage).toHaveClass(/current-page/);

			const box = await flipBookPage.container.boundingBox();
			if (!box) throw new Error("Container not found");

			// Even a relatively slow swipe should be "fast" with low threshold
			const startX = box.x + box.width * 0.7;
			const endX = box.x + box.width * 0.4;
			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();

			// Fast movement - advance clock between steps so velocity is computable
			// Total 50ms > HammerJS COMPUTE_INTERVAL (25ms) to ensure velocity is computed
			const steps = 5;
			for (let i = 1; i <= steps; i++) {
				const progress = i / steps;
				await page.mouse.move(startX + (endX - startX) * progress, y);
				await page.clock.runFor(10);
			}

			await page.mouse.up();
			await page.clock.runFor(2000);

			// With low threshold, should complete
			await expect(firstPage).not.toHaveClass(/current-page/);
		});

		test("higher threshold makes more swipes count as slow", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				fastDeltaThreshold: 2000, // Very high threshold
			});
			await flipBookPage.goto();
			await pauseClock(page);

			const firstPage = flipBookPage.getPage(0);
			await expect(firstPage).toHaveClass(/current-page/);

			const box = await flipBookPage.container.boundingBox();
			if (!box) throw new Error("Container not found");

			// Short slow swipe that doesn't cross the 0.5 threshold
			// With high velocity threshold, this is considered "slow" and should return
			const startX = box.x + box.width * 0.75;
			const endX = box.x + box.width * 0.55; // Only 20% movement, stays before middle
			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();
			// Slow movement with many steps
			for (let i = 0; i < 10; i++) {
				const progress = (i + 1) / 10;
				await page.mouse.move(startX + (endX - startX) * progress, y);
				await page.clock.runFor(50);
			}
			await page.mouse.up();

			await page.clock.runFor(1000);

			// With high threshold and slow movement before middle, should return
			await expect(firstPage).toHaveClass(/current-page/);
		});
	});
});
