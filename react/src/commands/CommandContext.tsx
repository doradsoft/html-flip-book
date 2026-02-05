import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import type { FlipBookHandle } from "../FlipBook";
import { DEFAULT_HOTKEYS, defaultCommands } from "./defaultCommands";
import type {
	Command,
	CommandContext as CommandCtx,
	CommandOptions,
	CommandRegistry,
	HotkeyBinding,
} from "./types";

interface CommandProviderProps {
	/** Reference to the FlipBook instance */
	flipBookRef: React.RefObject<FlipBookHandle | null>;
	/** Current page index */
	currentPage: number;
	/** Total number of pages */
	totalPages: number;
	/** Reading direction */
	direction?: "rtl" | "ltr";
	/** Custom commands to register (merged with defaults) */
	commands?: Command[];
	/** Options for specific commands */
	commandOptions?: Record<string, CommandOptions>;
	/** Disable all hotkey bindings */
	disableHotkeys?: boolean;
	children: React.ReactNode;
}

interface CommandsContextValue {
	/** Execute a command by ID */
	executeCommand: (commandId: string) => void;
	/** Check if a command can be executed */
	canExecute: (commandId: string) => boolean;
	/** Get a command by ID */
	getCommand: (commandId: string) => Command | undefined;
	/** Get all registered commands */
	getAllCommands: () => Command[];
}

const CommandsContext = createContext<CommandsContextValue | null>(null);

/**
 * Check if a hotkey binding matches a keyboard event.
 */
function hotkeyMatches(binding: HotkeyBinding, event: KeyboardEvent): boolean {
	if (event.key !== binding.key) return false;

	const modifiers = binding.modifiers ?? {};
	if (!!modifiers.ctrl !== event.ctrlKey) return false;
	if (!!modifiers.shift !== event.shiftKey) return false;
	if (!!modifiers.alt !== event.altKey) return false;
	if (!!modifiers.meta !== event.metaKey) return false;

	return true;
}

/**
 * Provider component that manages flipbook commands and hotkeys.
 */
export const CommandProvider: React.FC<CommandProviderProps> = ({
	flipBookRef,
	currentPage,
	totalPages,
	direction = "ltr",
	commands: customCommands = [],
	commandOptions = {},
	disableHotkeys = false,
	children,
}) => {
	// Build the command registry
	const registry = useMemo<CommandRegistry>(() => {
		const reg: CommandRegistry = {};

		// Register default commands
		for (const cmd of defaultCommands) {
			reg[cmd.id] = {
				command: cmd,
				options: commandOptions[cmd.id] ?? {},
			};
		}

		// Register/override with custom commands
		for (const cmd of customCommands) {
			reg[cmd.id] = {
				command: cmd,
				options: commandOptions[cmd.id] ?? {},
			};
		}

		return reg;
	}, [customCommands, commandOptions]);

	// Create command context for execution
	const createCommandContext = useCallback(
		(commandId: string): CommandCtx => {
			const options = registry[commandId]?.options ?? {};
			return {
				flipBookRef,
				currentPage,
				totalPages,
				direction,
				data: options.data,
			};
		},
		[flipBookRef, currentPage, totalPages, direction, registry],
	);

	// Execute a command
	const executeCommand = useCallback(
		(commandId: string) => {
			const entry = registry[commandId];
			if (!entry) {
				console.warn(`Command "${commandId}" not found`);
				return;
			}

			const ctx = createCommandContext(commandId);
			if (entry.command.canExecute && !entry.command.canExecute(ctx)) {
				return;
			}

			entry.command.execute(ctx);
		},
		[registry, createCommandContext],
	);

	// Check if command can execute
	const canExecute = useCallback(
		(commandId: string): boolean => {
			const entry = registry[commandId];
			if (!entry) return false;

			const ctx = createCommandContext(commandId);
			if (!entry.command.canExecute) return true;
			return entry.command.canExecute(ctx);
		},
		[registry, createCommandContext],
	);

	// Get a command
	const getCommand = useCallback(
		(commandId: string): Command | undefined => registry[commandId]?.command,
		[registry],
	);

	// Get all commands
	const getAllCommands = useCallback(
		(): Command[] => Object.values(registry).map((e) => e.command),
		[registry],
	);

	// Keyboard event handler
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			// Ignore when typing in inputs
			const target = event.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
				return;
			}

			// Check each command's hotkeys
			for (const [commandId, entry] of Object.entries(registry)) {
				if (entry.options.disableHotkeys) continue;

				const hotkeys = entry.options.hotkeys ?? DEFAULT_HOTKEYS[commandId] ?? [];
				for (const binding of hotkeys) {
					if (hotkeyMatches(binding, event)) {
						event.preventDefault();
						executeCommand(commandId);
						return;
					}
				}
			}
		},
		[registry, executeCommand],
	);

	// Register keyboard listener
	useEffect(() => {
		if (disableHotkeys) return;

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [disableHotkeys, handleKeyDown]);

	const value = useMemo<CommandsContextValue>(
		() => ({
			executeCommand,
			canExecute,
			getCommand,
			getAllCommands,
		}),
		[executeCommand, canExecute, getCommand, getAllCommands],
	);

	return <CommandsContext.Provider value={value}>{children}</CommandsContext.Provider>;
};

/**
 * Hook to access the commands system.
 */
export const useCommands = (): CommandsContextValue => {
	const ctx = useContext(CommandsContext);
	if (!ctx) {
		throw new Error("useCommands must be used within a CommandProvider");
	}
	return ctx;
};
