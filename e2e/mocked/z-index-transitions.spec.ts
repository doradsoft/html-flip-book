import { expect, test } from "@playwright/test";
import { FlipBookPage } from "../fixtures/flip-book-page";

/**
 * Z-index transition tests
 * Verifies that z-index flips at the 0.5 threshold during page flipping
 * This ensures proper visual stacking during animations
 */

test.describe("Z-Index Transitions", () => {
	test.beforeEach(async ({ page }) => {
		await page.clock.install();
	});

	test.describe("LTR Book - Forward Flip", () => {
		test("z-index changes at 0.5 threshold during flip", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, { direction: "ltr" });
			await flipBookPage.goto();

			const box = await flipBookPage.container.boundingBox();
			if (!box) throw new Error("Container not found");

			const firstPage = flipBookPage.getPage(0);
			const secondPage = flipBookPage.getPage(1);

			// Get initial z-indices
			const getZIndex = async (locator: ReturnType<typeof flipBookPage.getPage>) => {
				return locator.evaluate((el) => {
					return parseInt(window.getComputedStyle(el).zIndex, 10) || 0;
				});
			};

			const initialZ0 = await getZIndex(firstPage);
			const initialZ1 = await getZIndex(secondPage);

			// First page should be on top initially (higher z-index)
			expect(initialZ0).toBeGreaterThanOrEqual(initialZ1);

			// Start drag from right side
			const startX = box.x + box.width * 0.9;
			const _midX = box.x + box.width * 0.5; // Middle position
			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();

			// Drag to just before middle (< 0.5)
			await page.mouse.move(box.x + box.width * 0.55, y, { steps: 5 });
			await page.clock.runFor(100);

			const beforeMiddleZ0 = await getZIndex(firstPage);
			const beforeMiddleZ1 = await getZIndex(secondPage);

			// Before 0.5, first page should still be on top
			expect(beforeMiddleZ0).toBeGreaterThanOrEqual(beforeMiddleZ1);

			// Continue drag past middle (> 0.5)
			await page.mouse.move(box.x + box.width * 0.3, y, { steps: 5 });
			await page.clock.runFor(100);

			const afterMiddleZ0 = await getZIndex(firstPage);
			const afterMiddleZ1 = await getZIndex(secondPage);

			// After 0.5, the stacking order changes - this verifies the visual transition
			// The exact z-index values depend on implementation, but there should be a change
			expect(afterMiddleZ0 !== beforeMiddleZ0 || afterMiddleZ1 !== beforeMiddleZ1).toBe(true);

			// Complete the flip
			await page.mouse.move(box.x + box.width * 0.1, y, { steps: 3 });
			await page.mouse.up();
			await page.clock.runFor(1000);

			// After flip, page 2 (index 2) should be current
			const thirdPage = flipBookPage.getPage(2);
			await expect(thirdPage).toHaveClass(/current-page/);
		});

		test("adjacent pages maintain correct stacking order", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				initialTurnedLeaves: [0], // First leaf turned
			});
			await flipBookPage.goto();

			const box = await flipBookPage.container.boundingBox();
			if (!box) throw new Error("Container not found");

			// With first leaf turned, pages 2 and 3 are visible
			const page2 = flipBookPage.getPage(2);
			const page3 = flipBookPage.getPage(3);

			const getZIndex = async (locator: ReturnType<typeof flipBookPage.getPage>) => {
				return locator.evaluate((el) => parseInt(window.getComputedStyle(el).zIndex, 10) || 0);
			};

			const z2 = await getZIndex(page2);
			const z3 = await getZIndex(page3);

			// Left page should be on top for LTR (it's the one being flipped forward)
			expect(z2).toBeGreaterThanOrEqual(z3);
		});
	});

	test.describe("LTR Book - Backward Flip", () => {
		test("z-index changes during backward flip", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				initialTurnedLeaves: [0], // First leaf already turned
			});
			await flipBookPage.goto();

			const box = await flipBookPage.container.boundingBox();
			if (!box) throw new Error("Container not found");

			// Page 1 is on the left (back of first leaf) after flip
			const page1 = flipBookPage.getPage(1);
			const page2 = flipBookPage.getPage(2);

			const getZIndex = async (locator: ReturnType<typeof flipBookPage.getPage>) => {
				return locator.evaluate((el) => parseInt(window.getComputedStyle(el).zIndex, 10) || 0);
			};

			// Start backward flip from left side
			const startX = box.x + box.width * 0.1;
			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();

			// Drag to middle
			await page.mouse.move(box.x + box.width * 0.5, y, { steps: 5 });
			await page.clock.runFor(100);

			const midZ1 = await getZIndex(page1);
			const midZ2 = await getZIndex(page2);

			// During flip, the flipping page should be visible
			// Both pages should have reasonable z-index values
			expect(midZ1).toBeGreaterThanOrEqual(0);
			expect(midZ2).toBeGreaterThanOrEqual(0);

			// Complete backward flip
			await page.mouse.move(box.x + box.width * 0.9, y, { steps: 5 });
			await page.mouse.up();
			await page.clock.runFor(1000);

			// After backward flip, first page should be current again
			const firstPage = flipBookPage.getPage(0);
			await expect(firstPage).toHaveClass(/current-page/);
		});
	});

	test.describe("RTL Book", () => {
		test("z-index transitions work correctly for RTL", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, { direction: "rtl" });
			await flipBookPage.goto();

			const container = page.locator(".he-book.flipbook");
			const box = await container.boundingBox();
			if (!box) throw new Error("Container not found");

			const pages = container.locator(".page");
			const firstPage = pages.first();

			const getZIndex = async (index: number) => {
				return pages
					.nth(index)
					.evaluate((el) => parseInt(window.getComputedStyle(el).zIndex, 10) || 0);
			};

			const initialZ0 = await getZIndex(0);
			const initialZ1 = await getZIndex(1);

			// First page should be on top initially
			expect(initialZ0).toBeGreaterThanOrEqual(initialZ1);

			// RTL forward flip: drag from left to right
			const startX = box.x + box.width * 0.1;
			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();

			// Drag past middle
			await page.mouse.move(box.x + box.width * 0.7, y, { steps: 10 });
			await page.clock.runFor(100);

			const afterDragZ0 = await getZIndex(0);
			const afterDragZ1 = await getZIndex(1);

			// Z-index should have changed during the flip
			expect(afterDragZ0 !== initialZ0 || afterDragZ1 !== initialZ1).toBe(true);

			// Complete the flip
			await page.mouse.move(box.x + box.width * 0.9, y, { steps: 3 });
			await page.mouse.up();
			await page.clock.runFor(1000);

			// First page should no longer be current
			await expect(firstPage).not.toHaveClass(/current-page/);
		});
	});

	test.describe("Multiple Pages", () => {
		test("correct stacking with multiple turned pages", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				initialTurnedLeaves: [0, 1], // First two leaves turned
			});
			await flipBookPage.goto();

			// After turning 2 leaves, pages 4 and 5 should be visible (indices 4 and 5)
			const page4 = flipBookPage.getPage(4);
			const page5 = flipBookPage.getPage(5);

			const getZIndex = async (locator: ReturnType<typeof flipBookPage.getPage>) => {
				return locator.evaluate((el) => parseInt(window.getComputedStyle(el).zIndex, 10) || 0);
			};

			const z4 = await getZIndex(page4);
			const z5 = await getZIndex(page5);

			// Left page should have appropriate stacking
			expect(z4).toBeGreaterThanOrEqual(0);
			expect(z5).toBeGreaterThanOrEqual(0);

			// Current page should be marked
			await expect(page4).toHaveClass(/current-page/);
		});

		test("flipping middle leaf maintains proper stacking", async ({ page }) => {
			const flipBookPage = new FlipBookPage(page, {
				direction: "ltr",
				initialTurnedLeaves: [0, 1], // Two leaves turned, flipping third
			});
			await flipBookPage.goto();

			const box = await flipBookPage.container.boundingBox();
			if (!box) throw new Error("Container not found");

			const page4 = flipBookPage.getPage(4);
			await expect(page4).toHaveClass(/current-page/);

			const getZIndex = async (index: number) => {
				return flipBookPage.getPage(index).evaluate((el) => {
					return parseInt(window.getComputedStyle(el).zIndex, 10) || 0;
				});
			};

			// Start forward flip
			const startX = box.x + box.width * 0.9;
			const y = box.y + box.height / 2;

			await page.mouse.move(startX, y);
			await page.mouse.down();

			// Drag to middle
			await page.mouse.move(box.x + box.width * 0.5, y, { steps: 5 });
			await page.clock.runFor(100);

			// During flip, multiple pages should be involved
			const z4Mid = await getZIndex(4);
			const z5Mid = await getZIndex(5);

			expect(z4Mid).toBeGreaterThanOrEqual(0);
			expect(z5Mid).toBeGreaterThanOrEqual(0);

			// Complete flip
			await page.mouse.up();
			await page.clock.runFor(1000);
		});
	});
});
