import { describe, expect, it } from "vitest";
import {
	computePageFold,
	computePageFoldFromPoint,
	easePageTurn,
	getPageFoldDestination,
	type Point,
} from "../page-fold";

function area(polygon: Point[]): number {
	return (
		Math.abs(
			polygon.reduce((total, point, index) => {
				const next = polygon[(index + 1) % polygon.length];
				return total + point.x * next.y - point.y * next.x;
			}, 0),
		) / 2
	);
}

function reflected(point: Point, matrix: [number, number, number, number, number, number]): Point {
	return {
		x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
		y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
	};
}

describe("computePageFold", () => {
	it("partitions the sheet along the crease without losing area", () => {
		for (const corner of ["top", "bottom"] as const) {
			for (const position of [0, 0.01, 0.12, 0.4, 0.5, 0.73, 0.99, 1]) {
				for (const offset of [-2, -0.3, 0, 0.3, 2]) {
					const fold = computePageFold(320, 480, position, corner, offset);
					expect(area(fold.front) + area(fold.folded)).toBeCloseTo(320 * 480, 7);
					for (const [polygon, side] of [
						[fold.front, -1],
						[fold.folded, 1],
					] as const) {
						for (const point of polygon) {
							const distance =
								(point.x - fold.midpoint.x) * fold.normal.x +
								(point.y - fold.midpoint.y) * fold.normal.y;
							expect(side * distance).toBeGreaterThanOrEqual(-1e-10);
						}
					}
				}
			}
		}
	});

	it("reflects every lifted vertex across the crease and preserves its area", () => {
		const fold = computePageFold(320, 480, 0.38, "bottom", -0.12);
		const transformed = fold.folded.map((point) => {
			const result = reflected(point, fold.reflection);
			const distance =
				(point.x - fold.midpoint.x) * fold.normal.x + (point.y - fold.midpoint.y) * fold.normal.y;
			expect(result.x).toBeCloseTo(point.x - 2 * fold.normal.x * distance, 10);
			expect(result.y).toBeCloseTo(point.y - 2 * fold.normal.y * distance, 10);
			const restored = reflected(result, fold.reflection);
			expect(restored.x).toBeCloseTo(point.x, 10);
			expect(restored.y).toBeCloseTo(point.y, 10);
			return result;
		});
		expect(area(transformed)).toBeCloseTo(area(fold.folded), 8);
	});

	it("maps the outer corner to the constrained pointer position", () => {
		for (const corner of ["top", "bottom"] as const) {
			for (const position of [0, 0.025, 0.25, 0.5, 0.9, 1]) {
				const w = 300;
				const h = 500;
				const inward = corner === "top" ? 1 : -1;
				const cornerY = corner === "top" ? 0 : h;
				const wave = position === 0 || position === 1 ? 0 : Math.sin(Math.PI * position);
				let x = w * (1 - 2 * position);
				let y = inward * Math.min(h * 0.6, wave * (Math.min(h * 0.18, w * 0.28) + 0.5 * h));
				const length = Math.hypot(x, y);
				if (length > w) {
					x *= w / length;
					y *= w / length;
				}
				const fold = computePageFold(w, h, position, corner, inward * 0.5);
				const destination = reflected({ x: w, y: cornerY }, fold.reflection);
				expect(destination.x).toBeCloseTo(x, 9);
				expect(destination.y).toBeCloseTo(cornerY + y, 9);
				expect(Math.hypot(destination.x, destination.y - cornerY)).toBeLessThanOrEqual(w + 1e-9);
			}
		}
	});

	it("mirrors top and bottom folds when their pointer offsets are mirrored", () => {
		const top = computePageFold(300, 500, 0.41, "top", 0.14);
		const bottom = computePageFold(300, 500, 0.41, "bottom", -0.14);
		expect(top.normal.x).toBeCloseTo(bottom.normal.x, 10);
		expect(top.normal.y).toBeCloseTo(-bottom.normal.y, 10);
		expect(top.midpoint.x).toBeCloseTo(bottom.midpoint.x, 10);
		expect(top.midpoint.y).toBeCloseTo(500 - bottom.midpoint.y, 10);
		expect(area(top.front)).toBeCloseTo(area(bottom.front), 8);
		for (const point of top.folded) {
			const mappedTop = reflected(point, top.reflection);
			const mappedBottom = reflected({ x: point.x, y: 500 - point.y }, bottom.reflection);
			expect(mappedTop.x).toBeCloseTo(mappedBottom.x, 10);
			expect(mappedTop.y).toBeCloseTo(500 - mappedBottom.y, 10);
		}
	});

	it("rests flat at the endpoints and has a substantial fold halfway through", () => {
		const start = computePageFold(300, 500, 0, "top");
		const middle = computePageFold(300, 500, 0.5, "top");
		const end = computePageFold(300, 500, 1, "bottom");
		expect(area(start.front)).toBe(150000);
		expect(start.folded).toEqual([]);
		expect(start.strength).toBe(0);
		expect(area(middle.front)).toBeGreaterThan(0);
		expect(area(middle.folded)).toBeGreaterThan(0);
		expect(middle.strength).toBe(1);
		expect(end.front).toEqual([]);
		expect(area(end.folded)).toBe(150000);
		expect(end.strength).toBe(0);
		expect(reflected({ x: 300, y: 500 }, end.reflection)).toEqual({ x: -300, y: 500 });
	});

	it("bounds unusual input and always returns finite geometry", () => {
		for (const [width, height, position, offset] of [
			[0, -1, Number.NaN, Number.NaN],
			[Number.POSITIVE_INFINITY, 500, -100, Number.NEGATIVE_INFINITY],
			[300, 500, 100, Number.MAX_VALUE],
			[Number.MAX_VALUE, Number.MAX_VALUE, 0.3, Number.MAX_VALUE],
			[300, 500, 0.000001, -Number.MAX_VALUE],
		]) {
			const fold = computePageFold(width, height, position, "top", offset);
			const values = [
				...fold.front.flatMap((point) => [point.x, point.y]),
				...fold.folded.flatMap((point) => [point.x, point.y]),
				...fold.reflection,
				fold.normal.x,
				fold.normal.y,
				fold.midpoint.x,
				fold.midpoint.y,
				fold.strength,
			];
			expect(values.every(Number.isFinite)).toBe(true);
			expect(Math.hypot(fold.normal.x, fold.normal.y)).toBeCloseTo(1, 10);
			expect(fold.strength).toBeGreaterThanOrEqual(0);
			expect(fold.strength).toBeLessThanOrEqual(1);
		}
	});
});

