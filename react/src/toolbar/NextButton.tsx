import { flipNextCommand } from "html-flip-book-vanilla/commands";
import type React from "react";
import { useCommands } from "../commands/CommandContext";
import { t } from "../i18n";
import { ChevronRightIcon } from "../icons";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface NextButtonProps {
	/** Custom content (icon or text). Defaults to ChevronRightIcon */
	children?: React.ReactNode;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button: next page. Same behavior in LTR and RTL.
 * Visual mirroring is handled by CSS (dir="rtl" + icon flip).
 */
const NextButton: React.FC<NextButtonProps> = ({ children, className }) => {
	const { locale } = useToolbar();
	const { execute, canExecute } = useCommands();

	const handleClick = () => {
		execute(flipNextCommand);
	};

	const ariaLabel = t("command.jumpToNextPage", locale);
	const defaultIcon = <ChevronRightIcon size={20} />;

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={ariaLabel}
			title={ariaLabel}
			disabled={!canExecute(flipNextCommand)}
			className={`flipbook-toolbar-next ${className ?? ""}`.trim()}
		>
			{children ?? defaultIcon}
		</ToolbarButton>
	);
};

export { NextButton };
export type { NextButtonProps };
