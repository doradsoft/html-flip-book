import { expect, type Locator, test } from "./fixtures/coverage-test";

const bookClass = (direction: string) => `.${direction === "ltr" ? "en" : "he"}-book.flipbook`;

async function hoverEdge(target: Locator, side: "left" | "right") {
	const bounds = await target.boundingBox();
	if (!bounds) throw new Error("Visible page bounds unavailable");
	const edgeX = bounds.x + bounds.width * (side === "right" ? 0.98 : 0.02);
	await target.page().mouse.move(edgeX, bounds.y + bounds.height * 0.15);
}

async function pseudoStyle(target: Locator, pseudo: "::before" | "::after") {
	return target.evaluate((element, sel) => {
		const style = getComputedStyle(element, sel);
		return {
			opacity: Number.parseFloat(style.opacity),
			zIndex: style.zIndex,
			pointerEvents: style.pointerEvents,
		};
	}, pseudo);
}

for (const direction of ["ltr", "rtl"] as const) {
	test(`${direction}: confines animated shading values to the paper surface`, async ({ page }) => {
		await page.goto(`/?example=${direction}-comprehensive`);
		const book = page.locator(bookClass(direction));
		const interior = book.locator('.page[data-page-index="1"]');
		await expect(interior).toBeVisible();
		const values = await interior.evaluate((surface) => {
			const content = surface.ownerDocument.createElement("div");
			const word = surface.ownerDocument.createElement("span");
			content.append(word);
			surface.append(content);
			const pageElement = surface as HTMLElement;
			pageElement.style.setProperty("--inner-shadow-shadow", "0.7");
			pageElement.style.setProperty("--inner-shadow-highlight", "0.4");
			pageElement.style.setProperty("--inner-shadow-edge", "left");
			pageElement.style.setProperty("--fold-shading", "linear-gradient(black, white)");
			const style = getComputedStyle(word);
			return {
				pageShadow: getComputedStyle(surface).getPropertyValue("--inner-shadow-shadow").trim(),
				shadow: style.getPropertyValue("--inner-shadow-shadow").trim(),
				highlight: style.getPropertyValue("--inner-shadow-highlight").trim(),
				edge: style.getPropertyValue("--inner-shadow-edge").trim(),
				fold: style.getPropertyValue("--fold-shading").trim(),
			};
		});
		expect(values.pageShadow).toBe("0.7");
		expect(values).toMatchObject({ shadow: "0", highlight: "0", edge: "right", fold: "none" });
	});

	test(`${direction}: animation properties do not inherit through unrelated descendants`, async ({
		page,
	}) => {
		await page.goto(`/?example=${direction}-comprehensive`);
		const values = await page.evaluate(() => {
			const parent = document.createElement("div");
			const child = document.createElement("span");
			parent.append(child);
			document.body.append(parent);
			parent.style.setProperty("--inner-shadow-shadow", "0.7");
			parent.style.setProperty("--inner-shadow-highlight", "0.4");
			parent.style.setProperty("--inner-shadow-edge", "left");
			parent.style.setProperty("--fold-shading", "linear-gradient(black, white)");
			const style = getComputedStyle(child);
			const result = [
				"--inner-shadow-shadow",
				"--inner-shadow-highlight",
				"--inner-shadow-edge",
				"--fold-shading",
			].map((name) => style.getPropertyValue(name).trim());
			parent.remove();
			return result;
		});
		expect(values).toEqual(["0", "0", "right", "none"]);
	});

	test(`${direction}: shading overlays paint above positioned opaque content`, async ({ page }) => {
		await page.goto(`/?example=${direction}-comprehensive`);
		const book = page.locator(bookClass(direction));
		const interior = book.locator('.page[data-page-index="1"]');
		await expect(interior).toBeVisible();

		// The consumer scenario: a full-size, opaque, positioned content panel.
		await interior.evaluate((pageEl) => {
			const panel = pageEl.ownerDocument.createElement("div");
			panel.style.cssText = "position:relative;width:100%;height:100%;background:#fff;z-index:auto";
			pageEl.appendChild(panel);
		});

		await hoverEdge(interior, direction === "ltr" ? "right" : "left");

		await expect
			.poll(async () => (await pseudoStyle(interior, "::before")).opacity, {
				message: "inner shadow should engage on hover",
			})
			.toBeGreaterThan(0);

		const shadow = await pseudoStyle(interior, "::before");
		const highlight = await pseudoStyle(interior, "::after");
		expect(shadow.zIndex).toBe("10");
		expect(highlight.zIndex).toBe("10");
		expect(shadow.pointerEvents).toBe("none");
		expect(highlight.pointerEvents).toBe("none");
	});
}
