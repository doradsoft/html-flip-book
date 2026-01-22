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
	const { flipBookRef, isFirstPage } = useToolbar();

	const handleClick = () => {
		flipBookRef.current?.jumpToPage(0);
	};

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel="First page"
			disabled={isFirstPage}
			className={`flipbook-toolbar-first ${className ?? ""}`.trim()}
		>
			{children ?? "⏮"}
		</ToolbarButton>
	);
};

export { FirstPageButton };
export type { FirstPageButtonProps };
