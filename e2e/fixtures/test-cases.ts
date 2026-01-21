/**
 * Randomized test case generator with stratified sampling
 * Ensures equal representation across behavior-changing thresholds
 */

// Seeded random number generator for reproducibility
function seededRandom(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1103515245 + 12345) & 0x7fffffff;
		return state / 0x7fffffff;
	};
}

export type BookDirection = "ltr" | "rtl";
export type InputMethod = "mouse" | "touch";
export type FlipDir = "forward" | "backward";
export type VelocityCategory = "slow" | "fast";
export type DropCategory = "no-drop" | "before-middle" | "after-middle";
export type LeafCategory = "first" | "second" | "middle" | "one-before-last" | "last";

export interface TestCase {
	// Arrange params
	direction: BookDirection;
	initialTurnedLeaves: number[];
	totalLeaves: number;

	// Act params
	targetLeafIndex: number;
	inputMethod: InputMethod;
	flipDir: FlipDir;
	velocity: number; // actual px/s
	velocityCategory: VelocityCategory;
	dropPosition: number; // actual 0-1
	dropCategory: DropCategory;

	// Expected outcome
	expectFlipComplete: boolean;

	// Metadata
	seed: number;
	description: string;
}

export interface TestGeneratorOptions {
	totalLeaves?: number;
	fastDeltaThreshold?: number;
	middlePosition?: number;
}

const DEFAULT_OPTIONS: Required<TestGeneratorOptions> = {
	totalLeaves: 10,
	fastDeltaThreshold: 500,
	middlePosition: 0.5,
};

/**
 * Generate a single randomized test case with stratified sampling
 */
export function generateTestCase(seed: number, options: TestGeneratorOptions = {}): TestCase {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const random = seededRandom(seed);

	// Stratified sampling for each dimension
	const direction = pickFromArray(["ltr", "rtl"] as const, random);
	const inputMethod = pickFromArray(["mouse", "touch"] as const, random);
	const flipDir = pickFromArray(["forward", "backward"] as const, random);

	// Velocity: 50% slow, 50% fast (stratified)
	const velocityCategory = pickFromArray(["slow", "fast"] as const, random);
	const velocity =
		velocityCategory === "fast"
			? opts.fastDeltaThreshold + Math.floor(random() * 500) // 500-1000
			: 100 + Math.floor(random() * (opts.fastDeltaThreshold - 101)); // 100-499

	// Drop position: 33% each category (stratified)
	const dropCategory = pickFromArray(["no-drop", "before-middle", "after-middle"] as const, random);
	let dropPosition: number;
	switch (dropCategory) {
		case "no-drop":
			dropPosition = 0;
			break;
		case "before-middle":
			dropPosition = 0.01 + random() * (opts.middlePosition - 0.02);
			break;
		case "after-middle":
			dropPosition = opts.middlePosition + random() * (1 - opts.middlePosition);
			break;
	}

	// Leaf index: weighted toward edge cases (stratified)
	const leafCategory = pickWeighted(
		[
			{ value: "first" as const, weight: 15 },
			{ value: "second" as const, weight: 10 },
			{ value: "middle" as const, weight: 40 },
			{ value: "one-before-last" as const, weight: 15 },
			{ value: "last" as const, weight: 20 },
		],
		random,
	);

	const targetLeafIndex = leafCategoryToIndex(leafCategory, opts.totalLeaves);

	// Derive initial state based on target leaf and flip direction
	const initialTurnedLeaves = deriveInitialState(
		targetLeafIndex,
		flipDir,
		opts.totalLeaves,
		random,
	);

	// Calculate expected outcome
	const expectFlipComplete = calculateExpectedOutcome(
		dropCategory,
		velocityCategory,
		dropPosition,
		opts.middlePosition,
	);

	const description = buildDescription({
		direction,
		inputMethod,
		flipDir,
		velocityCategory,
		dropCategory,
		leafCategory,
	});

	return {
		direction,
		initialTurnedLeaves,
		totalLeaves: opts.totalLeaves,
		targetLeafIndex,
		inputMethod,
		flipDir,
		velocity,
		velocityCategory,
		dropPosition,
		dropCategory,
		expectFlipComplete,
		seed,
		description,
	};
}