describe("computePageFoldFromPoint", () => {
	it("keeps feasible points exact, including either vertical pull direction", () => {
		for (const corner of ["top", "bottom"] as const) {
			for (const point of [
				{ x: 180, y: 40 },
				{ x: 120, y: -40 },
				{ x: 0, y: 140 },
				{ x: -120, y: -40 },
				{ x: -180, y: 40 },
			]) {
				const destination = { x: point.x, y: corner === "top" ? point.y : 400 - point.y };
				const fold = computePageFoldFromPoint(240, 400, destination, corner);
				expect(fold.destination).toEqual(destination);
			}
		}
	});

	it("puts the lifted corner at the spine after a one-leaf-width horizontal pull", () => {
		for (const corner of ["top", "bottom"] as const) {
			const cornerY = corner === "top" ? 0 : 400;
			const fold = computePageFoldFromPoint(240, 400, { x: 0, y: cornerY }, corner);
			expect(fold.destination).toEqual({ x: 0, y: cornerY });
			expect(reflected({ x: 240, y: cornerY }, fold.reflection)).toEqual({ x: 0, y: cornerY });
			expect(area(fold.front)).toBe(240 * 400 * 0.5);
			expect(area(fold.folded)).toBe(240 * 400 * 0.5);
			expect(fold.strength).toBe(1);
		}
	});

	it("preserves both signs of vertical-only pulls at either resting edge", () => {
		for (const corner of ["top", "bottom"] as const) {
			const cornerY = corner === "top" ? 0 : 400;
			for (const x of [-240, 240]) {
				for (const dy of [-60, 60]) {
					const fold = computePageFoldFromPoint(240, 400, { x, y: cornerY + dy }, corner);
					expect(Math.sign(fold.destination.y - cornerY)).toBe(Math.sign(dy));
					expect(Math.abs(fold.destination.x)).toBeLessThan(240);
					expect(area(fold.front)).toBeGreaterThan(0);
					expect(area(fold.folded)).toBeGreaterThan(0);
				}
			}
		}
	});

	it("projects to the nearest admissible circle arc or their intersection", () => {
		const oppositeRadius = Math.hypot(200, 300);
		const straightUp = computePageFoldFromPoint(200, 300, { x: 0, y: -500 }, "top");
		expect(straightUp.destination.x).toBe(0);
		expect(straightUp.destination.y).toBeCloseTo(300 - oppositeRadius, 12);
		const outward = computePageFoldFromPoint(200, 300, { x: 300, y: -100 }, "top");
		expect(outward.destination).toEqual({ x: 200, y: 0 });
		const down = computePageFoldFromPoint(200, 300, { x: 300, y: 100 }, "top");
		const radialLength = Math.hypot(300, 100);
		expect(down.destination.x).toBeCloseTo((200 * 300) / radialLength, 12);
		expect(down.destination.y).toBeCloseTo((200 * 100) / radialLength, 12);
	});

	it("does not invert the sheet for rounding-sized pulls beyond the resting edge", () => {
		const fold = computePageFoldFromPoint(240, 400, { x: 240 + Number.EPSILON * 240, y: 0 }, "top");
		expect(fold.destination).toEqual({ x: 240, y: 0 });
		expect(fold.folded).toEqual([]);
		expect(area(fold.front)).toBe(240 * 400);
	});

	it("keeps both spine endpoints outside the lifted region for far-outside requests", () => {
		for (const corner of ["top", "bottom"] as const) {
			const cornerY = corner === "top" ? 0 : 400;
			for (const target of [
				{ x: 800, y: -900 },
				{ x: -800, y: 1200 },
				{ x: 120, y: -300 },
				{ x: -120, y: 800 },
				{ x: 240, y: 70 },
				{ x: -240, y: -70 },
			]) {
				const fold = computePageFoldFromPoint(240, 400, target, corner);
				expect(Math.hypot(fold.destination.x, fold.destination.y - cornerY)).toBeLessThanOrEqual(
					240 + 1e-10,
				);
				expect(
					Math.hypot(fold.destination.x, fold.destination.y - (400 - cornerY)),
				).toBeLessThanOrEqual(Math.hypot(240, 400) + 1e-10);
				for (const spineY of [0, 400]) {
					const distance =
						-fold.midpoint.x * fold.normal.x + (spineY - fold.midpoint.y) * fold.normal.y;
					expect(distance).toBeLessThanOrEqual(1e-10);
				}
				const actual = reflected({ x: 240, y: cornerY }, fold.reflection);
				expect(actual.x).toBeCloseTo(fold.destination.x, 10);
				expect(actual.y).toBeCloseTo(fold.destination.y, 10);
				expect(area(fold.front) + area(fold.folded)).toBeCloseTo(240 * 400, 8);
			}
		}
	});

	it("mirrors top and bottom geometry for the same two-dimensional pull", () => {
		for (const target of [
			{ x: 210, y: -80 },
			{ x: 100, y: 90 },
			{ x: -210, y: 60 },
			{ x: -400, y: -500 },
		]) {
			const top = computePageFoldFromPoint(240, 400, target, "top");
			const bottom = computePageFoldFromPoint(
				240,
				400,
				{ x: target.x, y: 400 - target.y },
				"bottom",
			);
			expect(top.destination.x).toBeCloseTo(bottom.destination.x, 10);
			expect(top.destination.y).toBeCloseTo(400 - bottom.destination.y, 10);
			expect(top.normal.x).toBeCloseTo(bottom.normal.x, 10);
			expect(top.normal.y).toBeCloseTo(-bottom.normal.y, 10);
			expect(area(top.folded)).toBeCloseTo(area(bottom.folded), 8);
		}
	});

	it("keeps release interpolation inside the feasible region and retains its first frame", () => {
		const initial = computePageFoldFromPoint(240, 400, { x: -70, y: -35 }, "top");
		for (const targetX of [-240, 240]) {
			for (let index = 0; index <= 10; index++) {
				const amount = easePageTurn(index / 10);
				const destination = {
					x: initial.destination.x + (targetX - initial.destination.x) * amount,
					y: initial.destination.y * (1 - amount),
				};
				const fold = computePageFoldFromPoint(240, 400, destination, "top");
				expect(fold.destination).toEqual(destination);
				if (index === 0) expect(fold.reflection).toEqual(initial.reflection);
			}
		}
	});

	it("returns finite geometry for invalid and very large destinations", () => {
		for (const target of [
			{ x: Number.NaN, y: Number.POSITIVE_INFINITY },
			{ x: Number.MAX_VALUE, y: Number.MAX_VALUE },
			{ x: -Number.MAX_VALUE, y: -Number.MAX_VALUE },
		]) {
			const fold = computePageFoldFromPoint(240, 400, target, "bottom");
			const values = [
				fold.destination.x,
				fold.destination.y,
				...fold.reflection,
				fold.normal.x,
				fold.normal.y,
				fold.midpoint.x,
				fold.midpoint.y,
				fold.strength,
			];
			expect(values.every(Number.isFinite)).toBe(true);
		}
	});
});

