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
	canUseFullscreen,
	defaultCommands,
	downloadCommand,
	exitFullscreen,
	flipNextCommand,
	flipPrevCommand,
	fullscreenStateEvents,
	getFullscreenElement,
	goToFirstCommand,
	goToLastCommand,
	goToTocCommand,
	requestFullscreen,
	toggleDebugCommand,
	toggleFullscreenCommand,
	toggleTextSelectionCommand,
} from "html-flip-book-vanilla/commands";
export { CommandProvider, useCommands } from "./CommandContext";
