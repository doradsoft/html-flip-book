import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test.describe("Download range (EN book)", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/?example=ltr-comprehensive");
		// Wait for the EN book to finish loading (async markdown import).
		await expect(page.locator(".en-book-container .en-book")).toBeVisible({ timeout: 15_000 });
	});

	test("should merge multiple chapter PDFs when downloading a page range", async ({ page }) => {
		// ── Open the EN book's download dropdown ──
		const toolbar = page.locator(".en-book-container [role='toolbar']");
		await expect(toolbar).toBeVisible();

		const downloadTrigger = toolbar.locator(".flipbook-toolbar-download-trigger");
		await expect(downloadTrigger).toBeVisible();
		await downloadTrigger.scrollIntoViewIfNeeded();
		await downloadTrigger.click();

		const menu = page.locator(".flipbook-toolbar-download-menu[role='menu']").first();
		await expect(menu).toBeVisible();

		// ── Switch to "Page range" mode ──
		const rangeRadio = menu.locator('input[type="radio"]').last();
		await rangeRadio.check();

		// ── Set from=5 to=8 (four content pages → 4 chapter PDFs) ──
		const selects = menu.locator("select.flipbook-toolbar-download-range-select");
		await selects.nth(0).selectOption({ index: 5 }); // from page index 5
		await selects.nth(1).selectOption({ index: 8 }); // to page index 8

		// ── Trigger download and capture the file ──
		const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
		const downloadButton = menu.getByRole("menuitem");
		await downloadButton.click();

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/\.pdf$/);

		// ── Read the downloaded PDF and count pages ──
		const filePath = await download.path();
		expect(filePath).toBeTruthy();

		// biome-ignore lint/style/noNonNullAssertion: guarded by toBeTruthy above
		const pdfBytes = await readFile(filePath!);
		expect(pdfBytes.length).toBeGreaterThan(0);

		const pdfDoc = await PDFDocument.load(pdfBytes);
		const pageCount = pdfDoc.getPageCount();

		// 4 page indices selected (5,6,7,8) — pages 3+ are content pages with PDFs.
		// Each chapter PDF may have ≥1 pages. The merged result must have MORE than 1 page
		// (i.e. not just the "from" page).
		expect(pageCount).toBeGreaterThan(1);
	});
});
