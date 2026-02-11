/**
 * en-US locale: LTR, with actual English translation values.
 */
import type { LocaleConfig } from "../types";

const enUS: LocaleConfig = {
	align: "left",
	direction: "ltr",
	translations: {
		"toolbarItem.download": "Download",
		"toolbarItem.downloadPageRange": "Download page range…",
		"toolbarItem.download.from": "From",
		"toolbarItem.download.to": "To",
		"toolbarItem.download.download": "Download",
		"command.downloadEntireBook": "Download entire book",
		"command.jumpToToc": "Table of contents",
		"command.jumpToFirstPage": "First page",
		"command.jumpToLastPage": "Last page",
		"command.jumpToPrevPage": "Previous page",
		"command.jumpToNextPage": "Next page",
		"command.toggleFullscreen": "Toggle fullscreen",
		"command.toggleFullscreenDesc": "Enter or exit fullscreen mode",
		"command.toggleDebug": "Toggle debug toolbar",
		"command.toggleDebugDesc": "Show or hide the debug toolbar (Ctrl+Alt+D)",
		"toolbarItem.goToPage": "Go to page",
	},
};

export default enUS;
