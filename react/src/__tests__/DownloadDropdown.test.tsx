import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DownloadConfig, FlipBookHandle, PageSemantics } from "../FlipBook";
import { DownloadDropdown, Toolbar } from "../toolbar";

/**
 * Helper to create a mock FlipBookHandle ref with download config support.
 */
function createMockFlipBookRef(
	downloadConfig?: DownloadConfig,
	overrides: Partial<FlipBookHandle> = {},
) {
	return {
		current: {
			flipNext: vi.fn().mockResolvedValue(undefined),
			flipPrev: vi.fn().mockResolvedValue(undefined),
			flipToPage: vi.fn().mockResolvedValue(undefined),
			jumpToPage: vi.fn(),
			toggleDebugBar: vi.fn(),
			getCurrentPageIndex: vi.fn().mockReturnValue(0),
			getTotalPages: vi.fn().mockReturnValue(10),
			getOf: vi.fn().mockReturnValue(10),
			isFirstPage: vi.fn().mockReturnValue(true),
			isLastPage: vi.fn().mockReturnValue(false),
			getDownloadConfig: vi.fn().mockReturnValue(downloadConfig),
			...overrides,
		} as FlipBookHandle,
	};
}

/** Minimal page semantics that assigns Hebrew letters to content pages (odd indices starting at 3). */
function createHebrewSemantics(perekCount: number): PageSemantics {
	const CONTENT_OFFSET = 3;
	return {
		indexToSemanticName(pageIndex: number): string {
			if (pageIndex < CONTENT_OFFSET) return "";
			const adjusted = pageIndex - CONTENT_OFFSET;
			if (adjusted % 2 !== 0) return ""; // blank page
			const perekNum = adjusted / 2 + 1;
			if (perekNum > perekCount) return "";
			return String(perekNum);
		},
		indexToTitle(pageIndex: number): string {
			if (pageIndex < CONTENT_OFFSET) return "";
			const adjusted = pageIndex - CONTENT_OFFSET;
			if (adjusted % 2 !== 0) return "";
			const perekNum = adjusted / 2 + 1;
			if (perekNum > perekCount) return "";
			return `Chapter ${perekNum}`;
		},
		semanticNameToIndex(name: string): number | null {
			const num = Number(name);
			if (Number.isNaN(num) || num < 1 || num > perekCount) return null;
			return (num - 1) * 2 + CONTENT_OFFSET;
		},
	};
}

const DOWNLOAD_CONFIG: DownloadConfig = {
	entireBookFilename: "book",
	rangeFilename: "pages",
	onDownloadSefer: vi.fn().mockResolvedValue({ ext: "pdf", data: "" }),
	onDownloadPageRange: vi.fn().mockResolvedValue({ ext: "pdf", data: "" }),
};

