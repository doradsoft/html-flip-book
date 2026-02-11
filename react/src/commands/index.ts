/**
 * React-specific: provider and hook. Commands, hotkeys, and types come from base.
 */

export type {
	Command,
	CommandContext,
	CommandData,
	CommandDefinition,
	CommandOptions,
	CommandRegistry,
	FlipBookHandleLike,
	FlipNavCommand,
	HotkeyBinding,
	JumpNavCommand,
	NavCommand,
} from "html-flip-book-vanilla/commands";
export { defaultCommands } from "html-flip-book-vanilla/commands";
export { CommandProvider, useCommands } from "./CommandContext";
