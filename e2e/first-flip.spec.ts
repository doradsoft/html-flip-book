import { TEST_PARAM_FAST_DELTA_THRESHOLD } from "../react/example/src/test-url-params";
import { expect, test } from "./fixtures/coverage-test";

/**
 * Simplified tests for first page flip
 * Isolate position-based settlement from flick completion. Playwright's move
 * steps do not define a slow velocity: native dispatch timing varies with load.
 * Velocity-based settlement remains covered by mocked/velocity-threshold.spec.ts.
 */
const POSITION_ONLY_QUERY = `${TEST_PARAM_FAST_DELTA_THRESHOLD}=${Number.MAX_SAFE_INTEGER}`;

test.describe("First Page Flip - LTR", () => {
	test("forward flip past middle completes", async ({ page }) => {
		await page.goto(`/?example=ltr-comprehensive&${POSITION_ONLY_QUERY}`);
		await page.waitForSelector(".en-book.flipbook .page", { state: "visible", timeout: 15_000 });

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
		await page.goto(`/?example=ltr-comprehensive&${POSITION_ONLY_QUERY}`);
		await page.waitForSelector(".en-book.flipbook .page", { state: "visible", timeout: 15_000 });

		const flipbook = page.locator(".en-book.flipbook");
		await expect(flipbook).toBeVisible();

		const firstPage = flipbook.locator(".page").first();
		await expect(firstPage).toHaveClass(/current-page/);

		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Flipbook not found");

		// Drag from right but stop before middle.
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
		await page.goto(`/?example=ltr-comprehensive&${POSITION_ONLY_QUERY}`);
		await page.waitForSelector(".en-book.flipbook .page", { state: "visible", timeout: 15_000 });

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
		await page.goto(`/?example=rtl-comprehensive&${POSITION_ONLY_QUERY}`);
		await page.waitForSelector(".he-book.flipbook .page", { state: "visible", timeout: 15_000 });
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

		// RTL: drag from left but stop before middle.
		await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 20 });
		await page.mouse.up();

		await page.waitForTimeout(800);

		// First page should still be current (flip cancelled)
		await expect(firstPage).toHaveClass(/current-page/);
	});
});
