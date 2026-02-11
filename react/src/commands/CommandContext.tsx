import {
	type CommandContext as CommandCtx,
	type CommandDefinition,
	type CommandOptions,
	type CommandRegistry,
	defaultCommands,
	hotkeyMatches,
} from "html-flip-book-vanilla/commands";
import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import type { FlipBookHandle } from "../FlipBook";

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
	commands?: CommandDefinition[];
	/** Options for specific commands */
	commandOptions?: Record<string, CommandOptions>;
	/** Disable all hotkey bindings */
	disableHotkeys?: boolean;
	children: React.ReactNode;
}

interface CommandsContextValue {
	/** Execute a command (pass the command object, not a string ID). */
	execute: (command: CommandDefinition, runData?: Record<string, unknown>) => void;
	/** Check if a command can execute (for disabled state). */
	canExecute: (command: CommandDefinition) => boolean;
	/** Get all registered commands. */
	getAllCommands: () => CommandDefinition[];
}

const CommandsContext = createContext<CommandsContextValue | null>(null);

/**
 * Provider component that manages flipbook commands and hotkeys.
 * Uses framework-agnostic commands from base; only the provider and hook are React-specific.
 */
export const CommandProvider: React.FC<CommandProviderProps> = ({
	flipBookRef,
	currentPage: _currentPage,
	totalPages: _totalPages,
	direction = "ltr",
	commands: customCommands = [],
	commandOptions = {},
	disableHotkeys = false,
	children,
}) => {
	const registry = useMemo<CommandRegistry>(() => {
		const reg: CommandRegistry = {};

		for (const cmd of defaultCommands) {
			reg[cmd.id] = {
				command: cmd,
				options: commandOptions[cmd.id] ?? {},
			};
		}

		for (const cmd of customCommands) {
			reg[cmd.id] = {
				command: cmd,
				options: commandOptions[cmd.id] ?? {},
			};
		}

		return reg;
	}, [customCommands, commandOptions]);

	const createCommandContext = useCallback(
		(command: CommandDefinition, runData?: Record<string, unknown>): CommandCtx => {
			const options = registry[command.id]?.options ?? {};
			const data = runData ? { ...options.data, ...runData } : options.data;
			return {
				handle: flipBookRef.current,
				data,
			};
		},
		[flipBookRef, registry],
	);

	const execute = useCallback(
		(command: CommandDefinition, runData?: Record<string, unknown>) => {
			const ctx = createCommandContext(command, runData);
			if (command.canExecute && !command.canExecute(ctx)) {
				return;
			}

			command.execute(ctx);
		},
		[createCommandContext],
	);

	const canExecute = useCallback(
		(command: CommandDefinition): boolean => {
			const ctx = createCommandContext(command);
			if (!command.canExecute) return true;
			return command.canExecute(ctx);
		},
		[createCommandContext],
	);

	const getAllCommands = useCallback(
		(): CommandDefinition[] => Object.values(registry).map((e) => e.command),
		[registry],
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			const target = event.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
				return;
			}

			for (const entry of Object.values(registry)) {
				if (entry.options.disableHotkeys) continue;

				const hotkeys = entry.options.hotkeys ?? entry.command.hotkeys ?? [];
				for (const binding of hotkeys) {
					if (hotkeyMatches(binding, event, direction)) {
						event.preventDefault();
						execute(entry.command);
						return;
					}
				}
			}
		},
		[registry, execute, direction],
	);

	useEffect(() => {
		if (disableHotkeys) return;

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [disableHotkeys, handleKeyDown]);

	const value = useMemo<CommandsContextValue>(
		() => ({
			execute,
			canExecute,
			getAllCommands,
		}),
		[execute, canExecute, getAllCommands],
	);

	return <CommandsContext.Provider value={value}>{children}</CommandsContext.Provider>;
};

export const useCommands = (): CommandsContextValue => {
	const ctx = useContext(CommandsContext);
	if (!ctx) {
		throw new Error("useCommands must be used within a CommandProvider");
	}
	return ctx;
};
