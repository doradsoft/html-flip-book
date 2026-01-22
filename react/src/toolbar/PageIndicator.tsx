import type React from "react";
import { useToolbar } from "./ToolbarContext";

interface PageIndicatorProps {
	/** Format string with {current} and {total} placeholders. Defaults to "{current} / {total}" */
	format?: string;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Displays the current page position (e.g., "3 / 10").
 */
const PageIndicator: React.FC<PageIndicatorProps> = ({
	format = "{current} / {total}",
	className,
}) => {
	const { currentPage, totalPages } = useToolbar();

	// Display 1-based page numbers for users
	const displayPage = currentPage + 1;

	const text = format
		.replace("{current}", displayPage.toString())
		.replace("{total}", totalPages.toString());

	return (
		<span
			className={`flipbook-toolbar-indicator ${className ?? ""}`.trim()}
			aria-live="polite"
			aria-atomic="true"
		>
			{text}
		</span>
	);
};

export { PageIndicator };
export type { PageIndicatorProps };
