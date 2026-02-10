import type React from "react";
import { t } from "../i18n";
import { TableOfContentsIcon } from "../icons";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface TocButtonProps {
	/** Page index where TOC is located. Defaults to 4 (after front/back covers and soft covers). */
	tocPageIndex?: number;
	/** Custom content (icon or text). Defaults to TableOfContentsIcon */
	children?: React.ReactNode;
	/** Custom ARIA label. Defaults to localized "Table of contents" */
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
	ariaLabel: ariaLabelProp,
	className,
}) => {
	const { flipBookRef, currentPage, locale, direction } = useToolbar();
	const ariaLabel = ariaLabelProp ?? t("command.jumpToToc", locale);
	const isLtr = direction === "ltr";

	const handleClick = () => {
		flipBookRef.current?.goToPage(tocPageIndex);
	};

	const isOnToc = currentPage === tocPageIndex;

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={ariaLabel}
			disabled={isOnToc}
			className={`flipbook-toolbar-toc ${className ?? ""}`.trim()}
		>
			{children ?? (
				<TableOfContentsIcon
					size={18}
					className={isLtr ? "flipbook-toc-icon--flip-h" : undefined}
				/>
			)}
		</ToolbarButton>
	);
};

export { TocButton };
export type { TocButtonProps };
