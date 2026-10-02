import { expect, test } from "@playwright/test";
import { FlipBookPage } from "./fixtures/flip-book-page";

test.describe("Clicks after a native touch swipe", () => {
	test.use({ hasTouch: true, viewport: { width: 1440, height: 900 } });
	for (const direction of ["ltr", "rtl"] as const) {
		test(`allows the first content tap after turning a ${direction} page`, async ({ page }) => {
			const book = new FlipBookPage(page, { direction });
			await book.goto();
			await expect(book.getPage(0)).toHaveClass(/current-page/);
			const rect = await book.container.boundingBox();
			if (!rect) throw new Error("Book is not visible");
			const x = Math.round(rect.x + rect.width * (direction === "ltr" ? 0.75 : 0.25));
			const y = Math.round(rect.y + rect.height / 2);
			const distance = Math.round(rect.width * (direction === "ltr" ? -0.6 : 0.6));
			const client = await page.context().newCDPSession(page);
			await client.send("Input.dispatchTouchEvent", {
				type: "touchStart",
				touchPoints: [{ x, y }],
			});
			for (let step = 1; step <= 8; step++) {
				await client.send("Input.dispatchTouchEvent", {
					type: "touchMove",
					touchPoints: [{ x: x + Math.round((distance * step) / 8), y }],
				});
			}
			await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
			await expect(book.getPage(2)).toHaveClass(/current-page/);
			// An ordinary child button stands in for any consumer's content action.
			await book.getPage(2).evaluate((element) => {
				const button = document.createElement("button");
				button.textContent = "Open content";
				button.style.cssText = "position:absolute;top:50%;left:25%;z-index:10";
				button.addEventListener("click", () => {
					button.textContent = "Content opened";
				});
				element.appendChild(button);
			});
			await book.getPage(2).getByRole("button", { name: "Open content" }).tap();
			await expect(book.getPage(2).getByRole("button", { name: "Content opened" })).toBeVisible();
		});
	}
});
