import type { Page } from "@playwright/test";
import { median, percentile } from "./stats.mts";
import { collectResourceGarbage, openFixture, resourceMetrics } from "./harness.mts";
import { inputProbePath } from "./input-probe.mts";

/**
 * Scenario drivers (issues #290/#291): one sample = one fresh fixture page
 * load against one variant bundle. Drivers return a flat metric map; the
 * paired statistics and verdicts live in compare.mts.
 */

export interface MetricSpec {
	key: string;
	label: string;
	/** Regression requires |medianDiff| > thresholdAbs AND ratio > thresholdRatio. */
	thresholdAbs: number;
	thresholdRatio: number;
	/** Signed metrics (leak deltas) legitimately go negative — do not drop them. */
	signed?: boolean;
}

export interface SampleResult {
	metrics: Record<string, number>;
	valid: boolean;
	invalidReason?: string;
	unsupported?: string[];
}

export interface ScenarioDriver {
	name: string;
	sizes: number[];
	metricsFor(size: number): MetricSpec[];
	runSample(page: Page, dist: string, size: number, delayMs: number): Promise<SampleResult>;
	/**
	 * Optional instrumented pass: leak/cleanup signals. Runs paired across
	 * variants on fresh pages (--audit-pairs repeats per side, plus an A/A
	 * pair set for the noise floor).
	 */
	audit?(page: Page, dist: string, size: number): Promise<Record<string, number>>;
}

// ---------------------------------------------------------------------------
// #290: page-turn smoothness and input latency
// ---------------------------------------------------------------------------

function pctAbove(xs: number[], budget: number): number {
	return xs.length === 0 ? -1 : xs.filter((x) => x > budget).length / xs.length;
}

interface TurnSample {
	gaps: number[];
	turnMs: number[];
	inputLatencies: number[];
	longtaskCount: number;
	longtaskTotal: number;
	loafCount: number | "unsupported";
	rafCallbacks: number;
	completedTurns: number;
	expectedTurns: number;
	initialPageIndex: number;
	finalPageIndex: number;
}

const INPUT_PROBES = 3;

const turnMetrics = (): MetricSpec[] => [
		{ key: "raf_gap_median_ms", label: "rAF gap median", thresholdAbs: 4, thresholdRatio: 1.5 },
		{ key: "raf_gap_p95_ms", label: "rAF gap p95", thresholdAbs: 16.7, thresholdRatio: 1.5 },
		{ key: "raf_gap_p99_ms", label: "rAF gap p99", thresholdAbs: 33.3, thresholdRatio: 1.5 },
		{ key: "raf_gap_worst_ms", label: "rAF gap worst", thresholdAbs: 50, thresholdRatio: 2 },
		{ key: "raf_gap_pct_16_7", label: "% gaps >16.7ms", thresholdAbs: 0.1, thresholdRatio: 3 },
		{ key: "raf_gap_pct_33_3", label: "% gaps >33.3ms", thresholdAbs: 0.05, thresholdRatio: 5 },
		{ key: "raf_gap_pct_50", label: "% gaps >50ms", thresholdAbs: 0.02, thresholdRatio: 5 },
		{ key: "turn_median_ms", label: "turn time median", thresholdAbs: 80, thresholdRatio: 1.3 },
		{ key: "turn_p95_ms", label: "turn time p95", thresholdAbs: 120, thresholdRatio: 1.4 },
		{ key: "input_median_ms", label: "input->paint median", thresholdAbs: 30, thresholdRatio: 2 },
		{ key: "input_p95_ms", label: "input->paint p95", thresholdAbs: 50, thresholdRatio: 2 },
		{ key: "longtask_count", label: "long tasks", thresholdAbs: 2, thresholdRatio: 3 },
		{ key: "longtask_total_ms", label: "long task time", thresholdAbs: 80, thresholdRatio: 2 },
		{ key: "loaf_count", label: "long animation frames", thresholdAbs: 2, thresholdRatio: 3 },
		{ key: "raf_cb_fps", label: "rAF callback fps (supplemental)", thresholdAbs: 10, thresholdRatio: 0.8 },
];

