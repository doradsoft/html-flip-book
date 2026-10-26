import {
	type CommandContext as CommandCtx,
	type CommandDefinition,
	type CommandOptions,
	type CommandRegistry,
	defaultCommands,
	HoldHotkeyController,
	type HotkeyBinding,
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

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return Boolean(
		target.isContentEditable ||
			target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'),
	);
}

function getHotkeys(entry: CommandRegistry[string]): HotkeyBinding[] {
	if (entry.options.disableHotkeys) return [];
	return entry.options.hotkeys ?? entry.command.hotkeys ?? [];
}

function canUseHotkey(
	command: CommandDefinition,
	binding: HotkeyBinding,
	getContext: (command: CommandDefinition) => CommandCtx,
): boolean {
	if (binding.mode !== "hold") return true;
	if (command.kind !== "toggle") return false;
	return !command.canExecute || command.canExecute(getContext(command));
}

function findHotkey(
	registry: CommandRegistry,
	event: KeyboardEvent,
	direction: "ltr" | "rtl",
	getContext: (command: CommandDefinition) => CommandCtx,
) {
	for (const entry of Object.values(registry)) {
		const binding = getHotkeys(entry).find(
			(binding) =>
				hotkeyMatches(binding, event, direction) &&
				canUseHotkey(entry.command, binding, getContext),
		);
		if (binding) return { command: entry.command, binding };
	}
	return undefined;
}

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
		const handleHoldKeyDown = (
			command: CommandDefinition,
			binding: HotkeyBinding,
			event: KeyboardEvent,
		): void => {
			if (command.kind !== "toggle") return;
			const ctx = latest.current.createCommandContext(command);
			if (!event.repeat && holds.press(command, binding, ctx)) refresh();
			// Keep modifier-only browser shortcuts (such as Ctrl+C) usable.
			if (!["Control", "Shift", "Alt", "Meta"].includes(binding.key)) event.preventDefault();
		};
		const handleKeyDown = (event: KeyboardEvent): void => {
			const { registry, execute, direction, disableHotkeys, createCommandContext } = latest.current;
			if (disableHotkeys || event.defaultPrevented || isEditableTarget(event.target)) return;
			const match = findHotkey(registry, event, direction, createCommandContext);
			if (!match) return;
			if (match.binding.mode === "hold") {
				handleHoldKeyDown(match.command, match.binding, event);
			} else {
				event.preventDefault();
				execute(match.command);
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
