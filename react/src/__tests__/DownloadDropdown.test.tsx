import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createContext, type ReactNode, useContext } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { downloadCommand, useCommands } from "../commands";
import type { FlipBookHandle } from "../FlipBook";
import { Toolbar } from "../toolbar";
import { DownloadDropdown } from "../toolbar/DownloadDropdown";

beforeAll(() => {
	URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
	URL.revokeObjectURL = vi.fn();
});

const createMockFlipBookRef = (getDownloadConfig: FlipBookHandle["getDownloadConfig"]) => ({
	current: {
		flipNext: vi.fn().mockResolvedValue(undefined),
		flipPrev: vi.fn().mockResolvedValue(undefined),
		flipToPage: vi.fn().mockResolvedValue(undefined),
		jumpToPage: vi.fn(),
		toggleDebugBar: vi.fn(),
		getCurrentPageIndex: vi.fn().mockReturnValue(0),
		getTotalPages: vi.fn().mockReturnValue(3),
		getOf: vi.fn().mockReturnValue(3),
		isFirstPage: vi.fn().mockReturnValue(true),
		isLastPage: vi.fn().mockReturnValue(false),
		getDownloadConfig,
		getMouseMode: vi.fn().mockReturnValue("turn"),
		setMouseMode: vi.fn(),
	} as FlipBookHandle,
});

