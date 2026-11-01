import { expect, type Locator, test } from "./fixtures/coverage-test";

// Exercise native gutter geometry; Playwright normally hides scrollbars.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

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
	test(`${direction}: starting a snapshot preserves the nested scrollbar gutter and text width`, async ({
		page,
	}, testInfo) => {
		await page.goto(`/?example=${direction}-comprehensive`);
		const book = page.locator(bookClass(direction));
		await page.locator(".flipbook-toolbar-next").click();
		await expect(book.locator(".page--flipping")).toHaveCount(0);
		const surface = book.locator('.page[data-page-index="2"]');
		const root = surface.locator(".flipbook-page-content > *").first();
		await makeBoundedPanel(root);
		await page.addStyleTag({
			content: ".pane {scrollbar-gutter:stable} .pane::-webkit-scrollbar {width:16px}",
		});
		const widths = await surface.evaluate((element) => {
			const pane = element.querySelector<HTMLElement>(".pane");
			if (!pane) throw new Error("Missing test scroll pane");
			const before = pane.clientWidth;
			const scrollbarBefore = getComputedStyle(pane, "::-webkit-scrollbar").visibility;
			const gutter = pane.offsetWidth - before;
			element.classList.add("page--flipping");
			const during = pane.clientWidth;
			const scrollbarDuring = getComputedStyle(pane, "::-webkit-scrollbar").visibility;
			element.classList.remove("page--flipping");
			return {
				before,
				during,
				gutter,
				scrollbarBefore,
				scrollbarDuring,
				idleShadowLayer: getComputedStyle(element, "::before").willChange,
			};
		});
		expect(widths.gutter).toBeGreaterThan(0);
		expect(widths.during).toBe(widths.before);
		expect(widths.scrollbarDuring).toBe(widths.scrollbarBefore);
		expect(widths.idleShadowLayer).toBe("auto");
		const beforePath = testInfo.outputPath("content-before-lock.png");
		const duringPath = testInfo.outputPath("content-during-lock.png");
		const before = await surface.screenshot({ path: beforePath });
		let during: Buffer;
		await surface.evaluate((element) => element.classList.add("page--flipping"));
		try {
			during = await surface.screenshot({ path: duringPath });
		} finally {
			await surface.evaluate((element) => element.classList.remove("page--flipping"));
		}
		for (const [name, path] of [
			["content-before-lock", beforePath],
			["content-during-lock", duringPath],
		])
			await testInfo.attach(name, { path, contentType: "image/png" });
		expect(during.equals(before), "Locking content must preserve its rendered pixels").toBe(true);
	});

	test(`${direction}: dormant buffered content preserves its scroll position when revealed again`, async ({
		page,
	}) => {
		await page.goto(`/?example=${direction}-comprehensive`);
		const book = page.locator(bookClass(direction));
		const next = page.locator(".flipbook-toolbar-next");
		const previous = page.locator(".flipbook-toolbar-prev");
		await next.click();
		await expect(book.locator(".page--flipping")).toHaveCount(0);
		const surface = book.locator('.page[data-page-index="2"]');
		const scrollport = surface.locator(":scope > .flipbook-page-scrollport");
		await surface
			.locator(".flipbook-page-content > *")
			.first()
			.evaluate((element) => {
				(element as HTMLElement).style.height = "2000px";
			});
		await scrollport.evaluate((element) => {
			element.scrollTop = 300;
		});
		expect(await scrollport.evaluate((element) => element.scrollTop)).toBe(300);
		for (let index = 0; index < 3; index++) {
			await next.click();
			await expect(book.locator(".page--flipping")).toHaveCount(0);
		}
		expect(
			await scrollport.evaluate((element) => (element as HTMLElement).style.contentVisibility),
		).toBe("hidden");
		for (let index = 0; index < 3; index++) {
			await previous.click();
			await expect(book.locator(".page--flipping")).toHaveCount(0);
		}
		await expect.poll(() => scrollport.evaluate((element) => element.scrollTop)).toBe(300);
	});

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