async function runTurnSample(
	page: Page,
	dist: string,
	delayMs: number,
	extraParams: Record<string, string>,
): Promise<SampleResult> {
	const t0 = Date.now();
	const mark = (label: string) =>
		console.log(`    [sample t+${((Date.now() - t0) / 1000).toFixed(1)}s] ${label}`);
	await openFixture(page, dist, {
		...(delayMs ? { delay: String(delayMs) } : {}),
		...extraParams,
	});
		mark("fixture open");
		const unsupported: string[] = [];
		await page.evaluate(() => window.__turn.prepare());
		mark("prepare done");

		// Input latency probes first: the book still has pages ahead, so the
		// forward sheet-edge lift-drag is available. A real pointer press triggers the
		// lift path; first style mutation after pointerdown is the first
		// visible state update (not INP, no attribution claimed). Each probe
		// then completes a real turn, checked against the engine's page index.
		const inputLatencies: number[] = [];
		{
			for (let i = 0; i < INPUT_PROBES; i++) {
				mark(`probe ${i} start`);
				const before = await page.evaluate(() => window.__turn.currentPageIndex());
				const forwardPage = before === 0 ? 0 : before + 1;
				const sheet = await page.locator(`.flipbook .page[data-page-index="${forwardPage}"]`).boundingBox();
				if (!sheet) throw new Error(`Input probe has no visible forward page ${forwardPage}`);
				const book = await page.locator(".flipbook").boundingBox();
				if (!book) throw new Error("Input probe has no .flipbook container");
				const rtl = extraParams.adapter === "react";
				const probe = inputProbePath(sheet, book, rtl ? "rtl" : "ltr");
				let start = probe.start;
				// Attached bookmark overlays can own the sheet's outer strip: walk
				// inward until a real page element is under the pointer. A sheet
				// with no draggable surface is a fixture bug, not a silent pass.
				for (let step = 0; step < 8; step++) {
					const onPage = await page.evaluate(
						(p) =>
							document.elementFromPoint(p.x, p.y)?.closest(".flipbook .page") != null,
						start,
					);
					if (onPage) break;
					if (step === 7)
						throw new Error(`Input probe found no draggable page surface on page ${forwardPage}`);
					start = { x: start.x + (rtl ? 12 : -12), y: start.y };
				}
				const lift = { x: start.x + (rtl ? 15 : -15), y: start.y };
				const { end } = probe;
				await page.mouse.move(start.x, start.y);
				await page.evaluate(() => window.__turn.armInput());
				try {
					await page.mouse.down();
					await page.mouse.move(lift.x, lift.y, { steps: 2 });
					const latency = await page
						.waitForFunction(() => {
							const value = window.__turn.inputLatency();
							return value !== null && value >= 0 ? { value } : null;
						}, null, {
							timeout: 1500,
							polling: 100,
						})
						.then(async (h) => (await h.jsonValue())?.value ?? null)
						.catch(() => null);
					if (typeof latency === "number" && latency >= 0) inputLatencies.push(latency);
					await page.mouse.move(end.x, end.y, { steps: 6 });
				} finally {
					await page.mouse.up().catch(() => {});
				}
				const expected = before === 0 ? 1 : before + 2;
				await page.waitForFunction((index) => window.__turn.currentPageIndex() === index, expected, { timeout: 1500, polling: 100 });
				// Let the completed turn settle before the next probe.
				await page.waitForTimeout(300);
			}
		}

		// Probes can leave a leaf mid-flip or land the book on a later page;
		// index polling raced in-flight animations, so rebuild the book
		// instead — prepare() clears #app and returns a fresh book at page 0
		// with no pending turns.
		await page.evaluate(() => window.__turn.prepare());
		mark("re-prepared for turns");

		const s = await page.evaluate(() => window.__turn.runTurns());
		mark("runTurns done");
		const sample = s as TurnSample;
		if (sample.loafCount === "unsupported") unsupported.push("loaf_count");

		const gaps = sample.gaps;
		const windowMs = gaps.reduce((a, b) => a + b, 0);
		const metrics: Record<string, number> = {
			raf_gap_median_ms: median(gaps),
			raf_gap_p95_ms: percentile(gaps, 95),
			raf_gap_p99_ms: percentile(gaps, 99),
			raf_gap_worst_ms: Math.max(...gaps, 0),
			raf_gap_pct_16_7: pctAbove(gaps, 16.7),
			raf_gap_pct_33_3: pctAbove(gaps, 33.3),
			raf_gap_pct_50: pctAbove(gaps, 50),
			turn_median_ms: median(sample.turnMs),
			turn_p95_ms: percentile(sample.turnMs, 95),
			input_median_ms: inputLatencies.length ? median(inputLatencies) : -1,
			input_p95_ms: inputLatencies.length ? percentile(inputLatencies, 95) : -1,
			longtask_count: sample.longtaskCount,
			longtask_total_ms: sample.longtaskTotal,
			loaf_count: sample.loafCount === "unsupported" ? -1 : sample.loafCount,
			// Supplemental cadence only: rAF callback rate, not physical display fps.
			raf_cb_fps: windowMs > 0 ? (sample.rafCallbacks / windowMs) * 1000 : 0,
		};

		// Cover spread shows page 0 alone, so each leaf flip advances the
		// leftmost index by 2 minus the initial single-page spread: after N
		// flips from index 0 the book sits at 2N - 1.
		const expectedFinal = sample.initialPageIndex + sample.expectedTurns * 2 - 1;
		// An uncaptured input sample is evidence that the fixture or gesture
		// did not execute; it must not silently pass as unsupported latency.
		const valid =
			sample.completedTurns === sample.expectedTurns &&
			sample.finalPageIndex === expectedFinal &&
			gaps.length > 10 && inputLatencies.length === INPUT_PROBES;
		return {
			metrics,
			valid,
			invalidReason: valid
				? undefined
				: `turns=${sample.completedTurns}/${sample.expectedTurns} final=${sample.finalPageIndex} want=${expectedFinal} gaps=${gaps.length} input=${inputLatencies.length}`,
			unsupported,
		};
}

