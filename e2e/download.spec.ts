import { expect, test } from "@playwright/test";

test.describe("Download dropdown", () => {
	// Tests navigate individually since LTR and RTL are separate examples

	test("should open download menu when clicking download button (LTR)", async ({ page }) => {
		await page.goto("/?example=ltr-comprehensive");
		await page.waitForSelector(".en-book-container [role='toolbar']", {
			state: "visible",
			timeout: 15_000,
		});
		const toolbar = page.locator(".en-book-container [role='toolbar']");
		await expect(toolbar).toBeVisible();

		const downloadTrigger = toolbar.locator(".flipbook-toolbar-download-trigger");
		await expect(downloadTrigger).toBeVisible();
		await downloadTrigger.scrollIntoViewIfNeeded();

		await downloadTrigger.click();

		const menu = page.locator(".flipbook-toolbar-download-menu[role='menu']").first();
		await expect(menu).toBeVisible();
		await expect(menu.getByRole("menuitem", { name: /download entire book/i })).toBeVisible();
	});

	test("should open download menu when clicking download button (RTL)", async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name === "mobile", "RTL book is off-viewport on mobile");
		await page.goto("/?example=rtl-comprehensive");
		await page.waitForSelector(".he-book-container [role='toolbar']", {
			state: "visible",
			timeout: 15_000,
		});
		const toolbar = page.locator(".he-book-container [role='toolbar']");
		await expect(toolbar).toBeVisible();

		const downloadTrigger = toolbar.locator(".flipbook-toolbar-download-trigger");
		await expect(downloadTrigger).toBeVisible();
		await downloadTrigger.scrollIntoViewIfNeeded();

		await downloadTrigger.click();

		const menu = page.locator(".flipbook-toolbar-download-menu[role='menu']").first();
		await expect(menu).toBeVisible();
		await expect(menu.getByRole("menuitem", { name: /הורד את כל הספר/ })).toBeVisible();
	});

	test("should open download menu via Ctrl+S (download command)", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name === "mobile", "Ctrl+S is a desktop keyboard shortcut");
		await page.goto("/?example=ltr-comprehensive");
		await page.waitForSelector(".en-book-container [role='toolbar']", {
			state: "visible",
			timeout: 15_000,
		});
		const toolbar = page.locator(".en-book-container [role='toolbar']");
		await expect(toolbar).toBeVisible();

		await page.keyboard.press("Control+s");

		const menu = page.locator(".flipbook-toolbar-download-menu[role='menu']").first();
		await expect(menu).toBeVisible();
	});
});
