import { expect, test } from "@playwright/test";

for (const direction of ["ltr", "rtl"] as const) {
	for (const example of ["comprehensive", "buffer"] as const) {
		test(`${direction} ${example}: keeps complete TOC titles and page numbers inside the scroll area`, async ({
			page,
		}) => {
			await page.goto(`/?example=${direction}-${example}&test-initialTurnedLeaves=0`);
			const toc = page.locator(`.${direction === "ltr" ? "en" : "he"}-book .toc-page`);
			await expect(toc.locator(".toc-link").first()).toBeVisible();
			const clippedEntries = await toc.locator(".toc-page__scroll").evaluate((scroll) => {
				const viewport = scroll.getBoundingClientRect();
				const left = viewport.left + scroll.clientLeft;
				const right = left + scroll.clientWidth;
				return Array.from(scroll.querySelectorAll(".toc-title, .toc-page-num"))
					.filter((part) => {
						const range = document.createRange();
						range.selectNodeContents(part);
						const bounds = range.getBoundingClientRect();
						return (
							bounds.left < left - 1 ||
							bounds.right > right + 1 ||
							part.scrollWidth > part.clientWidth + 1
						);
					})
					.map((part) => part.textContent);
			});
			expect(clippedEntries).toEqual([]);
			await toc.locator(".toc-link").last().scrollIntoViewIfNeeded();
			await expect(toc.locator(".toc-link").last()).toBeInViewport();
		});
	}
}

test("TOC links preserve in-book clicks and allow browser modifier navigation", async ({
	page,
	isMobile,
}) => {
	test.skip(isMobile, "Desktop browser modifiers open tabs and windows.");
	await page.goto("/?example=ltr-comprehensive&test-initialTurnedLeaves=0");
	const toc = page.locator('.en-book .page[data-page-index="2"]');
	const link = toc.locator(".toc-link[href]").first();
	await expect(link).toBeVisible();
	const href = await link.getAttribute("href");
	expect(href).toMatch(/^#page\//);
	if (!href) throw new Error("TOC entry has no href");

	const beforeUrl = page.url();
	const targetUrl = new URL(href, beforeUrl).toString();
	const newTab = page.context().waitForEvent("page");
	await link.click({ modifiers: ["Control"] });
	const tab = await newTab;
	await expect(tab).toHaveURL(targetUrl);
	await expect(page).toHaveURL(beforeUrl);
	await tab.close();

	const newWindow = page.context().waitForEvent("page");
	await link.click({ modifiers: ["Shift"] });
	const windowPage = await newWindow;
	await expect(windowPage).toHaveURL(targetUrl);
	await expect(page).toHaveURL(beforeUrl);
	await windowPage.close();

	await link.click();
	await expect(page).toHaveURL(targetUrl);
});
