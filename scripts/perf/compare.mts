#!/usr/bin/env node
import * as path from "node:path";
import {
	buildBase,
	buildCandidate,
	buildFixture,
	collectEnv,
	ensureDir,
	launchPerfBrowser,
	writeJson,
	type Variant,
} from "./harness.mts";
import { ALL_SCENARIOS, type MetricSpec, type ScenarioDriver } from "./scenarios.mts";
import { summarize, type PairedStats } from "./stats.mts";

/**
 * Perf compare orchestrator (issue #289).
 *
 *   node scripts/perf/compare.mts --base origin/master [options]
 *
 * Runs the base and candidate builds through byte-identical fixtures,
 * interleaving paired samples so machine drift hits both sides of a pair.
 * An A/A (base-vs-base) calibration pass establishes the noise floor every
 * run; a metric only reports "regression" when the paired effect exceeds
 * both its budget and the noise floor with a positive 90% CI bound.
 *
 * Outcomes per scenario: "no-regression" | "inconclusive" | "regression" |
 * "error". Exit codes: 0 = all no-regression, 1 = regression or error,
 * 2 = inconclusive only.
 *
 * --selfcheck runs candidate-vs-candidate with --delay-candidate-ms injected
 * into the "candidate" side; expected outcome is regression on the frame
 * metrics, proving the harness detects a representative slowdown.
 */

interface Cli {
	base: string;
	candidateRef: string;
	samples: number;
	auditPairs: number;
	scenario: string[];
	sizes: number[];
	delayCandidateMs: number;
	out: string;
	selfcheck: boolean;
}

function parseArgs(): Cli {
	const args = process.argv.slice(2);
	const cli: Cli = {
		base: "",
		candidateRef: "",
		samples: 8,
		auditPairs: 4,
		scenario: ["all"],
		sizes: [20, 200, 1000],
		delayCandidateMs: 0,
		out: `perf-results/run-${Date.now()}`,
		selfcheck: false,
	};
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		const next = () => args[++i];
		if (a === "--base") cli.base = next();
		else if (a === "--candidate-ref") cli.candidateRef = next();
		else if (a === "--samples") cli.samples = Number(next());
		else if (a === "--audit-pairs") cli.auditPairs = Number(next());
		else if (a === "--scenario") cli.scenario = next().split(",");
		else if (a === "--sizes") cli.sizes = next().split(",").map(Number);
		else if (a === "--delay-candidate-ms") cli.delayCandidateMs = Number(next());
		else if (a === "--out") cli.out = next();
		else if (a === "--selfcheck") cli.selfcheck = true;
		else throw new Error(`unknown arg ${a}`);
	}
	if (!cli.selfcheck && !cli.base) throw new Error("--base <git ref> is required");
	return cli;
}

type Verdict = "no-regression" | "inconclusive" | "regression" | "error" | "unsupported";

interface MetricOutcome {
	spec: MetricSpec;
	stats: PairedStats;
	noiseFloor: number;
	verdict: Verdict;
	reason: string;
}

function decide(
	spec: MetricSpec,
	stats: PairedStats,
	noiseFloor: number,
	unsupported: boolean,
): MetricOutcome {
	if (unsupported) {
		return { spec, stats, noiseFloor, verdict: "unsupported", reason: "metric unsupported on this platform" };
	}
	// No usable A/A calibration pairs: the noise floor is unknown, so the
	// run cannot certify "no regression". Surface it, never silently pass.
	if (!Number.isFinite(noiseFloor)) {
		return {
			spec,
			stats,
			noiseFloor,
			verdict: "inconclusive",
			reason: "A/A calibration produced no valid pairs",
		};
	}
	const budget = Math.max(spec.thresholdAbs, noiseFloor);
	const exceeds = Math.abs(stats.medianDiff) > budget && stats.medianRatio > spec.thresholdRatio;
	// A regression is a positive CI lower bound plus effect over budget.
	if (exceeds && stats.medianDiff > 0 && stats.ci90Low > 0) {
		return {
			spec,
			stats,
			noiseFloor,
			verdict: "regression",
			reason: `median diff +${stats.medianDiff.toFixed(2)} exceeds budget ${budget.toFixed(2)} (CI90 ${stats.ci90Low.toFixed(2)}..${stats.ci90High.toFixed(2)})`,
		};
	}
	// Too noisy to tell: noise floor alone swallows the budget, or the CI
	// straddles the budget boundary on both sides.
	if (noiseFloor > spec.thresholdAbs * 1.5 || stats.madDiff > spec.thresholdAbs * 1.5) {
		return {
			spec,
			stats,
			noiseFloor,
			verdict: "inconclusive",
			reason: `noise floor ${noiseFloor.toFixed(2)} / spread ${stats.madDiff.toFixed(2)} too large vs budget ${spec.thresholdAbs}`,
		};
	}
	return {
		spec,
		stats,
		noiseFloor,
		verdict: "no-regression",
		reason: `median diff ${stats.medianDiff.toFixed(2)} within budget ${budget.toFixed(2)}`,
	};
}