function renderDropdown(downloadConfig: Parameters<typeof createMockFlipBookRef>[0]) {
	const mockRef = createMockFlipBookRef(downloadConfig);
	render(
		<Toolbar flipBookRef={mockRef}>
			<DownloadDropdown />
		</Toolbar>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Download" }));
	return mockRef;
}

const primaryButton = () => screen.getByRole("menuitem");

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function CommandProbe() {
	const { execute } = useCommands();
	return (
		<>
			<button type="button" data-testid="exec-entire" onClick={() => execute(downloadCommand)} />
			<button
				type="button"
				data-testid="exec-range"
				onClick={() => execute(downloadCommand, { from: 1, to: 2 })}
			/>
		</>
	);
}

function renderClosedDropdown(downloadConfig: Parameters<typeof createMockFlipBookRef>[0]) {
	const mockRef = createMockFlipBookRef(downloadConfig);
	render(
		<Toolbar flipBookRef={mockRef}>
			<DownloadDropdown />
			<CommandProbe />
		</Toolbar>,
	);
	return mockRef;
}

describe("DownloadDropdown error lifecycle", () => {
	it("shows an alert and keeps the menu open when the entire-book handler rejects", async () => {
		const onDownloadError = vi.fn();
		const onDownloadSefer = vi.fn().mockRejectedValue(new Error("boom"));
		renderDropdown(() => ({
			onDownloadSefer,
			onDownloadError,
		}));

		fireEvent.click(primaryButton());
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toContain("Download failed");
		expect(screen.getByRole("menu")).toBeTruthy();
		expect(onDownloadError).toHaveBeenCalledWith(expect.any(Error));
	});

	it("uses the host-provided error message when onDownloadError returns a string", async () => {
		renderDropdown(() => ({
			onDownloadSefer: vi.fn().mockRejectedValue(new Error("boom")),
			onDownloadError: () => "Export exploded",
		}));

		fireEvent.click(primaryButton());
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toBe("Export exploded");
	});

	it("surfaces browser-side conversion failures through the same lifecycle", async () => {
		const onDownloadError = vi.fn();
		renderDropdown(() => ({
			onDownloadSefer: vi.fn().mockResolvedValue({ ext: "bin", data: "!!!not-base64!!!" }),
			onDownloadError,
		}));

		fireEvent.click(primaryButton());
		expect(await screen.findByRole("alert")).toBeTruthy();
		expect(onDownloadError).toHaveBeenCalledOnce();
	});

	it("closes without an error on an intentional null result", async () => {
		const onDownloadError = vi.fn();
		renderDropdown(() => ({
			onDownloadSefer: vi.fn().mockResolvedValue(null),
			onDownloadError,
		}));

		fireEvent.click(primaryButton());
		await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
		expect(screen.queryByRole("alert")).toBeNull();
		expect(onDownloadError).not.toHaveBeenCalled();
	});

	it("recovers: a failed attempt can be retried and then succeed", async () => {
		const onDownloadSefer = vi
			.fn()
			.mockRejectedValueOnce(new Error("boom"))
			.mockResolvedValueOnce({ ext: "bin", data: "aGk=" });
		renderDropdown(() => ({ onDownloadSefer }));

		fireEvent.click(primaryButton());
		expect(await screen.findByRole("alert")).toBeTruthy();

		fireEvent.click(primaryButton());
		await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
		expect(onDownloadSefer).toHaveBeenCalledTimes(2);
	});

	it("routes range-download rejections through the same lifecycle", async () => {
		const onDownloadError = vi.fn();
		renderDropdown(() => ({
			onDownloadPageRange: vi.fn().mockRejectedValue(new Error("boom")),
			onDownloadError,
		}));

		fireEvent.click(primaryButton());
		expect(await screen.findByRole("alert")).toBeTruthy();
		expect(onDownloadError).toHaveBeenCalledWith(expect.any(Error));
	});

	it("opens the menu with the alert when an entire-book command fails while closed", async () => {
		const onDownloadError = vi.fn();
		const onDownloadSefer = vi.fn().mockRejectedValue(new Error("boom"));
		renderClosedDropdown(() => ({ onDownloadSefer, onDownloadError }));

		fireEvent.click(screen.getByTestId("exec-entire"));
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toContain("Download failed");
		expect(screen.getByRole("menu")).toBeTruthy();
		expect(onDownloadError).toHaveBeenCalledWith(expect.any(Error));
	});

	it("opens the menu with the alert when a range command fails while closed", async () => {
		const onDownloadPageRange = vi.fn().mockRejectedValue(new Error("boom"));
		renderClosedDropdown(() => ({ onDownloadPageRange }));

		fireEvent.click(screen.getByTestId("exec-range"));
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toContain("Download failed");
		expect(screen.getByRole("menu")).toBeTruthy();
		expect(onDownloadPageRange).toHaveBeenCalledWith([1, 2], expect.any(Array), undefined);
	});

	it("falls back to the localized alert when onDownloadError throws", async () => {
		renderDropdown(() => ({
			onDownloadSefer: vi.fn().mockRejectedValue(new Error("boom")),
			onDownloadError: () => {
				throw new Error("hook failed");
			},
		}));

		fireEvent.click(primaryButton());
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toContain("Download failed");
	});

	it("keeps the localized alert when an async onDownloadError rejects", async () => {
		renderDropdown(() => ({
			onDownloadSefer: vi.fn().mockRejectedValue(new Error("boom")),
			onDownloadError: () => Promise.reject(new Error("hook failed")),
		}));

		fireEvent.click(primaryButton());
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toContain("Download failed");
		await waitFor(() => expect(alert.textContent).toContain("Download failed"));
	});

	it("uses the resolved string when an async onDownloadError settles", async () => {
		renderDropdown(() => ({
			onDownloadSefer: vi.fn().mockRejectedValue(new Error("boom")),
			onDownloadError: () => Promise.resolve("Async custom message"),
		}));

		fireEvent.click(primaryButton());
		const alert = await screen.findByRole("alert");
		await waitFor(() => expect(alert.textContent).toBe("Async custom message"));
	});

	it("ignores a late-resolving async hook from a superseded attempt", async () => {
		const first = deferred<string>();
		const onDownloadError = vi
			.fn()
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce("Second failure");
		renderDropdown(() => ({
			onDownloadSefer: vi.fn().mockRejectedValue(new Error("boom")),
			onDownloadError,
		}));

		fireEvent.click(primaryButton());
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toContain("Download failed");

		await waitFor(() => expect(primaryButton()).toHaveProperty("disabled", false));
		fireEvent.click(primaryButton());
		await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Second failure"));

		await act(async () => first.resolve("First failure"));
		expect(screen.getByRole("alert").textContent).toBe("Second failure");
	});

	it("applies the newer attempt's async message even when the older hook settles first", async () => {
		const first = deferred<string>();
		const second = deferred<string>();
		const onDownloadError = vi
			.fn()
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);
		renderDropdown(() => ({
			onDownloadSefer: vi.fn().mockRejectedValue(new Error("boom")),
			onDownloadError,
		}));

		fireEvent.click(primaryButton());
		expect(await screen.findByRole("alert")).toBeTruthy();
		await waitFor(() => expect(primaryButton()).toHaveProperty("disabled", false));
		fireEvent.click(primaryButton());

		await act(async () => first.resolve("First failure"));
		expect(screen.getByRole("alert").textContent).toContain("Download failed");

		await act(async () => second.resolve("Second failure"));
		expect(screen.getByRole("alert").textContent).toBe("Second failure");
	});

	it("clears a pending error hook when the retry succeeds", async () => {
		const first = deferred<string>();
		const onDownloadError = vi.fn().mockReturnValueOnce(first.promise);
		const onDownloadSefer = vi
			.fn()
			.mockRejectedValueOnce(new Error("boom"))
			.mockResolvedValueOnce({ ext: "bin", data: "aGk=" });
		renderDropdown(() => ({ onDownloadSefer, onDownloadError }));

		fireEvent.click(primaryButton());
		expect(await screen.findByRole("alert")).toBeTruthy();

		await waitFor(() => expect(primaryButton()).toHaveProperty("disabled", false));
		fireEvent.click(primaryButton());
		await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

		await act(async () => first.resolve("First failure"));
		fireEvent.click(screen.getByRole("button", { name: "Download" }));
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("keeps the localized fallback when the current attempt's hook resolves null", async () => {
		const hook = deferred<string | null>();
		renderDropdown(() => ({
			onDownloadSefer: vi.fn().mockRejectedValue(new Error("boom")),
			onDownloadError: () => hook.promise,
		}));

		fireEvent.click(primaryButton());
		const alert = await screen.findByRole("alert");
		await act(async () => hook.resolve(null));
		expect(alert.textContent).toContain("Download failed");
	});

	it("does not resurrect a dismissed error after close and reopen", async () => {
		const first = deferred<string>();
		renderDropdown(() => ({
			onDownloadSefer: vi.fn().mockRejectedValue(new Error("boom")),
			onDownloadError: () => first.promise,
		}));

		fireEvent.click(primaryButton());
		expect(await screen.findByRole("alert")).toBeTruthy();

		fireEvent.mouseDown(document.body);
		expect(screen.queryByRole("menu")).toBeNull();

		await act(async () => first.resolve("First failure"));
		fireEvent.click(screen.getByRole("button", { name: "Download" }));
		expect(await screen.findByRole("menu")).toBeTruthy();
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("ignores a pending error hook after unmount", async () => {
		const first = deferred<string>();
		const mockRef = createMockFlipBookRef(() => ({
			onDownloadSefer: vi.fn().mockRejectedValue(new Error("boom")),
			onDownloadError: () => first.promise,
		}));
		const { unmount } = render(
			<Toolbar flipBookRef={mockRef}>
				<DownloadDropdown />
			</Toolbar>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Download" }));
		fireEvent.click(primaryButton());
		expect(await screen.findByRole("alert")).toBeTruthy();

		unmount();
		await act(async () => first.resolve("Late failure"));
		expect(screen.queryByRole("alert")).toBeNull();
	});
});

describe("DownloadDropdown content slot", () => {
	const renderWithChildren = (children: ReactNode) => {
		const mockRef = createMockFlipBookRef(() => ({ onDownloadSefer: vi.fn() }));
		render(
			<Toolbar flipBookRef={mockRef}>
				<DownloadDropdown>{children}</DownloadDropdown>
			</Toolbar>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Download" }));
	};

	it("renders children inside the open menu, not in the document body", async () => {
		renderWithChildren(<p data-testid="hint">hint text</p>);
		const hint = await screen.findByTestId("hint");
		const menu = screen.getByRole("menu");
		expect(menu.contains(hint)).toBe(true);
		expect(hint.closest(".flipbook-toolbar-download-extra")).toBeTruthy();
	});

	it("treats interactive child clicks as inside-menu actions", async () => {
		const onAction = vi.fn();
		renderWithChildren(
			<button type="button" onClick={onAction}>
				settings
			</button>,
		);
		fireEvent.mouseDown(screen.getByRole("button", { name: "settings" }));
		fireEvent.click(screen.getByRole("button", { name: "settings" }));
		expect(onAction).toHaveBeenCalledOnce();
		expect(screen.getByRole("menu")).toBeTruthy();
	});

	it("preserves React context for slot children", async () => {
		const Ctx = createContext("unset");
		// biome-ignore lint/correctness/noComponentHookFactories: test-scoped probe component reading context once
		const Probe = () => {
			const v = useContext(Ctx);
			return <span data-testid="ctx">{v}</span>;
		};
		const mockRef = createMockFlipBookRef(() => ({ onDownloadSefer: vi.fn() }));
		render(
			<Ctx.Provider value="from-host">
				<Toolbar flipBookRef={mockRef}>
					<DownloadDropdown>
						<Probe />
					</DownloadDropdown>
				</Toolbar>
			</Ctx.Provider>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Download" }));
		expect((await screen.findByTestId("ctx")).textContent).toBe("from-host");
	});

	it("unmounts slot content with the menu and remounts on reopen", async () => {
		renderWithChildren(<p data-testid="hint">hint text</p>);
		expect(await screen.findByTestId("hint")).toBeTruthy();
		fireEvent.mouseDown(document.body);
		expect(screen.queryByTestId("hint")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Download" }));
		expect(await screen.findByTestId("hint")).toBeTruthy();
	});
});
