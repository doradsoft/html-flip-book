import type React from "react";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface FirstPageButtonProps {
	/** Custom content (icon or text). Defaults to "⏮" */
	children?: React.ReactNode;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button to navigate to the first page.
 */
const FirstPageButton: React.FC<FirstPageButtonProps> = ({ children, className }) => {
	const { flipBookRef, isFirstPage, direction } = useToolbar();

	const handleClick = () => {
		flipBookRef.current?.jumpToPage(0);
	};

	// In RTL, "first" page is on the right; use icon pointing right so it matches visual direction
	const defaultIcon = direction === "rtl" ? "⏭" : "⏮";

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel="First page"
			disabled={isFirstPage}
			className={`flipbook-toolbar-first ${className ?? ""}`.trim()}
		>
			{children ?? defaultIcon}
		</ToolbarButton>
	);
};

export { FirstPageButton };
export type { FirstPageButtonProps };
