import { mkdirSync, writeFileSync } from "node:fs";
import { test } from "@playwright/test";
import { collectBrowserMetadata, collectRunnerMetadata } from "../harness/env";
import { measureInit, measureTurn } from "../harness/probes";

/**
 * Smoke benchmark (issue #289): proves the paired base/head pipeline with
 * a cold init and a single toolbar turn per leg. Richer interaction and
 * scaling scenarios land in #290/#291 on top of this harness.
 *
 * Sampling contract: each leg runs in a fresh browser context on the
 * already-served production build, pair order alternates base/head →
 * head/base to cancel order drift, and a leg that never advances the page
 * is marked invalid — never silently "faster".
 */
const BASE_URL = process.env.PERF_BASE_URL ?? "";
const HEAD_URL = process.env.PERF_HEAD_URL ?? "http://localhost:4102";
const PAIRS = Number(process.env.PERF_PAIRS ?? "10");
const BOOK_PATH = "/?example=ltr-comprehensive";

interface SampleSet {
	version: 1;
	scenario: string;
	generatedAt: string;
	environment: Record<string, unknown>;
	pairs: unknown[];
}

const resultsDir = "perf-results";

test.describe("init-and-turn paired sampling", () => {
	test("collects paired base/head samples", async ({ browser }) => {
		const targets =
			BASE_URL === ""
				? [{ label: "head", url: HEAD_URL }]
				: [
						{ label: "base", url: BASE_URL },
						{ label: "head", url: HEAD_URL },
					];
		const pairCount = BASE_URL === "" ? 1 : PAIRS;

		const samples: SampleSet = {
			version: 1,
			scenario: "init-and-turn@1",
			generatedAt: new Date().toISOString(),
			environment: collectRunnerMetadata(),
			pairs: [],
		};

		for (let i = 0; i < pairCount; i++) {
			// Balanced alternating order: pair 0 runs base→head, pair 1 head→base.
			const order = i % 2 === 0 ? targets : [...targets].reverse();
			const legs: Record<string, unknown> = {};
			let valid = true;

			for (const target of order) {
				const context = await browser.newContext({
					viewport: { width: 1280, height: 800 },
				});
				const page = await context.newPage();
				try {
					if (i === 0 && target.label === "head") {
						samples.environment.browser = await collectBrowserMetadata(page);
					}
					const initMs = await measureInit(page, `${target.url}${BOOK_PATH}`);
					const turn = await measureTurn(page);
					const advanced = turn.pageBefore !== null && turn.pageAfter !== turn.pageBefore;
					if (!advanced) valid = false;
					legs[target.label] = {
						initMs,
						turnMs: turn.turnMs,
						rafMedian: medianOf(turn.rafGaps),
						rafP95: quantileOf(turn.rafGaps, 0.95),
						rafMax: turn.rafGaps.length ? Math.max(...turn.rafGaps) : 0,
						rafOver33: fractionOver(turn.rafGaps, 33.3),
						rafCount: turn.rafGaps.length,
						pageBefore: turn.pageBefore,
						pageAfter: turn.pageAfter,
					};
				} finally {
					await context.close();
				}
			}

			samples.pairs.push({ pair: i, order: order.map((t) => t.label), valid, legs });
			mkdirSync(resultsDir, { recursive: true });
			writeFileSync(`${resultsDir}/samples.json`, JSON.stringify(samples, null, 2));
		}
	});
});

function medianOf(values: number[]): number {
	return quantileOf(values, 0.5);
}

function quantileOf(values: number[], q: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const pos = (sorted.length - 1) * q;
	const lo = Math.floor(pos);
	const hi = Math.ceil(pos);
	return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function fractionOver(values: number[], threshold: number): number {
	if (values.length === 0) return 0;
	return values.filter((v) => v > threshold).length / values.length;
}
