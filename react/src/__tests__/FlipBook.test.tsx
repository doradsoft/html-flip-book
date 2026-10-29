import { act, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FlipBook } from "../FlipBook";

const mocked = vi.hoisted(() => ({
	instances: [] as Array<{
		render: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
		setDownloadConfig: ReturnType<typeof vi.fn>;
		bookElement: HTMLElement | null;
		options: Record<string, unknown>;
	}>,
	MockFlipBook: class {
		render = vi.fn();
		destroy = vi.fn();
		setDownloadConfig = vi.fn();
		bookElement: HTMLElement | null = null;
		options: Record<string, unknown>;

		constructor(options: Record<string, unknown>) {
			this.options = options;
			mocked.instances.push(this);
		}
	},
}));

// Mock the base FlipBook
vi.mock("html-flip-book-vanilla", () => ({
	FlipBook: mocked.MockFlipBook,
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
});
