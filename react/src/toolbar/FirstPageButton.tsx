import type React from "react";
import { t } from "../i18n";
import { ChevronFirstIcon } from "../icons";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface FirstPageButtonProps {
	/** Custom content (icon or text). Defaults to ChevronFirstIcon */
	children?: React.ReactNode;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button to navigate to the first page. Same behavior in LTR and RTL.
 * Visual mirroring is handled by CSS (dir="rtl" + icon flip).
 */
const FirstPageButton: React.FC<FirstPageButtonProps> = ({ children, className }) => {
	const { flipBookRef, isFirstPage, locale } = useToolbar();

	const handleClick = () => {
		flipBookRef.current?.commands.jumpToPage(0);
	};

	const defaultIcon = <ChevronFirstIcon size={18} />;
	const ariaLabel = t("command.jumpToFirstPage", locale);

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={ariaLabel}
			title={ariaLabel}
			disabled={isFirstPage}
			className={`flipbook-toolbar-first ${className ?? ""}`.trim()}
		>
			{children ?? defaultIcon}
		</ToolbarButton>
	);
};

export { FirstPageButton };
export type { FirstPageButtonProps };
