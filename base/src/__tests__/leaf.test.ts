import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlipDirection } from "../flip-direction";
import { FLIPPED, type FlipPosition, Leaf, NOT_FLIPPED } from "../leaf";
import { getLeafInternals, setLeafInternals } from "./test-utils";

describe("Leaf", () => {
	let mockPage1: HTMLElement;
	let mockPage2: HTMLElement;
	let onTurnedMock: ReturnType<typeof vi.fn>;

	const defaultBookProperties = {
		isLTR: true,
		pagesCount: 10,
		leavesCount: 5,
		pageShadow: true,
		snapshotDuringFlip: true,
	};

	beforeEach(() => {
		// Create mock page elements
		mockPage1 = document.createElement("div");
		mockPage1.dataset.pageIndex = "0";
		mockPage2 = document.createElement("div");
		mockPage2.dataset.pageIndex = "1";

		onTurnedMock = vi.fn();

		// Mock requestAnimationFrame
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			setTimeout(() => cb(performance.now()), 0);
			return 0;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("constructor", () => {
		it("should create a leaf with NOT_FLIPPED state", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			expect(leaf.index).toBe(0);
			expect(leaf.flipPosition).toBe(0);
			expect(leaf.isTurned).toBe(false);
			expect(leaf.isTurning).toBe(false);
		});

		it("should create a leaf with FLIPPED state", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			expect(leaf.flipPosition).toBe(1);
			expect(leaf.isTurned).toBe(true);
		});
	});

	describe("properties", () => {
		it("should identify first leaf", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			expect(leaf.isFirst).toBe(true);
			expect(leaf.isLast).toBe(false);
			expect(leaf.isCover).toBe(true);
		});

		it("should identify last leaf", () => {
			const leaf = new Leaf(
				4, // index 4 is last when leavesCount is 5
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			expect(leaf.isFirst).toBe(false);
			expect(leaf.isLast).toBe(true);
			expect(leaf.isCover).toBe(true);
		});

		it("should identify middle leaf as not cover", () => {
			const leaf = new Leaf(
				2,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			expect(leaf.isFirst).toBe(false);
			expect(leaf.isLast).toBe(false);
			expect(leaf.isCover).toBe(false);
		});
	});

	describe("flipPosition", () => {
		it("should clamp flip position to 0-1 range", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			leaf.flipPosition = -0.5;
			expect(leaf.flipPosition).toBe(0);

			leaf.flipPosition = 1.5;
			expect(leaf.flipPosition).toBe(1);

			leaf.flipPosition = 0.5;
			expect(leaf.flipPosition).toBe(0.5);
		});

		it("should report isTurning when flip position is not 0", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			expect(leaf.isTurning).toBe(false);

			leaf.flipPosition = 0.3;
			expect(leaf.isTurning).toBe(true);

			leaf.flipPosition = 1;
			expect(leaf.isTurning).toBe(true);
			expect(leaf.isTurned).toBe(true);
		});
	});

	describe("flipToPosition", () => {
		it("should resolve immediately if already at target position", async () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			const result = await leaf.flipToPosition(0 as FlipPosition);
			expect(result).toBeUndefined();
		});

		it("should animate flip from 0 to 1", async () => {
			vi.useFakeTimers();

			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			// Use fast velocity for quick test
			const promise = leaf.flipToPosition(1 as FlipPosition, 10000 as never);

			// Fast forward through animation
			await vi.runAllTimersAsync();
			await promise;

			expect(leaf.flipPosition).toBe(1);
			expect(leaf.isTurned).toBe(true);
			expect(onTurnedMock).toHaveBeenCalledWith(FlipDirection.Forward);

			vi.useRealTimers();
		});

		it("should return same promise when target is already in progress", async () => {
			vi.useFakeTimers();

			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			const promise1 = leaf.flipToPosition(1 as FlipPosition, 10000 as never);
			const firstAnimation = getLeafInternals(leaf).currentAnimation;
			const promise2 = leaf.flipToPosition(1 as FlipPosition, 10000 as never);
			const secondAnimation = getLeafInternals(leaf).currentAnimation;

			expect(secondAnimation).toBe(firstAnimation);
			expect(promise2).toBeInstanceOf(Promise);

			await vi.runAllTimersAsync();
			await promise1;
			await promise2;

			vi.useRealTimers();
		});

		it("should return current animation when target matches", async () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			setLeafInternals(leaf, { currentAnimation: null, targetFlipPosition: 1 as FlipPosition });

			const result = await leaf.flipToPosition(1 as FlipPosition);

			expect(result).toBeUndefined();
		});

		it("should update transforms for LTR across midpoints", async () => {
			const timestamps = [250, 750, 1000];
			vi.spyOn(performance, "now").mockReturnValue(0);
			vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
				const ts = timestamps.shift() ?? 1000;
				setTimeout(() => cb(ts), 0);
				return 0;
			});

			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				{ ...defaultBookProperties, isLTR: true },
				onTurnedMock,
			);

			const promise = leaf.flipToPosition(1 as FlipPosition, 180 as never);
			await new Promise((resolve) => setTimeout(resolve, 5));
			await promise;

			expect(mockPage1.style.transform).toContain("rotateY");
			expect(mockPage2.style.transform).toContain("rotateY");
		});

		it("should update transforms for RTL across midpoints", async () => {
			const timestamps = [250, 750, 1000];
			vi.spyOn(performance, "now").mockReturnValue(0);
			vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
				const ts = timestamps.shift() ?? 1000;
				setTimeout(() => cb(ts), 0);
				return 0;
			});

			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				{ ...defaultBookProperties, isLTR: false },
				onTurnedMock,
			);

			const promise = leaf.flipToPosition(1 as FlipPosition, 180 as never);
			await new Promise((resolve) => setTimeout(resolve, 5));
			await promise;

			expect(mockPage1.style.transformOrigin).toBeTruthy();
			expect(mockPage2.style.transformOrigin).toBeTruthy();
		});

		it("should skip transform when page is undefined", async () => {
			const timestamps = [500, 1000];
			vi.spyOn(performance, "now").mockReturnValue(0);
			vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
				const ts = timestamps.shift() ?? 1000;
				setTimeout(() => cb(ts), 0);
				return 0;
			});

			const leaf = new Leaf(
				0,
				[mockPage1, undefined],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			const promise = leaf.flipToPosition(1 as FlipPosition, 180 as never);
			await new Promise((resolve) => setTimeout(resolve, 5));
			await promise;

			expect(mockPage1.style.transform).toContain("rotateY");
		});
		it("should call onTurned with Backward when flipping to 0", async () => {
			vi.useFakeTimers();

			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			const forwardPromise = leaf.flipToPosition(1 as FlipPosition, 10000 as never);
			await vi.runAllTimersAsync();
			await forwardPromise;

			onTurnedMock.mockClear();

			const backwardPromise = leaf.flipToPosition(0 as FlipPosition, 10000 as never);
			await vi.runAllTimersAsync();
			await backwardPromise;

			expect(onTurnedMock).toHaveBeenCalledWith(FlipDirection.Backward);

			vi.useRealTimers();
		});

		it("should retry frame when elapsed is negative", async () => {
			const timestamps = [50, 200];
			vi.spyOn(performance, "now").mockReturnValue(100);
			vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
				const ts = timestamps.shift() ?? 200;
				setTimeout(() => cb(ts), 0);
				return 0;
			});

			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			const promise = leaf.flipToPosition(1 as FlipPosition, 10000 as never);
			await new Promise((resolve) => setTimeout(resolve, 5));
			await promise;

			expect(leaf.flipPosition).toBe(1);
		});
	});

	describe("efficientFlipToPosition", () => {
		it("should call flipToPosition through throttle", async () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			const spy = vi.spyOn(leaf, "flipToPosition").mockResolvedValue(undefined);

			await leaf.efficientFlipToPosition(1 as FlipPosition);

			expect(spy).toHaveBeenCalled();
		});
	});

	describe("paper folds", () => {
		const createPaperLeaf = (isLTR = true, pageShadow = true) => {
			for (const page of [mockPage1, mockPage2]) {
				page.style.width = "320px";
				page.style.height = "480px";
			}
			return new Leaf(
				2,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				{ ...defaultBookProperties, isLTR, pageShadow },
				onTurnedMock,
			);
		};
		const liftedCorner = (leaf: Leaf, isLTR: boolean, corner: "top" | "bottom") => {
			const width = Number.parseFloat(leaf.pages[0].style.width);
			const height = Number.parseFloat(leaf.pages[0].style.height);
			const matrix = leaf.pages[1]?.style.transform.match(/^matrix\((.+)\)$/);
			if (!matrix) throw new Error("Fold matrix unavailable");
			const [a, b, c, d, tx, ty] = matrix[1].split(",").map(Number);
			const x = isLTR ? 0 : width;
			const y = corner === "top" ? 0 : height;
			const reflectedX = a * x + c * y + tx;
			return {
				x: (isLTR ? reflectedX - width : -reflectedX) / width,
				y: (b * x + d * y + ty) / height,
			};
		};

		it.each([
			[true, "top"],
			[true, "bottom"],
			[false, "top"],
			[false, "bottom"],
		] as const)("reflects the %s %s corner to its held point", (isLTR, corner) => {
			const leaf = createPaperLeaf(isLTR);
			const point = { x: 0.35, y: corner === "top" ? 0.3 : 0.7 };
			leaf.setFoldOrigin(corner === "top" ? 0.1 : 0.9);
			leaf.setManualFold(point);

			const actual = liftedCorner(leaf, isLTR, corner);
			expect(actual.x).toBeCloseTo(point.x, 8);
			expect(actual.y).toBeCloseTo(point.y, 8);
			expect(leaf.flipPosition).toBeCloseTo((1 - point.x) / 2, 8);
			expect(mockPage1.classList.contains("page--folded")).toBe(true);
			expect(mockPage2.classList.contains("page--folded")).toBe(true);
			expect(onTurnedMock).not.toHaveBeenCalled();
		});

		it("follows vertical movement independently while holding the same horizontal position", () => {
			const leaf = createPaperLeaf();
			leaf.setFoldOrigin(0.1);
			leaf.setManualFold({ x: 0.2, y: 0.2 });
			const initialClip = mockPage1.style.clipPath;
			const initialTransform = mockPage2.style.transform;
			const initialPosition = leaf.flipPosition;

			leaf.setManualFold({ x: 0.2, y: 0.4 });

			const actual = liftedCorner(leaf, true, "top");
			expect(actual.x).toBeCloseTo(0.2, 8);
			expect(actual.y).toBeCloseTo(0.4, 8);
			expect(leaf.flipPosition).toBeCloseTo(initialPosition, 8);
			expect(mockPage1.style.clipPath).not.toBe(initialClip);
			expect(mockPage2.style.transform).not.toBe(initialTransform);
		});

		it("renders the constrained corner when a held point lies beyond the page", () => {
			const leaf = createPaperLeaf();
			leaf.setFoldOrigin(0.1);
			leaf.setManualFold({ x: 2, y: 0.25 });

			const actual = liftedCorner(leaf, true, "top");
			expect(actual.x).toBeLessThan(1);
			expect(actual.y).toBeGreaterThan(0);
			expect(Math.hypot(actual.x * 320, actual.y * 480)).toBeLessThanOrEqual(320 + 1e-8);
			expect(leaf.flipPosition).toBeCloseTo((1 - actual.x) / 2, 8);
			expect(mockPage1.style.clipPath).not.toMatch(/NaN|Infinity/);
			expect(mockPage2.style.transform).not.toMatch(/NaN|Infinity/);
		});

		it("keeps the held corner normalized across resize and repeated redraws", () => {
			const leaf = createPaperLeaf();
			leaf.setFoldOrigin(0.1);
			leaf.setManualFold({ x: 0.25, y: 0.4 });
			const initialTransform = mockPage2.style.transform;
			for (const page of [mockPage1, mockPage2]) {
				page.style.width = "480px";
				page.style.height = "720px";
			}

			leaf.applyTransform(leaf.flipPosition);
			leaf.applyTransform(leaf.flipPosition);

			const actual = liftedCorner(leaf, true, "top");
			expect(actual.x).toBeCloseTo(0.25, 8);
			expect(actual.y).toBeCloseTo(0.4, 8);
			expect(leaf.flipPosition).toBeCloseTo(0.375, 8);
			expect(mockPage2.style.transform).not.toBe(initialTransform);
		});

		it("clears a held fold when an instant endpoint is assigned", () => {
			const leaf = createPaperLeaf();
			leaf.setFoldOrigin(0.1);
			leaf.setManualFold({ x: 0.25, y: 0.4 });

			leaf.flipPosition = 1;
			leaf.applyTransform(leaf.flipPosition);

			expect(mockPage1.style.clipPath).toBe("");
			expect(mockPage2.style.clipPath).toBe("");
			expect(mockPage1.classList.contains("page--folded")).toBe(false);
			expect(mockPage2.style.transform).toContain("rotateY(0deg)");
		});

		it.each([
			0, 1,
		])("does not report stale manual settlement after an instant endpoint %s assignment", async (endpoint) => {
			const leaf = createPaperLeaf();
			leaf.setFoldOrigin(0.1);
			leaf.setManualFold({ x: 0.25, y: 0.4 });
			leaf.flipPosition = endpoint;
			leaf.applyTransform(endpoint);

			await leaf.flipToPosition(endpoint as FlipPosition);

			expect(leaf.flipPosition).toBe(endpoint);
			expect(onTurnedMock).not.toHaveBeenCalled();
			expect(mockPage1.style.clipPath).toBe("");
			expect(mockPage2.style.clipPath).toBe("");
		});

		it.each([
			0, 1,
		])("reports an actual held corner reaching endpoint %s only once on release", async (endpoint) => {
			const leaf = createPaperLeaf();
			leaf.setFoldOrigin(0.1);
			leaf.beginFlip();
			leaf.setManualFold({ x: 0.25, y: 0.4 });
			leaf.setManualFold({ x: 1 - 2 * endpoint, y: 0 });
			leaf.setManualFold({ x: 1 - 2 * endpoint, y: 0 });
			leaf.applyTransform(leaf.flipPosition);
			expect(onTurnedMock).not.toHaveBeenCalled();

			await leaf.flipToPosition(endpoint as FlipPosition);
			leaf.endFlip();
			await leaf.flipToPosition(endpoint as FlipPosition);

			expect(onTurnedMock).toHaveBeenCalledExactlyOnceWith(
				endpoint === 1 ? FlipDirection.Forward : FlipDirection.Backward,
			);
			expect(mockPage1.classList.contains("page--flipping")).toBe(false);
			expect(mockPage1.style.willChange).toBe("");
		});

		it.each([
			[true, "top", 0],
			[true, "top", 1],
			[true, "bottom", 0],
			[true, "bottom", 1],
			[false, "top", 0],
			[false, "top", 1],
			[false, "bottom", 0],
			[false, "bottom", 1],
		] as const)("releases isLTR=%s %s corner continuously toward endpoint %s", async (isLTR, corner, endpoint) => {
			const leaf = createPaperLeaf(isLTR);
			const frames: FrameRequestCallback[] = [];
			vi.spyOn(performance, "now").mockReturnValue(0);
			vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
				frames.push(callback);
				return frames.length;
			});
			const point = { x: 0.2, y: corner === "top" ? 0.3 : 0.7 };
			const cornerY = corner === "top" ? 0 : 1;
			leaf.setFoldOrigin(corner === "top" ? 0.1 : 0.9);
			leaf.beginFlip();
			leaf.setManualFold(point);
			const initialClips = leaf.pages.map((page) => page?.style.clipPath);
			const initialTransform = mockPage2.style.transform;
			const initialPosition = leaf.flipPosition;
			const duration = Math.abs(endpoint - initialPosition) * 1000;
			const release = leaf.flipToPosition(endpoint as FlipPosition, 180 as never);
			leaf.endFlip();

			frames.shift()?.(0);
			expect(leaf.pages.map((page) => page?.style.clipPath)).toEqual(initialClips);
			expect(mockPage2.style.transform).toBe(initialTransform);
			frames.shift()?.(duration / 2);
			const halfway = liftedCorner(leaf, isLTR, corner);
			expect(halfway.x).toBeCloseTo((point.x + 1 - 2 * endpoint) / 2, 8);
			expect(halfway.y).toBeCloseTo((point.y + cornerY) / 2, 8);
			expect(mockPage1.classList.contains("page--flipping")).toBe(true);
			expect(onTurnedMock).not.toHaveBeenCalled();
			frames.shift()?.(duration);
			await release;

			expect(leaf.flipPosition).toBe(endpoint);
			expect(onTurnedMock).toHaveBeenCalledExactlyOnceWith(
				endpoint === 1 ? FlipDirection.Forward : FlipDirection.Backward,
			);
			for (const page of leaf.pages) {
				expect(page?.style.clipPath).toBe("");
				expect(page?.classList.contains("page--folded")).toBe(false);
				expect(page?.classList.contains("page--flipping")).toBe(false);
				expect(page?.style.willChange).toBe("");
			}
			leaf.applyTransform(endpoint);
			expect(mockPage1.style.clipPath).toBe("");
		});

		it("preserves a held intermediate release after its interaction ends", async () => {
			const leaf = createPaperLeaf();
			const frames: FrameRequestCallback[] = [];
			vi.spyOn(performance, "now").mockReturnValue(0);
			vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
				frames.push(callback);
				return frames.length;
			});
			leaf.setFoldOrigin(0.1);
			leaf.setManualFold({ x: 0.2, y: 0.3 });
			const release = leaf.flipToPosition(0.3 as FlipPosition, 180 as never);
			frames.shift()?.(1000);
			await release;
			const settledTransform = mockPage2.style.transform;

			leaf.applyTransform(leaf.flipPosition);

			const actual = liftedCorner(leaf, true, "top");
			expect(actual.x).toBeCloseTo(0.4, 8);
			expect(actual.y).toBeCloseTo(0, 8);
			expect(leaf.flipPosition).toBeCloseTo(0.3, 8);
			expect(mockPage2.style.transform).toBe(settledTransform);
			expect(onTurnedMock).not.toHaveBeenCalled();
		});

		it.each([
			"cover",
			"missing-size",
			"single-sided",
		])("uses a rigid manual position for %s pages", (kind) => {
			const leaf = createPaperLeaf();
			if (kind === "cover") mockPage1.dataset.isCoverPage = "1";
			if (kind === "missing-size") mockPage1.style.width = "";
			if (kind === "single-sided") leaf.pages[1] = undefined;

			leaf.setManualFold({ x: 0.2, y: 0.3 });

			expect(leaf.flipPosition).toBeCloseTo(0.4, 8);
			expect(mockPage1.style.transform).toContain("rotateY");
			expect(mockPage1.style.clipPath).toBe("");
			expect(mockPage1.classList.contains("page--folded")).toBe(false);
		});

		it.each([
			true,
			false,
		])("clips both surfaces without stretching content for isLTR=%s", (isLTR) => {
			const leaf = createPaperLeaf(isLTR);
			leaf.setFoldOrigin(0.1);
			leaf.setFoldPointer(0.3);
			leaf.setManualPosition(0.4);

			expect(mockPage1.style.transform).toBe(`translateX(${isLTR ? 320 : -320}px)`);
			for (const page of leaf.pages) {
				expect(page?.classList.contains("page--folded")).toBe(true);
				expect(page?.style.clipPath).toMatch(/^polygon\(.+px.+\)$/);
				expect(page?.style.clipPath).not.toMatch(/NaN|Infinity/);
				expect(page?.style.transformOrigin).toBe("0px 0px");
				expect(page?.style.transform).not.toContain("rotateY");
			}
			const matrix = mockPage2.style.transform
				.match(/^matrix\((.+)\)$/)?.[1]
				.split(",")
				.map(Number);
			expect(matrix).toHaveLength(6);
			expect(matrix?.every(Number.isFinite)).toBe(true);
			const [a, b, c, d] = matrix ?? [];
			expect(a * a + b * b).toBeCloseTo(1, 8);
			expect(c * c + d * d).toBeCloseTo(1, 8);
			expect(a * c + b * d).toBeCloseTo(0, 8);
			expect(a * d - b * c).toBeCloseTo(1, 8);
			expect(onTurnedMock).not.toHaveBeenCalled();
		});

		it.each([0, 1])("clears fold geometry and shading at endpoint %s", (endpoint) => {
			const leaf = createPaperLeaf();
			leaf.setManualPosition(0.4);
			expect(mockPage1.style.getPropertyValue("--fold-shading")).toContain("linear-gradient");

			leaf.setManualPosition(endpoint);

			for (const page of leaf.pages) {
				expect(page?.classList.contains("page--folded")).toBe(false);
				expect(page?.style.clipPath).toBe("");
				expect(page?.style.getPropertyValue("--fold-shading")).toBe("");
				expect(page?.style.transform).toContain("rotateY(0deg)");
			}
		});

		it("keeps a configured cover rigid even when both surfaces have dimensions", () => {
			const leaf = createPaperLeaf();
			mockPage2.dataset.isCoverPage = "1";

			leaf.setManualPosition(0.4);

			for (const page of leaf.pages) {
				expect(page?.classList.contains("page--folded")).toBe(false);
				expect(page?.style.clipPath).toBe("");
				expect(page?.style.transform).toContain("rotateY");
			}
		});

		it("omits crease shading when page shadows are disabled", () => {
			const leaf = createPaperLeaf(true, false);
			leaf.setManualPosition(0.4);

			for (const page of leaf.pages) {
				expect(page?.classList.contains("page--folded")).toBe(true);
				expect(page?.style.getPropertyValue("--fold-shading")).toBe("");
			}
		});

		it("steers the crease from the chosen corner and held pointer", () => {
			const leaf = createPaperLeaf();
			leaf.setFoldOrigin(0.1);
			leaf.setManualPosition(0.35);
			const upperCorner = mockPage1.style.clipPath;

			leaf.setFoldPointer(0.4);
			leaf.setManualPosition(0.35);
			expect(mockPage1.style.clipPath).not.toBe(upperCorner);

			leaf.setFoldOrigin(0.9);
			leaf.setManualPosition(0.35);
			expect(mockPage1.style.clipPath).not.toBe(upperCorner);
		});

		it("previews a curl on hover without advancing the leaf", () => {
			const leaf = createPaperLeaf();
			leaf.setHoverShadow(0.7);

			expect(leaf.flipPosition).toBe(0);
			expect(mockPage1.classList.contains("page--folded")).toBe(true);
			expect(mockPage2.classList.contains("page--folded")).toBe(true);
			expect(onTurnedMock).not.toHaveBeenCalled();

			leaf.setHoverShadow(0);
			expect(mockPage1.classList.contains("page--folded")).toBe(false);
			expect(mockPage1.style.clipPath).toBe("");
		});

		it("preserves live controls and scroll positions throughout a fold", () => {
			const leaf = createPaperLeaf();
			const input = document.createElement("input");
			input.value = "Text entered before turning";
			const textarea = document.createElement("textarea");
			textarea.value = "Unsaved note on the reverse side";
			mockPage1.append(input);
			mockPage2.append(textarea);
			mockPage1.scrollTop = 125;
			mockPage2.scrollTop = 210;
			const onInput = vi.fn();
			input.addEventListener("input", onInput);

			leaf.beginFlip();
			for (const position of [0.1, 0.45, 0.8, 1]) leaf.setManualPosition(position);
			leaf.endFlip();

			expect(mockPage1.firstChild).toBe(input);
			expect(mockPage2.firstChild).toBe(textarea);
			expect(input.value).toBe("Text entered before turning");
			expect(textarea.value).toBe("Unsaved note on the reverse side");
			expect(mockPage1.scrollTop).toBe(125);
			expect(mockPage2.scrollTop).toBe(210);
			input.dispatchEvent(new Event("input"));
			expect(onInput).toHaveBeenCalledOnce();
		});

		it("holds interaction styles until the drag and its release animation both finish", async () => {
			const leaf = createPaperLeaf();
			const frames: FrameRequestCallback[] = [];
			vi.spyOn(performance, "now").mockReturnValue(0);
			vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
				frames.push(callback);
				return frames.length;
			});
			leaf.beginFlip();
			leaf.setManualPosition(0.4);

			const settlement = leaf.flipToPosition(1 as FlipPosition, 180 as never);
			leaf.endFlip();
			frames.shift()?.(250);

			for (const page of leaf.pages) {
				expect(page?.classList.contains("page--flipping")).toBe(true);
				expect(page?.classList.contains("page--folded")).toBe(true);
				expect(page?.style.willChange).toBe("transform");
			}
			expect(onTurnedMock).not.toHaveBeenCalled();

			frames.shift()?.(1000);
			await settlement;

			for (const page of leaf.pages) {
				expect(page?.classList.contains("page--flipping")).toBe(false);
				expect(page?.classList.contains("page--folded")).toBe(false);
				expect(page?.style.willChange).toBe("");
				expect(page?.style.clipPath).toBe("");
			}
			expect(onTurnedMock).toHaveBeenCalledExactlyOnceWith(FlipDirection.Forward);
		});

		it("eases away from rest and slows before completing an automatic turn", async () => {
			const leaf = createPaperLeaf();
			const frames: FrameRequestCallback[] = [];
			vi.spyOn(performance, "now").mockReturnValue(0);
			vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
				frames.push(callback);
				return frames.length;
			});
			const animation = leaf.flipToPosition(1 as FlipPosition, 180 as never);

			frames.shift()?.(100);
			expect(leaf.flipPosition).toBeGreaterThan(0);
			expect(leaf.flipPosition).toBeLessThan(0.1);
			frames.shift()?.(500);
			expect(leaf.flipPosition).toBeCloseTo(0.5, 8);
			frames.shift()?.(900);
			expect(leaf.flipPosition).toBeGreaterThan(0.9);
			expect(leaf.flipPosition).toBeLessThan(1);
			expect(onTurnedMock).not.toHaveBeenCalled();
			frames.shift()?.(1000);
			await animation;

			expect(leaf.flipPosition).toBe(1);
			expect(onTurnedMock).toHaveBeenCalledExactlyOnceWith(FlipDirection.Forward);
		});

		it("reports a completed turn only after an intermediate target reaches an endpoint", async () => {
			const leaf = createPaperLeaf();
			const frames: FrameRequestCallback[] = [];
			vi.spyOn(performance, "now").mockReturnValue(0);
			vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
				frames.push(callback);
				return frames.length;
			});
			const intermediate = leaf.flipToPosition(0.3 as FlipPosition, 180 as never);
			frames.shift()?.(300);
			await intermediate;

			expect(leaf.flipPosition).toBe(0.3);
			expect(onTurnedMock).not.toHaveBeenCalled();
			leaf.setManualPosition(0.4);
			await leaf.flipToPosition(0.4 as FlipPosition);
			expect(onTurnedMock).not.toHaveBeenCalled();

			const completion = leaf.flipToPosition(1 as FlipPosition, 180 as never);
			frames.shift()?.(1000);
			await completion;
			expect(leaf.flipPosition).toBe(1);
			expect(onTurnedMock).toHaveBeenCalledExactlyOnceWith(FlipDirection.Forward);
		});

		it.each([
			[1, FlipDirection.Forward],
			[0, FlipDirection.Backward],
		])("settles a manually reached endpoint %s exactly once", async (endpoint, direction) => {
			const leaf = createPaperLeaf();
			leaf.beginFlip();
			leaf.setManualPosition(0.4);
			leaf.setManualPosition(endpoint);
			expect(onTurnedMock).not.toHaveBeenCalled();

			await leaf.flipToPosition(endpoint as FlipPosition);
			leaf.endFlip();
			await leaf.flipToPosition(endpoint as FlipPosition);

			expect(onTurnedMock).toHaveBeenCalledExactlyOnceWith(direction);
			expect(mockPage1.classList.contains("page--flipping")).toBe(false);
			expect(mockPage1.style.willChange).toBe("");
		});
	});

	describe("mixed cover and paper stacking", () => {
		const createLeaf = (index: number, isLTR: boolean, cover = false) => {
			const pages: [HTMLElement, HTMLElement] = [
				document.createElement("div"),
				document.createElement("div"),
			];
			pages.forEach((page, side) => {
				page.dataset.pageIndex = `${index * 2 + side}`;
				page.style.width = "320px";
				page.style.height = "480px";
			});
			if (cover) pages[0].dataset.isCoverPage = "1";
			return new Leaf(index, pages, NOT_FLIPPED, { ...defaultBookProperties, isLTR }, onTurnedMock);
		};
		const stack = (leaf: Leaf) => leaf.pages.map((page) => Number(page?.style.zIndex));
		const expectAbove = (upper: Leaf, lower: Leaf) => {
			expect(Math.min(...stack(upper))).toBeGreaterThan(Math.max(...stack(lower)));
		};

		it.each([
			true,
			false,
		])("keeps an opening cover above the following curl for isLTR=%s", (isLTR) => {
			const cover = createLeaf(0, isLTR, true);
			const paper = createLeaf(1, isLTR);
			const stationary = createLeaf(2, isLTR);
			stationary.applyTransform(0);

			cover.setManualPosition(0.3);
			paper.setManualPosition(0.1);
			expectAbove(cover, paper);
			expectAbove(paper, stationary);
			expect(cover.pages[0].style.transform).toContain("rotateY");
			expect(paper.pages[0].classList.contains("page--folded")).toBe(true);
			expect(stack(cover)[0]).toBeGreaterThan(stack(cover)[1]);

			cover.setManualPosition(0.7);
			expectAbove(cover, paper);
			expect(stack(cover)[1]).toBeGreaterThan(stack(cover)[0]);

			paper.setManualPosition(0.6);
			expectAbove(paper, cover);
		});

		it.each([
			true,
			false,
		])("orders the back cover and preceding curl while turning backward for isLTR=%s", (isLTR) => {
			const cover = createLeaf(4, isLTR, true);
			const paper = createLeaf(3, isLTR);

			cover.setManualPosition(0.7);
			paper.setManualPosition(0.9);
			expectAbove(cover, paper);

			cover.setManualPosition(0.3);
			expectAbove(paper, cover);

			paper.setManualPosition(0.4);
			expectAbove(paper, cover);
		});

		it.each([true, false])("restores the exact flat stack and transforms for isLTR=%s", (isLTR) => {
			for (const cover of [false, true]) {
				const leaf = createLeaf(2, isLTR, cover);
				for (const endpoint of [0, 1]) {
					leaf.setManualPosition(0.4);
					leaf.setManualPosition(endpoint);

					expect(stack(leaf)).toEqual(endpoint === 0 ? [6, 5] : [4, 5]);
					expect(leaf.pages[0].style.transform).toBe(
						`translateX(${isLTR ? "100%" : "-100%"})rotateY(0deg)scaleX(${endpoint === 0 ? 1 : -1})`,
					);
					expect(leaf.pages[1]?.style.transform).toBe(
						`translateX(0px)rotateY(0deg)scaleX(${endpoint === 0 ? -1 : 1})`,
					);
				}
			}
		});
	});

	describe("pages", () => {
		it("should expose pages array", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			expect(leaf.pages).toHaveLength(2);
			expect(leaf.pages[0]).toBe(mockPage1);
			expect(leaf.pages[1]).toBe(mockPage2);
		});

		it("should handle undefined second page", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, undefined],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			expect(leaf.pages[0]).toBe(mockPage1);
			expect(leaf.pages[1]).toBeUndefined();
		});
	});

	describe("setHoverShadow", () => {
		it("sets hover shadow to specified value", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			leaf.setHoverShadow(0.5);
			expect(getLeafInternals(leaf).hoverShadow).toBe(0.5);
		});

		it("clamps values above 1 to 1", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			leaf.setHoverShadow(1.5);
			expect(getLeafInternals(leaf).hoverShadow).toBe(1);
		});

		it("clamps values below 0 to 0", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			leaf.setHoverShadow(-0.5);
			expect(getLeafInternals(leaf).hoverShadow).toBe(0);
		});

		it("skips update when setting same value", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			leaf.setHoverShadow(0.3);
			const spy = vi.spyOn(leaf, "applyTransform");
			leaf.setHoverShadow(0.3);

			expect(spy).not.toHaveBeenCalled();
		});

		it("calls applyTransform with current flipPosition", () => {
			const leaf = new Leaf(
				0,
				[mockPage1, mockPage2],
				NOT_FLIPPED,
				defaultBookProperties,
				onTurnedMock,
			);

			leaf.flipPosition = 0.4;
			const spy = vi.spyOn(leaf, "applyTransform");
			leaf.setHoverShadow(0.2);

			expect(spy).toHaveBeenCalledWith(0.4);
		});
	});

	describe("applyTransform", () => {
		describe("shadow calculations", () => {
			it("sets shadow progress to zero at position 0", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					defaultBookProperties,
					onTurnedMock,
				);

				leaf.applyTransform(0);

				expect(mockPage1.style.getPropertyValue("--inner-shadow-shadow")).toBe("0.000");
			});

			it("sets shadow progress to max at position 0.5", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					defaultBookProperties,
					onTurnedMock,
				);

				leaf.applyTransform(0.5);

				// sin(0.5 * PI) = 1, shadowStrength = min(1, 1 * 1.1) = 1
				expect(mockPage1.style.getPropertyValue("--inner-shadow-shadow")).toBe("1.000");
			});

			it("sets shadow progress to zero at position 1", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					defaultBookProperties,
					onTurnedMock,
				);

				leaf.applyTransform(1);

				// sin(1 * PI) ≈ 0
				expect(
					Number.parseFloat(mockPage1.style.getPropertyValue("--inner-shadow-shadow")),
				).toBeCloseTo(0, 2);
			});

			it("uses hoverShadow when greater than flip shadow", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					defaultBookProperties,
					onTurnedMock,
				);

				leaf.setHoverShadow(0.8);
				// At position 0, shadowFromFlip = 0, so hoverShadow (0.8) is used
				// shadowStrength = min(1, 0.8 * 1.1) = 0.88
				expect(mockPage1.style.getPropertyValue("--inner-shadow-shadow")).toBe("0.880");
			});
		});

		describe("highlight calculations", () => {
			it("sets highlight strength based on shadow progress", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					defaultBookProperties,
					onTurnedMock,
				);

				leaf.applyTransform(0.5);

				// shadowProgress = 1, highlightStrength = min(1, 1 * 0.9) = 0.9
				expect(mockPage1.style.getPropertyValue("--inner-shadow-highlight")).toBe("0.900");
			});
		});

		describe("edge direction", () => {
			it("sets edge to right for LTR odd page", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					{ ...defaultBookProperties, isLTR: true },
					onTurnedMock,
				);

				leaf.applyTransform(0.25);

				// odd page (index 0), LTR: origin=left, edge=right
				expect(mockPage1.style.getPropertyValue("--inner-shadow-edge")).toBe("right");
			});

			it("sets edge to left for LTR even page", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					{ ...defaultBookProperties, isLTR: true },
					onTurnedMock,
				);

				leaf.applyTransform(0.25);

				// even page (index 1), LTR: origin=right, edge=left
				expect(mockPage2.style.getPropertyValue("--inner-shadow-edge")).toBe("left");
			});

			it("sets edge to left for RTL odd page", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					{ ...defaultBookProperties, isLTR: false },
					onTurnedMock,
				);

				leaf.applyTransform(0.25);

				// odd page (index 0), RTL: origin=right, edge=left
				expect(mockPage1.style.getPropertyValue("--inner-shadow-edge")).toBe("left");
			});

			it("sets edge to right for RTL even page", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					{ ...defaultBookProperties, isLTR: false },
					onTurnedMock,
				);

				leaf.applyTransform(0.25);

				// even page (index 1), RTL: origin=left, edge=right
				expect(mockPage2.style.getPropertyValue("--inner-shadow-edge")).toBe("right");
			});
		});

		describe("position clamping", () => {
			it("clamps position above 1 to 1", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					defaultBookProperties,
					onTurnedMock,
				);

				leaf.applyTransform(1.5);

				// Should be same as position 1
				expect(
					Number.parseFloat(mockPage1.style.getPropertyValue("--inner-shadow-shadow")),
				).toBeCloseTo(0, 2);
			});

			it("clamps position below 0 to 0", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					defaultBookProperties,
					onTurnedMock,
				);

				leaf.applyTransform(-0.5);

				// Should be same as position 0
				expect(mockPage1.style.getPropertyValue("--inner-shadow-shadow")).toBe("0.000");
			});
		});
	});
});
