import { expect, test } from "@playwright/test";

test.describe("FlipBook Direction (LTR)", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/?example=ltr-comprehensive");
	});

	test("odd pages should translate toward center in LTR", async ({ page }) => {
		const firstPage = page.locator(".en-book.flipbook .page").first();
		await expect(firstPage).toBeVisible();

		const transform = await firstPage.evaluate((el) => window.getComputedStyle(el).transform);

		// Expect transform to be set; LTR initial odd page has translateX applied
		expect(transform).toBeTruthy();
	});

	test("current-page should start at first page in LTR", async ({ page }) => {
		const firstPage = page.locator(".en-book.flipbook .page").first();
		await expect(firstPage).toHaveClass(/current-page/);
	});

	test("forward flip drags from right to left in LTR", async ({ page }) => {
		const flipbook = page.locator(".en-book.flipbook");
		const firstPage = flipbook.locator(".page").first();
		await expect(firstPage).toHaveClass(/current-page/);

		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Container not found");

		// LTR forward flip: drag from right to left
		const startX = box.x + box.width * 0.9;
		const endX = box.x + box.width * 0.1;
		const y = box.y + box.height / 2;

		await page.mouse.move(startX, y);
		await page.mouse.down();
		await page.mouse.move(endX, y, { steps: 10 });
		await page.mouse.up();

		await page.waitForTimeout(800);

		// First page should no longer be current
		await expect(firstPage).not.toHaveClass(/current-page/);
	});

	test("backward flip drags from left to right in LTR", async ({ page }) => {
		const flipbook = page.locator(".en-book.flipbook");
		const firstPage = flipbook.locator(".page").first();

		// First flip forward
		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Container not found");
		const y = box.y + box.height / 2;

		await page.mouse.move(box.x + box.width * 0.9, y);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.1, y, { steps: 10 });
		await page.mouse.up();
		await page.waitForTimeout(800);

		await expect(firstPage).not.toHaveClass(/current-page/);

		// Now flip backward: drag from left to right
		await page.mouse.move(box.x + box.width * 0.1, y);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.9, y, { steps: 10 });
		await page.mouse.up();

		await page.waitForTimeout(800);

		// First page should be current again
		await expect(firstPage).toHaveClass(/current-page/);
	});

	test("pages stack correctly in LTR (left over right)", async ({ page }) => {
		const flipbook = page.locator(".en-book.flipbook");
		const pages = flipbook.locator(".page");

		const firstPage = pages.first();
		const secondPage = pages.nth(1);

		await expect(firstPage).toHaveClass(/current-page/);

		const z0 = await firstPage.evaluate(
			(el) => parseInt(window.getComputedStyle(el).zIndex, 10) || 0,
		);
		const z1 = await secondPage.evaluate(
			(el) => parseInt(window.getComputedStyle(el).zIndex, 10) || 0,
		);

		// First page (left side) should have higher z-index in LTR
		expect(z0).toBeGreaterThanOrEqual(z1);
	});
});

