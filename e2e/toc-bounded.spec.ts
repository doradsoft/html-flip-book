import { expect, test } from "@playwright/test";
import { readScrollOwnership } from "./toc-bounded-helpers.mts";

for (const direction of ["ltr", "rtl"] as const) {
	const bookClass = direction === "ltr" ? "en-book" : "he-book";

	test(`${direction}: document-mode TOC scrolls through the page scrollport`, async ({ page }) => {
		await page.goto(`/?example=${direction}-comprehensive&test-initialTurnedLeaves=0`);
		const toc = page.locator(`.${bookClass} .toc-page`);
		const inner = toc.locator(".toc-page__scroll");
		const lastLink = toc.locator(".toc-link").last();
		await expect(lastLink).toBeAttached();

		// A long TOC overflows the page and is carried by the outer scrollport.
		const metrics = await inner.evaluate(readScrollOwnership);
		expect(metrics.portScrollable).toBe(true);
		expect(metrics.innerOverflow).toBe("visible");

		await lastLink.scrollIntoViewIfNeeded();
		await expect(lastLink).toBeInViewport();
		const after = await inner.evaluate(readScrollOwnership);
		expect(after.portScrollTop).toBeGreaterThan(0);
		expect(after.innerScrollTop).toBe(0);
	});

	test(`${direction}: bounded TOC scrolls its own list while the scrollport stays put`, async ({
		page,
	}) => {
		await page.goto(`/?example=${direction}-comprehensive&test-initialTurnedLeaves=0`);
		const toc = page.locator(`.${bookClass} .toc-page`);
		const inner = toc.locator(".toc-page__scroll");
		const heading = toc.locator(".toc-heading");
		const lastLink = toc.locator(".toc-link").last();
		await expect(lastLink).toBeAttached();
		await expect(heading).toBeVisible();

		await toc.evaluate((el) => el.classList.add("flipbook-page-bounded"));

		// The bounded root pins to the page box; scroll ownership moves inward.
		const metrics = await inner.evaluate(readScrollOwnership);
		expect(metrics.innerScrollable).toBe(true);
		expect(metrics.innerOverflow).toBe("auto");
		expect(metrics.portScrollable).toBe(false);

		// Keyboard focus reaches the last entry inside the inner pane only.
		await lastLink.focus();
		await expect(lastLink).toBeFocused();
		const after = await inner.evaluate(readScrollOwnership);
		expect(after.innerScrollTop).toBeGreaterThan(0);
		expect(after.portScrollTop).toBe(0);
		await expect(lastLink).toBeInViewport();

		// Heading stays reachable at the top of the bounded pane.
		await inner.evaluate((el) => {
			el.scrollTop = 0;
		});
		await expect(heading).toBeVisible();
	});
}
