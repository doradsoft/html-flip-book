/**
 * Minimal i18n for toolbar and UI strings. Usable from vanilla or React.
 * Locale format: "en" | "he-IL" (RTL when he-IL).
 */

export type Locale = "en" | "he-IL";

const messages: Record<Locale, Record<string, string>> = {
	en: {
		"toolbar.download": "Download",
		"toolbar.downloadEntireBook": "Download entire book",
		"toolbar.downloadPageRange": "Download page range…",
		"toolbar.toc": "Table of contents",
		"toolbar.firstPage": "First page",
		"toolbar.lastPage": "Last page",
		"toolbar.prevPage": "Previous page",
		"toolbar.nextPage": "Next page",
		"toolbar.goToPage": "Go to page",
		"download.from": "From",
		"download.to": "To",
		"download.download": "Download",
	},
	"he-IL": {
		"toolbar.download": "הורדה",
		"toolbar.downloadEntireBook": "הורד את כל הספר",
		"toolbar.downloadPageRange": "הורד טווח עמודים…",
		"toolbar.toc": "תוכן העניינים",
		"toolbar.firstPage": "עמוד ראשון",
		"toolbar.lastPage": "עמוד אחרון",
		"toolbar.prevPage": "עמוד קודם",
		"toolbar.nextPage": "עמוד הבא",
		"toolbar.goToPage": "מעבר לעמוד",
		"download.from": "מ",
		"download.to": "עד",
		"download.download": "הורד",
	},
};

export function t(key: string, locale: Locale = "en"): string {
	return messages[locale]?.[key] ?? messages.en[key] ?? key;
}

export function isRtl(locale: Locale): boolean {
	return locale === "he-IL";
}