async function main(): Promise<void> {
	const cli = parseArgs();
	const repoRoot = process.cwd();
	const outDir = path.resolve(cli.out);
	await ensureDir(outDir);

	// --- Build both variants -------------------------------------------------
	const buildDir = path.join(outDir, "build");
	await ensureDir(buildDir);
	const candidate = cli.candidateRef
		? ({
				...(await buildBase(repoRoot, cli.candidateRef, path.join(buildDir, "candidate"))),
				name: "candidate",
			} as Variant)
		: await buildCandidate(repoRoot, path.join(buildDir, "candidate"));
	const base = cli.selfcheck
		? ({ ...candidate, name: "base" } as Variant)
		: await buildBase(repoRoot, cli.base, path.join(buildDir, "base"));

	console.log(`\nbase      ${base.sha}`);
	console.log(`candidate ${candidate.sha}${cli.delayCandidateMs ? ` (+${cli.delayCandidateMs}ms injected)` : ""}`);

	const distBase = await buildFixture(repoRoot, base, buildDir);
	const distCand = await buildFixture(repoRoot, candidate, buildDir);

	const browser = await launchPerfBrowser();
	const env = await collectEnv(browser, base.sha, candidate.sha);

	const scenarioNames = cli.scenario.includes("all") ? Object.keys(ALL_SCENARIOS) : cli.scenario;
	const results: Record<string, unknown> = {
		env,
		policy: {
			samples: cli.samples,
			aaSamples: cli.samples,
			auditPairs: cli.auditPairs,
			paired: true,
			verdictRule:
				"regression when median paired diff > max(thresholdAbs, noiseFloor) AND medianRatio > thresholdRatio AND ci90Low > 0",
			exitCodes: { 0: "all no-regression", 1: "regression or error", 2: "inconclusive only" },
		},
		injectedDelayMs: cli.delayCandidateMs,
		scenarios: [] as unknown[],
	};

	const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
	let sawRegression = false;
	let sawInconclusive = false;

	for (const name of scenarioNames) {
		const scenario: ScenarioDriver | undefined = ALL_SCENARIOS[name];
		if (!scenario) throw new Error(`unknown scenario ${name}`);
		const sizes = scenario.sizes[0] === 0 ? [0] : cli.sizes;

		for (const size of sizes) {
			const specs = scenario.metricsFor(size);
			const unsupportedKeys = new Set<string>();
			const baseSamples: Record<string, number>[] = [];
			const candSamples: Record<string, number>[] = [];
			const aaA: Record<string, number>[] = [];
			const aaB: Record<string, number>[] = [];
			let invalidBase = 0;
			let invalidCand = 0;
			const reasons: string[] = [];

			// A sample that throws is invalid, not a harness crash.
			const safeSample = async (dist: string, delay: number) => {
				try {
					return await scenario.runSample(page, dist, size, delay);
				} catch (err) {
					return {
						metrics: {},
						valid: false,
						invalidReason: `threw: ${String(err).slice(0, 160)}`,
					};
				}
			};

			// Paired samples, interleaved base/candidate.
			for (let i = 0; i < cli.samples; i++) {
				const rb = await safeSample(distBase, 0);
				const rc = await safeSample(distCand, cli.delayCandidateMs);
				console.log(`  ${name}${size ? `/${size}` : ""} pair ${i + 1}/${cli.samples} done`);
				if (rb.valid) baseSamples.push(rb.metrics);
				else invalidBase++;
				if (rc.valid) candSamples.push(rc.metrics);
				else invalidCand++;
				if (rb.invalidReason) reasons.push(`base#${i}: ${rb.invalidReason}`);
				if (rc.invalidReason) reasons.push(`cand#${i}: ${rc.invalidReason}`);
				for (const k of rb.unsupported ?? []) unsupportedKeys.add(k);
				for (const k of rc.unsupported ?? []) unsupportedKeys.add(k);
			}

			// A/A calibration: base-vs-base pairs establish the noise floor.
			// Invalid A/A samples count toward the error budget: calibration
			// failure is an environment problem, not a free pass.
			for (let i = 0; i < cli.samples; i++) {
				const a = await safeSample(distBase, 0);
				const b = await safeSample(distBase, 0);
				if (a.valid) aaA.push(a.metrics);
				else {
					invalidBase++;
					if (a.invalidReason) reasons.push(`aa#${i}a: ${a.invalidReason}`);
				}
				if (b.valid) aaB.push(b.metrics);
				else {
					invalidBase++;
					if (b.invalidReason) reasons.push(`aa#${i}b: ${b.invalidReason}`);
				}
			}

			// Instrumented audit passes (leak signals): real base/candidate
			// and A/A pairs so the paired statistics get an honest noise
			// floor. Each audit runs on a fresh page — Performance.getMetrics
			// counters include retained objects from earlier documents in the
			// same renderer, so reusing the sampling page leaks the previous
			// fixture's nodes and listeners into the baseline.
			const auditBase: Record<string, number>[] = [];
			const auditCand: Record<string, number>[] = [];
			const auditAaA: Record<string, number>[] = [];
			const auditAaB: Record<string, number>[] = [];
			const auditKeySet = new Set<string>();
			const audit = scenario.audit;
			if (audit) {
				const auditOnFreshPage = async (dist: string) => {
					const auditPage = await browser.newPage({
						viewport: { width: 800, height: 600 },
					});
					try {
						return await audit(auditPage, dist, size);
					} finally {
						await auditPage.close();
					}
				};
				for (let i = 0; i < cli.auditPairs; i++) {
					auditBase.push(await auditOnFreshPage(distBase));
					auditCand.push(await auditOnFreshPage(distCand));
					auditAaA.push(await auditOnFreshPage(distBase));
					auditAaB.push(await auditOnFreshPage(distBase));
				}
				for (const m of [...auditBase, ...auditCand]) {
					for (const k of Object.keys(m)) auditKeySet.add(k);
				}
			}

			// Outcomes per metric.
			const outcomes: MetricOutcome[] = [];
			const pick = (spec: MetricSpec, samples: Record<string, number>[]) =>
				samples
					.map((m) => m[spec.key])
					.filter(
						(v): v is number =>
							typeof v === "number" && Number.isFinite(v) && (spec.signed || v >= 0),
					);

			for (const spec of specs) {
				// Audit metrics draw from their own paired arrays; sampled
				// metrics from the paired sample sets.
				const auditMetric = auditKeySet.has(spec.key);
				const bs = pick(spec, auditMetric ? auditBase : baseSamples);
				const cs = pick(spec, auditMetric ? auditCand : candSamples);
				const aas = pick(spec, auditMetric ? auditAaA : aaA);
				const aas2 = pick(spec, auditMetric ? auditAaB : aaB);
				const unsupported = unsupportedKeys.has(spec.key) || bs.length === 0 || cs.length === 0;
				const stats = summarize(bs, cs);
				const aaStats = summarize(aas, aas2);
				const noiseFloor = Math.abs(aaStats.medianDiff) + 2 * aaStats.madDiff;
				outcomes.push(decide(spec, stats, noiseFloor, unsupported));
			}

			// Scenario outcome: error > regression > inconclusive > no-regression.
			// Invalid budget counts paired + A/A samples against 4*samples runs.
			const errorPct = (invalidBase + invalidCand) / (cli.samples * 4);
			const verdicts = outcomes.map((o) => o.verdict);
			let outcome: Verdict;
			if (invalidBase + invalidCand > 0 && errorPct >= 0.25) outcome = "error";
			else if (verdicts.includes("regression")) outcome = "regression";
			else if (verdicts.includes("inconclusive")) outcome = "inconclusive";
			else outcome = "no-regression";
			if (invalidBase + invalidCand > 0) {
				reasons.unshift(`invalid samples: base=${invalidBase} cand=${invalidCand}`);
				if (outcome === "no-regression") outcome = "inconclusive";
			}
			if (outcome === "regression" || outcome === "error") sawRegression = true;
			if (outcome === "inconclusive") sawInconclusive = true;

			console.log(`\n== ${name}${size ? ` size=${size}` : ""}: ${outcome.toUpperCase()}`);
			for (const o of outcomes) {
				const mark =
					o.verdict === "regression" ? "REGRESS" : o.verdict === "inconclusive" ? "  noisy" : o.verdict === "unsupported" ? " unsupp" : "     ok";
				console.log(
					`  ${mark} ${o.spec.label}: base ${o.stats.baseMedian.toFixed(2)} -> cand ${o.stats.candidateMedian.toFixed(2)} (x${o.stats.medianRatio.toFixed(2)}) ${o.reason}`,
				);
			}
			if (reasons.length) console.log(`  notes: ${reasons.join("; ")}`);

			(results.scenarios as unknown[]).push({
				name,
				size,
				outcome,
				invalidSamples: { base: invalidBase, candidate: invalidCand },
				invalidReasons: reasons,
				rawPaired: { base: baseSamples, candidate: candSamples },
				aaCalibration: { a: aaA, b: aaB },
				audit: {
					pairs: { base: auditBase, candidate: auditCand },
					aa: { a: auditAaA, b: auditAaB },
				},
				metrics: outcomes.map((o) => ({ key: o.spec.key, label: o.spec.label, ...o.stats, noiseFloor: o.noiseFloor, verdict: o.verdict, reason: o.reason })),
			});
		}
	}

	await browser.close();
	await writeJson(path.join(outDir, "result.json"), results);
	console.log(`\nartifacts: ${outDir}`);

	if (cli.selfcheck) {
		const ok = sawRegression;
		console.log(ok ? "selfcheck: regression detected as expected" : "selfcheck: FAILED to detect injected slowdown");
		process.exit(ok ? 0 : 1);
	}
	if (sawRegression) process.exit(1);
	if (sawInconclusive) process.exit(2);
	process.exit(0);
}

main().catch((err) => {
	console.error("perf harness failed:", err);
	process.exit(1);
});
