import type { FlipNavCommand, HotkeyBinding } from "./types";

const hotkeys: HotkeyBinding[] = [{ key: "ArrowLeft" }, { key: "PageUp" }];

export const flipPrevCommand: FlipNavCommand = {
	id: "flipPrev",
	navKind: "flip",
	enName: "Previous Page",
	enDescription: "Flip to the previous page",
	nameKey: "command.jumpToPrevPage",
	hotkeys,
	execute: (ctx) => {
		ctx.handle?.commands.flipPrev();
		return undefined;
	},
	canExecute: (ctx) => (ctx.handle?.getters.getCurrentPageIndex() ?? 0) > 0,
};