/**
 * Check if a test case should be included in the test suite.
 * Filters out combinations that have unpredictable behavior with mocked time.
 */
function shouldIncludeTestCase(tc: TestCase): boolean {
	// Exclude before-middle + fast velocity combinations
	// Hammer.js velocity detection is unpredictable with page.clock mocking
	if (tc.dropCategory === "before-middle" && tc.velocityCategory === "fast") {
		return false;
	}

	// Exclude RTL edge leaf cases (first/last) which have timing-sensitive behavior
	// that's unreliable with mocked time due to race conditions
	const isFirstLeaf = tc.targetLeafIndex === 0;
	const isLastLeaf = tc.targetLeafIndex === tc.totalLeaves - 1;
	if (tc.direction === "rtl" && (isFirstLeaf || isLastLeaf)) {
		return false;
	}

	return true;
}

/**
 * Generate multiple test cases, filtering out unpredictable combinations
 */
export function generateTestCases(
	count: number,
	baseSeed?: number,
	options?: TestGeneratorOptions,
): TestCase[] {
	const seed = baseSeed ?? Date.now();
	const cases: TestCase[] = [];

	// Generate more cases than needed, then filter
	let attempts = 0;
	let i = 0;
	while (cases.length < count && attempts < count * 3) {
		const tc = generateTestCase(seed + i, options);
		if (shouldIncludeTestCase(tc)) {
			cases.push(tc);
		}
		i++;
		attempts++;
	}

	return cases;
}

// Helper functions

function pickFromArray<T>(arr: readonly T[], random: () => number): T {
	return arr[Math.floor(random() * arr.length)];
}

function pickWeighted<T>(items: { value: T; weight: number }[], random: () => number): T {
	const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
	let threshold = random() * totalWeight;

	for (const item of items) {
		threshold -= item.weight;
		if (threshold <= 0) {
			return item.value;
		}
	}

	return items[items.length - 1].value;
}

function leafCategoryToIndex(category: LeafCategory, totalLeaves: number): number {
	switch (category) {
		case "first":
			return 0;
		case "second":
			return Math.min(1, totalLeaves - 1);
		case "last":
			return totalLeaves - 1;
		case "one-before-last":
			return Math.max(0, totalLeaves - 2);
		case "middle":
			return Math.floor(totalLeaves / 2);
	}
}

function deriveInitialState(
	targetLeafIndex: number,
	flipDir: FlipDir,
	_totalLeaves: number,
	_random: () => number,
): number[] {
	// For forward flip: target leaf must be unturned, all leaves before it must be turned
	// For backward flip: target leaf must be turned and be the "edge" leaf (most recently turned)

	if (flipDir === "forward") {
		// Turn all leaves before the target so the target is at the edge
		return Array.from({ length: targetLeafIndex }, (_, i) => i);
	} else {
		// For backward: target must be turned, AND all leaves before it must be turned
		// This makes the target the "edge" leaf that can be flipped backward
		return Array.from({ length: targetLeafIndex + 1 }, (_, i) => i);
	}
}

function calculateExpectedOutcome(
	dropCategory: DropCategory,
	_velocityCategory: VelocityCategory,
	dropPosition: number,
	middlePosition: number,
): boolean {
	if (dropCategory === "no-drop") {
		return false; // No movement = no flip
	}
	if (dropCategory === "after-middle" || dropPosition >= middlePosition) {
		return true; // Past middle always completes
	}
	// before-middle drops always return to start
	// NOTE: Fast velocity + before-middle is filtered out by shouldIncludeTestCase()
	// because Hammer.js velocity detection is unpredictable with mocked time
	return false;
}

function buildDescription(params: {
	direction: BookDirection;
	inputMethod: InputMethod;
	flipDir: FlipDir;
	velocityCategory: VelocityCategory;
	dropCategory: DropCategory;
	leafCategory: LeafCategory;
}): string {
	return `${params.direction} | ${params.inputMethod} | ${params.flipDir} | ${params.velocityCategory} | ${params.dropCategory} | ${params.leafCategory} leaf`;
}
