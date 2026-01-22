import type React from "react";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface LastPageButtonProps {
	/** Custom content (icon or text). Defaults to "⏭" */
	children?: React.ReactNode;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button to navigate to the last page.
 */
const LastPageButton: React.FC<LastPageButtonProps> = ({ children, className }) => {
	const { flipBookRef, isLastPage, totalPages } = useToolbar();

	const handleClick = () => {
		flipBookRef.current?.jumpToPage(totalPages - 1);
	};

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel="Last page"
			disabled={isLastPage}
			className={`flipbook-toolbar-last ${className ?? ""}`.trim()}
		>
			{children ?? "⏭"}
		</ToolbarButton>
	);
};

export { LastPageButton };
export type { LastPageButtonProps };
