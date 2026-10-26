/**
 * React-specific: provider and hook. Commands, hotkeys, and types come from base.
 */

export type {
	ActionCommandDefinition,
	Command,
	CommandContext,
	CommandData,
	CommandDefinition,
	CommandOptions,
	CommandRegistry,
	FlipNavCommand,
	HotkeyBinding,
	JumpNavCommand,
	NavCommand,
	ToggleCommandDefinition,
} from "html-flip-book-vanilla/commands";
export {
	defaultCommands,
	downloadCommand,
	flipNextCommand,
	flipPrevCommand,
	goToFirstCommand,
	goToLastCommand,
	goToTocCommand,
	toggleDebugCommand,
	toggleFullscreenCommand,
	toggleTextSelectionCommand,
} from "html-flip-book-vanilla/commands";
export { CommandProvider, useCommands } from "./CommandContext";
