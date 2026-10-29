import { afterEach, describe, expect, it } from "vitest";
import { defaultLocale, directionFromLocale, getConfig, isRtl, t } from "../intl";

describe("intl", () => {
	const enTranslations = getConfig("en-US").translations;
	const saved: Record<string, string | undefined> = {};

	afterEach(() => {
		for (const [k, v] of Object.entries(saved)) {
			if (v === undefined) delete enTranslations[k];
			else enTranslations[k] = v;
		}
		for (const k of Object.keys(saved)) delete saved[k];
	});

	it("returns the catalog translation for each locale", () => {
		expect(t("toolbarItem.download", "en-US")).toBe("Download");
		expect(t("toolbarItem.download", "he-IL")).toBe("הורדה");
	});

	it("falls back to the key for unknown keys", () => {
		expect(t("toolbarItem.nope", "he-IL")).toBe("toolbarItem.nope");
		expect(t("toolbarItem.nope", "en-US")).toBe("toolbarItem.nope");
	});

	it("supplies the original English string when a caller empties the en-US entry", () => {
		saved["toolbarItem.download"] = enTranslations["toolbarItem.download"];
		enTranslations["toolbarItem.download"] = "";
		expect(t("toolbarItem.download", "en-US")).toBe("Download");
		// he-IL still hits its own catalog first
		expect(t("toolbarItem.download", "he-IL")).toBe("הורדה");
	});

	it("supplies the original English string when a caller deletes the en-US entry", () => {
		saved["toolbarItem.download"] = enTranslations["toolbarItem.download"];
		delete enTranslations["toolbarItem.download"];
		expect(t("toolbarItem.download", "en-US")).toBe("Download");
	});

	it("keeps fallback working when a caller replaces the translations record", () => {
		const cfg = getConfig("en-US");
		const orig = cfg.translations;
		cfg.translations = {};
		expect(t("toolbarItem.download", "en-US")).toBe("Download");
		cfg.translations = orig;
	});

	it("reports direction and rtl metadata per locale", () => {
		expect(isRtl("he-IL")).toBe(true);
		expect(isRtl("en-US")).toBe(false);
		expect(directionFromLocale("he-IL")).toBe("rtl");
		expect(directionFromLocale("en-US")).toBe("ltr");
	});

	it("falls back to the default config for an unsupported locale", () => {
		expect(getConfig("fr-FR" as never).direction).toBe(getConfig(defaultLocale).direction);
		expect(t("toolbarItem.download", "fr-FR" as never)).toBe("Download");
	});
});
