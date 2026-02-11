import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FlipBookHandle, PageSemantics } from "../FlipBook";
import { PageIndicator, Toolbar } from "../toolbar";

// ── helpers ──────────────────────────────────────────────────────────

/**
 * Creates a mock FlipBookHandle ref with sensible defaults (commands + getters only).
 * Override getters.getCurrentPageIndex etc. to change state.
 */
const createMockFlipBookRef = (overrides: Partial<FlipBookHandle> = {}) => ({
	current: {
		commands: {
			flipNext: vi.fn().mockResolvedValue(undefined),
			flipPrev: vi.fn().mockResolvedValue(undefined),
			flipToPage: vi.fn().mockResolvedValue(undefined),
			jumpToPage: vi.fn(),
			toggleDebugBar: vi.fn(),
		},
		getters: {
			getCurrentPageIndex: vi.fn().mockReturnValue(0),
			getTotalPages: vi.fn().mockReturnValue(60),
			getOf: vi.fn().mockReturnValue(60),
			isFirstPage: vi.fn().mockReturnValue(true),
			isLastPage: vi.fn().mockReturnValue(false),
		},
		...overrides,
	} as FlipBookHandle,
});

/**
 * Mirrors the hePageSemantics from the Sefer component.
 *
 * Page layout (per the Sefer component):
 *   page 0  = front cover
 *   page 1  = perek 1 content   (odd → semantic name "1")
 *   page 2  = perek 1 blank     (even → "")
 *   page 3  = perek 2 content   (odd → semantic name "2")
 *   page 4  = perek 2 blank     (even → "")
 *   …
 *   page 2k-1 = perek k content (odd → semantic name "k")
 *   page 2k   = perek k blank   (even → "")
 *   last page = back cover
 *
 * We use plain numbers as semantic names to isolate the mapping logic
 * from Hebrew character conversion (already verified separately).
 */
function createHebrewStyleSemantics(perekCount: number): PageSemantics {
	return {
		indexToSemanticName(pageIndex: number): string {
			if (pageIndex <= 0 || pageIndex % 2 === 0) return "";
			const perekNum = (pageIndex + 1) / 2;
			if (perekNum > perekCount) return "";
			return String(perekNum);
		},
		semanticNameToIndex(semanticPageName: string): number | null {
			const num = Number.parseInt(semanticPageName, 10);
			if (Number.isNaN(num) || num <= 0) return null;
			if (num > perekCount) return null;
			return 2 * num - 1;
		},
	};
}

// Total pages: front cover + 2*perekCount + back cover
const PEREK_COUNT = 27; // e.g. Sefer with 27 perakim
const TOTAL_PAGES = 2 + 2 * PEREK_COUNT; // = 56

// ── tests ────────────────────────────────────────────────────────────

