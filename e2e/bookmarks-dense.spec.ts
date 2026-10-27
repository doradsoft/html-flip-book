import { expect, test } from "@playwright/test";
import {
	boundsOf,
	currentPages,
	expectExpanded,
	exposedHitPoint,
	fontFamilies,
	openDenseBookmarks,
	overlaps,
} from "./bookmark-helpers";

for (const direction of ["ltr", "rtl"] as const) {
	for (const orientation of ["perpendicular", "parallel"] as const) {
		for (const attachment of ["leaf", "pinned"] as const) {
			test(`${direction}: 60 ${orientation} ${attachment} side bookmarks remain reachable in stepped ranges`, async ({
				page,
				isMobile,
			}, testInfo) => {
				test.setTimeout(120_000);
				await page.emulateMedia({ reducedMotion: "reduce" });
				const book = await openDenseBookmarks(page, direction, orientation, attachment);
				const edge = direction === "rtl" ? "left" : "right";
				const rail = book.locator(`.flipbook-bookmarks__rail[data-edge="${edge}"]`);
				await expect(rail).toBeVisible();
				// One round-trip collects the rail state, every slot's stacking data,
				// bounds, z-index, and exposed hit point — asserting per-locator here
				// costs ~600 protocol calls and roughly doubles the test's runtime.
				const assertStack = async () => {
					const stack = await rail.evaluate((railElement) => {
						const railBounds = railElement.getBoundingClientRect();
						const xOffsetsOf = (rect: DOMRect, edge: string | undefined, peek: number) => {
							const xs = [rect.width / 2];
							if (peek > 0) xs.unshift(edge === "left" ? peek / 2 : rect.width - peek / 2);
							for (let inset = 1; inset < rect.width; inset += 1) {
								xs.push(edge === "left" ? inset : rect.width - inset);
							}
							return xs;
						};
						const yOffsetsOf = (rect: DOMRect) => {
							const ys = [rect.height / 2];
							for (let offset = 1; offset < rect.height; offset += 1) ys.push(offset);
							return ys;
						};
						const hitPointOf = (button: HTMLElement) => {
							const slotElement = button.closest<HTMLElement>(".flipbook-bookmark-slot") ?? button;
							const rect = slotElement.getBoundingClientRect();
							const peek = Number(slotElement.dataset.stackPeek);
							for (const y of yOffsetsOf(rect)) {
								for (const x of xOffsetsOf(rect, button.dataset.edge, peek)) {
									const point = { x: Math.round(rect.left + x), y: Math.round(rect.top + y) };
									const target = document.elementFromPoint(point.x, point.y);
									if (target?.closest(".flipbook-bookmark") === button) return point;
								}
							}
							return null;
						};
						const slots = Array.from(
							railElement.querySelectorAll<HTMLElement>(".flipbook-bookmark"),
						).map((button) => {
							const slotElement = button.closest<HTMLElement>(".flipbook-bookmark-slot") ?? button;
							const rect = slotElement.getBoundingClientRect();
							return {
								id: button.dataset.bookmarkId,
								layer: slotElement.dataset.stackLayer,
								row: slotElement.dataset.stackRow,
								peek: Number(slotElement.dataset.stackPeek),
								bounds: rect.toJSON(),
								zIndex: Number(getComputedStyle(slotElement).zIndex),
								hitPoint: hitPointOf(button),
							};
						});
						const byId = new Map(slots.map((slot) => [slot.id, slot]));
						const first = byId.get("dense-0");
						const second = byId.get("dense-1");
						let gapTarget: string | null = null;
						if (first && second) {
							const gapPoint = {
								x: first.bounds.x + first.bounds.width / 2,
								y: (first.bounds.y + first.bounds.height + second.bounds.y) / 2,
							};
							gapTarget =
								document
									.elementFromPoint(gapPoint.x, gapPoint.y)
									?.closest<HTMLElement>(".flipbook-bookmark")?.dataset.bookmarkId ?? null;
						}
						return {
							capacity: Number(railElement.dataset.stackCapacity),
							layers: Number(railElement.dataset.stackLayers),
							pitch: Number(railElement.dataset.stackPitch),
							stagger: Number(railElement.dataset.stackStagger),
							scrollHeight: railElement.scrollHeight,
							scrollTop: railElement.scrollTop,
							clientHeight: railElement.clientHeight,
							top: railBounds.top,
							bottom: railBounds.bottom,
							slots,
							gapTarget,
						};
					});
					const { capacity, layers, pitch, stagger, slots } = stack;
					expect(capacity).toBeGreaterThan(0);
					expect(capacity).toBeLessThan(60);
					expect(layers).toBe(Math.ceil(60 / capacity));
					expect(pitch).toBeGreaterThan(0);
					expect(stagger).toBeCloseTo(pitch / 2, 1);
					expect(stack.scrollHeight).toBeLessThanOrEqual(stack.clientHeight + 1);
					expect(stack.scrollTop).toBe(0);
					const byId = new Map(slots.map((slot) => [slot.id, slot]));
					const slotAt = (index: number) => {
						const found = byId.get(`dense-${index}`);
						if (!found) throw new Error(`dense-${index} missing from collected slots`);
						return found;
					};
					for (let index = 0; index < 60; index++) {
						const slot = slotAt(index);
						expect(slot.layer).toBe(String(Math.floor(index / capacity)));
						expect(slot.row).toBe(String(index % capacity));
						expect(slot.peek).toBeGreaterThan(0);
						expect(slot.hitPoint, `dense-${index} must expose a hit target`).not.toBeNull();
						if (index >= capacity) {
							const front = slotAt(index - capacity);
							const behind = slot;
							const layer = Math.floor(index / capacity);
							expect(behind.bounds.y - front.bounds.y).toBeCloseTo(
								layer % 2 ? stagger : -stagger,
								1,
							);
							if (index >= capacity * 2) {
								const sameParity = slotAt(index - capacity * 2);
								expect(behind.bounds.y).toBeCloseTo(sameParity.bounds.y, 1);
							}
							expect(
								overlaps(
									{
										left: front.bounds.x,
										right: front.bounds.x + front.bounds.width,
										top: front.bounds.y,
										bottom: front.bounds.y + front.bounds.height,
									},
									{
										left: behind.bounds.x,
										right: behind.bounds.x + behind.bounds.width,
										top: behind.bounds.y,
										bottom: behind.bounds.y + behind.bounds.height,
									},
								),
							).toBe(true);
							expect(front.zIndex).toBeGreaterThan(behind.zIndex);
						}
						expect(slot.bounds.y).toBeGreaterThanOrEqual(stack.top - 1);
						expect(slot.bounds.y + slot.bounds.height).toBeLessThanOrEqual(stack.bottom + 1);
						if (index % capacity > 0) {
							const previous = slotAt(index - 1);
							expect(slot.bounds.y).toBeGreaterThanOrEqual(
								previous.bounds.y + previous.bounds.height,
							);
						}
					}
					if (capacity > 1) {
						expect(
							stack.gapTarget,
							"The next range must show through the front range's white gap",
						).toBe(`dense-${capacity}`);
					}
					return { capacity, layers, pitch, stagger };
				};
				const before = await assertStack();
				await page.screenshot({ path: testInfo.outputPath("bookmarks-dense-stacked-idle.png") });
				const restingPages = await currentPages(book);
				// Full pointer interactions are verified at each stacked layer's head
				// row plus the last tab; the batched assertStack scan already proved
				// every tab exposes a hit target, so clicking all 60 adds serial
				// protocol time (~90s) without covering a different code path.
				let clicks = 0;
				for (let index = 0; index < 60; index++) {
					if (index % before.capacity !== 0 && index !== 59) continue;
					const tab = page.locator(`.flipbook-bookmark[data-bookmark-id="dense-${index}"]`);
					const source = await tab.elementHandle();
					if (!source) throw new Error(`Dense bookmark ${index} disappeared`);
					const point = await exposedHitPoint(tab);
					if (!isMobile) {
						const family = await fontFamilies(tab);
						const resting = await boundsOf(tab);
						await page.mouse.move(point.x, point.y);
						await expectExpanded(tab, true);
						expect(await fontFamilies(tab)).toEqual(family);
						const full = tab.locator(".flipbook-bookmark__expanded-content strong");
						await expect(full).toHaveText((await tab.getAttribute("aria-label")) ?? "");
						await expect(full).toHaveCSS("font-family", family.button);
						const revealed = await boundsOf(tab);
						expect(revealed.width).toBeCloseTo(resting.width, 1);
						expect(revealed.height).toBeCloseTo(resting.height, 1);
						expect(await tab.evaluate((button, original) => button === original, source)).toBe(
							true,
						);
						await page.screenshot({
							path: testInfo.outputPath(
								`bookmarks-dense-layer-${Math.floor(index / before.capacity)}-hover.png`,
							),
						});
						const hit = await exposedHitPoint(tab);
						await page.mouse.click(hit.x, hit.y);
					} else {
						await page.touchscreen.tap(point.x, point.y);
					}
					clicks += 1;
					const output = page.locator("#dense-bookmark-click");
					await expect(
						output,
						await output.evaluate((element) => element.outerHTML),
					).toHaveAttribute("data-id", `dense-${index}`);
					await expect(output).toHaveAttribute("data-count", String(clicks));
					await expect(output).toHaveAttribute("data-original-object", "true");
					await page.mouse.move(0, 0);
					await expectExpanded(tab, false);
					await expect(
						book.locator(`.flipbook-bookmark[data-bookmark-id="dense-${index}"]`),
					).toHaveCount(1);
					await source.dispose();
				}
				expect(await currentPages(book)).toEqual(restingPages);
				const smallerHeight = await rail.evaluate((element) => element.clientHeight * 0.55);
				await book.evaluate((host, height) => {
					host.style.height = `${height}px`;
					host.style.bottom = "auto";
				}, smallerHeight);
				await page.waitForFunction(
					({ edge, capacity }) =>
						Number(
							document.querySelector<HTMLElement>(
								`#dense-bookmark-book .flipbook-bookmarks__rail[data-edge="${edge}"]`,
							)?.dataset.stackCapacity,
						) < capacity,
					{ edge, capacity: before.capacity },
				);
				const resized = await assertStack();
				expect(resized.capacity).toBeLessThan(before.capacity);
				expect(resized.layers).toBeGreaterThanOrEqual(before.layers);
				await page.screenshot({ path: testInfo.outputPath("bookmarks-dense-stacked-resized.png") });
				await testInfo.attach("bookmark-dense-stack-layout", {
					body: JSON.stringify({ direction, orientation, attachment, before, resized }, null, 2),
					contentType: "application/json",
				});
			});
		}
	}
}
