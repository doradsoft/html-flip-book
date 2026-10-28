/**
 * Paraglide prototype adapter (#341): same public API as base/src/intl,
 * backed by compiled Paraglide messages. The dynamic t(key, locale)
 * signature forces a namespace lookup — measured separately from the
 * static-call Paraglide idiom.
 */
import * as m from "./paraglide/messages/_index.js";

export type Locale = "en-US" | "he-IL";

export interface LocaleConfig {
	align: "left" | "right";
	direction: "ltr" | "rtl";
	translations: Record<string, string>;
}

export const defaultLocale: Locale = "en-US";

const meta: Record<Locale, Pick<LocaleConfig, "align" | "direction">> = {
	"en-US": { align: "left", direction: "ltr" },
	"he-IL": { align: "right", direction: "rtl" },
};

const enFallbacks: Record<string, string> = {
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
	"toolbarItem.enterFullscreen": "Enter fullscreen",
	"toolbarItem.exitFullscreen": "Exit fullscreen",
	"toolbarItem.fullscreenUnsupported": "Fullscreen is not supported by this browser",
};

type MessageFn = (inputs?: object, options?: { locale?: Locale }) => string;
const messages = m as unknown as Record<string, MessageFn>;

export function getConfig(locale: Locale): LocaleConfig {
	const m_ = meta[locale] ?? meta[defaultLocale];
	return { ...m_, translations: {} };
}

export function isRtl(locale: Locale): boolean {
	return (meta[locale] ?? meta[defaultLocale]).direction === "rtl";
}

export function directionFromLocale(locale: Locale): "ltr" | "rtl" {
	return isRtl(locale) ? "rtl" : "ltr";
}

export function t(key: string, locale: Locale): string {
	const value = messages[key]?.({}, { locale });
	if (value !== undefined && value !== "") return value;
	const en = messages[key]?.({}, { locale: "en-US" });
	if (en !== undefined && en !== "") return en;
	return enFallbacks[key] ?? key;
}
