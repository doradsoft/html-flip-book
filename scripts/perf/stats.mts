/**
 * Paired-sample statistics for the perf harness (issue #289).
 * Everything is computed on index-aligned base/candidate pairs so slow
 * machine-wide drift hits both sides of a pair together.
 */

export interface PairedStats {
	n: number;
	baseMedian: number;
	candidateMedian: number;
	medianDiff: number;
	madDiff: number;
	medianRatio: number;
	ci90Low: number;
	ci90High: number;
}

/** Deterministic PRNG so CI output is reproducible for a given input. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function sorted(xs: number[]): number[] {
	return [...xs].sort((a, b) => a - b);
}

export function median(xs: number[]): number {
	const s = sorted(xs);
	const mid = Math.floor(s.length / 2);
	return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function percentile(xs: number[], p: number): number {
	const s = sorted(xs);
	const idx = Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1);
	return s[Math.max(0, idx)];
}

/** Median absolute deviation around the median: a robust spread measure. */
export function mad(xs: number[]): number {
	const m = median(xs);
	return median(xs.map((x) => Math.abs(x - m)));
}

/** Bootstrap a 90% interval on the median of the paired differences. */
function medianDiffCi(diffs: number[], seed: number): [number, number] {
	if (diffs.length < 4) return [Math.min(...diffs), Math.max(...diffs)];
	const rand = mulberry32(seed);
	const medians: number[] = [];
	for (let i = 0; i < 2000; i++) {
		const sample: number[] = [];
		for (let j = 0; j < diffs.length; j++) {
			sample.push(diffs[Math.floor(rand() * diffs.length)]);
		}
		medians.push(median(sample));
	}
	return [percentile(medians, 5), percentile(medians, 95)];
}

export function summarize(base: number[], candidate: number[], seed = 1): PairedStats {
	const n = Math.min(base.length, candidate.length);
	const diffs = base.slice(0, n).map((b, i) => candidate[i] - b);
	const ratios = base.slice(0, n).map((b, i) => candidate[i] / (b || 1e-9));
	const [ci90Low, ci90High] = medianDiffCi(diffs, seed);
	return {
		n,
		baseMedian: median(base.slice(0, n)),
		candidateMedian: median(candidate.slice(0, n)),
		medianDiff: median(diffs),
		madDiff: mad(diffs),
		medianRatio: median(ratios),
		ci90Low,
		ci90High,
	};
}
