import type { FlipBookHandle } from "../FlipBook";

/**
 * A command that can be executed on the flipbook.
 */
export interface Command {
	/** Unique command identifier */
	id: string;
	/** Human-readable name */
	name: string;
	/** Description of what the command does */
	description?: string;
	/** Execute the command. Return false to indicate the command couldn't be executed. */
	execute: (context: CommandContext) => boolean | undefined;
	/** Check if the command can be executed (for disabling UI) */
	canExecute?: (context: CommandContext) => boolean;
}

/**
 * Context passed to command execution.
 */
export interface CommandContext {
	flipBookRef: React.RefObject<FlipBookHandle | null>;
	currentPage: number;
	totalPages: number;
	direction: "rtl" | "ltr";
	/** Custom data passed when registering commands */
	data?: Record<string, unknown>;
}

/**
 * Hotkey binding configuration.
 */
export interface HotkeyBinding {
	/** The key to listen for (e.g., "ArrowLeft", "Home", "f") */
	key: string;
	/** Modifier keys required */
	modifiers?: {
		ctrl?: boolean;
		shift?: boolean;
		alt?: boolean;
		meta?: boolean;
	};
}

/**
 * Options for registering a command.
 */
export interface CommandOptions {
	/** Override the default hotkey bindings */
	hotkeys?: HotkeyBinding[];
	/** Disable all hotkeys for this command */
	disableHotkeys?: boolean;
	/** Custom data to pass to the command */
	data?: Record<string, unknown>;
}

/**
 * Registry of commands with their configurations.
 */
export interface CommandRegistry {
	[commandId: string]: {
		command: Command;
		options: CommandOptions;
	};
}
