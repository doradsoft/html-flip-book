import { goToLastCommand } from "html-flip-book-vanilla/commands";
import type React from "react";
import { useCommands } from "../commands/CommandContext";
import { t } from "../i18n";
import { ChevronLastIcon } from "../icons";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface LastPageButtonProps {
	/** Custom content (icon or text). Defaults to ChevronLastIcon */
	children?: React.ReactNode;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button to navigate to the last page. Same behavior in LTR and RTL.
 * Visual mirroring is handled by CSS (dir="rtl" + icon flip).
 */
const LastPageButton: React.FC<LastPageButtonProps> = ({ children, className }) => {
	const { locale } = useToolbar();
	const { execute, canExecute } = useCommands();

	const handleClick = () => {
		execute(goToLastCommand);
	};

	const defaultIcon = <ChevronLastIcon size={18} />;
	const ariaLabel = t("command.jumpToLastPage", locale);

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={ariaLabel}
			title={ariaLabel}
			disabled={!canExecute(goToLastCommand)}
			className={`flipbook-toolbar-last ${className ?? ""}`.trim()}
		>
			{children ?? defaultIcon}
		</ToolbarButton>
	);
};

export { LastPageButton };
export type { LastPageButtonProps };
