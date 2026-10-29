/**
 * Locale identifier (BCP 47). Default: en-US.
 */
export type Locale = "en-US" | "he-IL";

import type enUS from "./locales/en-US";

/**
 * Finite union of catalog message keys, derived from the en-US catalog's
 * literal keys (kept narrow via `satisfies`). Validates first-party
 * catalogs at compile time; `t()` still accepts arbitrary strings and
 * falls back to the key for unknown callers.
 */
export type TranslationKey = keyof (typeof enUS)["translations"];

// Permanent check that invalid literals are rejected by the typed path
// (tsc fails here if TranslationKey ever widens to plain string).
// @ts-expect-error — "command.bogus" is not a catalog key
const _rejectsInvalidKey: TranslationKey = "command.bogus";
void _rejectsInvalidKey;

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
