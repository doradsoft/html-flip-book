import type React from "react";
import { type ToggleCommandDefinition, useCommands } from "../commands";
import { ToolbarButton } from "./ToolbarButton";

export interface ToggleButtonProps {
	command: ToggleCommandDefinition;
	ariaLabel: string;
	children: React.ReactNode;
	disabled?: boolean;
	className?: string;
}

/** A command-backed toggle that follows clicks and temporary hotkey overrides. */
export const ToggleButton: React.FC<ToggleButtonProps> = ({
	command,
	ariaLabel,
	children,
	disabled = false,
	className,
}) => {
	const { execute, canExecute, isActive } = useCommands();
	return (
		<ToolbarButton
			onClick={() => execute(command)}
			ariaLabel={ariaLabel}
			ariaPressed={isActive(command)}
			disabled={disabled || !canExecute(command)}
			className={className}
		>
			{children}
		</ToolbarButton>
	);
};
