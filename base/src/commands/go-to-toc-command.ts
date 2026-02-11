import { getTocPageIndex } from "../store";
import type { HotkeyBinding, JumpNavCommand } from "./types";

const hotkeys: HotkeyBinding[] = [{ key: "t" }];

export const goToTocCommand: JumpNavCommand = {
	id: "goToToc",
	navKind: "jump",
	enName: "Table of Contents",
	enDescription: "Jump to the table of contents",
	nameKey: "command.jumpToToc",
	hotkeys,
	execute: (ctx) => {
		ctx.handle?.jumpToPage(getTocPageIndex());
		return undefined;
	},
	canExecute: (ctx) => ctx.handle?.getCurrentPageIndex() !== getTocPageIndex(),
};
