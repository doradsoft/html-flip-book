import type React from "react";
import { createContext, useContext } from "react";
import type { FlipBookHandle } from "../FlipBook";

interface ToolbarContextValue {
	flipBookRef: React.RefObject<FlipBookHandle | null>;
	direction: "ltr" | "rtl";
	currentPage: number;
	totalPages: number;
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
