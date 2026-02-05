import type React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";
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

	// In RTL, the visual "previous" is actually next in reading order
	const label = direction === "rtl" ? "Next page" : "Previous page";

	// In RTL, "previous" (lower page index) is toward the right, so use right-pointing icon
	const defaultIcon =
		direction === "rtl" ? <ChevronRightIcon size={20} /> : <ChevronLeftIcon size={20} />;

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
