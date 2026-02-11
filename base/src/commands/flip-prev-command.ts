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
		ctx.handle?.flipPrev();
		return undefined;
	},
	canExecute: (ctx) => (ctx.handle?.getCurrentPageIndex() ?? 0) > 0,
};
