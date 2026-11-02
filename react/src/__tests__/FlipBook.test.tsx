import { act, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FlipBook } from "../FlipBook";

import { mocked } from "./fixtures/mock-flipbook";

vi.mock("html-flip-book-vanilla", async () => ({
	FlipBook: (await import("./fixtures/mock-flipbook")).mocked.MockFlipBook,
}));

function Pair({ showSecond }: { showSecond: boolean }) {
	return (
		<>
			<FlipBook pages={[<div key="1">a</div>]} className="same-book" />
			{showSecond ? <FlipBook pages={[<div key="1">b</div>]} className="same-book" /> : null}
		</>
	);
}

let commitCount = 0;
const countCommit = () => {
	commitCount++;
};

function mockPageFrames() {
	const frames = new Map<number, FrameRequestCallback>();
	let next = 0;
	const request = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
		frames.set(++next, callback);
		return next;
	});
	const cancel = vi
		.spyOn(window, "cancelAnimationFrame")
		.mockImplementation((id) => frames.delete(id));
	return {
		frames,
		step: () =>
			act(() => {
				const pending = Array.from(frames.values());
				frames.clear();
				for (const callback of pending) callback(0);
			}),
		restore: () => {
			request.mockRestore();
			cancel.mockRestore();
		},
	};
}

