import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useToolbar } from "./ToolbarContext";

interface SemanticPageIndicatorProps {
	/** Placeholder when current page has no semantic name */
	placeholder?: string;
	/** Additional CSS class name */
	className?: string;
	/** Input aria-label for accessibility */
	ariaLabel?: string;
}

/**
 * Displays the current page as a semantic name (e.g. perek א) and allows
 * navigation by typing a semantic name. Requires pageSemantics on Toolbar.
 * Falls back to "current / total" when pageSemantics is not provided.
 */
const SemanticPageIndicator: React.FC<SemanticPageIndicatorProps> = ({
	placeholder = "—",
	className,
	ariaLabel = "Go to page (semantic name)",
}) => {
	const { flipBookRef, pageSemantics, currentPage, totalPages } = useToolbar();
	const [inputValue, setInputValue] = useState("");
	const [isEditing, setIsEditing] = useState(false);

	const displaySemantic = pageSemantics?.indexToSemanticName(currentPage) ?? "";
	const displayText = displaySemantic || placeholder;
	const showInput = pageSemantics != null;

	// Sync input value when page changes and not editing
	useEffect(() => {
		if (!isEditing && showInput) {
			setInputValue(displaySemantic);
		}
	}, [displaySemantic, isEditing, showInput]);

	const handleFocus = useCallback(() => {
		setIsEditing(true);
		setInputValue(displaySemantic);
	}, [displaySemantic]);

	const handleBlur = useCallback(() => {
		setIsEditing(false);
		// Navigate if value is valid
		if (pageSemantics && inputValue.trim()) {
			const pageIndex = pageSemantics.semanticNameToIndex(inputValue.trim());
			if (pageIndex != null && pageIndex >= 0 && pageIndex < totalPages) {
				flipBookRef.current?.jumpToPage(pageIndex);
			}
		}
		setInputValue(displaySemantic);
	}, [displaySemantic, inputValue, pageSemantics, totalPages, flipBookRef]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.currentTarget.blur();
		}
	}, []);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
	}, []);

	if (!showInput) {
		return (
			<span
				className={`flipbook-toolbar-indicator ${className ?? ""}`.trim()}
				aria-live="polite"
				aria-atomic="true"
			>
				{currentPage + 1} / {totalPages}
			</span>
		);
	}

	return (
		<input
			type="text"
			className={`flipbook-toolbar-indicator flipbook-toolbar-indicator-input ${className ?? ""}`.trim()}
			value={isEditing ? inputValue : displayText || placeholder}
			onFocus={handleFocus}
			onBlur={handleBlur}
			onKeyDown={handleKeyDown}
			onChange={handleChange}
			aria-label={ariaLabel}
			aria-live="polite"
			aria-atomic="true"
			maxLength={3}
		/>
	);
};

export { SemanticPageIndicator };
export type { SemanticPageIndicatorProps };
