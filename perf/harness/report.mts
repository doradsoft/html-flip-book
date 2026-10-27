import { readFileSync, writeFileSync } from "node:fs";
import { compareMetric, type MetricPolicy, type MetricReport, type SamplePair } from "./compare.mts";

/**
 * Report writer (issue #289): turns perf-results/samples.json into
 * perf-results/report.json + perf-results/summary.md. JSON is the
 * machine-readable record; the markdown goes into GITHUB_STEP_SUMMARY.
 */
const METRIC_POLICIES: Record<string, MetricPolicy> = {
	initMs: {
		label: "Mount (navigate → first page visible)",
		unit: "ms",
		rel: 0.15,
		absFloor: 50,
		iqrFactor: 2,
		lowerIsBetter: true,
	},
	turnMs: {
		label: "Turn (next click → current-page moves)",
		unit: "ms",
		rel: 0.15,
		absFloor: 40,
		iqrFactor: 2,
		lowerIsBetter: true,
	},
	rafMedian: {
		label: "rAF gap median",
		unit: "ms",
		rel: 0.1,
		absFloor: 2,
		iqrFactor: 2,
		lowerIsBetter: true,
	},
	rafP95: {
		label: "rAF gap p95",
		unit: "ms",
		rel: 0.2,
		absFloor: 8,
		iqrFactor: 2.5,
		lowerIsBetter: true,
	},
	rafMax: {
		label: "rAF gap worst",
		unit: "ms",
		rel: 0.3,
		absFloor: 34,
		iqrFactor: 3,
		lowerIsBetter: true,
	},
	rafOver33: {
		label: "rAF gaps over 33.3ms (fraction)",
		unit: "",
		rel: 0.5,
		absFloor: 0.05,
		iqrFactor: 3,
		lowerIsBetter: true,
	},
};

interface SamplesFile {
	version: number;
	scenario: string;
	generatedAt: string;
	environment: Record<string, unknown>;
	pairs: SamplePair[];
}

export interface RunReport {
	version: 1;
	outcome: "ok" | "regression" | "inconclusive" | "single-revision";
	reason?: string;
	run: {
		baseSha: string;
		headSha: string;
		pairs: number;
		scenario: string;
		generatedAt: string;
	};
	environment: Record<string, unknown>;
	metrics: MetricReport[];
	samples: SamplePair[];
}

export function buildReport(
	samplesPath: string,
	shas: { baseSha: string; headSha: string },
): RunReport {
	const samples = JSON.parse(readFileSync(samplesPath, "utf-8")) as SamplesFile;
	const singleRevision = samples.pairs.every(
		(p) => p.legs.head !== undefined && p.legs.base === undefined,
	);

	const metrics = singleRevision
		? []
		: Object.entries(METRIC_POLICIES).map(([metric, policy]) =>
				compareMetric(samples.pairs, metric, policy),
			);

	let outcome: RunReport["outcome"] = "ok";
	if (singleRevision) {
		outcome = "single-revision";
	} else if (metrics.some((m) => m.outcome === "regression")) {
		outcome = "regression";
	} else if (metrics.some((m) => m.outcome === "inconclusive")) {
		outcome = "inconclusive";
	}

	return {
		version: 1,
		outcome,
		run: {
			...shas,
			pairs: samples.pairs.length,
			scenario: samples.scenario,
			generatedAt: samples.generatedAt,
		},
		environment: samples.environment,
		metrics,
		samples: samples.pairs,
	};
}

export function writeReport(report: RunReport, outDir: string): string {
	writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
	const md = renderMarkdown(report);
	writeFileSync(`${outDir}/summary.md`, md);
	return md;
}

function fmt(report: MetricReport, value: number | null): string {
	return value === null ? "n/a" : `${value.toFixed(1)}${report.unit}`;
}

function renderMarkdown(report: RunReport): string {
	const lines = [
		`## Performance benchmark — ${report.run.scenario}`,
		"",
		`| | |`,
		`| --- | --- |`,
		`| outcome | **${report.outcome}** |`,
		`| base | \`${report.run.baseSha}\` |`,
		`| head | \`${report.run.headSha}\` |`,
		`| pairs | ${report.run.pairs} |`,
		`| generated | ${report.run.generatedAt} |`,
		"",
	];

	if (report.outcome === "single-revision") {
		lines.push(
			"Single-revision run (no `--base`) — raw samples recorded, no comparison.",
			"",
		);
		return lines.join("\n");
	}

	lines.push(
		"| metric | base median | head median | median diff | ratio | diff IQR | agreement | outcome |",
		"| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
	);
	for (const m of report.metrics) {
		const ratio = m.medianRatio === null ? "n/a" : `${m.medianRatio.toFixed(3)}×`;
		lines.push(
			`| ${m.label} | ${fmt(m, m.baseMedian)} | ${fmt(m, m.headMedian)} | ${fmt(m, m.medianDiff)} | ${ratio} | ${fmt(m, m.diffIqr)} | ${(m.consistency * 100).toFixed(0)}% | ${m.outcome}${m.note ? ` — ${m.note}` : ""} |`,
		);
	}

	const env = report.environment as Record<string, unknown>;
	const browser = (env.browser ?? {}) as Record<string, unknown>;
	lines.push(
		"",
		"### Environment",
		"",
		`| runner | ${env.runnerOs ?? "unknown"} (${env.runnerArch ?? "?"}) |`,
		`| cpu | ${env.cpuModel ?? "unknown"} × ${env.cpuCores ?? "?"} |`,
		`| node | ${env.nodeVersion ?? "unknown"} |`,
		`| playwright | ${env.playwrightVersion ?? "unknown"} |`,
		`| browser | ${browser.userAgent ?? "unknown"} |`,
		`| renderer | ${browser.webglRenderer ?? "unknown"} |`,
		`| viewport | ${JSON.stringify(browser.viewport ?? {})} @${browser.devicePixelRatio ?? "?"}x |`,
		"",
		"Paired diffs are per-run differences with the pair order alternated; IQR is the paired-diff spread. rAF gaps are callback-cadence proxies, not presented-frame proof.",
	);
	return lines.join("\n");
}
