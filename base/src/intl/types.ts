/**
 * Locale identifier (BCP 47). Default: en-US.
 */
export type Locale = "en-US" | "he-IL";

/**
 * Per-locale config: align, direction, and translation strings.
 */
export interface LocaleConfig {
	/** Toolbar/content alignment. LTR locales typically "left", RTL "right". */
	align: "left" | "right";
	/** Text direction for UI (e.g. toolbar, TOC). Default: ltr. */
	direction: "ltr" | "rtl";
	/** Translation map. Empty string means fallback to key. */
	translations: Record<string, string>;
}
