import { defineConfig, devices } from "@playwright/test";

/**
 * Performance benchmark configuration (issue #289).
 *
 * Deliberately separate from playwright.config.ts: benchmarks need one
 * measured browser at a time — no parallel workers, no retries that turn a
 * slow sample into a silent rerun, no sharding, no coverage reporter and no
 * video/trace capture inside the timed window. The dev server is also out:
 * scripts/perf-run.mts serves production builds on fixed ports before any
 * sampling starts.
 */
export default defineConfig({
	testDir: "./perf/scenarios",
	testMatch: "**/*.spec.ts",
	fullyParallel: false,
	workers: 1,
	forbidOnly: true,
	retries: 0,
	timeout: 600_000,
	reporter: [["list"]],
	use: {
		baseURL: process.env.PERF_HEAD_URL ?? "http://localhost:4102",
		trace: "off",
		video: "off",
		screenshot: "off",
	},
	projects: [
		{
			name: "perf-chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
