/**
 * Flipbook command system - allows registering commands with hotkeys
 * and executing them from toolbar items or keyboard shortcuts.
 */

export { CommandProvider, useCommands } from "./CommandContext";
export { DEFAULT_HOTKEYS, defaultCommands } from "./defaultCommands";
export type { Command, CommandOptions, CommandRegistry, HotkeyBinding } from "./types";