describe("PageIndicator — semantic navigation (Hebrew perek style)", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/**
	 * Helper: render a Toolbar + PageIndicator with the mock ref and semantics.
	 * Returns the mock ref so callers can inspect/change mock return values.
	 */
	function renderIndicator(startPageIndex: number) {
		const pageSemantics = createHebrewStyleSemantics(PEREK_COUNT);
		const mockRef = createMockFlipBookRef({
			getCurrentPageIndex: vi.fn().mockReturnValue(startPageIndex),
			getTotalPages: vi.fn().mockReturnValue(TOTAL_PAGES),
			getOf: vi.fn().mockReturnValue(PEREK_COUNT),
			isFirstPage: vi.fn().mockReturnValue(startPageIndex === 0),
			isLastPage: vi.fn().mockReturnValue(startPageIndex >= TOTAL_PAGES - 1),
		});

		render(
			<Toolbar flipBookRef={mockRef} direction="rtl" pageSemantics={pageSemantics}>
				<PageIndicator ariaLabel="Go to perek" />
			</Toolbar>,
		);

		// Let the initial polling run
		act(() => {
			vi.advanceTimersByTime(200);
		});

		return mockRef;
	}

	// ── semanticNameToIndex mapping tests ─────────────────────────

	describe("pageSemantics mapping", () => {
		const semantics = createHebrewStyleSemantics(PEREK_COUNT);

		it.each([
			[1, 1],
			[2, 3],
			[3, 5],
			[10, 19],
			[23, 45],
			[24, 47],
			[27, 53],
		])("semanticNameToIndex('%s') → page index %i", (perekNum, expectedIndex) => {
			expect(semantics.semanticNameToIndex(String(perekNum))).toBe(expectedIndex);
		});

		it.each([
			[1, "1"],
			[3, "2"],
			[5, "3"],
			[19, "10"],
			[45, "23"],
			[47, "24"],
			[53, "27"],
		])("indexToSemanticName(%i) → '%s'", (pageIndex, expectedName) => {
			expect(semantics.indexToSemanticName(pageIndex)).toBe(expectedName);
		});

		it("round-trips all perakim correctly", () => {
			for (let perek = 1; perek <= PEREK_COUNT; perek++) {
				const pageIndex = semantics.semanticNameToIndex(String(perek));
				expect(pageIndex).not.toBeNull();
				if (pageIndex != null) {
					expect(semantics.indexToSemanticName(pageIndex)).toBe(String(perek));
				}
			}
		});

		it("returns empty for even pages (blank pages) and page 0 (cover)", () => {
			expect(semantics.indexToSemanticName(0)).toBe("");
			expect(semantics.indexToSemanticName(2)).toBe("");
			expect(semantics.indexToSemanticName(46)).toBe("");
		});
	});

	// ── jumpToPage argument tests ─────────────────────────────────

	describe("navigation via Enter key calls jumpToPage with correct index", () => {
		it.each([
			{ inputText: "1", expectedJumpIndex: 1, description: "perek 1" },
			{ inputText: "10", expectedJumpIndex: 19, description: "perek 10" },
			{ inputText: "23", expectedJumpIndex: 45, description: "perek 23" },
			{
				inputText: "24",
				expectedJumpIndex: 47,
				description: "perek 24 (the off-by-one candidate)",
			},
			{ inputText: "27", expectedJumpIndex: 53, description: "perek 27 (last)" },
		])("typing '$inputText' ($description) → jumpToPage($expectedJumpIndex)", ({
			inputText,
			expectedJumpIndex,
		}) => {
			// Start on the cover (page 0)
			const mockRef = renderIndicator(0);

			const input = screen.getByRole("textbox", { name: "Go to perek" });

			// Focus the input (simulating user click)
			fireEvent.focus(input);
			// Clear and type the desired perek number
			fireEvent.change(input, { target: { value: inputText } });
			// Press Enter to navigate
			fireEvent.keyDown(input, { key: "Enter" });

			expect(mockRef.current.commands.jumpToPage).toHaveBeenCalledTimes(1);
			expect(mockRef.current.commands.jumpToPage).toHaveBeenCalledWith(expectedJumpIndex);
		});
	});

	// ── off-by-one regression tests ──────────────────────────────

	describe("off-by-one regression: navigation lands on the correct spread", () => {
		it("typing '24' from perek 23 results in jumpToPage(47), not jumpToPage(45)", () => {
			// Start on the spread showing perek 23: pages [44, 45]
			// currentPageIndex = 44, rightPage = 45, semantic name = "23"
			const mockRef = renderIndicator(44);

			const input = screen.getByRole("textbox", { name: "Go to perek" }) as HTMLInputElement;

			// The indicator should currently show "23"
			expect(input.value).toContain("23");

			// User clicks input, types "24", presses Enter
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: "24" } });
			fireEvent.keyDown(input, { key: "Enter" });

			expect(mockRef.current.commands.jumpToPage).toHaveBeenCalledWith(47);
			// Critical: NOT 45 (which would be perek 23 — the "one back" bug)
			expect(mockRef.current.commands.jumpToPage).not.toHaveBeenCalledWith(45);
		});

		it("typing '24' from perek 22 results in jumpToPage(47)", () => {
			// Start on spread showing perek 22: pages [42, 43]
			const mockRef = renderIndicator(42);

			const input = screen.getByRole("textbox", { name: "Go to perek" }) as HTMLInputElement;
			expect(input.value).toContain("22");

			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: "24" } });
			fireEvent.keyDown(input, { key: "Enter" });

			expect(mockRef.current.commands.jumpToPage).toHaveBeenCalledWith(47);
		});
	});

	// ── display correctness ──────────────────────────────────────

	describe("display updates correctly", () => {
		it("updates display when currentPage changes via polling (no user interaction)", () => {
			const mockRef = renderIndicator(0);
			const input = screen.getByRole("textbox", { name: "Go to perek" }) as HTMLInputElement;

			// Initial display: cover page (page 0), right page = 1 → "1"
			// displayText = "1 / 27"
			expect(input.value).toBe("1 / 27");

			// Simulate page change via external navigation (e.g., button click)
			mockRef.current.getters.getCurrentPageIndex = vi.fn().mockReturnValue(44);
			act(() => {
				vi.advanceTimersByTime(200);
			});

			// Should now show perek 23
			expect(input.value).toBe("23 / 27");
		});

		it("clears justNavigated after polling catches up (focus+blur clears stale flag)", () => {
			// This test verifies whether the useEffect properly clears justNavigatedRef
			const mockRef = renderIndicator(0);
			const input = screen.getByRole("textbox", { name: "Go to perek" }) as HTMLInputElement;

			// Navigate to perek 24
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: "24" } });
			fireEvent.keyDown(input, { key: "Enter" });
			expect(input.value).toBe("24");

			// Change mock and poll
			mockRef.current.getters.getCurrentPageIndex = vi.fn().mockReturnValue(46);
			act(() => {
				vi.advanceTimersByTime(200);
			});

			// At this point, justNavigatedRef should have been cleared by the useEffect.
			// A focus+blur cycle reads the cleared flag and sets displayText.
			fireEvent.focus(input);
			fireEvent.blur(input);

			expect(input.value).toBe("24 / 27");
		});

		it("shows typed value immediately after Enter, then correct display after polling + next interaction", () => {
			// Start on perek 1 spread: pages [0, 1]
			const mockRef = renderIndicator(0);

			const input = screen.getByRole("textbox", { name: "Go to perek" }) as HTMLInputElement;

			// Navigate to perek 24
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: "24" } });
			fireEvent.keyDown(input, { key: "Enter" });

			// After Enter + blur, the input should still show the user's typed value "24"
			// (justNavigatedRef prevents stale display text from flashing)
			expect(input.value).toBe("24");

			// Simulate the FlipBook updating (jumpToPage(47) → currentPageIndex = 46)
			mockRef.current.getters.getCurrentPageIndex = vi.fn().mockReturnValue(46);

			// Advance timer to trigger Toolbar polling (updates currentPage).
			// The useEffect clears justNavigatedRef and schedules setInputValue("24 / 27").
			act(() => {
				vi.advanceTimersByTime(200);
			});

			// Trigger focus+blur to flush the cleared justNavigatedRef into the display.
			// In the real app, this happens automatically via React's render cycle;
			// the extra interaction is needed only because happy-dom + fake timers
			// don't fully flush effect-triggered state updates within act().
			fireEvent.focus(input);
			fireEvent.blur(input);

			// Now the input shows the full display text
			expect(input.value).toBe("24 / 27");
		});

		it("does NOT flash the old perek name during the polling gap", () => {
			// Start on perek 23 spread: pages [44, 45]
			const mockRef = renderIndicator(44);
			const input = screen.getByRole("textbox", { name: "Go to perek" }) as HTMLInputElement;

			// Navigate to perek 24
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: "24" } });
			fireEvent.keyDown(input, { key: "Enter" });

			// Immediately after Enter, before polling — should NOT revert to "23"
			expect(input.value).toBe("24");

			// Even after a small delay (but polling hasn't updated currentPage yet)
			act(() => {
				vi.advanceTimersByTime(50);
			});
			// CRITICAL: must still show "24", NOT "23" (the old perek)
			expect(input.value).toBe("24");

			// Now polling catches up
			mockRef.current.getters.getCurrentPageIndex = vi.fn().mockReturnValue(46);
			act(() => {
				vi.advanceTimersByTime(200);
			});

			// After polling, the next user interaction shows the correct display text.
			// The key assertion: it shows "24 / 27" (perek 24), NOT "23 / 27" (old perek).
			fireEvent.focus(input);
			fireEvent.blur(input);
			expect(input.value).toBe("24 / 27");
		});
	});

	// ── edge cases ───────────────────────────────────────────────

	describe("edge cases", () => {
		it("typing invalid perek does not call jumpToPage", () => {
			const mockRef = renderIndicator(0);
			const input = screen.getByRole("textbox", { name: "Go to perek" });

			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: "999" } });
			fireEvent.keyDown(input, { key: "Enter" });

			expect(mockRef.current.commands.jumpToPage).not.toHaveBeenCalled();
		});

		it("typing '0' does not call jumpToPage", () => {
			const mockRef = renderIndicator(0);
			const input = screen.getByRole("textbox", { name: "Go to perek" });

			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: "0" } });
			fireEvent.keyDown(input, { key: "Enter" });

			expect(mockRef.current.commands.jumpToPage).not.toHaveBeenCalled();
		});

		it("Escape cancels editing without navigation", () => {
			const mockRef = renderIndicator(44);
			const input = screen.getByRole("textbox", { name: "Go to perek" });

			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: "24" } });
			fireEvent.keyDown(input, { key: "Escape" });

			expect(mockRef.current.commands.jumpToPage).not.toHaveBeenCalled();
		});

		it("navigating to the same perek still calls jumpToPage", () => {
			// On perek 23 spread: pages [44, 45]
			const mockRef = renderIndicator(44);
			const input = screen.getByRole("textbox", { name: "Go to perek" });

			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: "23" } });
			fireEvent.keyDown(input, { key: "Enter" });

			// Should still call jumpToPage with the correct index
			expect(mockRef.current.commands.jumpToPage).toHaveBeenCalledWith(45);
		});

		it("navigating to perek 1 from any other perek", () => {
			const mockRef = renderIndicator(44);
			const input = screen.getByRole("textbox", { name: "Go to perek" });

			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: "1" } });
			fireEvent.keyDown(input, { key: "Enter" });

			expect(mockRef.current.commands.jumpToPage).toHaveBeenCalledWith(1);
		});
	});
});
