import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 700 } });

for (const direction of ["ltr", "rtl"] as const) {
	for (const turnedLeaves of [[0], [0, 1, 2]]) {
		test(`${direction} spread after ${turnedLeaves.length} leaves: previews only at physical page edges`, async ({
			page,
		}) => {
			await page.goto(
				`/?example=${direction}-buffer&test-initialTurnedLeaves=${turnedLeaves.join(",")}`,
			);
			const book = page.locator(`.${direction === "ltr" ? "en" : "he"}-book.flipbook`);
			const frontIndex = turnedLeaves.length * 2;
			await expect(book.locator(`.page[data-page-index="${frontIndex}"]`)).toBeVisible();
			const bookBounds = await book.boundingBox();
			if (!bookBounds) throw new Error("Book bounds unavailable");
			const surfaces = book.locator(".page");
			const snapshot = () =>
				surfaces.evaluateAll((pages) =>
					pages.map((page) => {
						const style = (page as HTMLElement).style;
						return [
							style.transform,
							style.clipPath,
							style.getPropertyValue("--fold-shading"),
							style.getPropertyValue("--inner-shadow-shadow"),
							style.getPropertyValue("--inner-shadow-highlight"),
						];
					}),
				);
			const resting = await snapshot();
			const move = async (x: number, y: number) => {
				await page.mouse.move(x, y);
				// Let the throttled mousemove run before asserting that nothing changed.
				await page.waitForTimeout(40);
			};

			for (const side of ["left", "right"] as const) {
				const isRight = side === "right";
				const isForward = (direction === "ltr") === isRight;
				const surface = book.locator(
					`.page[data-page-index="${isForward ? frontIndex : frontIndex - 1}"]`,
				);
				const bounds = await surface.boundingBox();
				if (!bounds) throw new Error("Page bounds unavailable");
				const content = surface.locator(":scope > *").first();
				const contentBounds = await content.boundingBox();
				if (!contentBounds) throw new Error("Page content bounds unavailable");
				const edgeX = bounds.x + (isRight ? bounds.width : 0);
				const insideX = edgeX + (isRight ? -3 : 3);
				for (const y of [0.1, 0.5, 0.9]) {
					await move(
						bookBounds.x + (isRight ? bookBounds.width - 5 : 5),
						bounds.y + bounds.height * y,
					);
					await expect.poll(snapshot).toEqual(resting);
				}
				for (const [x, y] of [
					[edgeX + (isRight ? 5 : -5), bounds.y + bounds.height / 2],
					[insideX, bounds.y - 5],
					[insideX, bounds.y + bounds.height + 5],
				]) {
					await move(x, y);
					await expect.poll(snapshot).toEqual(resting);
				}
				for (const cornerY of [0.1, 0.9]) {
					for (let i = 0; i < 3; i++) {
						await move(insideX, bounds.y + bounds.height * cornerY + i);
						await expect.poll(snapshot).not.toEqual(resting);
					}
					if (turnedLeaves.length > 1) {
						const hoveredContent = await content.boundingBox();
						if (!hoveredContent) throw new Error("Hovered page content unavailable");
						expect(hoveredContent.x).toBeCloseTo(contentBounds.x, 0);
						expect(hoveredContent.y).toBeCloseTo(contentBounds.y, 0);
						const flap = book.locator(
							`.page[data-page-index="${isForward ? frontIndex + 1 : frontIndex - 2}"]`,
						);
						const curlSize = await flap.evaluate((element) => {
							const page = element as HTMLElement;
							const points = page.style.clipPath
								.slice("polygon(".length, -1)
								.split(",")
								.map((point) => point.trim().split(/\s+/).map(Number.parseFloat));
							const xs = points.map((point) => point[0]);
							const ys = points.map((point) => point[1]);
							return {
								width: (Math.max(...xs) - Math.min(...xs)) / Number.parseFloat(page.style.width),
								height: (Math.max(...ys) - Math.min(...ys)) / Number.parseFloat(page.style.height),
							};
						});
						expect(curlSize.width).toBeLessThan(0.15);
						expect(curlSize.height).toBeLessThan(0.15);
						const directory = process.env.HOVER_SCREENSHOT_DIR;
						if (directory && direction === "ltr" && cornerY === 0.9) {
							await surface.screenshot({ path: `${directory}/ltr-${side}-hover.png` });
						}
					}
					await move(edgeX + (isRight ? 5 : -5), bounds.y + bounds.height * cornerY);
					await expect.poll(snapshot).toEqual(resting);
					await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
				}
			}
		});
	}
}
