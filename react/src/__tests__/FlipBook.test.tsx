import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FlipBook } from "../FlipBook";

const mocked = vi.hoisted(() => ({
	instances: [] as Array<{
		render: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
		bookElement: HTMLElement | null;
		options: Record<string, unknown>;
	}>,
	MockFlipBook: class {
		render = vi.fn();
		destroy = vi.fn();
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

	it.each([
		"ltr",
		"rtl",
	] as const)("keeps direct text and nested content in the %s reading direction inside the scrollport", (direction) => {
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
	});

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

	it("should call FlipBook.render on mount", async () => {
		const pages = [<div key="1">Page 1</div>];

		render(<FlipBook pages={pages} className="test-flipbook" />);

		expect(mocked.instances[0].render).toHaveBeenCalledWith(".test-flipbook", false);
	});

	it("should pass debug prop to render", async () => {
		const pages = [<div key="1">Page 1</div>];

		render(<FlipBook pages={pages} className="test-flipbook" debug={true} />);

		expect(mocked.instances[0].render).toHaveBeenCalledWith(".test-flipbook", true);
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
});
