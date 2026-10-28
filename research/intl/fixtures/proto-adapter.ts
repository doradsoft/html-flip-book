/** Paraglide fixture: full adapter API surface (mirrors baseline-full-intl). */
import {
	defaultLocale,
	directionFromLocale,
	getConfig,
	isRtl,
	t,
} from "../paraglide-proto/intl-paraglide";

const keys = [
	"toolbarItem.download",
	"toolbarItem.downloadPageRange",
	"toolbarItem.download.from",
	"toolbarItem.download.to",
	"toolbarItem.download.download",
	"toolbarItem.download.error",
	"command.downloadEntireBook",
	"command.jumpToToc",
	"command.jumpToFirstPage",
	"command.jumpToLastPage",
	"command.jumpToPrevPage",
	"command.jumpToNextPage",
	"command.toggleFullscreen",
	"command.toggleFullscreenDesc",
	"command.toggleDebug",
	"command.toggleDebugDesc",
	"toolbarItem.goToPage",
	"toolbarItem.selectText",
	"toolbarItem.selectionLetters",
	"toolbarItem.enterFullscreen",
	"toolbarItem.exitFullscreen",
	"toolbarItem.fullscreenUnsupported",
	"toolbarItem.unknown",
] as const;

export const results = {
	labels: keys.map((k) => t(k, "he-IL")),
	direction: directionFromLocale(defaultLocale),
	rtl: isRtl("he-IL"),
	config: getConfig("en-US"),
};
