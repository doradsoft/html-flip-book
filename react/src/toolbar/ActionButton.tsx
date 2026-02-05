import type React from "react";
import { ToolbarButton } from "./ToolbarButton";

interface ActionButtonProps {
	/** Click handler for custom action */
	onClick: () => void;
	/** ARIA label for accessibility */
	ariaLabel: string;
	/** Custom content (icon or text) */
	children: React.ReactNode;
	/** Whether the button is disabled */
	disabled?: boolean;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Generic toolbar button for custom actions.
 * Use this for actions that aren't standard flipbook navigation.
 */
const ActionButton: React.FC<ActionButtonProps> = ({
	onClick,
	ariaLabel,
	children,
	disabled = false,
	className,
}) => {
	return (
		<ToolbarButton
			onClick={onClick}
			ariaLabel={ariaLabel}
			disabled={disabled}
			className={`flipbook-toolbar-action ${className ?? ""}`.trim()}
		>
			{children}
		</ToolbarButton>
	);
};

export { ActionButton };
export type { ActionButtonProps };
