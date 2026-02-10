import type React from "react";
import { t } from "../i18n";
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
 * Button: previous page. Same behavior in LTR and RTL.
 * Visual mirroring is handled by CSS (dir="rtl" + icon flip).
 */
const PrevButton: React.FC<PrevButtonProps> = ({ children, className }) => {
	const { flipBookRef, isFirstPage, locale } = useToolbar();

	const handleClick = () => {
		flipBookRef.current?.flipPrev();
	};

	const ariaLabel = t("command.jumpToPrevPage", locale);
	const defaultIcon = <ChevronLeftIcon size={20} />;

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={ariaLabel}
			title={ariaLabel}
			disabled={isFirstPage}
			className={`flipbook-toolbar-prev ${className ?? ""}`.trim()}
		>
			{children ?? defaultIcon}
		</ToolbarButton>
	);
};

export { PrevButton };
export type { PrevButtonProps };
