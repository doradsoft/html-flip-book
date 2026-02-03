import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { FlipBookHandle, PageSemantics } from "../FlipBook";
import { ToolbarContext } from "./ToolbarContext";
import "./Toolbar.css";

interface ToolbarProps {
	/** Ref to the FlipBook component for programmatic control */
	flipBookRef: React.RefObject<FlipBookHandle | null>;
	/** Text direction for button layout. Defaults to "ltr" */
	direction?: "ltr" | "rtl";
	/** Optional page semantics for semantic indicator (e.g. perek/chapter) */
	pageSemantics?: PageSemantics;
	/** Additional CSS class name */
	className?: string;
	/** Toolbar children in reading order: First, Prev, Indicator, Next, Last */
	children: React.ReactNode;
}

/**
 * Container component for FlipBook toolbar controls.
 * Provides context to child components for accessing FlipBook methods.
 */
const Toolbar: React.FC<ToolbarProps> = ({
	flipBookRef,
	direction = "ltr",
	pageSemantics,
	className = "",
	children,
}) => {
	const [currentPage, setCurrentPage] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [isFirstPage, setIsFirstPage] = useState(true);
	const [isLastPage, setIsLastPage] = useState(false);

	// Update state from FlipBook ref
	const updateState = useCallback(() => {
		const fb = flipBookRef.current;
		if (fb) {
			setCurrentPage(fb.getCurrentPageIndex());
			setTotalPages(fb.getTotalPages());
			setIsFirstPage(fb.isFirstPage());
			setIsLastPage(fb.isLastPage());
		}
	}, [flipBookRef]);

	// Initial state update and periodic polling
	// TODO: Replace with event-based updates when FlipBook emits page change events
	useEffect(() => {
		updateState();
		const interval = setInterval(updateState, 100);
		return () => clearInterval(interval);
	}, [updateState]);

	return (
		<ToolbarContext.Provider
			value={{
				flipBookRef,
				direction,
				pageSemantics,
				currentPage,
				totalPages,
				isFirstPage,
				isLastPage,
			}}
		>
			<div
				className={`flipbook-toolbar ${className}`.trim()}
				role="toolbar"
				aria-label="FlipBook navigation"
				dir={direction}
			>
				{children}
			</div>
		</ToolbarContext.Provider>
	);
};

export { Toolbar };
export type { ToolbarProps };
