/**
 * Paired base/head statistics (issue #289).
 *
 * Uncertainty is expressed at the run/pair level — individual rAF frames
 * inside one run are NOT independent experiment repetitions. For each
 * metric we report the paired diffs head_i - base_i, the median, an IQR
 * spread, the direction consistency across pairs, and a three-way outcome.
 *
 * Outcome policy (all thresholds are per-metric and documented):
 *   regression   — median relative increase >= rel AND median absolute
 *                  increase >= absFloor, with >= 80% of pairs agreeing.
 *   improvement  — same test with the sign flipped; reported, never a gate.
 *   inconclusive — fewer than minPairs valid pairs, an invalid leg, or an
 *                  IQR larger than the median-magnitude policy allows.
 *   ok           — everything else.
 */
export interface MetricPolicy {
	label: string;
	unit: string;
	rel: number;
	absFloor: number;
	/** IQR of paired diffs must stay under iqrFactor × max(|medianDiff|, absFloor). */
	iqrFactor: number;
	lowerIsBetter: boolean;
}

export interface PairLeg {
	[key: string]: number | string | boolean | number[] | null | undefined;
}

export interface SamplePair {
	pair: number;
	order: string[];
	valid: boolean;
	legs: { base?: PairLeg; head?: PairLeg };
}

export interface MetricReport {
	label: string;
	unit: string;
	baseMedian: number;
	headMedian: number;
	medianDiff: number;
	medianRatio: number | null;
	diffIqr: number;
	consistency: number;
	pairs: number;
	outcome: "ok" | "regression" | "improvement" | "inconclusive";
	note?: string;
}

function quantile(sorted: number[], q: number): number {
	if (sorted.length === 0) return 0;
	const pos = (sorted.length - 1) * q;
	const lo = Math.floor(pos);
	const hi = Math.ceil(pos);
	return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function median(values: number[]): number {
	return quantile([...values].sort((a, b) => a - b), 0.5);
}

export function iqr(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	return quantile(sorted, 0.75) - quantile(sorted, 0.25);
}

const MIN_PAIRS = 6;
const MIN_CONSISTENCY = 0.8;

export function compareMetric(
	samples: SamplePair[],
	metric: string,
	policy: MetricPolicy,
): MetricReport {
	const diffs: number[] = [];
	const ratios: number[] = [];
	const baseVals: number[] = [];
	const headVals: number[] = [];
	let invalid = 0;
	let agreeing = 0;

	for (const pair of samples) {
		const b = pair.legs.base?.[metric];
		const h = pair.legs.head?.[metric];
		if (!pair.valid || typeof b !== "number" || typeof h !== "number") {
			invalid++;
			continue;
		}
		const d = h - b;
		diffs.push(d);
		baseVals.push(b);
		headVals.push(h);
		if (Math.abs(b) > 1e-9) ratios.push(h / b);
		if (policy.lowerIsBetter ? d > 0 : d < 0) agreeing++;
	}

	const pairs = diffs.length;
	const baseMedian = median(baseVals);
	const headMedian = median(headVals);
	const medianDiff = median(diffs);
	const medianRatio = ratios.length === pairs && pairs > 0 ? median(ratios) : null;
	const diffIqr = iqr(diffs);
	const consistency = pairs > 0 ? agreeing / pairs : 0;

	const report: MetricReport = {
		label: policy.label,
		unit: policy.unit,
		baseMedian,
		headMedian,
		medianDiff,
		medianRatio,
		diffIqr,
		consistency,
		pairs,
		outcome: "ok",
	};

	if (pairs < MIN_PAIRS) {
		report.outcome = "inconclusive";
		report.note = `only ${pairs} valid pair(s) (${invalid} invalid) — need ${MIN_PAIRS}`;
		return report;
	}

	const noiseBound = policy.iqrFactor * Math.max(Math.abs(medianDiff), policy.absFloor);
	if (diffIqr > noiseBound) {
		report.outcome = "inconclusive";
		report.note = `paired-diff IQR ${diffIqr.toFixed(1)}${policy.unit} exceeds noise bound ${noiseBound.toFixed(1)}${policy.unit}`;
		return report;
	}

	const relChange = medianRatio === null ? Math.abs(medianDiff) : Math.abs(medianRatio - 1);
	const absChange = Math.abs(medianDiff);
	const meaningful = relChange >= policy.rel && absChange >= policy.absFloor;
	const worse = policy.lowerIsBetter ? medianDiff > 0 : medianDiff < 0;

	if (meaningful && consistency >= MIN_CONSISTENCY) {
		report.outcome = worse ? "regression" : "improvement";
		if (!worse) {
			report.note = "improvement is reported, never merged as a gate";
		}
	}
	return report;
}
