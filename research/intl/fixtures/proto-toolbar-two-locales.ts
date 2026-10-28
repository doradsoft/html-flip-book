/** Paraglide fixture: toolbar label set, both locales (two-toolbars gate). */
import {
	"toolbarItem.download" as dl,
	"command.jumpToNextPage" as next,
	"command.jumpToPrevPage" as prev,
} from "../paraglide-proto/paraglide/messages/_index.js";

export const en = [
	dl({}, { locale: "en-US" }),
	next({}, { locale: "en-US" }),
	prev({}, { locale: "en-US" }),
];
export const he = [
	dl({}, { locale: "he-IL" }),
	next({}, { locale: "he-IL" }),
	prev({}, { locale: "he-IL" }),
];
