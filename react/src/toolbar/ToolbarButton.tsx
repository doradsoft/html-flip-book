import type React from "react";

interface ToolbarButtonProps {
	/** Click handler */
	onClick: () => void;
	/** Accessible label for the button */
	ariaLabel: string;
	/** Whether the button is disabled */
	disabled?: boolean;
	/** Button content (icon or text) */
	children: React.ReactNode;
	/** Additional CSS class name */
	className?: string;
	/** Title tooltip */
	title?: string;
}

/**
 * Base button component for toolbar actions.
 */
const ToolbarButton: React.FC<ToolbarButtonProps> = ({
	onClick,
	ariaLabel,
	disabled = false,
	children,
	className = "",
	title,
}) => {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={ariaLabel}
			disabled={disabled}
			title={title ?? ariaLabel}
			className={`flipbook-toolbar-button ${className}`.trim()}
		>
			{children}
		</button>
	);
};

export { ToolbarButton };
export type { ToolbarButtonProps };
