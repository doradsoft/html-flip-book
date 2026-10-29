import { expect, type Locator, test } from "./fixtures/coverage-test";

const bookClass = (direction: string) => `.${direction === "ltr" ? "en" : "he"}-book.flipbook`;

/** The dev server can show a typecheck overlay that intercepts pointer input. */
async function clearDevOverlay(page: import("./fixtures/coverage-test").Page) {
	await page.evaluate(() => document.querySelector("vite-plugin-checker-error-overlay")?.remove());
}

/** Convert a page's content root into a bounded panel: fixed header and
 *  footer around an independently scrolling inner pane. */
async function makeBoundedPanel(pageRoot: Locator) {
	await pageRoot.evaluate((root) => {
		root.classList.add("flipbook-page-bounded");
		root.setAttribute("style", "display:flex;flex-direction:column");
		const doc = root.ownerDocument;
		const header = doc.createElement("div");
		header.style.cssText = "flex:none;height:40px";
		header.textContent = "header";
		const pane = doc.createElement("div");
		pane.className = "pane";
		pane.style.cssText = "flex:1;min-height:0;overflow-y:auto";
		const list = doc.createElement("div");
		list.style.height = "2000px";
		list.textContent = "long content";
		pane.appendChild(list);
		const footer = doc.createElement("div");
		footer.style.cssText = "flex:none;height:40px";
		footer.textContent = "footer";
		root.replaceChildren(header, pane, footer);
	});
}

for (const direction of ["ltr", "rtl"] as const) {
	test(`${direction}: bounded panel keeps the root at page height and scrolls only its inner pane`, async ({
		page,
	}) => {
		await page.goto(`/?example=${direction}-comprehensive`);
		const book = page.locator(bookClass(direction));
		await clearDevOverlay(page);
		// Flip to the first interior spread — the cover's back face stays hidden.
		await page.locator(".flipbook-toolbar-next").click();
		const interior = book.locator(".page.current-page:not(.page--cover)").first();
		await expect(interior).toBeVisible();
		// Wait for the flip animation to settle — the turning cover still covers
		// the spread mid-flight and would swallow pointer input.
		await expect(book.locator(".page--flipping")).toHaveCount(0);

		const root = interior.locator(".flipbook-page-content > *").first();
		const scrollport = interior.locator(".flipbook-page-scrollport");
		await makeBoundedPanel(root);
		const pane = root.locator(".pane");

		// The root is pinned to the page box — the scrollport has nothing to scroll.
		const [rootH, pageH, portScrollable] = await Promise.all([
			root.evaluate((el) => el.getBoundingClientRect().height),
			interior.evaluate((el) => el.getBoundingClientRect().height),
			scrollport.evaluate((el) => el.scrollHeight - el.clientHeight),
		]);
		expect(rootH).toBeCloseTo(pageH, 0);
		expect(portScrollable).toBe(0);

		const header = root.locator(":scope > div").first();
		const footer = root.locator(":scope > div").last();
		const headerTopBefore = await header.evaluate((el) => el.getBoundingClientRect().top);

		// Wheel over the panel: only the inner pane scrolls. The checker overlay
		// mounts asynchronously — remove it again before pointer input.
		await clearDevOverlay(page);
		const box = await pane.boundingBox();
		if (!box) throw new Error("pane bounds unavailable");
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.wheel(0, 300);
		await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
		expect(await scrollport.evaluate((el) => el.scrollTop)).toBe(0);

		// Header and footer stay stationary while the pane scrolls underneath.
		const [headerTop, footerBottom, pageTop, pageBottom] = await Promise.all([
			header.evaluate((el) => el.getBoundingClientRect().top),
			footer.evaluate((el) => el.getBoundingClientRect().bottom),
			interior.evaluate((el) => el.getBoundingClientRect().top),
			interior.evaluate((el) => el.getBoundingClientRect().bottom),
		]);
		expect(headerTop).toBeCloseTo(headerTopBefore, 0);
		expect(headerTop).toBeGreaterThanOrEqual(pageTop);
		expect(footerBottom).toBeLessThanOrEqual(pageBottom + 1);
	});

	test(`${direction}: untagged roots still scroll document-style`, async ({ page }) => {
		await page.goto(`/?example=${direction}-comprehensive`);
		const book = page.locator(bookClass(direction));
		await clearDevOverlay(page);
		const interior = book.locator('.page[data-page-index="1"]');
		await expect(interior).toBeVisible();
		const root = interior.locator(".flipbook-page-content > *").first();
		// Same panel without the class — root must grow past the page height.
		await root.evaluate((el) => {
			el.setAttribute("style", "display:flex;flex-direction:column");
			const doc = el.ownerDocument;
			const pane = doc.createElement("div");
			pane.style.cssText = "flex:1;min-height:0;overflow-y:auto";
			const list = doc.createElement("div");
			list.style.height = "2000px";
			pane.appendChild(list);
			el.replaceChildren(doc.createElement("div"), pane);
		});
		const portScrollable = await interior
			.locator(".flipbook-page-scrollport")
			.evaluate((el) => el.scrollHeight - el.clientHeight);
		expect(portScrollable).toBeGreaterThan(0);
	});
}