export const turnSmoothness: ScenarioDriver = {
	name: "turn-smoothness",
	sizes: [0],
	metricsFor: turnMetrics,
	runSample: (page, dist, _size, delayMs) => runTurnSample(page, dist, delayMs, {}),
};

// Same measurement under a bible-on-site-scale workload (?heavy=1): a
// scrollable pane of per-word/verse markup per page plus book-wide
// bookmarks. The light fixture cannot validate website-scale frame cost.
export const turnHeavy: ScenarioDriver = {
	name: "turn-heavy",
	sizes: [0],
	metricsFor: turnMetrics,
	runSample: (page, dist, _size, delayMs) =>
		runTurnSample(page, dist, delayMs, { heavy: "1" }),
};

// Heavy workload plus .flipbook-page-bounded content roots — the exact DOM
// contract bible-on-site ships since its #2742 (#279 adoption).
export const turnBounded: ScenarioDriver = {
	name: "turn-bounded",
	sizes: [0],
	metricsFor: turnMetrics,
	runSample: (page, dist, _size, delayMs) =>
		runTurnSample(page, dist, delayMs, { heavy: "1", bounded: "1" }),
};

// Bounded-heavy workload mounted through the React adapter (?adapter=react):
// RTL, leavesBuffer=7, bookmarks, hard covers — the bible-on-site mount
// contract, so each turn also pays the adapter's buffer remount.
export const turnReact: ScenarioDriver = {
	name: "turn-react",
	sizes: [0],
	metricsFor: turnMetrics,
	runSample: (page, dist, _size, delayMs) =>
		runTurnSample(page, dist, delayMs, { adapter: "react", heavy: "1", bounded: "1" }),
};

// ---------------------------------------------------------------------------
// #291: large-book scaling and lifecycle/resource cleanup
// ---------------------------------------------------------------------------

interface ScalingSample {
	size: number;
	fixtureBuildMs: number;
	initMs: number;
	bookmarkRefreshMs: number;
	navSeqMs: number;
	resizeMs: number;
	cycleMs: number[];
	reactMountMs: number | "skipped";
	audit: {
		pendingTimers: number;
		pendingRafs: number;
		liveObservers: number;
		domNodes: number;
		bookElements: number;
	};
	opsCompleted: number;
	opsExpected: number;
}

