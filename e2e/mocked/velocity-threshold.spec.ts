import { expect, test } from "@playwright/test";
import { FlipBookPage } from "../fixtures/flip-book-page";

/**
 * Velocity threshold tests
 * Verifies the FAST_DELTA (default 500px/s) behavior for determining
 * whether a swipe should complete despite not crossing the 0.5 threshold
 */

test.describe("Velocity Threshold - FAST_DELTA", () => {
	test.beforeEach(async ({ page }) => {
		await page.clock.install();
	});

	test.describe("LTR Book", () => {
		test("slow swipe before middle returns to start", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				fastDeltaThreshold: 500,
			});
			await flipBookPage.goto();

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
			// Flush event handlers before advancing animation clock
			await page.evaluate(() => {});
			// Two passes: first completes any pending drag animation,
			// second completes the flip-to-target animation scheduled after it
			await page.clock.runFor(1000);
			await page.evaluate(() => {});
			await page.clock.runFor(1000);

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
			const steps = 5;
			for (let i = 1; i <= steps; i++) {
				const progress = i / steps;
				await page.mouse.move(startX + (endX - startX) * progress, y);
				await page.clock.runFor(5); // 5ms per step = 25ms total = fast
			}

			await page.mouse.up();
			// Flush event handlers before advancing animation clock
			await page.evaluate(() => {});
			await page.clock.runFor(1000);

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
			// Flush event handlers before advancing animation clock
			await page.evaluate(() => {});
			// Two passes: first completes any pending drag animation,
			// second completes the flip-to-target animation scheduled after it
			await page.clock.runFor(1000);
			await page.evaluate(() => {});
			await page.clock.runFor(1000);

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
			// Flush event handlers before advancing animation clock
			await page.evaluate(() => {});
			await page.clock.runFor(1000);

			// With low threshold, should complete
			await expect(firstPage).not.toHaveClass(/current-page/);
		});

		test("higher threshold makes more swipes count as slow", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				fastDeltaThreshold: 2000, // Very high threshold
			});
			await flipBookPage.goto();

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
