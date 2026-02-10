/**
 * Intl at base level: locale config (align + translations) and helpers.
 * One file per locale: en-US (default), he-IL.
 */
import enUS from "./locales/en-US";
import heIL from "./locales/he-IL";
import type { Locale, LocaleConfig } from "./types";

export type { Locale, LocaleConfig } from "./types";

const configs: Record<Locale, LocaleConfig> = {
	"en-US": enUS,
	"he-IL": heIL,
};

/** Default locale. Used to derive default direction (LTR). */
export const defaultLocale: Locale = "en-US";

/** Fallback when a key is missing (use en-US or key). */
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
	"toolbarItem.goToPage": "Go to page",
};

export function getConfig(locale: Locale): LocaleConfig {
	return configs[locale] ?? configs[defaultLocale];
}

/** Whether the locale is RTL (e.g. he-IL). */
export function isRtl(locale: Locale): boolean {
	return getConfig(locale).direction === "rtl";
}

/** Resolve direction from locale. Default from intl. */
export function directionFromLocale(locale: Locale): "ltr" | "rtl" {
	return isRtl(locale) ? "rtl" : "ltr";
}

/**
 * Translate key for locale. Returns config translation or fallback to en-US, then key.
 */
export function t(key: string, locale: Locale): string {
	const cfg = getConfig(locale);
	const value = cfg.translations[key];
	if (value !== undefined && value !== "") return value;
	const en = configs[defaultLocale].translations[key];
	if (en !== undefined && en !== "") return en;
	return enFallbacks[key] ?? key;
}
