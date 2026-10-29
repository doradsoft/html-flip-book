import { describe, expect, it } from "vitest";
import { defaultLocale, directionFromLocale, getConfig, isRtl, t } from "../intl";

const KEY = "toolbarItem.download";

describe("intl", () => {
	it("returns the catalog translation for each locale", () => {
		expect(t(KEY, "en-US")).toBe("Download");
		expect(t(KEY, "he-IL")).toBe("הורדה");
	});

	it("falls back to the key for unknown keys", () => {
		expect(t("toolbarItem.nope", "he-IL")).toBe("toolbarItem.nope");
		expect(t("toolbarItem.nope", "en-US")).toBe("toolbarItem.nope");
	});

	it("supplies the original English string when a caller empties the en-US entry", () => {
		const enTranslations = getConfig("en-US").translations;
		try {
			enTranslations["toolbarItem.download"] = "";
			expect(t(KEY, "en-US")).toBe("Download");
			// he-IL still hits its own catalog first
			expect(t(KEY, "he-IL")).toBe("הורדה");
		} finally {
			enTranslations["toolbarItem.download"] = "Download";
		}
	});

	it("supplies the original English string when a caller deletes the en-US entry", () => {
		const enTranslations = getConfig("en-US").translations;
		try {
			delete enTranslations["toolbarItem.download"];
			expect(t(KEY, "en-US")).toBe("Download");
		} finally {
			enTranslations["toolbarItem.download"] = "Download";
		}
	});

	it("keeps fallback working when a caller replaces the translations record", () => {
		const cfg = getConfig("en-US");
		const orig = cfg.translations;
		try {
			cfg.translations = {};
			expect(t(KEY, "en-US")).toBe("Download");
		} finally {
			cfg.translations = orig;
		}
	});

	it("reports direction and rtl metadata per locale", () => {
		expect(isRtl("he-IL")).toBe(true);
		expect(isRtl("en-US")).toBe(false);
		expect(directionFromLocale("he-IL")).toBe("rtl");
		expect(directionFromLocale("en-US")).toBe("ltr");
	});

	it("falls back to the default config for an unsupported locale", () => {
		expect(getConfig("fr-FR" as never).direction).toBe(getConfig(defaultLocale).direction);
		expect(t(KEY, "fr-FR" as never)).toBe("Download");
	});
});
