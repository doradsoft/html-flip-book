import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, Profiler } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FlipBook, type FlipBookHandle } from "../FlipBook";
import { mocked } from "./fixtures/mock-flipbook";

vi.mock("html-flip-book-vanilla", async () => ({
	FlipBook: (await import("./fixtures/mock-flipbook")).mocked.MockFlipBook,
}));

let commitCount = 0;
const countCommit = () => {
	commitCount++;
};

describe("FlipBook pointer buffer hold", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocked.instances.length = 0;
	});
	it.each([
		{ origin: "page", release: "pointerup", moving: false },
		{ origin: "toolbar", release: "pointerup", moving: false },
		{ origin: "page", release: "pointercancel", moving: false },
		{ origin: "toolbar", release: "blur", moving: false },
		{ origin: "page", release: "pointerup", moving: true },
	])(
		"holds buffer work from $origin press until $release and motion=$moving settles",
		async ({ origin, release, moving }) => {
			vi.useFakeTimers();
			try {
				commitCount = 0;
				const ref = createRef<FlipBookHandle>();
				const { unmount } = render(
					<Profiler id="pointer-handoff" onRender={countCommit}>
						<FlipBook
							ref={ref}
							className="pointer-book"
							pages={Array.from({ length: 30 }, (_, i) => `Pointer guard ${i}`)}
							leavesBuffer={1}
						/>
					</Profiler>,
				);
				const engine = mocked.instances[0];
				act(() => (engine.options.onPageChanged as (index: number) => void)(6));
				await act(async () => vi.advanceTimersByTimeAsync(40));
				const before = commitCount;
				act(() => {
					if (origin === "page")
						fireEvent.pointerDown(screen.getByText("Pointer guard 0"), {
							button: 0,
							isPrimary: true,
						});
					else ref.current?.beginPointerInteraction?.();
				});
				await act(async () => vi.advanceTimersByTimeAsync(80));
				expect(commitCount).toBe(before);
				expect(screen.queryByText("Pointer guard 10")).toBeNull();
				// Releasing another finger must not end the primary pointer hold.
				act(() => fireEvent.pointerUp(document, { isPrimary: false }));
				await act(async () => vi.advanceTimersByTimeAsync(80));
				expect(commitCount).toBe(before);
				engine.currentPageIndex = 6;
				const activity = engine.options.onLeafFlipActivity as (
					index: number,
					active: boolean,
				) => void;
				if (moving) act(() => activity(1, true));
				act(() => {
					if (release === "blur") window.dispatchEvent(new Event("blur"));
					else fireEvent(document, new Event(release, { bubbles: true }));
				});
				if (moving) {
					await act(async () => vi.advanceTimersByTimeAsync(80));
					expect(commitCount).toBe(before);
					act(() => activity(1, false));
				}
				await act(async () => vi.advanceTimersByTimeAsync(79));
				expect(screen.queryByText("Pointer guard 10")).toBeNull();
				await act(async () => vi.advanceTimersByTimeAsync(1));
				expect(screen.getByText("Pointer guard 10")).toBeTruthy();
				unmount();
				expect(vi.getTimerCount()).toBe(0);
			} finally {
				vi.useRealTimers();
			}
		},
	);
});
