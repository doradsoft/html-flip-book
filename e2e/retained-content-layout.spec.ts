import { expect, test } from "./fixtures/coverage-test";

for (const direction of ["ltr", "rtl"] as const) {
	test(`${direction}: retained chapters preserve geometry and stay inaccessible until revealed`, async ({
		page,
	}) => {
		await page.goto(`/?example=${direction}-comprehensive`);
		await expect(page.locator(".flipbook")).toBeVisible();
		await page.evaluate(async (readingDirection) => {
			const moduleUrl = performance
				.getEntriesByType("resource")
				.find((entry) => new URL(entry.name).pathname.endsWith("/base/src/flipbook.ts"))?.name;
			if (!moduleUrl) throw new Error("The example's FlipBook module has not loaded");
			const { FlipBook } = await import(moduleUrl);
			const host = document.createElement("div");
			host.id = "retained-book";
			host.style.cssText = "position:fixed;inset:20px;z-index:100000;background:white";
			for (let index = 0; index < 24; index++) {
				const surface = document.createElement("div");
				surface.className = "page";
				const port = document.createElement("div");
				port.className = "flipbook-page-scrollport";
				const content = document.createElement("div");
				content.className = "flipbook-page-content";
				const button = document.createElement("button");
				button.textContent = `Chapter ${index}`;
				content.append(button);
				for (let line = 0; line < 40; line++) {
					const paragraph = document.createElement("p");
					paragraph.textContent = "Original chapter text keeps its spacing and width.";
					content.append(paragraph);
				}
				port.append(content);
				surface.append(port);
				host.append(surface);
			}
			document.body.append(host);
			const book = new FlipBook({
				pagesCount: 24,
				direction: readingDirection,
				leavesBuffer: 0,
				keepPageContentLayout: true,
				coverPageIndices: "auto",
				enableHistory: false,
				initialTurnedLeaves: [0, 1, 2, 3, 4, 5, 6],
			});
			book.render(host);
			Reflect.set(window, "__retainedBook", book);
		}, direction);
		const host = page.locator("#retained-book");
		const dormant = host.locator('[data-page-index="18"] > .flipbook-page-scrollport');
		expect(
			await dormant.evaluate((element) => (element as HTMLElement).style.contentVisibility),
		).toBe("visible");
		await expect(dormant).toHaveAttribute("inert", "");
		await expect(dormant).toHaveAttribute("aria-hidden", "true");
		expect(await host.ariaSnapshot()).not.toContain("Chapter 18");
		expect(
			await dormant.locator("button").evaluate((button) => {
				button.focus();
				return button.ownerDocument.activeElement === button;
			}),
		).toBe(false);
		const original = host.locator('[data-page-index="14"] .flipbook-page-content p').first();
		const before = await original.boundingBox();
		await original.evaluate((element) => Reflect.set(window, "__retainedOriginal", element));
		await page.evaluate(() => Reflect.get(window, "__retainedBook").jumpToPage(17));
		await expect(dormant).not.toHaveAttribute("inert");
		await expect(dormant).not.toHaveAttribute("aria-hidden");
		expect(
			await dormant.locator("button").evaluate((button) => {
				button.focus();
				return button.ownerDocument.activeElement === button;
			}),
		).toBe(true);
		const retiredPort = host.locator('[data-page-index="14"] > .flipbook-page-scrollport');
		await retiredPort.evaluate((element) => {
			element.scrollTop = 120;
		});
		await page.evaluate(() => Reflect.get(window, "__retainedBook").jumpToPage(23));
		expect(
			await retiredPort.evaluate((element) => (element as HTMLElement).style.contentVisibility),
		).toBe("hidden");
		await page.evaluate(() => Reflect.get(window, "__retainedBook").jumpToPage(13));
		expect(await retiredPort.evaluate((element) => element.scrollTop)).toBe(120);
		await retiredPort.evaluate((element) => {
			element.scrollTop = 0;
		});
		expect(
			await original.evaluate((element) => element === Reflect.get(window, "__retainedOriginal")),
		).toBe(true);
		expect(await original.boundingBox()).toEqual(before);
		await page.evaluate(() => {
			Reflect.get(window, "__retainedBook").destroy();
			Reflect.deleteProperty(window, "__retainedBook");
			Reflect.deleteProperty(window, "__retainedOriginal");
		});
		await expect(host.locator(".flipbook-layout-dormant")).toHaveCount(0);
	});
}
