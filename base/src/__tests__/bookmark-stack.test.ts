import { describe, expect, it } from "vitest";
import { calculateBookmarkStack } from "../bookmark-stack";

describe("bookmark range stacking", () => {
	it("fits sixty bookmarks into three ranges of twenty without extending the rail", () => {
		const stack = calculateBookmarkStack(60, 636, 28, 92, 4, 27.6, 160);
		expect(stack).toMatchObject({ capacity: 20, layers: 3, length: 28 });
		expect(stack.frontDepth).toBeCloseTo(92);
		expect(stack.step).toBeCloseTo(27.6);
		expect(stack.stagger).toBeCloseTo(stack.pitch / 2);
		expect(stack.pitch - stack.length).toBeGreaterThanOrEqual(2);
		expect((stack.capacity - 1) * stack.pitch + stack.stagger + stack.length).toBeCloseTo(636);
		expect(stack.depth).toBeCloseTo(147.2);
		// The odd range remains behind the gap between two neighbours of the front range.
		expect(stack.stagger).toBeLessThan(stack.length);
		expect(stack.stagger + stack.length).toBeGreaterThan(stack.pitch);
	});

	it("keeps a single range at its full depth and reflows capacity after resizing", () => {
		expect(calculateBookmarkStack(20, 636, 28, 92, 4, 10)).toMatchObject({
			capacity: 20,
			layers: 1,
			frontDepth: 92,
			step: 0,
		});
		expect(calculateBookmarkStack(60, 316, 28, 92, 4, 10)).toMatchObject({
			capacity: 10,
			layers: 6,
		});
	});

	it("reduces stair width to keep the front range useful within a narrow rail", () => {
		const stack = calculateBookmarkStack(60, 636, 28, 28, 4, 10);
		expect(stack.frontDepth).toBe(20);
		expect(stack.step).toBe(4);
		expect(stack.frontDepth + 2 * stack.step).toBe(28);
	});

	it("bounds stairs by existing clearance without changing reserved book depth", () => {
		const stack = calculateBookmarkStack(60, 636, 28, 92, 4, 27.6);
		expect(stack.depth).toBe(92);
		expect(stack.frontDepth).toBeCloseTo(55.2);
		expect(stack.step).toBeCloseTo(18.4);
	});

	it("shortens crowded parallel tips enough to leave every layer a whole pixel", () => {
		const stack = calculateBookmarkStack(26, 229.28125, 72, 28, 4, 8.4, 28, 1);
		expect(stack).toMatchObject({ capacity: 3, layers: 9, step: 1, frontDepth: 20, depth: 28 });
		expect(stack.length).toBeLessThan(72);
		expect(stack.length).toBeGreaterThan(62);
		expect(2 * stack.pitch + stack.stagger + stack.length).toBeCloseTo(229.28125);
	});

	it("honors a smaller consumer step and clamps tab height to short books", () => {
		expect(calculateBookmarkStack(60, 636, 28, 92, 4, 6).step).toBe(6);
		expect(calculateBookmarkStack(3, 12, 28, 92, 4, 10)).toMatchObject({
			capacity: 1,
			layers: 3,
			length: 12,
		});
		expect(calculateBookmarkStack(0, 0, 28, 92, 0, 10)).toMatchObject({
			capacity: 1,
			layers: 1,
			length: 0,
		});
	});
});
