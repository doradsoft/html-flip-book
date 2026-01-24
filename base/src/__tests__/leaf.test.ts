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

		describe("lift calculations", () => {
			it("sets lift to 0 at position 0", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					defaultBookProperties,
					onTurnedMock,
				);

				leaf.applyTransform(0);

				expect(mockPage1.style.getPropertyValue("--inner-shadow-lift")).toBe("0.000px");
			});

			it("sets lift to max at position 0.5", () => {
				const leaf = new Leaf(
					0,
					[mockPage1, mockPage2],
					NOT_FLIPPED,
					defaultBookProperties,
					onTurnedMock,
				);

				leaf.applyTransform(0.5);

				// shadowProgress = 1, lift = 1 * 8 = 8
				expect(mockPage1.style.getPropertyValue("--inner-shadow-lift")).toBe("8.000px");
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
