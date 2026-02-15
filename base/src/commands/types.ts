/**
 * Framework-agnostic handle exposing flipbook methods.
 * Commands receive this via CommandContext to call flipbook methods internally.
 * These methods are NOT part of the public consumer API — consumers interact
 * through commands (execute) and getters (ref) only.
 */
export interface FlipBookHandleLike {
	flipNext: () => Promise<void>;
	flipPrev: () => Promise<void>;
	flipToPage: (pageIndex: number) => Promise<void>;
	jumpToPage: (pageIndex: number) => void;
	toggleDebugBar?: () => void;
	getCurrentPageIndex: () => number;
	getTotalPages: () => number;
	getOf: () => string | number;
	isFirstPage: () => boolean;
	isLastPage: () => boolean;
	/** Download configuration for the book. Undefined when no download is configured. */
	getDownloadConfig?: () => import("../download/types").DownloadConfig | undefined;
	/** Get the configured table of contents page index. */
	getTocPageIndex?: () => number;
}

/**
 * Hotkey binding configuration.
 * Hotkeys are 1:1 with a command (each command has its own hotkeys).
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
 * Custom data passed to command execution.
 * Consumers may pass additional fields (e.g. tocPageIndex for goToToc) via command options.
 */
export interface CommandData {
	/** Return the element to make fullscreen; used by toggleFullscreen. */
	getFullscreenTarget?: () => HTMLElement | null;
	/** Run download; used by the download command. Called with nothing (entire book) or from/to (page range). */
	onDownload?: (from?: number, to?: number) => void;
	[key: string]: unknown;
}

/**
 * Context passed to command execution: handle and optional command-specific data.
 * Commands read currentPage, totalPages, etc. from handle (and other stores like toc when needed).
 */
export interface CommandContext {
	handle: FlipBookHandleLike | null;
	data?: CommandData;
}

/**
 * Command definition: object with id, enName, execute, etc.
 * Used when defining commands (e.g. in default-commands).
 */
export interface CommandDefinition {
	/** Unique command identifier */
	id: string;
	/** Static English name (fallback when name from intl is not set) */
	enName: string;
	/** Static English description (fallback when description from intl is not set) */
	enDescription?: string;
	/** Human-readable name (set by UI from intl when locale is known) */
	name?: string;
	/** Description (set by UI from intl when locale is known) */
	description?: string;
	/** Intl key for name (e.g. "command.jumpToNextPage") */
	nameKey?: string;
	/** Intl key for description */
	descriptionKey?: string;
	/** Hotkey bindings for this command (1:1 with command) */
	hotkeys?: HotkeyBinding[];
	/** Execute the command. Return false to indicate the command couldn't be executed. */
	execute: (context: CommandContext) => boolean | undefined;
	/** Check if the command can be executed (for disabling UI) */
	canExecute?: (context: CommandContext) => boolean;
}

/**
 * Command: same as CommandDefinition and callable. When invoked as a function `command()` it runs execute internally.
 */
export type Command = CommandDefinition & (() => void);

/**
 * Base for navigation commands (flip or jump).
 */
export interface NavCommand extends CommandDefinition {
	navKind?: "jump" | "flip";
}

/**
 * Navigation command that jumps to a page (instant, no flip animation).
 */
export interface JumpNavCommand extends NavCommand {
	navKind: "jump";
}

/**
 * Navigation command that flips to next/previous page (animated).
 */
export interface FlipNavCommand extends NavCommand {
	navKind: "flip";
}

/**
 * Options when registering a command (overrides).
 */
export interface CommandOptions {
	/** Override this command's hotkey bindings */
	hotkeys?: HotkeyBinding[];
	/** Disable all hotkeys for this command */
	disableHotkeys?: boolean;
	/** Custom data to pass to the command */
	data?: CommandData;
}

/**
 * Registry of commands with their configurations.
 */
export interface CommandRegistry {
	[commandId: string]: {
		command: CommandDefinition;
		options: CommandOptions;
	};
}