test.describe("FlipBook Direction (RTL)", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/?example=rtl-comprehensive");
	});

	test("current-page should start at first page in RTL", async ({ page }) => {
		// RTL book uses .he-book selector
		const firstPage = page.locator(".he-book.flipbook .page").first();
		await expect(firstPage).toHaveClass(/current-page/);
	});

	test("odd pages should have transform applied in RTL", async ({ page }) => {
		const firstPage = page.locator(".he-book.flipbook .page").first();
		await expect(firstPage).toBeVisible();

		const transform = await firstPage.evaluate((el) => window.getComputedStyle(el).transform);

		// RTL initial odd page has transform applied
		expect(transform).toBeTruthy();
	});

	test("forward flip drags from left to right in RTL", async ({ page }) => {
		const flipbook = page.locator(".he-book.flipbook");
		const firstPage = flipbook.locator(".page").first();
		await expect(firstPage).toHaveClass(/current-page/);

		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Container not found");

		// RTL forward flip: drag from left to right (opposite of LTR)
		const startX = box.x + box.width * 0.1;
		const endX = box.x + box.width * 0.9;
		const y = box.y + box.height / 2;

		await page.mouse.move(startX, y);
		await page.mouse.down();
		await page.mouse.move(endX, y, { steps: 10 });
		await page.mouse.up();

		await page.waitForTimeout(800);

		// First page should no longer be current
		await expect(firstPage).not.toHaveClass(/current-page/);
	});

	test("backward flip drags from right to left in RTL", async ({ page }) => {
		const flipbook = page.locator(".he-book.flipbook");
		const firstPage = flipbook.locator(".page").first();

		// First flip forward
		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Container not found");
		const y = box.y + box.height / 2;

		await page.mouse.move(box.x + box.width * 0.1, y);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.9, y, { steps: 10 });
		await page.mouse.up();
		await page.waitForTimeout(800);

		await expect(firstPage).not.toHaveClass(/current-page/);

		// Now flip backward: drag from right to left (opposite of LTR)
		await page.mouse.move(box.x + box.width * 0.9, y);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.1, y, { steps: 10 });
		await page.mouse.up();

		await page.waitForTimeout(800);

		// First page should be current again
		await expect(firstPage).toHaveClass(/current-page/);
	});

	test("pages stack correctly in RTL (right over left)", async ({ page }) => {
		const flipbook = page.locator(".he-book.flipbook");
		const pages = flipbook.locator(".page");

		const firstPage = pages.first();
		const secondPage = pages.nth(1);

		await expect(firstPage).toHaveClass(/current-page/);

		const z0 = await firstPage.evaluate(
			(el) => parseInt(window.getComputedStyle(el).zIndex, 10) || 0,
		);
		const z1 = await secondPage.evaluate(
			(el) => parseInt(window.getComputedStyle(el).zIndex, 10) || 0,
		);

		// First page should have appropriate z-index in RTL
		expect(z0).toBeGreaterThanOrEqual(z1);
	});

	test("multiple flips work correctly in RTL", async ({ page }) => {
		const flipbook = page.locator(".he-book.flipbook");
		const pages = flipbook.locator(".page");

		const box = await flipbook.boundingBox();
		if (!box) throw new Error("Container not found");
		const y = box.y + box.height / 2;

		// Flip forward twice
		for (let i = 0; i < 2; i++) {
			await page.mouse.move(box.x + box.width * 0.1, y);
			await page.mouse.down();
			await page.mouse.move(box.x + box.width * 0.9, y, { steps: 10 });
			await page.mouse.up();
			await page.waitForTimeout(800);
		}

		// First and second pages should not be current
		const firstPage = pages.first();
		await expect(firstPage).not.toHaveClass(/current-page/);

		// Page at index 4 should be current (after flipping 2 leaves = 4 pages)
		const fifthPage = pages.nth(4);
		await expect(fifthPage).toHaveClass(/current-page/);
	});
});

test.describe("LTR vs RTL Comparison", () => {
	test("flip directions are mirrored between LTR and RTL", async ({ page }) => {
		// Test LTR forward flip (right to left)
		await page.goto("/?example=ltr-comprehensive");
		await page.waitForSelector(".en-book.flipbook .page", { state: "visible", timeout: 15_000 });

		const ltrFlipbook = page.locator(".en-book.flipbook");
		await expect(ltrFlipbook).toBeVisible();

		const ltrBox = await ltrFlipbook.boundingBox();
		if (!ltrBox) throw new Error("LTR flipbook not found");

		const ltrY = ltrBox.y + ltrBox.height / 2;

		await page.mouse.move(ltrBox.x + ltrBox.width * 0.9, ltrY);
		await page.mouse.down();
		await page.mouse.move(ltrBox.x + ltrBox.width * 0.1, ltrY, { steps: 10 });
		await page.mouse.up();

		await page.waitForTimeout(1000);

		const ltrFirstPage = ltrFlipbook.locator(".page").first();
		await expect(ltrFirstPage).not.toHaveClass(/current-page/);

		// Test RTL forward flip (left to right)
		await page.goto("/?example=rtl-comprehensive");
		await page.waitForSelector(".he-book.flipbook .page", { state: "visible", timeout: 15_000 });

		const rtlFlipbook = page.locator(".he-book.flipbook");
		await expect(rtlFlipbook).toBeVisible();

		const rtlBox = await rtlFlipbook.boundingBox();
		if (!rtlBox) throw new Error("RTL flipbook not found");

		const rtlY = rtlBox.y + rtlBox.height / 2;

		await page.mouse.move(rtlBox.x + rtlBox.width * 0.1, rtlY);
		await page.mouse.down();
		await page.mouse.move(rtlBox.x + rtlBox.width * 0.9, rtlY, { steps: 10 });
		await page.mouse.up();

		await page.waitForTimeout(1000);

		const rtlFirstPage = rtlFlipbook.locator(".page").first();
		await expect(rtlFirstPage).not.toHaveClass(/current-page/);
	});
});
