/**
 * Page-side instrumentation shared by all perf scenarios (issue #289).
 * Installed before any scenario code runs so the same hooks exist for the
 * base and candidate builds. The patched requestAnimationFrame adds an
 * optional injected delay (?delay=NN) used by the selfcheck to prove the
 * harness detects a representative slowdown.
 */

export interface PerfInstrumentation {
	/** Injected per-frame slowdown in ms (selfcheck only; 0 in real runs). */
	delayMs: number;
	/** Busy-wait helper scenarios call inside measured windows when delay > 0. */
	spin(ms: number): void;
	raf: {
		start(): void;
		/** Returns frame-to-frame gaps (ms) between successive rAF callbacks. */
		stop(): number[];
		/** Callback count during the capture window (supplemental cadence). */
		callbackCount(): number;
	};
	longtasks: PerformanceEntry[];
	loaf: PerformanceEntry[] | "unsupported";
	timers: { pending(): number; rafPending(): number };
	observers: { active(): number };
	mutations: {
		arm(): void;
		firstAt(): number | null;
	};
	input: {
		arm(): void;
		receivedAt(): number | null;
	};
}

declare global {
	interface Window {
		__perf: PerfInstrumentation;
	}
}

export function installInstrumentation(): PerfInstrumentation {
	const delayMs = Number(new URLSearchParams(location.search).get("delay") ?? "0");

	function spin(ms: number): void {
		if (ms <= 0) return;
		const until = performance.now() + ms;
		while (performance.now() < until) {
			/* injected slowdown for selfcheck */
		}
	}

	// rAF capture: wrap callbacks to record invocation timestamps. Gaps are
	// derived between successive callback times inside a capture window.
	let rafCapturing = false;
	const rafTimes: number[] = [];
	const nativeRaf = window.requestAnimationFrame.bind(window);
	window.requestAnimationFrame = (cb: FrameRequestCallback): number =>
		nativeRaf((t) => {
			if (rafCapturing) rafTimes.push(t);
			if (delayMs > 0) spin(delayMs);
			cb(t);
		});

	const longtasks: PerformanceEntry[] = [];
	try {
		new PerformanceObserver((list) => {
			longtasks.push(...list.getEntries());
		}).observe({ entryTypes: ["longtask"] });
	} catch {
		// longtask unsupported: leave the array empty; scenario marks it.
	}
	let loaf: PerformanceEntry[] | "unsupported";
	try {
		const entries: PerformanceEntry[] = [];
		new PerformanceObserver((list) => {
			entries.push(...list.getEntries());
		}).observe({ entryTypes: ["long-animation-frame"] });
		loaf = entries;
	} catch {
		loaf = "unsupported";
	}

	// Pending-work audit counters (instrumented pass): pending timers and
	// live rAF requests still outstanding when checked.
	const nativeSetTimeout = window.setTimeout.bind(window);
	const nativeSetInterval = window.setInterval.bind(window);
	const nativeClearTimeout = window.clearTimeout.bind(window);
	const nativeClearInterval = window.clearInterval.bind(window);
	const nativeCancelRaf = window.cancelAnimationFrame.bind(window);
	const timerAlive = new Set<number>();
	const intervalAlive = new Set<number>();
	window.setTimeout = ((cb: TimerHandler, ms?: number, ...args: unknown[]): number => {
		const id = nativeSetTimeout(
			(...inner: unknown[]) => {
				timerAlive.delete(id);
				if (typeof cb === "function") cb(...inner);
			},
			ms,
			...args,
		) as unknown as number;
		timerAlive.add(id);
		return id;
	}) as typeof setTimeout;
	window.setInterval = ((cb: TimerHandler, ms?: number, ...args: unknown[]): number => {
		const id = nativeSetInterval(cb as () => void, ms, ...args) as unknown as number;
		intervalAlive.add(id);
		return id;
	}) as typeof setInterval;
	window.clearTimeout = ((id?: number) => {
		if (id !== undefined) timerAlive.delete(id);
		nativeClearTimeout(id);
	}) as typeof clearTimeout;
	window.clearInterval = ((id?: number) => {
		if (id !== undefined) intervalAlive.delete(id);
		nativeClearInterval(id);
	}) as typeof clearInterval;
	const patchedRaf = window.requestAnimationFrame;
	const rafLive = new Set<number>();
	window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
		const id = patchedRaf((t) => {
			rafLive.delete(id);
			cb(t);
		});
		rafLive.add(id);
		return id;
	};
	window.cancelAnimationFrame = ((id: number) => {
		rafLive.delete(id);
		nativeCancelRaf(id);
	}) as typeof cancelAnimationFrame;

	// Observer audit: count observers that called observe() and have not
	// disconnected — a leak signal after destroy(), not a correctness check.
	const liveObservers = new Set<object>();
	for (const Ctor of [MutationObserver, ResizeObserver, IntersectionObserver]) {
		const proto = Ctor.prototype;
		const origObserve = proto.observe;
		const origDisconnect = proto.disconnect;
		proto.observe = function (this: object, ...args: never[]) {
			liveObservers.add(this);
			return origObserve.apply(this, args);
		} as never;
		proto.disconnect = function (this: object) {
			liveObservers.delete(this);
			return origDisconnect.apply(this);
		};
	}

	// First visual mutation after arming (input latency measurement).
	let mutationObserver: MutationObserver | null = null;
	let firstMutationAt: number | null = null;
	const mutations = {
		arm(): void {
			firstMutationAt = null;
			mutationObserver?.disconnect();
			const target = document.querySelector(".flipbook") ?? document.getElementById("app");
			mutationObserver = new MutationObserver(() => {
				if (firstMutationAt === null) firstMutationAt = performance.now();
			});
			if (target) {
				mutationObserver.observe(target, {
					subtree: true,
					attributes: true,
					childList: true,
				});
			}
		},
		firstAt: () => firstMutationAt,
	};

	// Pointer-event receive timestamp for input latency pairing.
	let pointerReceivedAt: number | null = null;
	document.addEventListener(
		"pointerdown",
		() => {
			pointerReceivedAt = performance.now();
		},
		{ capture: true },
	);
	const input = {
		arm(): void {
			pointerReceivedAt = null;
			mutations.arm();
		},
		receivedAt: () => pointerReceivedAt,
	};

	const perf: PerfInstrumentation = {
		delayMs,
		spin,
		raf: {
			start() {
				rafTimes.length = 0;
				rafCapturing = true;
			},
			stop() {
				rafCapturing = false;
				const gaps: number[] = [];
				for (let i = 1; i < rafTimes.length; i++) gaps.push(rafTimes[i] - rafTimes[i - 1]);
				return gaps;
			},
			callbackCount: () => rafTimes.length,
		},
		longtasks,
		loaf,
		timers: {
			pending: () => timerAlive.size + intervalAlive.size,
			rafPending: () => rafLive.size,
		},
		observers: { active: () => liveObservers.size },
		mutations,
		input,
	};
	window.__perf = perf;
	return perf;
}
