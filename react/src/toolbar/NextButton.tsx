import type React from "react";
import { ChevronRightIcon } from "../icons";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface NextButtonProps {
	/** Custom content (icon or text). Defaults to ChevronRightIcon */
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

	// In RTL, the action goes to next spread (left in book); label reflects action
	const label = direction === "rtl" ? "Previous page" : "Next page";

	// Same arrow direction as LTR: right chevron. RTL layout reversal gives opposite action.
	const defaultIcon = <ChevronRightIcon size={20} />;

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={label}
			disabled={isLastPage}
			className={`flipbook-toolbar-next ${className ?? ""}`.trim()}
		>
			{children ?? defaultIcon}
		</ToolbarButton>
	);
};

export { NextButton };
export type { NextButtonProps };
