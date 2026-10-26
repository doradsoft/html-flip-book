import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FlipBookHandle } from "../FlipBook";
import { FullscreenButton, Toolbar } from "../toolbar";

const doc = document as Document & {
	fullscreenEnabled?: boolean;
	fullscreenElement?: Element | null;
	exitFullscreen?: () => Promise<void>;
};

const createMockFlipBookRef = (overrides: Partial<FlipBookHandle> = {}) => ({
	current: {
		flipNext: vi.fn().mockResolvedValue(undefined),
		flipPrev: vi.fn().mockResolvedValue(undefined),
		flipToPage: vi.fn().mockResolvedValue(undefined),
		jumpToPage: vi.fn(),
		getCurrentPageIndex: vi.fn().mockReturnValue(2),
		getTotalPages: vi.fn().mockReturnValue(10),
		getOf: vi.fn().mockReturnValue(10),
		isFirstPage: vi.fn().mockReturnValue(false),
		isLastPage: vi.fn().mockReturnValue(false),
		getDownloadConfig: vi.fn().mockReturnValue(undefined),
		getMouseMode: vi.fn().mockReturnValue("turn"),
		setMouseMode: vi.fn(),
		...overrides,
	} as FlipBookHandle,
});

function stubFullscreenApi() {
	const request = vi.fn().mockResolvedValue(undefined);
	const exit = vi.fn().mockResolvedValue(undefined);
	(HTMLElement.prototype as HTMLElement & { requestFullscreen?: unknown }).requestFullscreen =
		request;
	doc.exitFullscreen = exit;
	doc.fullscreenEnabled = true;
	return { request, exit };
}

function cleanupFullscreenApi() {
	delete (HTMLElement.prototype as HTMLElement & { requestFullscreen?: unknown }).requestFullscreen;
	delete doc.exitFullscreen;
	delete doc.fullscreenEnabled;
	delete doc.fullscreenElement;
}

afterEach(cleanupFullscreenApi);