describe("getPageFoldDestination", () => {
	it("matches the automatic renderer and provides exact resting endpoints", () => {
		for (const corner of ["top", "bottom"] as const) {
			const cornerY = corner === "top" ? 0 : 400;
			expect(getPageFoldDestination(240, 400, 0, corner)).toEqual({ x: 240, y: cornerY });
			expect(getPageFoldDestination(240, 400, 1, corner)).toEqual({ x: -240, y: cornerY });
			for (const position of [0.05, 0.25, 0.5, 0.75, 0.95]) {
				const destination = getPageFoldDestination(240, 400, position, corner, 0.15);
				const automatic = computePageFold(240, 400, position, corner, 0.15);
				const direct = computePageFoldFromPoint(240, 400, destination, corner);
				expect(automatic.destination).toEqual(destination);
				expect(automatic.reflection).toEqual(direct.reflection);
				expect(automatic.front).toEqual(direct.front);
				expect(automatic.folded).toEqual(direct.folded);
			}
		}
	});
});

describe("easePageTurn", () => {
	it("has exact bounded endpoints and a symmetric midpoint", () => {
		expect(easePageTurn(-1)).toBe(0);
		expect(easePageTurn(0)).toBe(0);
		expect(easePageTurn(1)).toBe(1);
		expect(easePageTurn(2)).toBe(1);
		expect(easePageTurn(Number.NaN)).toBe(0);
		expect(easePageTurn(0.5)).toBeCloseTo(0.5, 15);
		for (const value of [0.1, 0.2, 0.3, 0.4]) {
			expect(easePageTurn(value) + easePageTurn(1 - value)).toBeCloseTo(1, 15);
		}
	});

	it("accelerates from rest, stays monotonic, and settles at rest", () => {
		let previous = 0;
		for (let index = 1; index <= 100; index++) {
			const current = easePageTurn(index / 100);
			expect(current).toBeGreaterThan(previous);
			previous = current;
		}
		expect(easePageTurn(0.01)).toBeLessThan(0.01);
		expect(easePageTurn(0.99)).toBeGreaterThan(0.99);
	});
});
