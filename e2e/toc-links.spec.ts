import { expect, test } from "@playwright/test";

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
