import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
	const { flipBookRef, pageSemantics, direction, currentPage, totalPages, of } = useToolbar();

	// Determine effective mode
	const mode: PageIndicatorMode = modeProp ?? (pageSemantics ? "semantic" : "index");
	const editable = editableProp ?? (mode === "semantic" && !!pageSemantics);

	const [inputValue, setInputValue] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	// Ref-only flag: prevents handleBlur from reverting inputValue to a stale
	// displayText during the brief gap before Toolbar polling updates currentPage.
	// Cleared synchronously once the page actually changes.
	const justNavigatedRef = useRef(false);
	const prevCurrentPageRef = useRef(currentPage);

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

	// "Of" comes from the book (via context); default is total pages count
	const getTotalDisplay = useCallback((): string => String(of), [of]);

	// Build display text for the range (always left physical page then right, e.g. י"א - י"ב)
	const buildDisplayText = useCallback((): string => {
		const firstName = leftName;
		const secondName = rightName;

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
	}, [leftName, rightName, placeholder, showTotal, getTotalDisplay]);

	// The primary semantic name for editing (use left page in RTL reading order)
	const primarySemanticName = direction === "rtl" ? rightName || leftName : leftName || rightName;

	const displayText = buildDisplayText();

	// Sync input value when page changes and not editing.
	// After Enter navigation, justNavigatedRef prevents flashing the stale value;
	// once Toolbar polling updates currentPage, the flag is cleared and the
	// new displayText is applied. Because displayText includes the " / total"
	// suffix, it is always different from the user's typed value, guaranteeing
	// a state change that triggers a re-render.
	useEffect(() => {
		const pageChanged = currentPage !== prevCurrentPageRef.current;
		prevCurrentPageRef.current = currentPage;

		if (pageChanged) {
			justNavigatedRef.current = false;
		}
		if (!isEditing && !justNavigatedRef.current) {
			setInputValue(displayText);
		}
	}, [displayText, isEditing, currentPage]);

	const handleFocus = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			if (editable) {
				setIsEditing(true);
				setInputValue(primarySemanticName);
				justNavigatedRef.current = false;
				// Select all text so the user can immediately type a replacement
				requestAnimationFrame(() => e.target.select());
			}
		},
		[editable, primarySemanticName],
	);

	const handleBlur = useCallback(() => {
		setIsEditing(false);
		// After a successful Enter navigation, keep the user's typed value visible
		// until Toolbar polling updates currentPage with the new position.
		if (!justNavigatedRef.current) {
			setInputValue(displayText);
		}
	}, [displayText]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				// Navigate on Enter
				if (pageSemantics && inputValue.trim()) {
					const pageIndex = pageSemantics.semanticNameToIndex(inputValue.trim());
					if (pageIndex != null && pageIndex >= 0 && pageIndex < totalPages) {
						flipBookRef.current?.jumpToPage(pageIndex);
						justNavigatedRef.current = true;
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

	// Editable input — always shows inputValue.
	// When not editing, useEffect keeps inputValue in sync with displayText.
	// During editing, inputValue holds the user's typed text.
	// After Enter navigation, inputValue keeps the typed value until polling
	// updates currentPage, at which point useEffect sets it to the new displayText.
	const editingClass = isEditing ? "flipbook-toolbar-indicator--editing" : "";
	return (
		<input
			type="text"
			className={`flipbook-toolbar-indicator ${editingClass} ${className ?? ""}`.trim()}
			value={inputValue}
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
