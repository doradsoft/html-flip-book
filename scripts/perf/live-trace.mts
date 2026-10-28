/**
 * Live-site page-turn trace (issue #343): opens a real consumer URL in
 * Chromium, installs the same rAF-gap/longtask instrumentation as the perf
 * fixture, records a CDP trace while performing a real pointer drag and
 * consecutive turns, then writes the raw trace + a summarized breakdown of
 * where main-thread time went (script / layout / paint / input dispatch).
 *
 * Usage:
 *   node scripts/perf/live-trace.mts --url https://example/ --out dir
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

interface Args {
	url: string;
	out: string;
	drags: number;
}

function parseArgs(): Args {
	const args: Args = { url: "", out: "perf-results/live-trace", drags: 3 };
	const argv = process.argv.slice(2);
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--url") args.url = argv[++i];
		else if (argv[i] === "--out") args.out = argv[++i];
		else if (argv[i] === "--drags") args.drags = Number(argv[++i]);
		else throw new Error(`unknown arg ${argv[i]}`);
	}
	if (!args.url) throw new Error("--url is required");
	return args;
}

// Injected verbatim into the page — must be plain JS, no TS syntax.
const PROBE = `(() => {
	const probe = {
		gaps: [],
		longtasks: [],
		running: false,
		last: 0,
		start() {
			this.gaps = [];
			this.last = performance.now();
			if (this.running) return;
			this.running = true;
			const tick = (t) => {
				if (!this.running) return;
				this.gaps.push(t - this.last);
				this.last = t;
				requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		},
		stop() {
			this.running = false;
			return this.gaps;
		},
	};
	try {
		new PerformanceObserver((list) => {
			for (const e of list.getEntries()) probe.longtasks.push(e.duration);
		}).observe({ entryTypes: ["longtask"] });
	} catch {}
	window.__probe = probe;
})()`;

interface TraceEvent {
	name: string;
	cat: string;
	ph: string;
	ts: number;
	dur?: number;
	args?: { data?: { url?: string; functionName?: string } };
}

function summarizeTrace(events: TraceEvent[]): Record<string, unknown> {
	const byName = new Map<string, { count: number; total: number }>();
	const taskUrls = new Map<string, number>();
	let functionCalls = 0;
	let functionCallMs = 0;
	let layoutMs = 0;
	let paintMs = 0;
	let compositeMs = 0;
	let eventDispatchMs = 0;
	let v8RunMs = 0;
	const eventTypes = new Map<string, { count: number; total: number }>();

	for (const e of events) {
		if (e.ph !== "X" || !e.dur) continue;
		const ms = e.dur / 1000;
		const slot = byName.get(e.name) ?? { count: 0, total: 0 };
		slot.count++;
		slot.total += ms;
		byName.set(e.name, slot);
		switch (e.name) {
			case "FunctionCall":
			case "EvaluateScript":
				functionCalls++;
				functionCallMs += ms;
				if (e.args?.data?.url) {
					taskUrls.set(e.args.data.url, (taskUrls.get(e.args.data.url) ?? 0) + ms);
				}
				break;
			case "UpdateLayoutTree":
			case "Layout":
				layoutMs += ms;
				break;
			case "Paint":
			case "RasterTask":
				paintMs += ms;
				break;
			case "CompositeLayers":
				compositeMs += ms;
				break;
			case "EventDispatch": {
				eventDispatchMs += ms;
				const type = (e.args as { type?: string })?.type ?? "?";
				const s = eventTypes.get(type) ?? { count: 0, total: 0 };
				s.count++;
				s.total += ms;
				eventTypes.set(type, s);
				break;
			}
			case "V8.Execute":
				v8RunMs += ms;
				break;
		}
	}
	const top = [...byName.entries()]
		.sort((a, b) => b[1].total - a[1].total)
		.slice(0, 20)
		.map(([name, v]) => ({ name, count: v.count, totalMs: +v.total.toFixed(1) }));
	return {
		totals: {
			functionCallMs: +functionCallMs.toFixed(1),
			v8RunMs: +v8RunMs.toFixed(1),
			layoutMs: +layoutMs.toFixed(1),
			paintMs: +paintMs.toFixed(1),
			compositeMs: +compositeMs.toFixed(1),
			eventDispatchMs: +eventDispatchMs.toFixed(1),
		},
		topEvents: top,
		eventDispatchByType: [...eventTypes.entries()]
			.sort((a, b) => b[1].total - a[1].total)
			.slice(0, 10)
			.map(([type, v]) => ({ type, count: v.count, totalMs: +v.total.toFixed(1) })),
		scriptUrlsByTime: [...taskUrls.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 15)
			.map(([url, ms]) => ({ url, totalMs: +ms.toFixed(1) })),
	};
}

async function main(): Promise<void> {
	const args = parseArgs();
	mkdirSync(args.out, { recursive: true });
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		locale: "he-IL",
	});
	const page = await context.newPage();
	await page.addInitScript(PROBE);
	await page.goto(args.url, { waitUntil: "load", timeout: 60000 });
	// Wait for the book to mount; pages carry the engine's `.page` class.
	await page
		.waitForSelector(".page", { timeout: 30000 })
		.catch(() => console.log("warn: no .page selector within 30s"));
	await page.waitForTimeout(2000);

	const client = await context.newCDPSession(page);
	await client.send("Tracing.start", {
		categories:
			"devtools.timeline,disabled-by-default-devtools.timeline.frame,blink.user_timing,latencyInfo",
		options: "sampling-frequency=10000",
	} as never);

	const traceEvents: TraceEvent[] = [];
	client.on(
		"Tracing.dataCollected" as never,
		((e: { value: TraceEvent[] }) => {
			for (const ev of e.value ?? []) traceEvents.push(ev);
		}) as never,
	);

	const dragResults: unknown[] = [];
	const book = await page
		.locator(".flipbook, .he-book, [class*='bookArea']")
		.first()
		.boundingBox();
	const box = book ?? { x: 40, y: 100, width: 1100, height: 600 };
	const dir = await page
		.locator(".flipbook, .he-book, [class*='bookArea']")
		.first()
		.evaluate((el) => getComputedStyle(el).direction)
		.catch(() => "ltr");
	const startX = dir === "rtl" ? box.x + 60 : box.x + box.width - 60;
	const endX = dir === "rtl" ? box.x + box.width - 60 : box.x + 60;
	const midY = box.y + box.height / 2;

	for (let d = 0; d < args.drags; d++) {
		await page.evaluate(PROBE);
		await page.evaluate("window.__probe.start()");
		// Slow drag right-to-left across the book, then release (forward turn).
		await page.mouse.move(startX, midY);
		await page.mouse.down();
		const steps = 24;
		for (let s = 1; s <= steps; s++) {
			const x = startX + ((endX - startX) * s) / steps;
			await page.mouse.move(x, midY);
			await page.waitForTimeout(30);
		}
		await page.mouse.up();
		await page.waitForTimeout(1200);
		const sample = await page.evaluate(`({
			gaps: window.__probe.stop(),
			longtasks: window.__probe.longtasks.splice(0),
			domNodes: document.getElementsByTagName('*').length,
			pageIndex: (window.document.querySelector('[data-page-index]')?.getAttribute('data-page-index') ?? null),
		})`);
		dragResults.push(sample);
		console.log(`  drag ${d + 1}/${args.drags} done`);
	}

	await client.send("Tracing.end");
	await new Promise<void>((resolve) => {
		client.on("Tracing.tracingComplete" as never, (() => resolve()) as never);
		setTimeout(resolve, 60000);
	});

	writeFileSync(
		path.join(args.out, "trace.json"),
		JSON.stringify({ traceEvents }),
	);
	const events = traceEvents;
	writeFileSync(path.join(args.out, "drags.json"), JSON.stringify(dragResults, null, 2));
	writeFileSync(
		path.join(args.out, "summary.json"),
		JSON.stringify(summarizeTrace(events), null, 2),
	);

	const allGaps = (dragResults as { gaps: number[] }[]).flatMap((r) => r.gaps);
	const over16 = allGaps.filter((g) => g > 16.7).length;
	const over33 = allGaps.filter((g) => g > 33.3).length;
	const over50 = allGaps.filter((g) => g > 50).length;
	console.log(
		`\nrAF gaps: ${allGaps.length} frames, >16.7ms: ${over16} (${((over16 / Math.max(1, allGaps.length)) * 100).toFixed(1)}%), >33.3ms: ${over33}, >50ms: ${over50}`,
	);
	const summary = summarizeTrace(events) as { totals: Record<string, number> };
	console.log("main-thread totals:", JSON.stringify(summary.totals));
	execFileSync("echo", [`artifacts: ${path.resolve(args.out)}`], { stdio: "inherit" });
	await browser.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
