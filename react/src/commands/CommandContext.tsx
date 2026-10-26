import {
	type CommandContext as CommandCtx,
	type CommandDefinition,
	type CommandOptions,
	type CommandRegistry,
	defaultCommands,
	HoldHotkeyController,
	hotkeyMatches,
	type ToggleCommandDefinition,
} from "html-flip-book-vanilla/commands";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";
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
	/** Read the current state of a toggle command for its toolbar button. */
	isActive: (command: ToggleCommandDefinition) => boolean;
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
	const holds = useRef(new HoldHotkeyController()).current;
	const [, refresh] = useReducer((value: number) => value + 1, 0);
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
			if (holds.has(command.id)) return;
			const ctx = createCommandContext(command, runData);
			if (command.canExecute && !command.canExecute(ctx)) {
				return;
			}

			command.execute(ctx);
			refresh();
		},
		[createCommandContext, holds],
	);

	const canExecute = useCallback(
		(command: CommandDefinition): boolean => {
			if (holds.has(command.id)) return false;
			const ctx = createCommandContext(command);
			if (!command.canExecute) return true;
			return command.canExecute(ctx);
		},
		[createCommandContext, holds],
	);

	const isActive = useCallback(
		(command: ToggleCommandDefinition) => command.isActive(createCommandContext(command)),
		[createCommandContext],
	);

	const getAllCommands = useCallback(
		(): CommandDefinition[] => Object.values(registry).map((e) => e.command),
		[registry],
	);

	const latest = useRef({ registry, execute, createCommandContext, direction, disableHotkeys });
	latest.current = { registry, execute, createCommandContext, direction, disableHotkeys };

	useEffect(() => {
		if (holds.reconcile(registry, disableHotkeys)) refresh();
	}, [holds, registry, disableHotkeys]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const { registry, execute, createCommandContext, direction, disableHotkeys } = latest.current;
			if (disableHotkeys || event.defaultPrevented) return;
			const target = event.target;
			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'))
			)
				return;

			for (const entry of Object.values(registry)) {
				if (entry.options.disableHotkeys) continue;

				const hotkeys = entry.options.hotkeys ?? entry.command.hotkeys ?? [];
				for (const binding of hotkeys) {
					if (hotkeyMatches(binding, event, direction)) {
						if (binding.mode === "hold") {
							if (entry.command.kind !== "toggle") continue;
							const ctx = createCommandContext(entry.command);
							if (entry.command.canExecute && !entry.command.canExecute(ctx)) continue;
							if (!event.repeat && holds.press(entry.command, binding, ctx)) refresh();
							// Keep modifier-only browser shortcuts (such as Ctrl+C) usable.
							if (!["Control", "Shift", "Alt", "Meta"].includes(binding.key))
								event.preventDefault();
						} else {
							event.preventDefault();
							execute(entry.command);
						}
						return;
					}
				}
			}
		};
		const handleKeyUp = (event: KeyboardEvent) => {
			if (holds.release(event, latest.current.direction)) refresh();
		};
		const restore = () => {
			if (holds.clear()) refresh();
		};
		const handleVisibility = () => {
			if (document.hidden) restore();
		};
		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("keyup", handleKeyUp);
		window.addEventListener("blur", restore);
		document.addEventListener("visibilitychange", handleVisibility);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("keyup", handleKeyUp);
			window.removeEventListener("blur", restore);
			document.removeEventListener("visibilitychange", handleVisibility);
			holds.clear();
		};
	}, [holds]);

	const value: CommandsContextValue = { execute, canExecute, isActive, getAllCommands };

	return <CommandsContext.Provider value={value}>{children}</CommandsContext.Provider>;
};

export const useCommands = (): CommandsContextValue => {
	const ctx = useContext(CommandsContext);
	if (!ctx) {
		throw new Error("useCommands must be used within a CommandProvider");
	}
	return ctx;
};
