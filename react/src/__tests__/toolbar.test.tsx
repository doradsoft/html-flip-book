import { fireEvent, render, screen } from "@testing-library/react";
import { setTocPageIndex } from "html-flip-book-vanilla/store";
import { describe, expect, it, vi } from "vitest";
import type { FlipBookHandle } from "../FlipBook";
import {
	ActionButton,
	BookshelfIcon,
	ChevronFirstIcon,
	ChevronLastIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	FullscreenButton,
	MaximizeIcon,
	MinimizeIcon,
	TableOfContentsIcon,
	TocButton,
	Toolbar,
} from "../toolbar";

// Mock flipbook ref
const createMockFlipBookRef = (overrides: Partial<FlipBookHandle> = {}) => ({
	current: {
		flipNext: vi.fn().mockResolvedValue(undefined),
		flipPrev: vi.fn().mockResolvedValue(undefined),
		flipToPage: vi.fn().mockResolvedValue(undefined),
		jumpToPage: vi.fn(),
		toggleDebugBar: vi.fn(),
		getCurrentPageIndex: vi.fn().mockReturnValue(2),
		getTotalPages: vi.fn().mockReturnValue(10),
		getOf: vi.fn().mockReturnValue(10),
		isFirstPage: vi.fn().mockReturnValue(false),
		isLastPage: vi.fn().mockReturnValue(false),
		getDownloadConfig: vi.fn().mockReturnValue(undefined),
		...overrides,
	} as FlipBookHandle,
});

describe("Icons", () => {
	it("should render ChevronLeftIcon", () => {
		const { container } = render(<ChevronLeftIcon size={24} />);
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("should render ChevronRightIcon", () => {
		const { container } = render(<ChevronRightIcon size={24} />);
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("should render ChevronFirstIcon", () => {
		const { container } = render(<ChevronFirstIcon size={24} />);
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("should render ChevronLastIcon", () => {
		const { container } = render(<ChevronLastIcon size={24} />);
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("should render MaximizeIcon", () => {
		const { container } = render(<MaximizeIcon size={24} />);
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("should render MinimizeIcon", () => {
		const { container } = render(<MinimizeIcon size={24} />);
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("should render TableOfContentsIcon", () => {
		const { container } = render(<TableOfContentsIcon size={24} />);
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("should render BookshelfIcon", () => {
		const { container } = render(<BookshelfIcon size={24} />);
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("should apply custom size to icons", () => {
		const { container } = render(<ChevronLeftIcon size={32} />);
		const svg = container.querySelector("svg");
		expect(svg?.getAttribute("width")).toBe("32");
		expect(svg?.getAttribute("height")).toBe("32");
	});

	it("should apply custom className to icons", () => {
		const { container } = render(<ChevronLeftIcon className="custom-class" />);
		const svg = container.querySelector("svg");
		expect(svg?.classList.contains("custom-class")).toBe(true);
	});
});

describe("ActionButton", () => {
	it("should render children", () => {
		render(
			<ActionButton onClick={() => {}} ariaLabel="Test">
				<span>Action</span>
			</ActionButton>,
		);
		expect(screen.getByText("Action")).toBeTruthy();
	});

	it("should call onClick when clicked", () => {
		const handleClick = vi.fn();
		render(
			<ActionButton onClick={handleClick} ariaLabel="Test">
				Click me
			</ActionButton>,
		);
		fireEvent.click(screen.getByRole("button"));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("should have correct aria-label", () => {
		render(
			<ActionButton onClick={() => {}} ariaLabel="Custom Label">
				Action
			</ActionButton>,
		);
		expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Custom Label");
	});

	it("should be disabled when disabled prop is true", () => {
		render(
			<ActionButton onClick={() => {}} ariaLabel="Test" disabled>
				Action
			</ActionButton>,
		);
		expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
	});
});

describe("TocButton", () => {
	it("should jump to TOC page from store (default 4)", () => {
		setTocPageIndex(4);
		const mockRef = createMockFlipBookRef({
			getCurrentPageIndex: vi.fn().mockReturnValue(0),
			getTotalPages: vi.fn().mockReturnValue(10),
			getOf: vi.fn().mockReturnValue(10),
			isFirstPage: vi.fn().mockReturnValue(false),
			isLastPage: vi.fn().mockReturnValue(false),
		});
		render(
			<Toolbar flipBookRef={mockRef}>
				<TocButton />
			</Toolbar>,
		);

		fireEvent.click(screen.getByRole("button", { name: /table of contents/i }));
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(4);
	});

	it("should jump to TOC page from store when set to 2", () => {
		setTocPageIndex(2);
		const mockRef = createMockFlipBookRef({
			getCurrentPageIndex: vi.fn().mockReturnValue(0),
			getTotalPages: vi.fn().mockReturnValue(10),
			getOf: vi.fn().mockReturnValue(10),
			isFirstPage: vi.fn().mockReturnValue(false),
			isLastPage: vi.fn().mockReturnValue(false),
		});
		render(
			<Toolbar flipBookRef={mockRef}>
				<TocButton />
			</Toolbar>,
		);

		fireEvent.click(screen.getByRole("button", { name: /table of contents/i }));
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(2);
	});

	it("should use custom ariaLabel when provided", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<Toolbar flipBookRef={mockRef}>
				<TocButton ariaLabel="Go to TOC" />
			</Toolbar>,
		);

		expect(screen.getByRole("button", { name: "Go to TOC" })).toBeTruthy();
	});

	it("should be disabled when on TOC page", () => {
		setTocPageIndex(4);
		const mockRef = createMockFlipBookRef({
			getCurrentPageIndex: vi.fn().mockReturnValue(4),
			getTotalPages: vi.fn().mockReturnValue(10),
			getOf: vi.fn().mockReturnValue(10),
			isFirstPage: vi.fn().mockReturnValue(false),
			isLastPage: vi.fn().mockReturnValue(false),
		});
		render(
			<Toolbar flipBookRef={mockRef}>
				<TocButton />
			</Toolbar>,
		);

		const button = screen.getByRole("button", { name: /table of contents/i }) as HTMLButtonElement;
		expect(button.disabled).toBe(true);
	});
});

describe("FullscreenButton", () => {
	it("should render with enter fullscreen label by default", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<Toolbar flipBookRef={mockRef}>
				<FullscreenButton />
			</Toolbar>,
		);

		expect(screen.getByRole("button", { name: /enter fullscreen/i })).toBeTruthy();
	});

	it("should use custom aria labels when provided", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<Toolbar flipBookRef={mockRef}>
				<FullscreenButton ariaLabelEnter="Full mode" ariaLabelExit="Exit mode" />
			</Toolbar>,
		);

		expect(screen.getByRole("button", { name: "Full mode" })).toBeTruthy();
	});
});

describe("Toolbar", () => {
	it("should render children", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<Toolbar flipBookRef={mockRef}>
				<span>Child content</span>
			</Toolbar>,
		);

		expect(screen.getByText("Child content")).toBeTruthy();
	});

	it("should apply rtl direction class", () => {
		const mockRef = createMockFlipBookRef();
		const { container } = render(
			<Toolbar flipBookRef={mockRef} direction="rtl">
				<span>Content</span>
			</Toolbar>,
		);

		expect(container.querySelector('[dir="rtl"]')).toBeTruthy();
	});

	it("should have toolbar role", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<Toolbar flipBookRef={mockRef}>
				<span>Content</span>
			</Toolbar>,
		);

		expect(screen.getByRole("toolbar")).toBeTruthy();
	});
});
