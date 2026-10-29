import { expect, type Locator, type Page, test } from "./fixtures/coverage-test";

type Bounds = { x: number; y: number; width: number; height: number };
type Side = "left" | "right";

async function boundsOf(locator: Locator): Promise<Bounds> {
	const bounds = await locator.boundingBox();
	if (!bounds) throw new Error("Visible element bounds unavailable");
	return bounds;
}

function snapshot(surfaces: Locator) {
	return surfaces.evaluateAll((elements) =>
		elements.map((element) => [
			(element as HTMLElement).style.transform,
			(element as HTMLElement).style.clipPath,
			(element as HTMLElement).style.getPropertyValue("--fold-shading"),
			(element as HTMLElement).style.getPropertyValue("--inner-shadow-shadow"),
			(element as HTMLElement).style.getPropertyValue("--inner-shadow-highlight"),
		]),
	);
}

async function move(page: Page, x: number, y: number) {
	await page.mouse.move(x, y);
	// Let the throttled mousemove run before asserting that nothing changed.
	await page.waitForTimeout(40);
}

async function expectSmallCurl(flap: Locator) {
	const curlSize = await flap.evaluate((element) => {
		const points = (element as HTMLElement).style.clipPath
			.slice("polygon(".length, -1)
			.split(",")
			.map((point) => point.trim().split(/\s+/).map(Number.parseFloat));
		const xs = points.map((point) => point[0]);
		const ys = points.map((point) => point[1]);
		return {
			width: (Math.max(...xs) - Math.min(...xs)) / element.clientWidth,
			height: (Math.max(...ys) - Math.min(...ys)) / element.clientHeight,
		};
	});
	expect(curlSize.width).toBeLessThan(0.15);
	expect(curlSize.height).toBeLessThan(0.15);
}

async function captureCorner(surface: Locator, direction: string, side: Side, cornerY: number) {
	const directory = process.env.HOVER_SCREENSHOT_DIR;
	if (directory && direction === "ltr" && cornerY === 0.9) {
		await surface.screenshot({ path: `${directory}/ltr-${side}-hover.png` });
	}
}

async function checkCorners(
	page: Page,
	book: Locator,
	surface: Locator,
	frontIndex: number,
	direction: string,
	side: Side,
	edgeSign: number,
) {
	const isForward = (direction === "ltr") === (side === "right");
	const bounds = await boundsOf(surface);
	const content = surface.locator(":scope > *").first();
	const contentBounds = await boundsOf(content);
	const surfaces = book.locator(".page");
	const resting = await snapshot(surfaces);
	const edgeX = bounds.x + ((edgeSign + 1) * bounds.width) / 2;
	const insideX = edgeX - edgeSign * 3;
	try {
		for (const cornerY of [0.1, 0.9]) {
			for (let i = 0; i < 3; i++) {
				await move(page, insideX, bounds.y + bounds.height * cornerY + i);
				await expect.poll(() => snapshot(surfaces)).not.toEqual(resting);
			}
			if (frontIndex > 2) {
				const hoveredContent = await boundsOf(content);
				expect(hoveredContent.x).toBeCloseTo(contentBounds.x, 0);
				expect(hoveredContent.y).toBeCloseTo(contentBounds.y, 0);
				const flap = book.locator(
					`.page[data-page-index="${isForward ? frontIndex + 1 : frontIndex - 2}"]`,
				);
				await expectSmallCurl(flap);
				await captureCorner(surface, direction, side, cornerY);
			}
			await move(page, edgeX + edgeSign * 5, bounds.y + bounds.height * cornerY);
			await expect.poll(() => snapshot(surfaces)).toEqual(resting);
			await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
		}
	} catch (cause) {
		throw new Error(`${direction} ${side} corner preview failed`, { cause });
	}
}

async function checkPageEdge(
	page: Page,
	book: Locator,
	frontIndex: number,
	direction: string,
	side: Side,
) {
	const edgeSign = side === "right" ? 1 : -1;
	const isForward = (direction === "ltr") === (side === "right");
	const surface = book.locator(
		`.page[data-page-index="${isForward ? frontIndex : frontIndex - 1}"]`,
	);
	const bounds = await boundsOf(surface);
	const bookBounds = await boundsOf(book);
	const surfaces = book.locator(".page");
	const resting = await snapshot(surfaces);
	const edgeX = bounds.x + ((edgeSign + 1) * bounds.width) / 2;
	const insideX = edgeX - edgeSign * 3;
	const marginX = bookBounds.x + bookBounds.width / 2 + edgeSign * (bookBounds.width / 2 - 5);
	const outsidePoints = [
		...[0.1, 0.5, 0.9].map((y) => [marginX, bounds.y + bounds.height * y]),
		[edgeX + edgeSign * 5, bounds.y + bounds.height / 2],
		[insideX, bounds.y - 5],
		[insideX, bounds.y + bounds.height + 5],
	];
	for (const [x, y] of outsidePoints) {
		await move(page, x, y);
		await expect.poll(() => snapshot(surfaces)).toEqual(resting);
	}
	await checkCorners(page, book, surface, frontIndex, direction, side, edgeSign);
}

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
			for (const side of ["left", "right"] as const) {
				await checkPageEdge(page, book, frontIndex, direction, side);
			}
		});
	}
}
