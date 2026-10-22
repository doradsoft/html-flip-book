import { describe, expect, it, vi } from "vitest";
import {
	type BookmarkFoldSurface,
	type BookmarkLeafFrame,
	getBookmarkFoldSurfaces,
} from "../bookmark-fold";
import { FLIPPED, Leaf, NOT_FLIPPED } from "../leaf";
import { computePageFold, computePageFoldFromPoint, type Point } from "../page-fold";

function frame(overrides: Partial<BookmarkLeafFrame> = {}): BookmarkLeafFrame {
	return {
		width: 400,
		height: 600,
		isLTR: true,
		position: 0,
		restingPosition: 0,
		kind: "rigid",
		backwardPreview: false,
		zIndices: [20, 21],
		...overrides,
	};
}

function area(polygon: Point[]): number {
	return Math.abs(
		polygon.reduce((total, point, index) => {
			const next = polygon[(index + 1) % polygon.length];
			return total + point.x * next.y - next.x * point.y;
		}, 0) / 2,
	);
}

/** Evaluate the affine paper surface, including the bookmark's local translation. */
function projectPaperPoint(surface: BookmarkFoldSurface, point: Point): Point {
	const matrix = surface.transform
		.match(/^matrix\(([^)]+)\)/)?.[1]
		.split(",")
		.map(Number);
	const offset = surface.transform.match(/ translate\(([-\d.]+)px, ([-\d.]+)px\)$/);
	if (!matrix || !offset) throw new Error("Expected an affine paper surface");
	const [a, b, c, d, tx, ty] = matrix;
	const x = point.x + Number(offset[1]);
	const y = point.y + Number(offset[2]);
	return { x: a * x + c * y + tx, y: b * x + d * y + ty };
}

describe("bookmark material during leaf motion", () => {
	it.each([
		{ left: 0, top: 0, width: 0, height: 20 },
		{ left: 0, top: 0, width: 20, height: -1 },
		{ left: Number.NaN, top: 0, width: 20, height: 20 },
		{ left: 0, top: Number.POSITIVE_INFINITY, width: 20, height: 20 },
	])("rejects a non-renderable material rectangle", (rectangle) => {
		expect(getBookmarkFoldSurfaces(frame(), rectangle)).toEqual([]);
	});

	it.each([true, false])("keeps rigid turns in the page's perspective plane (LTR=%s)", (isLTR) => {
		const rectangle = { left: 400, top: 120, width: 36, height: 24 };
		const [surface] = getBookmarkFoldSurfaces(frame({ isLTR, position: 0.25 }), rectangle);
		expect(surface.polygon).toEqual([
			{ x: 0, y: 0 },
			{ x: 36, y: 0 },
			{ x: 36, y: 24 },
			{ x: 0, y: 24 },
		]);
		expect(surface.transform).toBe(
			isLTR
				? "translateX(400px) rotateY(-45deg) scaleX(1) translate(400px, 120px)"
				: "translateX(0px) rotateY(45deg) scaleX(-1) translate(400px, 120px)",
		);
		expect(surface.face).toBe(0);
		expect(surface.zIndex).toBe(20);
		const [reverse] = getBookmarkFoldSurfaces(frame({ isLTR, position: 0.75 }), rectangle);
		expect(reverse.face).toBe(1);
		expect(reverse.zIndex).toBe(21);
	});

	it.each([
		{ left: 180, top: -36, width: 40, height: 36 },
		{ left: 180, top: 600, width: 40, height: 36 },
		{ left: -36, top: 280, width: 36, height: 40 },
		{ left: 400, top: 280, width: 36, height: 40 },
	])("preserves all bookmark material outside every paper edge", (rectangle) => {
		for (const corner of ["top", "bottom"] as const) {
			for (const isLTR of [true, false]) {
				const surfaces = getBookmarkFoldSurfaces(
					frame({
						isLTR,
						position: 0.5,
						kind: "paper",
						fold: computePageFold(400, 600, 0.5, corner),
					}),
					rectangle,
				);
				expect(surfaces.reduce((total, surface) => total + area(surface.polygon), 0)).toBeCloseTo(
					rectangle.width * rectangle.height,
					6,
				);
				for (const surface of surfaces) {
					for (const point of surface.polygon) {
						expect(point.x).toBeGreaterThanOrEqual(-1e-8);
						expect(point.x).toBeLessThanOrEqual(rectangle.width + 1e-8);
						expect(point.y).toBeGreaterThanOrEqual(-1e-8);
						expect(point.y).toBeLessThanOrEqual(rectangle.height + 1e-8);
					}
				}
			}
		}
	});

	it.each([
		true,
		false,
	])("splits a bookmark at the paper crease without a seam (LTR=%s)", (isLTR) => {
		const rectangle = { left: 180, top: -36, width: 40, height: 36 };
		const fold = computePageFoldFromPoint(400, 600, { x: 0, y: 0 }, "top");
		const surfaces = getBookmarkFoldSurfaces(frame({ isLTR, kind: "paper", fold }), rectangle);
		expect(surfaces).toHaveLength(2);
		expect(area(surfaces[0].polygon)).toBe(20 * 36);
		expect(area(surfaces[1].polygon)).toBe(20 * 36);
		const crease = { x: 20, y: 18 };
		const frontPoint = projectPaperPoint(surfaces[0], crease);
		const backPoint = projectPaperPoint(surfaces[1], crease);
		expect(frontPoint.x).toBeCloseTo(isLTR ? 600 : -200);
		expect(frontPoint.y).toBe(-18);
		expect(backPoint.x).toBeCloseTo(frontPoint.x);
		expect(backPoint.y).toBeCloseTo(frontPoint.y);
		const liftedTip = projectPaperPoint(surfaces[1], { x: 40, y: 18 });
		expect(liftedTip.x).toBeCloseTo(isLTR ? 580 : -180);
	});

	it.each([
		true,
		false,
	])("curls from the back face without moving the resting body (LTR=%s)", (isLTR) => {
		const fold = computePageFoldFromPoint(400, 600, { x: 0, y: 600 }, "bottom");
		const surfaces = getBookmarkFoldSurfaces(
			frame({ isLTR, kind: "paper", fold, backwardPreview: true, restingPosition: 1 }),
			{ left: 180, top: 600, width: 40, height: 36 },
		);
		expect(surfaces.map((surface) => surface.face)).toEqual([1, 0]);
		const body = projectPaperPoint(surfaces[0], { x: 0, y: 0 });
		expect(body.x).toBe(isLTR ? 220 : 180);
		expect(body.y).toBe(600);
		const crease = { x: 20, y: 0 };
		expect(projectPaperPoint(surfaces[0], crease)).toEqual(projectPaperPoint(surfaces[1], crease));
	});
});

