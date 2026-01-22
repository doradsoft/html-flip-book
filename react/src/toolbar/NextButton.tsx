import type React from "react";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface NextButtonProps {
	/** Custom content (icon or text). Defaults to "›" */
	children?: React.ReactNode;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button to navigate to the next page.
 */
const NextButton: React.FC<NextButtonProps> = ({ children, className }) => {
	const { flipBookRef, isLastPage, direction } = useToolbar();

	const handleClick = () => {
		flipBookRef.current?.flipNext();
	};

	// In RTL, the visual "next" is actually previous in reading order
	const label = direction === "rtl" ? "Previous page" : "Next page";

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={label}
			disabled={isLastPage}
			className={`flipbook-toolbar-next ${className ?? ""}`.trim()}
		>
			{children ?? "›"}
		</ToolbarButton>
	);
};

export { NextButton };
export type { NextButtonProps };
