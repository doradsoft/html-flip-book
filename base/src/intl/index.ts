/**
 * Intl at base level: locale config (align + translations) and helpers.
 * One file per locale: en-US (default), he-IL.
 */
import enUS from "./locales/en-US";
import heIL from "./locales/he-IL";
import type { Locale, LocaleConfig } from "./types";

export type { Locale, LocaleConfig, TranslationKey } from "./types";

const configs: Record<Locale, LocaleConfig> = {
	"en-US": enUS,
	"he-IL": heIL,
};

/** Default locale. Used to derive default direction (LTR). */
export const defaultLocale: Locale = "en-US";

// Snapshot of the en-US catalog taken at module init. `getConfig()` returns
// the live mutable config, so a caller can empty or delete an English entry —
// this copy still supplies the original string, matching the old literal table.
const enFallbacks: Record<string, string> = Object.fromEntries(
	Object.entries(enUS.translations).filter(([, v]) => v !== ""),
);

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
