import type React from "react";
import { createContext, useContext } from "react";
import type { FlipBookHandle, PageSemantics } from "../FlipBook";
import type { Locale } from "../i18n";

interface ToolbarContextValue {
	flipBookRef: React.RefObject<FlipBookHandle | null>;
	direction: "ltr" | "rtl";
	/** Locale for UI strings (toolbar, download menu). Defaults to en-US. */
	locale: Locale;
	pageSemantics?: PageSemantics;
	currentPage: number;
	totalPages: number;
	/** "Of" value from the book (for page indicator). Sourced from FlipBook ref. */
	of: string | number;
	isFirstPage: boolean;
	isLastPage: boolean;
	/** Ref used by openDownloadMenu command (Ctrl+S) to open the download dropdown. DownloadDropdown sets this. */
	openDownloadMenuRef: React.MutableRefObject<(() => void) | null>;
	/** Ref set by DownloadDropdown: (from?, to?) => void to run download (entire book or range). Used by download command. */
	downloadExecutorRef: React.MutableRefObject<((from?: number, to?: number) => void) | null>;
	/** When set (via Toolbar fullscreenTargetRef), fullscreen targets this container (e.g. sefer + toolbar). */
	fullscreenTargetRef?: React.RefObject<HTMLElement | null>;
}

const ToolbarContext = createContext<ToolbarContextValue | null>(null);

export function useToolbar(): ToolbarContextValue {
	const context = useContext(ToolbarContext);
	if (!context) {
		throw new Error("Toolbar components must be used within a Toolbar");
	}
	return context;
}

export { ToolbarContext };
export type { ToolbarContextValue };
