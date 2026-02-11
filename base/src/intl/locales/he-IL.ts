/**
 * he-IL locale: RTL, Hebrew translations.
 */
import type { LocaleConfig } from "../types";

const heIL: LocaleConfig = {
	align: "right",
	direction: "rtl",
	translations: {
		"toolbarItem.download": "הורדה",
		"toolbarItem.downloadPageRange": "הורד טווח עמודים…",
		"toolbarItem.download.from": "מ",
		"toolbarItem.download.to": "עד",
		"toolbarItem.download.download": "הורד",
		"command.downloadEntireBook": "הורד את כל הספר",
		"command.jumpToToc": "תוכן העניינים",
		"command.jumpToFirstPage": "עמוד ראשון",
		"command.jumpToLastPage": "עמוד אחרון",
		"command.jumpToPrevPage": "עמוד קודם",
		"command.jumpToNextPage": "עמוד הבא",
		"command.toggleFullscreen": "מסך מלא",
		"command.toggleFullscreenDesc": "כניסה או יציאה ממסך מלא",
		"command.toggleDebug": "סרגל כלים לדיבוג",
		"command.toggleDebugDesc": "הצג או הסתר סרגל הדיבוג (Ctrl+Alt+D)",
		"toolbarItem.goToPage": "מעבר לעמוד",
	},
};

export default heIL;
