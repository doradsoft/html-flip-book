import arSA from "./ar-SA";
import deDE from "./de-DE";
import enUS from "./en-US";
import frFR from "./fr-FR";
import heIL from "./he-IL";

export type ScaleLocale = "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA";
const catalogs = { "en-US": enUS, "he-IL": heIL, "fr-FR": frFR, "de-DE": deDE, "ar-SA": arSA };
export function t(key: string, locale: ScaleLocale): string {
	return catalogs[locale]?.[key] ?? catalogs["en-US"][key] ?? key;
}
