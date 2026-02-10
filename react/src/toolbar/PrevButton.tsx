import type React from "react";
import { ChevronLeftIcon } from "../icons";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface PrevButtonProps {
	/** Custom content (icon or text). Defaults to ChevronLeftIcon */
	children?: React.ReactNode;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button to navigate to the previous page.
 */
const PrevButton: React.FC<PrevButtonProps> = ({ children, className }) => {
	const { flipBookRef, isFirstPage, direction } = useToolbar();

	const handleClick = () => {
		flipBookRef.current?.flipPrev();
	};

	// In RTL, the action goes to previous spread (right in book); label reflects action
	const label = direction === "rtl" ? "Next page" : "Previous page";

	// Same arrow direction as LTR: left chevron. RTL layout reversal gives opposite action.
	const defaultIcon = <ChevronLeftIcon size={20} />;

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={label}
			disabled={isFirstPage}
			className={`flipbook-toolbar-prev ${className ?? ""}`.trim()}
		>
			{children ?? defaultIcon}
		</ToolbarButton>
	);
};

export { PrevButton };
export type { PrevButtonProps };
