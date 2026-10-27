import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
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
});