describe("leaf transform frames", () => {
	function leaf(isLTR = true, turned = false, cover = false): Leaf {
		const pages = [document.createElement("div"), document.createElement("div")] as [
			HTMLElement,
			HTMLElement,
		];
		for (const [index, page] of pages.entries()) {
			page.style.width = "400px";
			page.style.height = "600px";
			page.dataset.pageIndex = String(index);
			page.dataset.isCoverPage = cover ? "1" : "";
		}
		return new Leaf(
			0,
			pages,
			turned ? FLIPPED : NOT_FLIPPED,
			{ isLTR, pagesCount: 10, leavesCount: 5, pageShadow: false, snapshotDuringFlip: true },
			vi.fn(),
		);
	}

	it("reports static and rigid cover poses only after both page transforms are applied", () => {
		const cover = leaf(true, false, true);
		const poses: BookmarkLeafFrame[] = [];
		cover.onTransform = (pose) => {
			poses.push(pose);
			expect(cover.pages[0].style.transform).toContain("rotateY");
			expect(cover.pages[1]?.style.transform).toContain("rotateY");
		};
		cover.applyTransform(0);
		cover.setManualPosition(0.35);
		expect(poses).toHaveLength(2);
		expect(poses[0].kind).toBe("rigid");
		expect(poses[1].position).toBe(0.35);
		expect(poses[1].fold).toBeUndefined();
		expect(cover.transformFrame).toBe(poses[1]);
	});

	it.each([
		true,
		false,
	])("exposes the exact manual paper geometry and settlement (LTR=%s)", async (isLTR) => {
		const paper = leaf(isLTR);
		const observed = vi.fn();
		paper.onTransform = observed;
		paper.setFoldOrigin(1);
		paper.setManualFold({ x: 0.15, y: 0.75 });
		const pose = paper.transformFrame;
		expect(pose?.kind).toBe("paper");
		expect(pose?.fold?.destination.x).toBeCloseTo(60);
		expect(pose?.fold?.destination.y).toBeCloseTo(450);
		expect(pose?.position).toBeCloseTo(0.425);
		expect(pose?.restingPosition).toBeCloseTo(0.425);
		expect(observed).toHaveBeenCalledWith(pose);
		await paper.flipToPosition(1, 20000);
		expect(paper.transformFrame?.position).toBe(1);
		expect(paper.transformFrame?.kind).toBe("rigid");
		expect(paper.transformFrame?.fold).toBeUndefined();
	});

	it("retains the turned state separately from a backward hover's temporary curl", () => {
		const paper = leaf(true, true);
		paper.setHoverShadow(0.1);
		const pose = paper.transformFrame;
		expect(pose?.restingPosition).toBe(1);
		expect(pose?.position).toBeCloseTo(0.978);
		expect(pose?.backwardPreview).toBe(true);
		expect(pose?.kind).toBe("paper");
		expect(pose?.fold?.destination.x).toBeGreaterThan(350);
	});
});
