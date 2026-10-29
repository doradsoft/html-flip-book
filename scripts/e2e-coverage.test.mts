import type { Page, TestInfo } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";
import { withBrowserCoverage } from "../e2e/fixtures/coverage-collector";

function fixture() {
	const events: string[] = [];
	const coverage = [{ url: "http://localhost:5173/base/src/leaf.ts", source: "export const leaf = 1;", functions: [] }];
	const page = {
		coverage: {
			startJSCoverage: vi.fn(async () => { events.push("start"); }),
			stopJSCoverage: vi.fn(async () => { events.push("stop"); return coverage; }),
		},
		isClosed: vi.fn(() => false),
	};
	const report = vi.fn(async () => { events.push("report"); });
	const info = {} as TestInfo;
	const run = vi.fn(async () => { events.push("test"); });
	const collect = () => withBrowserCoverage("chromium", page as unknown as Page, info, run, report);
	return { page, info, coverage, run, report, collect, events };
}

describe("automatic browser coverage", () => {
	it("preserves navigations and reports before page teardown", async () => {
		const f = fixture();
		await f.collect();
		f.events.push("page teardown");
		expect(f.events).toEqual(["start", "test", "stop", "report", "page teardown"]);
		expect(f.page.coverage.startJSCoverage).toHaveBeenCalledWith({ resetOnNavigation: false });
		expect(f.report).toHaveBeenCalledWith(f.coverage, f.info);
	});
	it("still reports after a failed assertion and preserves that error", async () => {
		const f = fixture();
		const failure = new Error("assertion failed");
		f.run.mockRejectedValue(failure);
		await expect(f.collect()).rejects.toBe(failure);
		expect(f.events).toEqual(["start", "stop", "report"]);
	});
	it("does not swallow a closed page or pretend it submitted coverage", async () => {
		const f = fixture();
		f.page.isClosed.mockReturnValue(true);
		await expect(f.collect()).rejects.toThrow(/closed its page/);
		expect(f.report).not.toHaveBeenCalled();
	});
	it("reports both assertion and collection failures", async () => {
		const f = fixture();
		const assertion = new Error("assertion");
		const collection = new Error("collection");
		f.run.mockRejectedValue(assertion);
		f.page.coverage.stopJSCoverage.mockRejectedValue(collection);
		await expect(f.collect()).rejects.toMatchObject({ errors: [assertion, collection] });
	});
	it.each(["start", "stop", "report"])("propagates %s failures", async (operation) => {
		const f = fixture();
		const failure = new Error(`${operation} failed`);
		if (operation === "start") f.page.coverage.startJSCoverage.mockRejectedValue(failure);
		else if (operation === "stop") f.page.coverage.stopJSCoverage.mockRejectedValue(failure);
		else f.report.mockRejectedValue(failure);
		await expect(f.collect()).rejects.toBe(failure);
	});
	it("leaves unsupported browsers unchanged", async () => {
		const f = fixture();
		await withBrowserCoverage("firefox", f.page as unknown as Page, f.info, f.run, f.report);
		expect(f.events).toEqual(["test"]);
	});
});
