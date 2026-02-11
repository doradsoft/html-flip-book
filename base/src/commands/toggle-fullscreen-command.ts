import type { CommandDefinition, HotkeyBinding } from "./types";

const hotkeys: HotkeyBinding[] = [{ key: "F11" }];

export const toggleFullscreenCommand: CommandDefinition = {
	id: "toggleFullscreen",
	enName: "Toggle Fullscreen",
	enDescription: "Enter or exit fullscreen mode",
	nameKey: "command.toggleFullscreen",
	descriptionKey: "command.toggleFullscreenDesc",
	hotkeys,
	execute: (ctx) => {
		const data = ctx.data;
		if (document.fullscreenElement) {
			document.exitFullscreen().catch(console.warn);
		} else {
			const target = data?.getFullscreenTarget?.() ?? document.documentElement;
			target.requestFullscreen().catch(console.warn);
		}
		return undefined;
	},
};
