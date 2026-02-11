import { getTocPageIndex } from "html-flip-book-vanilla/store";
import type React from "react";
import { useCommands } from "../commands/CommandContext";
import { t } from "../i18n";
import { TableOfContentsIcon } from "../icons";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface TocButtonProps {
	/** Custom content (icon or text). Defaults to TableOfContentsIcon */
	children?: React.ReactNode;
	/** Custom ARIA label. Defaults to localized "Table of contents" */
	ariaLabel?: string;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button to navigate to the Table of Contents page (instant jump, same as goToToc command).
 * TOC page index comes from store (populated by book config); command and UI both use the store.
 */
const TocButton: React.FC<TocButtonProps> = ({ children, ariaLabel: ariaLabelProp, className }) => {
	const { currentPage, locale } = useToolbar();
	const { executeCommand, canExecute } = useCommands();
	const ariaLabel = ariaLabelProp ?? t("command.jumpToToc", locale);

	const handleClick = () => {
		executeCommand("goToToc");
	};

	const isOnToc = currentPage === getTocPageIndex();
	const disabled = isOnToc || !canExecute("goToToc");

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={ariaLabel}
			disabled={disabled}
			className={`flipbook-toolbar-toc ${className ?? ""}`.trim()}
		>
			{children ?? <TableOfContentsIcon size={18} />}
		</ToolbarButton>
	);
};

export { TocButton };
export type { TocButtonProps };