describe("FullscreenButton", () => {
	it("renders the localized enter label in LTR and RTL locales", () => {
		const mockRef = createMockFlipBookRef();
		stubFullscreenApi();
		const { unmount } = render(
			<Toolbar flipBookRef={mockRef}>
				<FullscreenButton />
			</Toolbar>,
		);
		expect(screen.getByRole("button", { name: "Enter fullscreen" })).toBeTruthy();
		unmount();
		render(
			<Toolbar flipBookRef={mockRef} locale="he-IL">
				<FullscreenButton />
			</Toolbar>,
		);
		expect(screen.getByRole("button", { name: "כניסה למסך מלא" })).toBeTruthy();
	});

	it("keeps custom aria labels", () => {
		const mockRef = createMockFlipBookRef();
		stubFullscreenApi();
		render(
			<Toolbar flipBookRef={mockRef}>
				<FullscreenButton ariaLabelEnter="Full mode" ariaLabelExit="Exit mode" />
			</Toolbar>,
		);
		expect(screen.getByRole("button", { name: "Full mode" })).toBeTruthy();
	});

	it("requests fullscreen on the toolbar's fullscreenTargetRef when clicked", () => {
		const mockRef = createMockFlipBookRef();
		const { request } = stubFullscreenApi();
		const containerRef = { current: document.createElement("div") };
		render(
			<Toolbar flipBookRef={mockRef} fullscreenTargetRef={containerRef}>
				<FullscreenButton />
			</Toolbar>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Enter fullscreen" }));
		expect(request).toHaveBeenCalledTimes(1);
		expect(request.mock.contexts[0]).toBe(containerRef.current);
	});

	it("requests fullscreen on its own targetRef override", () => {
		const mockRef = createMockFlipBookRef();
		const { request } = stubFullscreenApi();
		const targetRef = { current: document.createElement("div") };
		render(
			<Toolbar flipBookRef={mockRef}>
				<FullscreenButton targetRef={targetRef} />
			</Toolbar>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Enter fullscreen" }));
		expect(request.mock.contexts[0]).toBe(targetRef.current);
	});

	it("syncs the pressed state and label when fullscreen changes outside the button", () => {
		const mockRef = createMockFlipBookRef();
		stubFullscreenApi();
		render(
			<Toolbar flipBookRef={mockRef}>
				<FullscreenButton />
			</Toolbar>,
		);
		const button = screen.getByRole("button", { name: "Enter fullscreen" });
		expect(button.getAttribute("aria-pressed")).toBe("false");
		doc.fullscreenElement = document.createElement("div");
		fireEvent(document, new Event("fullscreenchange"));
		expect(screen.getByRole("button", { name: "Exit fullscreen" })).toBeTruthy();
		expect(button.getAttribute("aria-pressed")).toBe("true");
		// Exiting via Escape/browser UI fires the same events — including the webkit prefix.
		doc.fullscreenElement = null;
		fireEvent(document, new Event("webkitfullscreenchange"));
		expect(screen.getByRole("button", { name: "Enter fullscreen" })).toBeTruthy();
		expect(button.getAttribute("aria-pressed")).toBe("false");
	});

	it("re-syncs on fullscreenerror so a rejected request cannot wedge the state", () => {
		const mockRef = createMockFlipBookRef();
		stubFullscreenApi();
		render(
			<Toolbar flipBookRef={mockRef}>
				<FullscreenButton />
			</Toolbar>,
		);
		fireEvent(document, new Event("fullscreenerror"));
		expect(screen.getByRole("button", { name: "Enter fullscreen" })).toBeTruthy();
	});

	it("hides itself when fullscreen is unsupported", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<Toolbar flipBookRef={mockRef}>
				<FullscreenButton />
			</Toolbar>,
		);
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("can render disabled with an explanation instead of hiding", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<Toolbar flipBookRef={mockRef} locale="he-IL">
				<FullscreenButton unsupportedBehavior="disable" />
			</Toolbar>,
		);
		const button = screen.getByRole("button", { name: "כניסה למסך מלא" });
		expect((button as HTMLButtonElement).disabled).toBe(true);
		expect(button.getAttribute("title")).toBe("מסך מלא אינו נתמך בדפדפן זה");
	});

	it("toggles fullscreen via the F11 hotkey", () => {
		const mockRef = createMockFlipBookRef();
		const { request } = stubFullscreenApi();
		render(
			<Toolbar flipBookRef={mockRef}>
				<FullscreenButton />
			</Toolbar>,
		);
		fireEvent.keyDown(document, { key: "F11" });
		expect(request).toHaveBeenCalledTimes(1);
		expect(request.mock.contexts[0]).toBe(document.documentElement);
	});

	it("lets consumers rebind the hotkey without losing the fullscreen target", () => {
		const mockRef = createMockFlipBookRef();
		const { request } = stubFullscreenApi();
		const containerRef = { current: document.createElement("div") };
		render(
			<Toolbar
				flipBookRef={mockRef}
				fullscreenTargetRef={containerRef}
				commandOptions={{ toggleFullscreen: { hotkeys: [{ key: "f" }] } }}
			>
				<FullscreenButton />
			</Toolbar>,
		);
		fireEvent.keyDown(document, { key: "F11" });
		expect(request).not.toHaveBeenCalled();
		fireEvent.keyDown(document, { key: "f" });
		expect(request).toHaveBeenCalledTimes(1);
		expect(request.mock.contexts[0]).toBe(containerRef.current);
	});

	it("lets consumers disable the hotkey through commandOptions", () => {
		const mockRef = createMockFlipBookRef();
		const { request } = stubFullscreenApi();
		render(
			<Toolbar
				flipBookRef={mockRef}
				commandOptions={{ toggleFullscreen: { disableHotkeys: true } }}
			>
				<FullscreenButton />
			</Toolbar>,
		);
		fireEvent.keyDown(document, { key: "F11" });
		expect(request).not.toHaveBeenCalled();
	});

	it("ignores the hotkey when fullscreen is unsupported", () => {
		const mockRef = createMockFlipBookRef();
		const request = vi.fn().mockResolvedValue(undefined);
		(HTMLElement.prototype as HTMLElement & { requestFullscreen?: unknown }).requestFullscreen =
			request;
		doc.fullscreenEnabled = false;
		render(
			<Toolbar flipBookRef={mockRef}>
				<FullscreenButton unsupportedBehavior="disable" />
			</Toolbar>,
		);
		fireEvent.keyDown(document, { key: "F11" });
		expect(request).not.toHaveBeenCalled();
	});

	it("works inside an RTL toolbar", () => {
		const mockRef = createMockFlipBookRef();
		const { request } = stubFullscreenApi();
		const { container } = render(
			<Toolbar flipBookRef={mockRef} direction="rtl">
				<FullscreenButton />
			</Toolbar>,
		);
		const toolbar = container.querySelector('[dir="rtl"]');
		const button = screen.getByRole("button", { name: "כניסה למסך מלא" });
		expect(toolbar?.contains(button)).toBe(true);
		fireEvent.click(button);
		expect(request).toHaveBeenCalledTimes(1);
	});
});
