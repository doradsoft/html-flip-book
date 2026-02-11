import { flipPrevCommand } from "html-flip-book-vanilla/commands";
import type React from "react";
import { useCommands } from "../commands/CommandContext";
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
	const { locale } = useToolbar();
	const { execute, canExecute } = useCommands();

	const handleClick = () => {
		execute(flipPrevCommand);
	};

	const ariaLabel = t("command.jumpToPrevPage", locale);
	const defaultIcon = <ChevronLeftIcon size={20} />;

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={ariaLabel}
			title={ariaLabel}
			disabled={!canExecute(flipPrevCommand)}
			className={`flipbook-toolbar-prev ${className ?? ""}`.trim()}
		>
			{children ?? defaultIcon}
		</ToolbarButton>
	);
};

export { PrevButton };
export type { PrevButtonProps };
