import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { measureReadyMount } from "../../perf/fixture/mount-readiness";

describe("React scaling mount lifecycle", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("cancels the fallback after real readiness and excludes disposal from mount timing", async () => {
		let ready = () => {};
		const dispose = vi.fn(() => vi.advanceTimersByTime(500));
		const measured = measureReadyMount((onReady) => { ready = onReady; }, dispose);
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(20);
		ready();
		expect(await measured).toBe(20);
		expect(dispose).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("rejects an expired fallback instead of recording a successful mount and still disposes", async () => {
		const dispose = vi.fn();
		const measured = measureReadyMount(() => {}, dispose);
		const rejected = expect(measured).rejects.toThrow(/did not become ready/);
		await vi.advanceTimersByTimeAsync(10_000);
		await rejected;
		expect(dispose).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("clears the timer and disposes a partially mounted root on synchronous errors", async () => {
		const dispose = vi.fn();
		const failure = new Error("render failed");
		await expect(measureReadyMount(() => { throw failure; }, dispose)).rejects.toBe(failure);
		expect(dispose).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("does not dispose twice if a late ref arrives after the fallback", async () => {
		let ready = () => {};
		const dispose = vi.fn();
		const measured = measureReadyMount((onReady) => { ready = onReady; }, dispose);
		const rejected = expect(measured).rejects.toThrow(/did not become ready/);
		await vi.advanceTimersByTimeAsync(10_000);
		await rejected;
		ready();
		expect(dispose).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});
});
