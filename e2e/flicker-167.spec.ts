import { expect, test } from "@playwright/test";

/**
 * Regression for issue #167: flickering after several consecutive page flips.
 *
 * During rapid consecutive flips the leaves-buffer window slides past leaves
 * whose flip animation is still in flight. Hiding an in-flight leaf makes the
 * turning page vanish and reappear — perceived as flicker. The invariant: no
 * page may be hidden (display:none / content-visibility:hidden) while it is
 * mid-flip (page--flipping, page--folded, or an active fold clip-path).
 *
 * The repro needs more concurrent flips than `leavesBuffer` (3 here), so we
 * dispatch ArrowLeft keydowns faster than the ~800ms flip animation.
 */

interface PageSample {
	i: string | undefined;
	disp: string;
	cv: string;
	folded: boolean;
	flipping: boolean;
	clip: number;
	z: string;
}

async function sampleRapidBackFlips(
	page: import("@playwright/test").Page,
	disableShadow: boolean,
): Promise<PageSample[][]> {
	await page.goto(
		"/?example=ltr-comprehensive&test-initialTurnedLeaves=0,1,2,3,4,5,6,7,8,9,10,11,12",
	);
	await page.waitForSelector(".en-book.flipbook .page");
	if (disableShadow) {
		await page.evaluate(() => {
			document.querySelector(".en-book.flipbook")?.classList.add("flipbook--no-page-shadow");
		});
	}

	await page.evaluate(() => {
		const w = window as unknown as { __samples: PageSample[][]; __run: boolean };
		w.__samples = [];
		w.__run = true;
		const sample = () => {
			if (!w.__run) return;
			const book = document.querySelector(".en-book.flipbook");
			if (book) {
				w.__samples.push(
					Array.from(book.querySelectorAll(".page")).map((el) => {
						const e = el as HTMLElement;
						const cs = getComputedStyle(e);
						return {
							i: e.dataset.pageIndex,
							disp: e.style.display || cs.display,
							cv: e.style.contentVisibility || cs.contentVisibility,
							folded: e.classList.contains("page--folded"),
							flipping: e.classList.contains("page--flipping"),
							clip: e.style.clipPath ? 1 : 0,
							z: e.style.zIndex,
						};
					}),
				);
			}
			requestAnimationFrame(sample);
		};
		requestAnimationFrame(sample);
	});

	await page.evaluate(async () => {
		for (let i = 0; i < 14; i++) {
			document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
			await new Promise((r) => setTimeout(r, 40));
		}
	});

	await page.waitForTimeout(1500);
	return page.evaluate(() => {
		const w = window as unknown as { __samples: PageSample[][]; __run: boolean };
		w.__run = false;
		return w.__samples;
	});
}

function hiddenMidFlip(samples: PageSample[][]): string[] {
	const violations: string[] = [];
	for (const pages of samples) {
		for (const p of pages) {
			const hidden = p.disp === "none" || p.cv === "hidden";
			const midFlip = p.folded || p.flipping || p.clip === 1;
			if (hidden && midFlip) {
				violations.push(
					`page ${p.i} disp=${p.disp} cv=${p.cv} folded=${p.folded} flipping=${p.flipping} z=${p.z}`,
				);
			}
		}
	}
	return violations;
}

for (const shadows of [true, false] as const) {
	test(`no page hides mid-flip during rapid back flips (shadows ${shadows ? "on" : "off"})`, async ({
		page,
	}) => {
		const samples = await sampleRapidBackFlips(page, !shadows);
		expect(samples.length).toBeGreaterThan(0);
		expect(hiddenMidFlip(samples)).toEqual([]);
	});
}
