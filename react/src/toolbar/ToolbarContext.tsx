import type React from "react";
import { createContext, useContext } from "react";
import type { FlipBookHandle, PageSemantics } from "../FlipBook";
import type { Locale } from "../i18n";

interface ToolbarContextValue {
	flipBookRef: React.RefObject<FlipBookHandle | null>;
	direction: "ltr" | "rtl";
	/** Locale for UI strings (toolbar, download menu). Defaults to "he-IL" when direction is rtl, else "en". */
	locale: Locale;
	pageSemantics?: PageSemantics;
	currentPage: number;
	totalPages: number;
	/** "Of" value from the book (for page indicator). Sourced from FlipBook ref. */
	of: string | number;
	isFirstPage: boolean;
	isLastPage: boolean;
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
