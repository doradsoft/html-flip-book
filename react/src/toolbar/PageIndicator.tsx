import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useToolbar } from "./ToolbarContext";

type PageIndicatorMode = "semantic" | "index";

interface PageIndicatorProps {
	/**
	 * Display mode:
	 * - "semantic": uses pageSemantics to show semantic names (e.g., "א", "ב")
	 * - "index": shows 1-based page numbers
	 * Defaults to "semantic" if pageSemantics is available, otherwise "index".
	 */
	mode?: PageIndicatorMode;
	/** Whether to show "/ total" after the current page(s). Defaults to true. */
	showTotal?: boolean;
	/** Placeholder when current page has no semantic name (semantic mode only) */
	placeholder?: string;
	/** Whether the input is editable for navigation. Defaults to true in semantic mode. */
	editable?: boolean;
	/** Additional CSS class name */
	className?: string;
	/** Input aria-label for accessibility */
	ariaLabel?: string;
	/** Maximum input length */
	maxLength?: number;
}

/**
 * Displays the current page position with support for semantic names or indices.
 * Shows a range when a spread is visible (e.g., "א - ב" or "1 - 2").
 * Direction-aware: RTL shows right-left, LTR shows left-right.
 * When both pages have the same semantic name, shows scalar (no range).
 */
const PageIndicator: React.FC<PageIndicatorProps> = ({
	mode: modeProp,
	showTotal = true,
	placeholder = "—",
	editable: editableProp,
	className,
	ariaLabel = "Go to page",
	maxLength = 10,
}) => {
	const { flipBookRef, pageSemantics, direction, currentPage, totalPages } = useToolbar();

	// Determine effective mode
	const mode: PageIndicatorMode = modeProp ?? (pageSemantics ? "semantic" : "index");
	const editable = editableProp ?? (mode === "semantic" && !!pageSemantics);

	const [inputValue, setInputValue] = useState("");
	const [isEditing, setIsEditing] = useState(false);

	// Calculate the spread pages (current page and its facing page)
	const leftPageIndex = currentPage;
	const rightPageIndex = currentPage + 1 < totalPages ? currentPage + 1 : null;

	// Get display names for pages
	const getPageName = useCallback(
		(pageIndex: number): string => {
			if (mode === "semantic" && pageSemantics) {
				return pageSemantics.indexToSemanticName(pageIndex) || "";
			}
			return String(pageIndex + 1); // 1-based for display
		},
		[mode, pageSemantics],
	);

	const leftName = getPageName(leftPageIndex);
	const rightName = rightPageIndex != null ? getPageName(rightPageIndex) : "";

	// Get total display (last page name or total count)
	const getTotalDisplay = useCallback((): string => {
		if (mode === "semantic" && pageSemantics) {
			// Find the last page with a semantic name
			for (let i = totalPages - 1; i >= 0; i--) {
				const name = pageSemantics.indexToSemanticName(i);
				if (name) return name;
			}
			return String(totalPages);
		}
		return String(totalPages);
	}, [mode, pageSemantics, totalPages]);

	// Build display text for the range
	const buildDisplayText = useCallback((): string => {
		// Determine which names to show based on direction
		// RTL: right page shown first (physically on right side)
		// LTR: left page shown first (physically on left side)
		const firstName = direction === "rtl" ? rightName : leftName;
		const secondName = direction === "rtl" ? leftName : rightName;

		let rangeText: string;
		if (!firstName && !secondName) {
			// Both empty (e.g., cover pages)
			rangeText = placeholder;
		} else if (!firstName) {
			// Only second has a name
			rangeText = secondName;
		} else if (!secondName) {
			// Only first has a name
			rangeText = firstName;
		} else if (firstName === secondName) {
			// Same name on both pages - show scalar
			rangeText = firstName;
		} else {
			// Different names - show range
			rangeText = `${firstName} - ${secondName}`;
		}

		if (showTotal) {
			return `${rangeText} / ${getTotalDisplay()}`;
		}
		return rangeText;
	}, [direction, leftName, rightName, placeholder, showTotal, getTotalDisplay]);

	// The primary semantic name for editing (use left page in RTL reading order)
	const primarySemanticName = direction === "rtl" ? rightName || leftName : leftName || rightName;

	// Sync input value when page changes and not editing
	useEffect(() => {
		if (!isEditing) {
			setInputValue(primarySemanticName);
		}
	}, [primarySemanticName, isEditing]);

	const handleFocus = useCallback(() => {
		if (editable) {
			setIsEditing(true);
			setInputValue(primarySemanticName);
		}
	}, [editable, primarySemanticName]);

	const handleBlur = useCallback(() => {
		// Always revert on blur - navigation only happens on Enter
		setIsEditing(false);
		setInputValue(primarySemanticName);
	}, [primarySemanticName]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				// Navigate on Enter
				if (pageSemantics && inputValue.trim()) {
					const pageIndex = pageSemantics.semanticNameToIndex(inputValue.trim());
					if (pageIndex != null && pageIndex >= 0 && pageIndex < totalPages) {
						flipBookRef.current?.jumpToPage(pageIndex);
					}
				}
				e.currentTarget.blur();
			} else if (e.key === "Escape") {
				// Cancel editing
				e.currentTarget.blur();
			}
		},
		[inputValue, pageSemantics, totalPages, flipBookRef],
	);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
	}, []);

	const displayText = buildDisplayText();

	// Non-editable display (span)
	if (!editable) {
		return (
			<span
				className={`flipbook-toolbar-indicator ${className ?? ""}`.trim()}
				aria-live="polite"
				aria-atomic="true"
			>
				{displayText}
			</span>
		);
	}

	// Editable input
	const editingClass = isEditing ? "flipbook-toolbar-indicator--editing" : "";
	return (
		<input
			type="text"
			className={`flipbook-toolbar-indicator ${editingClass} ${className ?? ""}`.trim()}
			value={isEditing ? inputValue : displayText}
			onFocus={handleFocus}
			onBlur={handleBlur}
			onKeyDown={handleKeyDown}
			onChange={handleChange}
			aria-label={ariaLabel}
			aria-live="polite"
			aria-atomic="true"
			maxLength={maxLength}
			readOnly={!editable}
		/>
	);
};

export { PageIndicator };
export type { PageIndicatorProps, PageIndicatorMode };
