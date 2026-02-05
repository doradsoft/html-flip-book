import type React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";
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

	// In RTL, the visual "next" is actually previous in reading order
	const label = direction === "rtl" ? "Previous page" : "Next page";

	// In RTL, "next" (higher page index) is toward the left, so use left-pointing icon
	const defaultIcon =
		direction === "rtl" ? <ChevronLeftIcon size={20} /> : <ChevronRightIcon size={20} />;

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