describe("FlipBook React Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocked.instances.length = 0;
	});

	it("should render pages correctly", () => {
		const pages = [<div key="1">Page 1</div>, <div key="2">Page 2</div>, <div key="3">Page 3</div>];

		render(<FlipBook pages={pages} className="test-flipbook" />);

		expect(screen.getByText("Page 1")).toBeTruthy();
		expect(screen.getByText("Page 2")).toBeTruthy();
		expect(screen.getByText("Page 3")).toBeTruthy();
	});

	it("should apply className to container", () => {
		const pages = [<div key="1">Page 1</div>];

		const { container } = render(<FlipBook pages={pages} className="my-flipbook" />);

		expect(container.querySelector(".my-flipbook")).toBeTruthy();
	});

	it("should wrap each page in a div with page class", () => {
		const pages = [<div key="1">Page 1</div>, <div key="2">Page 2</div>];

		const { container } = render(<FlipBook pages={pages} className="test-flipbook" />);

		const pageElements = container.querySelectorAll(".page");
		expect(pageElements.length).toBe(2);
	});

	it.each(["ltr", "rtl"] as const)(
		"keeps direct text and nested content in the %s reading direction inside the scrollport",
		(direction) => {
			const { container } = render(
				<FlipBook
					pages={[
						"Direct page text",
						<article key="nested">
							<p>Nested page text</p>
						</article>,
					]}
					className="reading-book"
					direction={direction}
				/>,
			);
			const scrollports = container.querySelectorAll(".page > .flipbook-page-scrollport");
			expect(scrollports).toHaveLength(2);
			const contents = container.querySelectorAll<HTMLElement>(".flipbook-page-content");
			expect(Array.from(contents, (content) => content.dir)).toEqual([direction, direction]);
			expect(contents[0].textContent).toBe("Direct page text");
			expect(contents[1].querySelector("article p")?.textContent).toBe("Nested page text");
		},
	);

	it("retains consumer direction overrides, links, and declarative content updates", () => {
		const { container, rerender } = render(
			<FlipBook
				className="reading-book"
				direction="ltr"
				pages={[
					<article key="content" dir="rtl" style={{ direction: "rtl" }}>
						<a href="#chapter">Original</a>
					</article>,
				]}
			/>,
		);
		const article = container.querySelector("article");
		expect(article?.dir).toBe("rtl");
		expect(article?.style.direction).toBe("rtl");
		expect(article?.querySelector("a")?.getAttribute("href")).toBe("#chapter");
		rerender(
			<FlipBook
				className="reading-book"
				direction="ltr"
				pages={[
					<article key="content" dir="rtl" style={{ direction: "rtl" }}>
						<a href="#updated">Updated</a>
					</article>,
				]}
			/>,
		);
		expect(container.querySelector("article")).toBe(article);
		expect(article?.querySelector("a")?.textContent).toBe("Updated");
		expect(article?.querySelector("a")?.getAttribute("href")).toBe("#updated");
	});

	it("should call FlipBook.render on mount with the owned host element", async () => {
		const pages = [<div key="1">Page 1</div>];

		const { container } = render(<FlipBook pages={pages} className="test-flipbook" />);

		expect(mocked.instances[0].render).toHaveBeenCalledWith(container.firstChild, false);
	});

	it("should pass debug prop to render", async () => {
		const pages = [<div key="1">Page 1</div>];

		const { container } = render(<FlipBook pages={pages} className="test-flipbook" debug={true} />);

		expect(mocked.instances[0].render).toHaveBeenCalledWith(container.firstChild, true);
	});

	it("binds same-className books to their own roots (issue #333)", async () => {
		const { container } = render(
			<>
				<FlipBook pages={[<div key="1">a</div>]} className="same-book" />
				<FlipBook pages={[<div key="1">b</div>]} className="same-book" />
			</>,
		);
		expect(mocked.instances).toHaveLength(2);
		const hosts = container.querySelectorAll(".same-book");
		expect(hosts).toHaveLength(2);
		expect(hosts[0]).not.toBe(hosts[1]);
		expect(mocked.instances[0].render).toHaveBeenCalledTimes(1);
		expect(mocked.instances[0].render).toHaveBeenCalledWith(hosts[0], false);
		expect(mocked.instances[1].render).toHaveBeenCalledTimes(1);
		expect(mocked.instances[1].render).toHaveBeenCalledWith(hosts[1], false);
	});

	it("mounts with an empty className (issue #333)", async () => {
		const { container } = render(<FlipBook pages={[<div key="1">a</div>]} className="" />);
		expect(mocked.instances[0].render).toHaveBeenCalledWith(container.firstChild, false);
	});

	it("unmounting one same-className book leaves the sibling engine alive (issue #333)", async () => {
		const { rerender } = render(<Pair showSecond={true} />);
		rerender(<Pair showSecond={false} />);
		expect(mocked.instances[1].destroy).toHaveBeenCalledTimes(1);
		expect(mocked.instances[0].destroy).not.toHaveBeenCalled();
	});

	it("bridges onPageFlipped and downloadConfig changes into the mounted engine (issue #332)", async () => {
		const first = vi.fn();
		const second = vi.fn();
		const props = (handler: typeof first, filename: string) => (
			<FlipBook
				pages={[<div key="1">a</div>]}
				className="bridge-book"
				handlers={{ onPageFlipped: handler }}
				downloadConfig={{ entireBookFilename: filename }}
			/>
		);
		const { rerender } = render(props(first, "first"));
		const engine = mocked.instances[0];
		expect(engine.setDownloadConfig).toHaveBeenLastCalledWith({ entireBookFilename: "first" });
		rerender(props(second, "second"));
		expect(mocked.instances).toHaveLength(1);
		expect(engine.setDownloadConfig).toHaveBeenLastCalledWith({ entireBookFilename: "second" });
		const params = { leafIndex: 0, pageIndices: [0, 1], direction: "forward" };
		(engine.options.onPageFlipped as (p: unknown) => void)(params);
		expect(second).toHaveBeenCalledWith(params);
		expect(first).not.toHaveBeenCalled();
	});

	it("should pass direction to FlipBook constructor", async () => {
		const pages = [<div key="1">Page 1</div>];

		render(<FlipBook pages={pages} className="test-flipbook" direction="rtl" />);

		expect(mocked.instances[0].options.direction).toBe("rtl");
	});

	it("should handle empty pages array", () => {
		const { container } = render(<FlipBook pages={[]} className="test-flipbook" />);

		const pageElements = container.querySelectorAll(".page");
		expect(pageElements.length).toBe(0);
	});

	it("should handle many pages", () => {
		const pageIds = Array.from({ length: 100 }, (_, i) => `test-page-${i}`);
		const pages = pageIds.map((id, i) => <div key={id}>Page {i + 1}</div>);

		const { container } = render(<FlipBook pages={pages} className="test-flipbook" />);

		const pageElements = container.querySelectorAll(".page");
		expect(pageElements.length).toBe(100);
	});

	it("should pass pageSemantics to FlipBook constructor", async () => {
		const pageSemantics = {
			indexToSemanticName: vi.fn(),
			indexToTitle: vi.fn(),
			semanticNameToIndex: vi.fn(),
		};

		const pages = [<div key="1">Page 1</div>];

		render(<FlipBook pages={pages} className="test-flipbook" pageSemantics={pageSemantics} />);

		expect(mocked.instances[0].options.pageSemantics).toBe(pageSemantics);
	});

	it("should create FlipBook with correct pagesCount", async () => {
		const pages = [<div key="1">Page 1</div>, <div key="2">Page 2</div>, <div key="3">Page 3</div>];

		render(<FlipBook pages={pages} className="test-flipbook" />);

		expect(mocked.instances[0].options.pagesCount).toBe(3);
	});

	it("keeps content mounted for leaves whose flip is in flight (issue #167)", async () => {
		const pageIds = Array.from({ length: 20 }, (_, i) => `test-page-${i}`);
		const pages = pageIds.map((id, i) => <div key={id}>Page {i}</div>);
		render(<FlipBook pages={pages} className="test-flipbook" leavesBuffer={1} />);
		const options = mocked.instances[0].options;
		const onPageFlipping = options.onPageFlipping as (params: {
			leafIndex: number;
			pageIndices: [number, number];
			semantics: [undefined, undefined];
			direction: "forward" | "backward";
		}) => void;
		const onPageChanged = options.onPageChanged as (index: number) => void;

		// The buffer window sits around page 0, so leaf 6's content starts unmounted.
		expect(screen.queryByText("Page 12")).toBeNull();
		expect(screen.queryByText("Page 13")).toBeNull();

		// Backward flip targeting spread [11, 12] carries leaf 6 (pages 12-13).
		act(() => {
			onPageFlipping({
				leafIndex: 6,
				pageIndices: [11, 12],
				semantics: [undefined, undefined],
				direction: "backward",
			});
		});
		// The base reveals in-flight leaves outside the buffer window, so their
		// content must stay mounted too — otherwise the revealed page is blank.
		expect(screen.getByText("Page 12")).toBeTruthy();
		expect(screen.getByText("Page 13")).toBeTruthy();

		// Once flips settle, the debounced window recenters and far content unmounts.
		act(() => {
			onPageChanged(0);
		});
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
		});
		expect(screen.queryByText("Page 12")).toBeNull();
	});

	it("does not commit a re-render on page changes when leavesBuffer is unset (issue #343)", async () => {
		commitCount = 0;
		render(
			<Profiler id="no-buffer" onRender={countCommit}>
				<FlipBook pages={[<div key="c">p</div>]} className="no-buffer-book" />
			</Profiler>,
		);
		const options = mocked.instances[0].options;
		const onPageChanged = options.onPageChanged as (index: number) => void;
		const after = commitCount;

		// Without a buffer window, currentPageIndex drives nothing in render;
		// onPageChanged must not pay a full-tree reconcile per turn.
		act(() => {
			onPageChanged(1);
		});
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
		});
		expect(commitCount).toBe(after);
	});

	it("recenters the buffer window on page change when leavesBuffer is set (issue #343)", async () => {
		// Buffer window around page 0 mounts pages 0..(leavesBuffer+margin)*2;
		// a far page's content starts unmounted and mounts once the window moves.
		const pages = Array.from({ length: 24 }, (_, i) => `Far Page ${i}`).map((label) => (
			<div key={label}>{label}</div>
		));
		render(<FlipBook pages={pages} className="buffer-book" leavesBuffer={1} />);
		const options = mocked.instances[0].options;
		const onPageChanged = options.onPageChanged as (index: number) => void;

		expect(screen.queryByText("Far Page 20")).toBeNull();
		act(() => {
			onPageChanged(20);
		});
		// The debounced buffer update is a transition — let it commit.
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 150));
		});
		expect(screen.getByText("Far Page 20")).toBeTruthy();
	});

	it("does not reconcile already mounted page content when a nearby turn starts", () => {
		commitCount = 0;
		render(
			<Profiler id="mounted-window" onRender={countCommit}>
				<FlipBook
					pages={Array.from({ length: 30 }, (_, index) => `Mounted ${index}`)}
					leavesBuffer={2}
				/>
			</Profiler>,
		);
		const before = commitCount;
		const onPageFlipping = mocked.instances[0].options.onPageFlipping as (params: {
			leafIndex: number;
			pageIndices: [number, number];
			semantics: [undefined, undefined];
			direction: "forward";
		}) => void;
		act(() => {
			onPageFlipping({
				leafIndex: 1,
				pageIndices: [2, 3],
				semantics: [undefined, undefined],
				direction: "forward",
			});
		});
		expect(commitCount).toBe(before);
		expect(screen.getByText("Mounted 2")).toBeTruthy();
		expect(screen.getByText("Mounted 3")).toBeTruthy();
	});

	it("keeps both directions' handoff pages mounted with a zero content buffer", async () => {
		vi.useFakeTimers();
		let unmount: (() => void) | undefined;
		try {
			commitCount = 0;
			({ unmount } = render(
				<Profiler id="zero-buffer-window" onRender={countCommit}>
					<FlipBook
						pages={Array.from({ length: 30 }, (_, index) => `Zero buffer ${index}`)}
						leavesBuffer={0}
					/>
				</Profiler>,
			));
			const engine = mocked.instances[0];
			engine.currentPageIndex = 13;
			act(() => (engine.options.onPageChanged as (index: number) => void)(13));
			await act(async () => vi.advanceTimersByTimeAsync(80));
			for (const index of [6, 7, 18, 19]) {
				expect(screen.getByText(`Zero buffer ${index}`)).toBeTruthy();
			}
			expect(screen.queryByText("Zero buffer 4")).toBeNull();
			expect(screen.queryByText("Zero buffer 20")).toBeNull();
			const before = commitCount;
			const onPageFlipping = engine.options.onPageFlipping as (params: {
				leafIndex: number;
				pageIndices: [number, number];
				semantics: [undefined, undefined];
				direction: "forward";
			}) => void;
			act(() => {
				onPageFlipping({
					leafIndex: 9,
					pageIndices: [18, 19],
					semantics: [undefined, undefined],
					direction: "forward",
				});
			});
			expect(commitCount).toBe(before);
			for (const index of [18, 19]) {
				expect(screen.getByText(`Zero buffer ${index}`)).toBeTruthy();
			}
		} finally {
			unmount?.();
			vi.useRealTimers();
		}
	});

	it("prepares newly committed slots without invalidating unchanged chapters", async () => {
		vi.useFakeTimers();
		const frames = new Map<number, FrameRequestCallback>();
		let nextFrame = 0;
		const requestFrame = vi
			.spyOn(window, "requestAnimationFrame")
			.mockImplementation((callback) => {
				frames.set(++nextFrame, callback);
				return nextFrame;
			});
		const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
			frames.delete(id);
		});
		const commitFrame = () =>
			act(() => {
				const pending = Array.from(frames.values());
				frames.clear();
				for (const callback of pending) callback(0);
			});
		const commitPage = () => {
			commitFrame();
			commitFrame();
		};
		let unmount: (() => void) | undefined;
		try {
			const pages = Array.from({ length: 30 }, (_, index) => `Prepared ${index}`);
			const rendered = render(<FlipBook pages={pages} leavesBuffer={0} keepPageContentLayout />);
			unmount = rendered.unmount;
			const engine = mocked.instances[0];
			expect(engine.options.keepPageContentLayout).toBe(true);
			expect(engine.refreshPageContent).not.toHaveBeenCalled();
			engine.refreshPageContent.mockImplementation((indices: number[]) => {
				for (const index of indices) expect(screen.getByText(`Prepared ${index}`)).toBeTruthy();
			});
			engine.currentPageIndex = 13;
			act(() => (engine.options.onPageChanged as (index: number) => void)(13));
			// Both current faces and their underlays are synchronous after a jump.
			expect(engine.refreshPageContent).toHaveBeenLastCalledWith([11, 12, 13, 14, 15, 16]);
			for (let frame = 0; frame < 6; frame++) {
				engine.refreshPageContent.mockClear();
				commitPage();
				expect(engine.refreshPageContent).toHaveBeenCalledTimes(1);
				expect(engine.refreshPageContent.mock.calls[0][0]).toHaveLength(1);
			}
			engine.refreshPageContent.mockClear();
			commitPage();
			commitPage();
			expect(engine.refreshPageContent).not.toHaveBeenCalled();
			expect(frames.size).toBe(0);
			engine.refreshPageContent.mockClear();
			rendered.rerender(
				<FlipBook pages={pages} leavesBuffer={0} keepPageContentLayout className="updated" />,
			);
			expect(engine.refreshPageContent).not.toHaveBeenCalled();
			engine.currentPageIndex = 15;
			act(() => (engine.options.onPageChanged as (index: number) => void)(15));
			expect(screen.getByText("Prepared 6")).toBeTruthy();
			expect(screen.getByText("Prepared 7")).toBeTruthy();
			expect(engine.refreshPageContent).not.toHaveBeenCalled();
			commitPage();
			commitPage();
			expect(engine.refreshPageContent.mock.calls.map(([indices]) => indices)).toEqual([
				[20],
				[21],
			]);
			engine.refreshPageContent.mockClear();
			commitPage();
			expect(screen.queryByText("Prepared 6")).toBeNull();
			expect(screen.getByText("Prepared 7")).toBeTruthy();
			commitPage();
			expect(screen.queryByText("Prepared 7")).toBeNull();
			expect(engine.refreshPageContent).not.toHaveBeenCalled();
			expect(frames.size).toBe(0);
		} finally {
			unmount?.();
			requestFrame.mockRestore();
			cancelFrame.mockRestore();
			vi.useRealTimers();
		}
	});

	it("pauses chapter mounting while the pointer is held and cancels work on unmount", () => {
		const queue = mockPageFrames();
		const rendered = render(
			<FlipBook
				className="staged"
				pages={Array.from({ length: 30 }, (_, i) => `Staged ${i}`)}
				leavesBuffer={0}
				keepPageContentLayout
			/>,
		);
		try {
			const engine = mocked.instances[0];
			engine.currentPageIndex = 13;
			act(() => (engine.options.onPageChanged as (index: number) => void)(13));
			engine.refreshPageContent.mockClear();
			act(() =>
				rendered.container.firstElementChild?.dispatchEvent(
					new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
				),
			);
			expect(queue.frames.size).toBe(0);
			for (let frame = 0; frame < 3; frame++) queue.step();
			expect(engine.refreshPageContent).not.toHaveBeenCalled();
			expect(screen.queryByText("Staged 17")).toBeNull();
			act(() => document.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0 })));
			queue.step();
			expect(engine.refreshPageContent).not.toHaveBeenCalled();
			queue.step();
			expect(engine.refreshPageContent).toHaveBeenCalledExactlyOnceWith([17]);
			const stale = Array.from(queue.frames.values());
			rendered.unmount();
			expect(queue.frames.size).toBe(0);
			act(() => {
				for (const callback of stale) callback(0);
			});
			expect(queue.frames.size).toBe(0);
			expect(engine.refreshPageContent).toHaveBeenCalledTimes(1);
		} finally {
			rendered.unmount();
			queue.restore();
		}
	});

	it("discards a stale mount plan after reversal and retains every moving underlay", () => {
		const queue = mockPageFrames();
		const rendered = render(
			<FlipBook
				className="reversed"
				pages={Array.from({ length: 30 }, (_, i) => `Reversed ${i}`)}
				leavesBuffer={0}
				keepPageContentLayout
			/>,
		);
		try {
			const engine = mocked.instances[0];
			engine.currentPageIndex = 13;
			act(() => (engine.options.onPageChanged as (index: number) => void)(13));
			const stale = Array.from(queue.frames.values());
			engine.currentPageIndex = 5;
			act(() => (engine.options.onPageChanged as (index: number) => void)(5));
			act(() => {
				for (const callback of stale) callback(0);
			});
			expect(screen.queryByText("Reversed 17")).toBeNull();
			for (let page = 0; page < 3; page++) {
				queue.step();
				queue.step();
			}
			expect(screen.getByText("Reversed 13")).toBeTruthy();
			queue.step();
			queue.step();
			expect(screen.getByText("Reversed 13")).toBeTruthy();
			queue.step();
			queue.step();
			expect(screen.queryByText("Reversed 13")).toBeNull();
			expect(queue.frames.size).toBe(0);
			act(() =>
				(engine.options.onLeafFlipActivity as (index: number, active: boolean) => void)(12, true),
			);
			for (const index of [23, 24, 25, 26])
				expect(screen.getByText(`Reversed ${index}`)).toBeTruthy();
			act(() =>
				(engine.options.onLeafFlipActivity as (index: number, active: boolean) => void)(12, false),
			);
			for (const index of [23, 24, 25, 26])
				expect(screen.queryByText(`Reversed ${index}`)).toBeNull();
		} finally {
			rendered.unmount();
			queue.restore();
		}
	});

	it("waits for engine layout before mounting another covered chapter and cancels its subscription", () => {
		const queue = mockPageFrames();
		const rendered = render(
			<FlipBook
				className="coordinated"
				pages={Array.from({ length: 30 }, (_, i) => `Coordinated ${i}`)}
				leavesBuffer={0}
				keepPageContentLayout
			/>,
		);
		try {
			const engine = mocked.instances[0];
			const ready: (() => void)[] = [];
			const unsubscribe = vi.fn();
			engine.onPageContentPrepared.mockImplementation((callback: () => void) => {
				ready.push(callback);
				return unsubscribe;
			});
			engine.currentPageIndex = 13;
			act(() => (engine.options.onPageChanged as (index: number) => void)(13));
			expect(queue.frames.size).toBe(0);
			expect(screen.getByText("Coordinated 13")).toBeTruthy();
			expect(screen.queryByText("Coordinated 17")).toBeNull();
			engine.refreshPageContent.mockClear();
			act(() => ready[0]());
			queue.step();
			expect(engine.refreshPageContent).not.toHaveBeenCalled();
			queue.step();
			expect(engine.refreshPageContent).toHaveBeenCalledExactlyOnceWith([17]);
			expect(queue.frames.size).toBe(0);
			expect(unsubscribe).toHaveBeenCalledOnce();
			rendered.unmount();
			expect(unsubscribe).toHaveBeenCalledTimes(2);
			act(() => ready[1]());
			expect(queue.frames.size).toBe(0);
		} finally {
			rendered.unmount();
			queue.restore();
		}
	});

	it("mounts the complete retained window when animation-frame scheduling is unavailable", () => {
		vi.stubGlobal("requestAnimationFrame", undefined);
		const rendered = render(
			<FlipBook
				className="synchronous"
				pages={Array.from({ length: 30 }, (_, i) => `Synchronous ${i}`)}
				leavesBuffer={0}
				keepPageContentLayout
			/>,
		);
		try {
			const engine = mocked.instances[0];
			engine.currentPageIndex = 13;
			act(() => (engine.options.onPageChanged as (index: number) => void)(13));
			for (const index of [8, 10, 13, 14, 19])
				expect(screen.getByText(`Synchronous ${index}`)).toBeTruthy();
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});

	it("coalesces rapid page changes into a single debounced recenter", async () => {
		const pages = Array.from({ length: 26 }, (_, i) => `Rapid ${i}`).map((label) => (
			<div key={label}>{label}</div>
		));
		render(<FlipBook pages={pages} className="rapid-book" leavesBuffer={1} />);
		const options = mocked.instances[0].options;
		const onPageChanged = options.onPageChanged as (index: number) => void;

		// Two changes inside the 80ms debounce window: the pending timer must be
		// cleared. If it survived, the window would recenter onto page 4 after
		// 80ms and mount it — instead only the latest position must win.
		act(() => {
			onPageChanged(4);
			onPageChanged(22);
		});
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 150));
		});
		expect(screen.getByText("Rapid 22")).toBeTruthy();
		expect(screen.queryByText("Rapid 4")).toBeNull();
	});

	it("holds the debounced recenter while a flip is in flight (issue #343)", async () => {
		const pages = Array.from({ length: 26 }, (_, i) => `Hold ${i}`).map((label) => (
			<div key={label}>{label}</div>
		));
		render(<FlipBook pages={pages} className="hold-book" leavesBuffer={1} />);
		const options = mocked.instances[0].options;
		const onPageChanged = options.onPageChanged as (index: number) => void;
		const onPageFlipping = options.onPageFlipping as (params: {
			leafIndex: number;
			pageIndices: [number, number];
			semantics: [undefined, undefined];
			direction: "forward" | "backward";
		}) => void;

		// A committed flip arms the 80ms recenter; a new flip starting inside the
		// window must hold it so the heavy remount cannot land mid-animation.
		act(() => {
			onPageChanged(20);
			onPageFlipping({
				leafIndex: 9,
				pageIndices: [18, 19],
				semantics: [undefined, undefined],
				direction: "backward",
			});
		});
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 150));
		});
		// The recenter to 20 must not have committed — had the timer survived, the
		// window would have mounted its content during the in-flight flip.
		expect(screen.queryByText("Hold 20")).toBeNull();
		// The in-flight leaf still mounts via inflightLeaves, not the recenter.
		expect(screen.getByText("Hold 18")).toBeTruthy();
		expect(screen.getByText("Hold 19")).toBeTruthy();

		// The next committed flip re-arms the recenter and the window catches up.
		act(() => {
			onPageChanged(18);
		});
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 150));
		});
		expect(screen.getByText("Hold 18")).toBeTruthy();
		expect(screen.getByText("Hold 20")).toBeTruthy();
	});

	it("holds recenter work as soon as a mounted leaf is dragged, before release", async () => {
		vi.useFakeTimers();
		try {
			commitCount = 0;
			render(
				<Profiler id="drag-handoff" onRender={countCommit}>
					<FlipBook
						pages={Array.from({ length: 30 }, (_, i) => `Drag guard ${i}`)}
						leavesBuffer={1}
					/>
				</Profiler>,
			);
			const engine = mocked.instances[0];
			const changed = engine.options.onPageChanged as (index: number) => void;
			const activity = engine.options.onLeafFlipActivity as (
				index: number,
				active: boolean,
			) => void;
			const before = commitCount;
			act(() => {
				changed(4);
				activity(2, true);
				changed(6);
			});
			await act(async () => {
				await vi.advanceTimersByTimeAsync(150);
			});
			expect(commitCount).toBe(before);
			expect(screen.queryByText("Drag guard 10")).toBeNull();
			engine.currentPageIndex = 6;
			act(() => activity(2, false));
			await act(async () => {
				await vi.advanceTimersByTimeAsync(80);
			});
			expect(screen.getByText("Drag guard 10")).toBeTruthy();
		} finally {
			vi.useRealTimers();
		}
	});

	it("releases far in-flight content after a cancelled drag with no page-change event", async () => {
		vi.useFakeTimers();
		try {
			render(
				<FlipBook
					pages={Array.from({ length: 24 }, (_, i) => `Cancel guard ${i}`)}
					leavesBuffer={1}
				/>,
			);
			const activity = mocked.instances[0].options.onLeafFlipActivity as (
				index: number,
				active: boolean,
			) => void;
			act(() => activity(8, true));
			expect(screen.getByText("Cancel guard 16")).toBeTruthy();
			act(() => activity(8, false));
			await act(async () => {
				await vi.advanceTimersByTimeAsync(80);
			});
			expect(screen.queryByText("Cancel guard 16")).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it("keeps recenter work held until the last concurrent leaf settles", async () => {
		vi.useFakeTimers();
		try {
			render(
				<FlipBook
					pages={Array.from({ length: 30 }, (_, i) => `Overlap guard ${i}`)}
					leavesBuffer={1}
				/>,
			);
			const engine = mocked.instances[0];
			const changed = engine.options.onPageChanged as (index: number) => void;
			const activity = engine.options.onLeafFlipActivity as (
				index: number,
				active: boolean,
			) => void;
			act(() => {
				activity(1, true);
				activity(2, true);
				changed(6);
				activity(1, false);
			});
			await act(async () => {
				await vi.advanceTimersByTimeAsync(150);
			});
			expect(screen.queryByText("Overlap guard 10")).toBeNull();
			engine.currentPageIndex = 6;
			act(() => activity(2, false));
			await act(async () => {
				await vi.advanceTimersByTimeAsync(80);
			});
			expect(screen.getByText("Overlap guard 10")).toBeTruthy();
		} finally {
			vi.useRealTimers();
		}
	});
});
