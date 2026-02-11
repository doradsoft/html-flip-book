import { downloadCommand } from "./download-command";
import { flipNextCommand } from "./flip-next-command";
import { flipPrevCommand } from "./flip-prev-command";
import { goToFirstCommand } from "./go-to-first-command";
import { goToLastCommand } from "./go-to-last-command";
import { goToTocCommand } from "./go-to-toc-command";
import { toggleDebugCommand } from "./toggle-debug-command";
import { toggleFullscreenCommand } from "./toggle-fullscreen-command";
import type { CommandDefinition } from "./types";

/**
 * Built-in commands (definitions). Hotkeys are 1:1 with each command (see command.hotkeys).
 */
export const defaultCommands: CommandDefinition[] = [
	flipNextCommand,
	flipPrevCommand,
	goToFirstCommand,
	goToLastCommand,
	goToTocCommand,
	toggleFullscreenCommand,
	toggleDebugCommand,
	downloadCommand,
];
