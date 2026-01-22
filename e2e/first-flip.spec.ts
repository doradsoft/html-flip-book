import { expect, test } from "@playwright/test";
import { test as clockedTest } from "./fixtures/clocked-test";

/**
 * Simplified tests for first page flip
 * Tests the basic flip mechanics using class-based assertions (proven to work)
 */

test.describe("First Page Flip - LTR", () => {
	test("forward flip past middle completes", async ({ page }) => {
		await page.goto("/");

		const flipbook = page.locator(".en-book.flipbook");
		await expect(flipbook).toBeVisible();

		const firstPage = flipbook.locator(".page").first();
		await expect(firstPage).toHaveClass(/current-page/);

		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Flipbook not found");

		// Drag from right to left past middle (90% to 10% for reliable flip position > 0.5)
		await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2, { steps: 20 });
		await page.mouse.up();

		await page.waitForTimeout(800);

		// First page should no longer be the only current page
		await expect(firstPage).not.toHaveClass(/current-page/);
	});

	test("forward flip before middle returns", async ({ page }) => {
		await page.goto("/");

		const flipbook = page.locator(".en-book.flipbook");
		await expect(flipbook).toBeVisible();

		const firstPage = flipbook.locator(".page").first();
		await expect(firstPage).toHaveClass(/current-page/);

		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Flipbook not found");

		// Drag from right but stop before middle (slow)
		await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 20 });
		await page.mouse.up();

		await page.waitForTimeout(800);

		// First page should still be current (flip cancelled)
		await expect(firstPage).toHaveClass(/current-page/);
	});

	// Uses clockedTest fixture which auto-skips on mobile and pre-installs clock
	// This scenario is also covered in mocked/velocity-threshold.spec.ts
	clockedTest("fast swipe before middle completes", async ({ clockedPage: page }) => {
		await page.goto("/");
		await page.waitForSelector(".en-book.flipbook .page");

		const flipbook = page.locator(".en-book.flipbook");
		await expect(flipbook).toBeVisible();

		const firstPage = flipbook.locator(".page").first();
		await expect(firstPage).toHaveClass(/current-page/);

		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Flipbook not found");

		// Fast swipe - drag from right side toward middle with clock advancing between moves
		const startX = box.x + box.width * 0.9;
		const endX = box.x + box.width * 0.4; // 50% movement (before middle) but fast
		const y = box.y + box.height / 2;

		await page.mouse.move(startX, y);
		await page.mouse.down();

		// Fast movement - advance clock minimally between steps to simulate high velocity
		const steps = 2;
		for (let i = 1; i <= steps; i++) {
			const progress = i / steps;
			await page.mouse.move(startX + (endX - startX) * progress, y);
			await page.clock.runFor(5); // Only 5ms per step = high velocity
		}

		await page.mouse.up();

		// Advance time for animation to complete
		await page.clock.runFor(1000);

		// Fast swipe should complete the flip
		await expect(firstPage).not.toHaveClass(/current-page/);
	});

	test("no movement returns to start", async ({ page }) => {
		await page.goto("/");

		const flipbook = page.locator(".en-book.flipbook");
		await expect(flipbook).toBeVisible();

		const firstPage = flipbook.locator(".page").first();
		await expect(firstPage).toHaveClass(/current-page/);

		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Flipbook not found");

		// Click without drag
		await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
		await page.mouse.down();
		await page.waitForTimeout(100);
		await page.mouse.up();

		await page.waitForTimeout(800);

		// First page should still be current
		await expect(firstPage).toHaveClass(/current-page/);
	});
});

test.describe("First Page Flip - RTL", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("forward flip past middle completes", async ({ page }) => {
		const flipbook = page.locator(".he-book.flipbook");
		await expect(flipbook).toBeVisible();

		const firstPage = flipbook.locator(".page").first();
		await expect(firstPage).toHaveClass(/current-page/);

		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Flipbook not found");

		// RTL: drag from left to right (10% to 90% for reliable flip position > 0.5)
		await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, { steps: 20 });
		await page.mouse.up();

		await page.waitForTimeout(800);

		// First page should no longer be the only current page
		await expect(firstPage).not.toHaveClass(/current-page/);
	});

	test("forward flip before middle returns", async ({ page }) => {
		const flipbook = page.locator(".he-book.flipbook");
		await expect(flipbook).toBeVisible();

		const firstPage = flipbook.locator(".page").first();
		await expect(firstPage).toHaveClass(/current-page/);

		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Flipbook not found");

		// RTL: drag from left but stop before middle (slow)
		await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 20 });
		await page.mouse.up();

		await page.waitForTimeout(800);

		// First page should still be current (flip cancelled)
		await expect(firstPage).toHaveClass(/current-page/);
	});
});