describe("DownloadDropdown", () => {
	it("does not render when there is no download config", () => {
		const ref = createMockFlipBookRef(undefined);
		render(
			<Toolbar flipBookRef={ref}>
				<DownloadDropdown ariaLabel="Download" />
			</Toolbar>,
		);
		expect(screen.queryByRole("button", { name: "Download" })).toBeNull();
	});

	it("renders a trigger button when download config exists", () => {
		const ref = createMockFlipBookRef(DOWNLOAD_CONFIG);
		render(
			<Toolbar flipBookRef={ref}>
				<DownloadDropdown ariaLabel="Download" />
			</Toolbar>,
		);
		expect(screen.getByRole("button", { name: "Download" })).toBeTruthy();
	});

	it("opens the dropdown menu when trigger is clicked", () => {
		const ref = createMockFlipBookRef(DOWNLOAD_CONFIG);
		render(
			<Toolbar flipBookRef={ref}>
				<DownloadDropdown ariaLabel="Download" />
			</Toolbar>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Download" }));
		expect(screen.getByRole("menu")).toBeTruthy();
	});

	it("defaults to 'entire' mode when onDownloadSefer is available", () => {
		const ref = createMockFlipBookRef(DOWNLOAD_CONFIG);
		render(
			<Toolbar flipBookRef={ref}>
				<DownloadDropdown ariaLabel="Download" />
			</Toolbar>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Download" }));

		const radios = screen.getAllByRole("radio") as HTMLInputElement[];
		const entireRadio = radios.find((r) => r.checked);
		expect(entireRadio).toBeTruthy();
	});

	it("switches to range mode and stays open when range radio is selected", () => {
		const ref = createMockFlipBookRef(DOWNLOAD_CONFIG);
		render(
			<Toolbar flipBookRef={ref}>
				<DownloadDropdown ariaLabel="Download" />
			</Toolbar>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Download" }));

		const radios = screen.getAllByRole("radio") as HTMLInputElement[];
		// The second radio is the range option
		const rangeRadio = radios[1];
		fireEvent.click(rangeRadio);

		// Menu should still be open
		expect(screen.getByRole("menu")).toBeTruthy();
		// Range radio should be checked
		expect(rangeRadio.checked).toBe(true);
	});

	it("shows only content pages (not covers/blanks) in range selects when semantics are provided", () => {
		const perekCount = 3;
		const totalPages = 3 + perekCount * 2 + 2; // cover + interior + toc + (perek + blank)*3 + back cover
		const semantics = createHebrewSemantics(perekCount);
		const ref = createMockFlipBookRef(DOWNLOAD_CONFIG, {
			getTotalPages: vi.fn().mockReturnValue(totalPages),
		});

		render(
			<Toolbar flipBookRef={ref} pageSemantics={semantics}>
				<DownloadDropdown ariaLabel="Download" />
			</Toolbar>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Download" }));

		// Switch to range mode
		const radios = screen.getAllByRole("radio") as HTMLInputElement[];
		fireEvent.click(radios[1]);

		// Should have select elements for from/to
		const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
		expect(selects.length).toBe(2);

		// Each select should only have perekCount options (content pages), not total pages
		const fromOptions = selects[0].querySelectorAll("option");
		expect(fromOptions.length).toBe(perekCount);

		// Options should be semantic names, not "Page 1", "Page 2"
		const optionTexts = Array.from(fromOptions).map((o) => o.textContent);
		expect(optionTexts).toEqual(["1", "2", "3"]);
	});

	it("closes dropdown when trigger is clicked again", () => {
		const ref = createMockFlipBookRef(DOWNLOAD_CONFIG);
		render(
			<Toolbar flipBookRef={ref}>
				<DownloadDropdown ariaLabel="Download" />
			</Toolbar>,
		);
		const trigger = screen.getByRole("button", { name: "Download" });
		fireEvent.click(trigger);
		expect(screen.getByRole("menu")).toBeTruthy();

		fireEvent.click(trigger);
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("closes dropdown when clicking outside", () => {
		const ref = createMockFlipBookRef(DOWNLOAD_CONFIG);
		render(
			<Toolbar flipBookRef={ref}>
				<DownloadDropdown ariaLabel="Download" />
			</Toolbar>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Download" }));
		expect(screen.getByRole("menu")).toBeTruthy();

		fireEvent.mouseDown(document.body);
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("calls onDownloadSefer when download button is clicked in entire mode", async () => {
		const onDownloadSefer = vi.fn().mockResolvedValue(null);
		const config: DownloadConfig = {
			...DOWNLOAD_CONFIG,
			onDownloadSefer,
		};
		const ref = createMockFlipBookRef(config);

		render(
			<Toolbar flipBookRef={ref}>
				<DownloadDropdown ariaLabel="Download" />
			</Toolbar>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Download" }));

		// The download menuitem button
		const downloadBtn = screen.getByRole("menuitem");
		await act(async () => {
			fireEvent.click(downloadBtn);
		});

		expect(onDownloadSefer).toHaveBeenCalledTimes(1);
	});
});
