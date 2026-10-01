import { expect, test } from "@playwright/test";

test("mouse mode selects real page text, then restores continuous page turning", async ({
	page,
	isMobile,
}) => {
	test.skip(isMobile, "Mouse dragging is covered on desktop; mobile uses touch gestures.");
	await page.goto("/?example=ltr-comprehensive&test-initialTurnedLeaves=0,1");
	const book = page.locator(".en-book.flipbook");
	const button = page.getByRole("button", { name: "Select text with mouse" });
	const paragraph = book.locator('.page[data-page-index="3"] .en-page p').first();
	await expect(paragraph).toBeVisible();
	await expect(button).toHaveAttribute("aria-pressed", "false");
	await expect(button.locator(".flipbook-toolbar-mouse-mode-icon")).toContainText("Aa");
	await button.click();
	await expect(button).toHaveAttribute("aria-pressed", "true");
	await expect(book).toHaveClass(/flipbook--select-text/);
	await expect(paragraph).toHaveCSS("user-select", "text");
	const word = await paragraph.evaluate((element) => {
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
		let node = walker.nextNode();
		while (node && (node.textContent?.trim().length ?? 0) < 12) node = walker.nextNode();
		if (!node) throw new Error("No selectable paragraph text found");
		const start = node.textContent?.search(/\S/) ?? 0;
		const range = document.createRange();
		range.setStart(node, start);
		range.setEnd(node, start + 8);
		const rect = range.getBoundingClientRect();
		return { left: rect.left, right: rect.right, y: rect.top + rect.height / 2 };
	});
	await page.mouse.move(word.left + 1, word.y);
	await page.mouse.down();
	await page.mouse.move(word.right - 1, word.y, {
		steps: 12,
	});
	await page.mouse.up();
	await expect
		.poll(() => page.evaluate(() => window.getSelection()?.toString().length ?? 0))
		.toBeGreaterThan(0);
	await expect(book.locator('.page[data-page-index="3"]')).toHaveClass(/current-page/);
	await page.reload();
	await expect(button).toHaveAttribute("aria-pressed", "true");

	await button.click();
	await expect(button).toHaveAttribute("aria-pressed", "false");
	const currentPage = book.locator('.page[data-page-index="4"]');
	const box = await currentPage.boundingBox();
	if (!box) throw new Error("Current page missing");
	const y = box.y + box.height * 0.65;
	const startX = box.x + box.width * 0.78;
	await page.mouse.move(startX, y);
	await page.mouse.down();
	await page.waitForTimeout(550);
	await page.mouse.move(box.x + box.width * 0.45, y, { steps: 10 });
	const pageAngle = () =>
		book.evaluate((element) => {
			const turningPage = Array.from(element.querySelectorAll<HTMLElement>(".page")).find(
				(page) => page.style.willChange === "transform",
			);
			const angle = turningPage?.style.transform.match(/rotateY\((-?[\d.]+)deg\)/);
			return angle ? Math.abs(Number(angle[1])) : 0;
		});
	await expect.poll(pageAngle).toBeGreaterThan(2);
	const heldAngle = await pageAngle();
	await page.waitForTimeout(550);
	expect(Math.abs((await pageAngle()) - heldAngle)).toBeLessThan(3);
	await page.mouse.move(startX, y, { steps: 10 });
	await expect.poll(pageAngle).toBeLessThan(3);
	await page.mouse.up();
	await expect(currentPage).toHaveClass(/current-page/);
});

test("selection icon follows Hebrew locale and keeps caret ahead of letters", async ({ page }) => {
	await page.goto("/?example=rtl-comprehensive");
	const button = page.getByRole("button", { name: "בחירת טקסט עם העכבר" });
	await expect(button).toBeVisible();
	await expect(button.locator(".flipbook-toolbar-mouse-mode-icon")).toContainText("אב");
	await expect(button.locator(".flipbook-toolbar-mouse-mode-caret")).toBeVisible();
	await expect(button.locator(".flipbook-toolbar-mouse-mode-icon")).toHaveCSS("transform", "none");
});
