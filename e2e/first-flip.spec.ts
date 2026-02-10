import { expect, test } from "@playwright/test";

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

	// NOTE: "fast swipe before middle completes" test was removed from here
	// as it was flaky and is properly covered in mocked/velocity-threshold.spec.ts
	// which provides deterministic clock control for velocity-based tests

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
		await flipbook.scrollIntoViewIfNeeded();
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
		await flipbook.scrollIntoViewIfNeeded();
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
