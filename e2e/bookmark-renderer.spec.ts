import { expect, type Locator, test } from "@playwright/test";

// Scan the tab's slot for a point that hit-tests back to the tab itself —
// overlapping rail tabs may cover its geometric center.
async function exposedPoint(tab: Locator) {
	return tab.evaluate((button) => {
		const slot = button.closest(".flipbook-bookmark-slot") ?? button;
		const rect = slot.getBoundingClientRect();
		for (let y = 1; y < rect.height; y += 1) {
			for (let x = 1; x < rect.width; x += 1) {
				const point = { x: rect.left + x, y: rect.top + y };
				if (document.elementFromPoint(point.x, point.y)?.closest(".flipbook-bookmark") === button)
					return point;
			}
		}
		throw new Error(`No exposed hit point for ${(button as HTMLElement).dataset.bookmarkId}`);
	});
}

for (const direction of ["ltr", "rtl"] as const) {
	test(`${direction}: expanded renderer content stays within the reveal bounds`, async ({
		page,
	}) => {
		await page.goto(`/?example=${direction}-bookmarks`);
		const tabs = page.locator(".flipbook-bookmark");
		await expect(tabs.first()).toBeVisible();
		let point: { x: number; y: number } | undefined;
		for (const tab of await tabs.all()) {
			try {
				point = await exposedPoint(tab);
				break;
			} catch {
				// fully covered by neighbours — try the next tab
			}
		}
		if (!point) throw new Error("No bookmark tab exposes a hit point");
		await page.mouse.move(point.x, point.y);

		const expanded = page.locator(
			".flipbook-bookmark-preview .flipbook-bookmark__expanded-content",
		);
		await expect(expanded).toBeVisible();

		// The adapter's portal target must not form its own layout box — otherwise
		// a flex/grid child's automatic minimum size blocks ellipsis.
		const slotDisplay = await expanded
			.locator(".flipbook-bookmark__renderer")
			.evaluate((el) => getComputedStyle(el).display);
		expect(slotDisplay).toBe("contents");

		// Force the truncation scenario from the issue: a long, single-line title
		// in a renderer already styled for ellipsis.
		await expanded.locator(".example-bookmark-full strong").evaluate((el) => {
			el.textContent =
				"A very long chapter title that must truncate inside the bounded expanded bookmark width";
		});

		// The consumer's content must shrink to the container instead of being
		// clipped by its overflow:hidden (the pre-fix symptom).
		await expect
			.poll(
				() =>
					expanded.evaluate((box) => {
						const content = box.querySelector<HTMLElement>(".example-bookmark-full");
						if (!content) throw new Error("expanded renderer content missing");
						return content.getBoundingClientRect().width - box.clientWidth;
					}),
				{ message: "renderer content must fit the expanded bounds" },
			)
			.toBeLessThanOrEqual(0);

		// ...and the ellipsis actually engages on the title element.
		const truncated = await expanded
			.locator(".example-bookmark-full strong")
			.evaluate((el) => el.scrollWidth > el.clientWidth);
		expect(truncated).toBe(true);
	});
}
