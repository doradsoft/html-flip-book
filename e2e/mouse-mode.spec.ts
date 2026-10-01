import { expect, test } from "@playwright/test";

test("mouse mode selects real page text, then restores continuous page turning", async ({
	page,
}) => {
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
	const textBox = await paragraph.boundingBox();
	if (!textBox) throw new Error("Paragraph missing");
	await page.mouse.move(textBox.x + 12, textBox.y + 12);
	await page.mouse.down();
	await page.mouse.move(textBox.x + Math.min(textBox.width - 12, 160), textBox.y + 12, {
		steps: 12,
	});
	await page.mouse.up();
	expect(await page.evaluate(() => window.getSelection()?.toString().length ?? 0)).toBeGreaterThan(
		0,
	);
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