export const scaling: ScenarioDriver = {
	name: "scaling",
	sizes: [20, 200, 1000],
	metricsFor: (size) => [
		{ key: `s${size}_init_ms`, label: `init+render (${size}p)`, thresholdAbs: 80, thresholdRatio: 1.4 },
		{ key: `s${size}_bookmark_refresh_ms`, label: `bookmark refresh (${size}p)`, thresholdAbs: 40, thresholdRatio: 1.5 },
		{ key: `s${size}_nav_ms`, label: `nav sequence (${size}p)`, thresholdAbs: 40, thresholdRatio: 1.5 },
		{ key: `s${size}_resize_ms`, label: `resize relayout (${size}p)`, thresholdAbs: 40, thresholdRatio: 1.5 },
		{ key: `s${size}_cycle_median_ms`, label: `mount/destroy cycle (${size}p)`, thresholdAbs: 120, thresholdRatio: 1.4 },
		{ key: `s${size}_react_mount_ms`, label: `react mount (${size}p)`, thresholdAbs: 120, thresholdRatio: 1.4 },
		// Audit metrics (instrumented pass): deltas should stay ~0.
		{ key: `s${size}_nodes_delta`, label: `retained DOM nodes delta (${size}p)`, thresholdAbs: size / 2 + 10, thresholdRatio: 2, signed: true },
		{ key: `s${size}_listeners_delta`, label: `event listeners delta (${size}p)`, thresholdAbs: 15, thresholdRatio: 2, signed: true },
		{ key: `s${size}_heap_delta_mb`, label: `heap delta MB (${size}p)`, thresholdAbs: 30, thresholdRatio: 2, signed: true },
		{ key: `s${size}_pending_work`, label: `pending timers/raf/observers (${size}p)`, thresholdAbs: 3, thresholdRatio: 4 },
	],

	async runSample(page, dist, size, delayMs) {
		await openFixture(page, dist, {
			...(delayMs ? { delay: String(delayMs) } : {}),
			audit: "0",
		});
		const unsupported: string[] = [];
		const s = (await page.evaluate(
			(sz) => window.__scaling.run(sz, false),
			size,
		)) as ScalingSample;
		const metrics: Record<string, number> = {
			[`s${size}_fixture_build_ms`]: s.fixtureBuildMs, // context only, not a verdict metric
			[`s${size}_init_ms`]: s.initMs,
			[`s${size}_bookmark_refresh_ms`]: s.bookmarkRefreshMs,
			[`s${size}_nav_ms`]: s.navSeqMs,
			[`s${size}_resize_ms`]: s.resizeMs,
			[`s${size}_cycle_median_ms`]: median(s.cycleMs),
			[`s${size}_react_mount_ms`]: s.reactMountMs === "skipped" ? -1 : s.reactMountMs,
		};
		if (s.reactMountMs === "skipped") unsupported.push(`s${size}_react_mount_ms`);
		return {
			metrics,
			valid: s.opsCompleted === s.opsExpected,
			invalidReason:
				s.opsCompleted === s.opsExpected
					? undefined
					: `ops=${s.opsCompleted}/${s.opsExpected}`,
			unsupported,
		};
	},

	async audit(page, dist, size) {
		const gc = () => collectResourceGarbage(page);
		// Baseline on a blank page after GC: the previous document's nodes
		// and listeners can linger past a plain goto, which makes the
		// retained-dom delta noise-dominated. A blank baseline is
		// deterministic; fixture DOM that survives teardown is symmetric
		// across variants and cancels out in the paired diff.
		await page.goto("about:blank");
		await page.waitForTimeout(300);
		await gc();
		await page.waitForTimeout(100);
		const before = await resourceMetrics(page);
		await openFixture(page, dist, { audit: "1" });
		const s = (await page.evaluate(
			(sz) => window.__scaling.run(sz, true),
			size,
		)) as ScalingSample;
		// Strip fixture-owned DOM so deltas isolate retained/leaked nodes,
		// then let post-teardown work flush and collect both V8 and Blink
		// before reading retained resource deltas.
		await page.evaluate(() => document.getElementById("perf-book")?.remove());
		await page.waitForTimeout(400);
		await gc();
		await page.waitForTimeout(100);
		const after = await resourceMetrics(page);
		return {
			[`s${size}_nodes_delta`]: after.nodes - before.nodes,
			[`s${size}_listeners_delta`]: after.listeners - before.listeners,
			[`s${size}_documents_delta`]: after.documents - before.documents,
			[`s${size}_heap_delta_mb`]: (after.jsHeapBytes - before.jsHeapBytes) / 1e6,
			[`s${size}_pending_work`]:
				s.audit.pendingTimers + s.audit.pendingRafs + s.audit.liveObservers,
			[`s${size}_dom_nodes_reported`]: s.audit.domNodes,
		};
	},
};

export const ALL_SCENARIOS: Record<string, ScenarioDriver> = {
	turn: turnSmoothness,
	turnHeavy,
	turnBounded,
	turnReact,
	scaling,
};
