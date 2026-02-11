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
	executeCommand: (commandId: string, runData?: Record<string, unknown>) => void;
	canExecute: (commandId: string) => boolean;
	getCommand: (commandId: string) => CommandDefinition | undefined;
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
		(commandId: string, runData?: Record<string, unknown>): CommandCtx => {
			const options = registry[commandId]?.options ?? {};
			const data = runData ? { ...options.data, ...runData } : options.data;
			return {
				handle: flipBookRef.current,
				data,
			};
		},
		[flipBookRef, registry],
	);

	const executeCommand = useCallback(
		(commandId: string, runData?: Record<string, unknown>) => {
			const entry = registry[commandId];
			if (!entry) {
				console.warn(`Command "${commandId}" not found`);
				return;
			}

			const ctx = createCommandContext(commandId, runData);
			if (entry.command.canExecute && !entry.command.canExecute(ctx)) {
				return;
			}

			entry.command.execute(ctx);
		},
		[registry, createCommandContext],
	);

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

	const getCommand = useCallback(
		(commandId: string): CommandDefinition | undefined => registry[commandId]?.command,
		[registry],
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

			for (const [commandId, entry] of Object.entries(registry)) {
				if (entry.options.disableHotkeys) continue;

				const hotkeys = entry.options.hotkeys ?? entry.command.hotkeys ?? [];
				for (const binding of hotkeys) {
					if (hotkeyMatches(binding, event, direction)) {
						event.preventDefault();
						executeCommand(commandId);
						return;
					}
				}
			}
		},
		[registry, executeCommand, direction],
	);

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

export const useCommands = (): CommandsContextValue => {
	const ctx = useContext(CommandsContext);
	if (!ctx) {
		throw new Error("useCommands must be used within a CommandProvider");
	}
	return ctx;
};
