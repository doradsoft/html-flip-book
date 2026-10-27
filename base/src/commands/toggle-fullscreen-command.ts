import {
	canUseFullscreen,
	exitFullscreen,
	getFullscreenElement,
	requestFullscreen,
} from "./fullscreen-utils";
import type { HotkeyBinding, ToggleCommandDefinition } from "./types";

const hotkeys: HotkeyBinding[] = [{ key: "F11" }];

/** Enter or exit fullscreen. Reports state so toolbar toggles and hold hotkeys stay in sync. */
export const toggleFullscreenCommand: ToggleCommandDefinition = {
	id: "toggleFullscreen",
	kind: "toggle",
	enName: "Toggle Fullscreen",
	enDescription: "Enter or exit fullscreen mode",
	nameKey: "command.toggleFullscreen",
	descriptionKey: "command.toggleFullscreenDesc",
	hotkeys,
	canExecute: (ctx) => canUseFullscreen(ctx.data?.getFullscreenTarget?.()),
	isActive: () => getFullscreenElement() !== null,
	setActive: (ctx, active) => {
		const element = getFullscreenElement();
		if (active) {
			if (element) return undefined;
			const target = ctx.data?.getFullscreenTarget?.() ?? document.documentElement;
			if (!canUseFullscreen(target)) return false;
			requestFullscreen(target).catch(console.warn);
			return undefined;
		}
		if (!element) return undefined;
		exitFullscreen().catch(console.warn);
		return undefined;
	},
	execute: (ctx) => toggleFullscreenCommand.setActive(ctx, !toggleFullscreenCommand.isActive(ctx)),
};
