import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type CoverConfig, FlipBook } from "../FlipBook";

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

vi.mock("html-flip-book-vanilla", () => ({
	FlipBook: mocked.MockFlipBook,
}));

describe("FlipBook CoverConfig", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocked.instances.length = 0;
	});

	it("should apply page--cover class to first page by default", () => {
		const pages = [<div key="1">Cover</div>, <div key="2">Page 1</div>, <div key="3">Page 2</div>];
		const coverConfig: CoverConfig = {};

		const { container } = render(
			<FlipBook pages={pages} className="test-flipbook" coverConfig={coverConfig} />,
		);

		const pageElements = container.querySelectorAll(".page");
		expect(pageElements[0]?.classList.contains("page--cover")).toBe(true);
		expect(pageElements[1]?.classList.contains("page--cover")).toBe(false);
		expect(pageElements[2]?.classList.contains("page--cover")).toBe(false);
	});

	it("should apply page--cover class to specified indices", () => {
		const pages = [
			<div key="1">Front Cover</div>,
			<div key="2">Page 1</div>,
			<div key="3">Page 2</div>,
			<div key="4">Back Cover</div>,
		];
		const coverConfig: CoverConfig = { coverIndices: [0, 3] };

		const { container } = render(
			<FlipBook pages={pages} className="test-flipbook" coverConfig={coverConfig} />,
		);

		const pageElements = container.querySelectorAll(".page");
		expect(pageElements[0]?.classList.contains("page--cover")).toBe(true);
		expect(pageElements[1]?.classList.contains("page--cover")).toBe(false);
		expect(pageElements[2]?.classList.contains("page--cover")).toBe(false);
		expect(pageElements[3]?.classList.contains("page--cover")).toBe(true);
	});

	it("should apply page--cover to first and last pages when coverIndices is auto", () => {
		const pages = [
			<div key="1">Front Cover</div>,
			<div key="2">Page 1</div>,
			<div key="3">Page 2</div>,
			<div key="4">Back Cover</div>,
		];
		const coverConfig: CoverConfig = { coverIndices: "auto" };

		const { container } = render(
			<FlipBook pages={pages} className="test-flipbook" coverConfig={coverConfig} />,
		);

		const pageElements = container.querySelectorAll(".page");
		expect(pageElements[0]?.classList.contains("page--cover")).toBe(true);
		expect(pageElements[1]?.classList.contains("page--cover")).toBe(false);
		expect(pageElements[2]?.classList.contains("page--cover")).toBe(false);
		expect(pageElements[3]?.classList.contains("page--cover")).toBe(true);
	});

	it("should apply page--hard class when hardCovers is true", () => {
		const pages = [<div key="1">Cover</div>, <div key="2">Page 1</div>];
		const coverConfig: CoverConfig = { hardCovers: true };

		const { container } = render(
			<FlipBook pages={pages} className="test-flipbook" coverConfig={coverConfig} />,
		);

		const pageElements = container.querySelectorAll(".page");
		expect(pageElements[0]?.classList.contains("page--hard")).toBe(true);
		expect(pageElements[1]?.classList.contains("page--hard")).toBe(false);
	});

	it("should apply page--no-shadow class when noShadow is true", () => {
		const pages = [<div key="1">Cover</div>, <div key="2">Page 1</div>];
		const coverConfig: CoverConfig = { noShadow: true };

		const { container } = render(
			<FlipBook pages={pages} className="test-flipbook" coverConfig={coverConfig} />,
		);

		const pageElements = container.querySelectorAll(".page");
		expect(pageElements[0]?.classList.contains("page--no-shadow")).toBe(true);
		expect(pageElements[1]?.classList.contains("page--no-shadow")).toBe(false);
	});

	it("should apply all cover classes together", () => {
		const pages = [
			<div key="1">Front Cover</div>,
			<div key="2">Page 1</div>,
			<div key="3">Back Cover</div>,
		];
		const coverConfig: CoverConfig = {
			coverIndices: "auto",
			hardCovers: true,
			noShadow: true,
		};

		const { container } = render(
			<FlipBook pages={pages} className="test-flipbook" coverConfig={coverConfig} />,
		);

		const pageElements = container.querySelectorAll(".page");
		// Front cover
		expect(pageElements[0]?.classList.contains("page--cover")).toBe(true);
		expect(pageElements[0]?.classList.contains("page--hard")).toBe(true);
		expect(pageElements[0]?.classList.contains("page--no-shadow")).toBe(true);
		// Content page
		expect(pageElements[1]?.classList.contains("page--cover")).toBe(false);
		expect(pageElements[1]?.classList.contains("page--hard")).toBe(false);
		expect(pageElements[1]?.classList.contains("page--no-shadow")).toBe(false);
		// Back cover
		expect(pageElements[2]?.classList.contains("page--cover")).toBe(true);
		expect(pageElements[2]?.classList.contains("page--hard")).toBe(true);
		expect(pageElements[2]?.classList.contains("page--no-shadow")).toBe(true);
	});

	it("should still mark first page as cover when coverConfig is undefined (default behavior)", () => {
		const pages = [<div key="1">Page 1</div>, <div key="2">Page 2</div>];

		const { container } = render(<FlipBook pages={pages} className="test-flipbook" />);

		const pageElements = container.querySelectorAll(".page");
		// When coverConfig is undefined, we still use default coverIndices [0]
		expect(pageElements[0]?.classList.contains("page--cover")).toBe(true);
		expect(pageElements[1]?.classList.contains("page--cover")).toBe(false);
	});
});
