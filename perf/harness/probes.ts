import type { Page } from "@playwright/test";

/**
 * Per-leg measurements (issue #289). Every sample is one cold browser
 * context: real clocks, real animations, no coverage instrumentation.
 *
 * initMs   — Node-side wall clock from navigation start to the first
 *            `.page` being visible. This is a whole-mount measurement —
 *            it includes navigation, React mount and library init — and is
 *            reported as such, never as "library init alone".
 * turnMs   — Node-side wall clock from the toolbar next click until the
 *            `.current-page` marker moves to a different page element.
 * rafGaps  — raw requestAnimationFrame callback gaps (ms) recorded in-page
 *            for the duration of the turn. These are callback cadence /
 *            jank proxies: gaps over 16.7ms are not proof of dropped
 *            presented frames.
 */
export interface LegSample {
	initMs: number;
	turnMs: number;
	rafGaps: number[];
	/** Page index before the turn and after — validity, not a metric. */
	pageBefore: string | null;
	pageAfter: string | null;
}

const CURRENT_PAGE_INDEX =
	"document.querySelector('.page.current-page')?.getAttribute('data-page-index') ?? null";

/** Navigate cold and wait for the first rendered page. */
export async function measureInit(page: Page, url: string): Promise<number> {
	const t0 = Date.now();
	await page.goto(url, { waitUntil: "domcontentloaded" });
	await page.waitForSelector(".flipbook .page", { state: "visible", timeout: 60_000 });
	return Date.now() - t0;
}

async function installRafRecorder(page: Page): Promise<void> {
	await page.evaluate(() => {
		const w = window as unknown as { __rafGaps: number[]; __rafStop: boolean };
		w.__rafGaps = [];
		w.__rafStop = false;
		let last: number | undefined;
		const record = (t: number) => {
			if (last !== undefined) w.__rafGaps.push(t - last);
			last = t;
			if (!w.__rafStop) requestAnimationFrame(record);
		};
		requestAnimationFrame(record);
	});
}

async function drainRafGaps(page: Page): Promise<number[]> {
	return page.evaluate(() => {
		const w = window as unknown as { __rafGaps: number[]; __rafStop: boolean };
		w.__rafStop = true;
		return w.__rafGaps;
	});
}

/**
 * One forward toolbar turn. The previous current-page index is captured
 * before the click so completion is the marker moving — a turn that does
 * not advance is invalid, not "fast".
 */
export async function measureTurn(page: Page): Promise<Omit<LegSample, "initMs">> {
	const pageBefore = await page.evaluate(CURRENT_PAGE_INDEX);
	await installRafRecorder(page);
	const t0 = Date.now();
	await page.locator(".flipbook-toolbar-next").click();
	await page.waitForFunction(
		(before) =>
			document.querySelector(".page.current-page")?.getAttribute("data-page-index") !== before,
		pageBefore,
		{ timeout: 30_000 },
	);
	const turnMs = Date.now() - t0;
	const rafGaps = await drainRafGaps(page);
	const pageAfter = await page.evaluate(CURRENT_PAGE_INDEX);
	return { turnMs, rafGaps, pageBefore, pageAfter };
}
