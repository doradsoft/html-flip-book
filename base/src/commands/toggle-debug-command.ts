import type { CommandDefinition, HotkeyBinding } from "./types";

const hotkeys: HotkeyBinding[] = [{ key: "d", modifiers: { ctrl: true, alt: true } }];

export const toggleDebugCommand: CommandDefinition = {
	id: "toggleDebug",
	enName: "Toggle Debug Toolbar",
	enDescription: "Show or hide the debug toolbar (Ctrl+Alt+D)",
	nameKey: "command.toggleDebug",
	descriptionKey: "command.toggleDebugDesc",
	hotkeys,
	execute: (ctx) => {
		ctx.handle?.toggleDebugBar?.();
		return undefined;
	},
};
