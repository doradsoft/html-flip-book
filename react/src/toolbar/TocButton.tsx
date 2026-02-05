import type React from "react";
import { TableOfContentsIcon } from "../icons";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface TocButtonProps {
	/** Page index where TOC is located. Defaults to 4 (after front/back covers and soft covers). */
	tocPageIndex?: number;
	/** Custom content (icon or text). Defaults to TableOfContentsIcon */
	children?: React.ReactNode;
	/** Custom ARIA label. Defaults to "Table of contents" */
	ariaLabel?: string;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button to navigate to the Table of Contents page.
 */
const TocButton: React.FC<TocButtonProps> = ({
	tocPageIndex = 4,
	children,
	ariaLabel = "Table of contents",
	className,
}) => {
	const { flipBookRef, currentPage } = useToolbar();

	const handleClick = () => {
		flipBookRef.current?.jumpToPage(tocPageIndex);
	};

	const isOnToc = currentPage === tocPageIndex;

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={ariaLabel}
			disabled={isOnToc}
			className={`flipbook-toolbar-toc ${className ?? ""}`.trim()}
		>
			{children ?? <TableOfContentsIcon size={18} />}
		</ToolbarButton>
	);
};

export { TocButton };
export type { TocButtonProps };
