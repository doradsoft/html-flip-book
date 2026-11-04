import { expect, test } from "./fixtures/coverage-test";

for (const direction of ["ltr", "rtl"] as const) {
	for (const example of ["hold-hotkeys", "comprehensive"]) {
		test(`${direction} ${example} copies existing selection while Ctrl still forces page turning`, async ({
			page,
		}) => {
			await page.goto(`/?example=${direction}-${example}&test-initialTurnedLeaves=0,1`);
			const book = page.locator(`.${direction === "ltr" ? "en" : "he"}-book.flipbook`);
			const button = page.locator(".flipbook-toolbar-mouse-mode");
			await expect(button).toBeEnabled();
			if ((await button.getAttribute("aria-pressed")) !== "true") await button.click();
			await expect(book).toHaveClass(/flipbook--select-text/);
			// Exercise native copy/paste without granting Clipboard API permissions.
			await page.evaluate(() => {
				const target = document.createElement("textarea");
				target.setAttribute("aria-label", "Clipboard test target");
				target.style.cssText = "position:fixed;top:0;left:0;width:180px;height:30px;z-index:10000";
				document.body.append(target);
			});
			const clipboardTarget = page.getByRole("textbox", { name: "Clipboard test target" });
			await clipboardTarget.fill("Clipboard sentinel");
			await clipboardTarget.press("Control+a");
			await clipboardTarget.press("Control+c");
			await clipboardTarget.fill("");
			await clipboardTarget.press("Control+v");
			await expect(clipboardTarget).toHaveValue("Clipboard sentinel");
			await clipboardTarget.fill("");
			await clipboardTarget.press("Tab");
			const content = direction === "ltr" ? ".en-page p" : ".bible-content";
			await book.locator(`.current-page ${content}`).first().dblclick();
			const selectedRangeText = () =>
				page.evaluate(() => {
					const selection = window.getSelection();
					return selection?.rangeCount ? selection.getRangeAt(0).toString() : "";
				});
			const selectedText = await selectedRangeText();
			expect(selectedText?.length).toBeGreaterThan(0);
			await page.keyboard.down("Control");
			await expect(button).toHaveAttribute("aria-pressed", "false");
			await expect(button).toBeDisabled();
			await expect(book).not.toHaveClass(/flipbook--select-text/);
			// Keep the modifier held across a paint and the toolbar's polling rerenders.
			await page.waitForTimeout(450);
			await page.keyboard.press("c");
			await page.evaluate(
				() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
			);
			expect(await selectedRangeText()).toBe(selectedText);
			await expect(button).toHaveAttribute("aria-pressed", "false");
			await page.keyboard.up("Control");
			await expect(button).toHaveAttribute("aria-pressed", "true");
			await clipboardTarget.fill("");
			await clipboardTarget.press("Control+v");
			await expect(clipboardTarget).toHaveValue(selectedText ?? "");
		});

		test(`${direction} ${example} temporarily disables text selection while Ctrl is held`, async ({
			page,
		}) => {
			await page.goto(`/?example=${direction}-${example}&test-initialTurnedLeaves=0,1`);
			const book = page.locator(`.${direction === "ltr" ? "en" : "he"}-book.flipbook`);
			const button = page.locator(".flipbook-toolbar-mouse-mode");
			await expect(button).toBeVisible();
			await expect(page.locator(".hold-hotkey-hint")).toBeVisible();
			if ((await button.getAttribute("aria-pressed")) !== "true") await button.click();
			await expect(button).toHaveAttribute("aria-pressed", "true");
			const savedMode = await page.evaluate(() => JSON.stringify(localStorage));
			await page.keyboard.down("Control");
			await expect(button).toHaveAttribute("aria-pressed", "false");
			await expect(button).toBeDisabled();
			await expect(book).not.toHaveClass(/flipbook--select-text/);
			// Exercise the toolbar's polling rerenders while the key is still held.
			await page.waitForTimeout(450);
			await expect(button).toHaveAttribute("aria-pressed", "false");
			expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(savedMode);
			await page.keyboard.up("Control");
			await expect(button).toHaveAttribute("aria-pressed", "true");
			await expect(button).toBeEnabled();
			await expect(book).toHaveClass(/flipbook--select-text/);
			await button.click();
			await page.keyboard.down("Control");
			await page.keyboard.up("Control");
			await expect(button).toHaveAttribute("aria-pressed", "false");
		});
	}

	for (const initiallySelected of [false, true]) {
		test(`${direction} Ctrl-drag turns pages without selecting text (existing selection: ${initiallySelected})`, async ({
			page,
			isMobile,
		}) => {
			test.skip(isMobile, "Uses a desktop mouse drag.");
			await page.goto(`/?example=${direction}-hold-hotkeys&test-initialTurnedLeaves=0,1`);
			const book = page.locator(`.${direction === "ltr" ? "en" : "he"}-book.flipbook`);
			const button = page.locator(".flipbook-toolbar-mouse-mode");
			await expect(button).toHaveAttribute("aria-pressed", "true");
			const currentPage = book.locator('.page[data-page-index="4"]');
			await expect(currentPage).toHaveClass(/current-page/);
			const text = currentPage
				.locator(direction === "ltr" ? ".en-page p" : ".bible-content")
				.first();
			await expect(text).toBeVisible();
			await page.evaluate(() => document.fonts.ready);
			// Use a real word near the top so the gesture starts on text, not empty paper.
			const word = await text.evaluate((element) => {
				const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
				const node = walker.nextNode();
				if (!node) throw new Error("No page text found");
				const start = node.textContent?.search(/\S/) ?? 0;
				const range = document.createRange();
				range.setStart(node, start);
				range.setEnd(node, start + 4);
				const rect = range.getBoundingClientRect();
				return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
			});
			if (initiallySelected) {
				await page.mouse.dblclick(word.x, word.y);
				expect(await page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(false);
			}
			await page.keyboard.down("Control");
			await expect(button).toHaveAttribute("aria-pressed", "false");
			await expect(button).toBeDisabled();
			await page.mouse.move(word.x, word.y);
			await page.mouse.down();
			expect(await page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(true);
			await page.waitForTimeout(550);
			const box = await currentPage.boundingBox();
			if (!box) throw new Error("Current page missing");
			const endX = word.x + (direction === "ltr" ? -1 : 1) * box.width * 1.3;
			await page.mouse.move(endX, word.y, { steps: 12 });
			await expect(book.locator(".page--folded")).toHaveCount(2);
			expect(await page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(true);
			await page.mouse.up();
			await expect(book.locator('.page[data-page-index="6"]')).toHaveClass(/current-page/);
			await page.keyboard.up("Control");
			await expect(button).toHaveAttribute("aria-pressed", "true");
		});
	}
}

test("turns a page while Ctrl is held and restores text selection afterwards", async ({
	page,
	isMobile,
}) => {
	test.skip(isMobile, "Uses a desktop mouse drag.");
	await page.goto("/?example=ltr-hold-hotkeys&test-initialTurnedLeaves=0,1");
	const book = page.locator(".en-book.flipbook");
	const button = page.locator(".flipbook-toolbar-mouse-mode");
	await expect(button).toHaveAttribute("aria-pressed", "true");
	const currentPage = book.locator('.page[data-page-index="4"]');
	await expect(currentPage).toHaveClass(/current-page/);
	const box = await currentPage.boundingBox();
	if (!box) throw new Error("Current page missing");
	await page.keyboard.down("Control");
	await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.65);
	await page.mouse.down();
	await page.waitForTimeout(550);
	await page.mouse.move(box.x - box.width * 0.5, box.y + box.height * 0.65, { steps: 12 });
	await page.mouse.up();
	await expect(book.locator('.page[data-page-index="6"]')).toHaveClass(/current-page/);
	await page.keyboard.up("Control");
	await expect(button).toHaveAttribute("aria-pressed", "true");
	await expect(book).toHaveClass(/flipbook--select-text/);
});

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
	const bookBox = await book.boundingBox();
	if (!bookBox) throw new Error("Book missing while selecting text");
	await page.mouse.move(bookBox.x + bookBox.width * 0.01, word.y, { steps: 12 });
	await expect(book.locator(".page--folded")).toHaveCount(0);
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
	const heldTransform = () =>
		book.evaluate((element) => {
			const turningPage = Array.from(element.querySelectorAll<HTMLElement>(".page")).find((page) =>
				page.classList.contains("page--folded"),
			);
			return turningPage?.style.transform ?? "";
		});
	await expect(book.locator(".page--folded")).toHaveCount(2);
	const transform = await heldTransform();
	expect(transform).not.toBe("");
	await page.waitForTimeout(550);
	expect(await heldTransform()).toBe(transform);
	await page.mouse.move(startX, y, { steps: 10 });
	await expect(book.locator(".page--folded")).toHaveCount(0);
	await page.mouse.up();
	await expect(currentPage).toHaveClass(/current-page/);
});

test("selection icon follows Hebrew locale and keeps caret ahead of letters", async ({ page }) => {
	await page.goto("/?example=rtl-comprehensive");
	const button = page.getByRole("button", { name: "בחירת טקסט עם העכבר" });
	await expect(button).toBeVisible();
	await expect(button.locator(".flipbook-toolbar-mouse-mode-icon")).toContainText("אב");
	const caret = button.locator(".flipbook-toolbar-mouse-mode-caret");
	await expect(caret).toBeVisible();
	await expect(caret).toHaveCSS("mask-image", /text-caret\.png/);
	await expect(button.locator(".flipbook-toolbar-mouse-mode-icon")).toHaveCSS("transform", "none");
});
