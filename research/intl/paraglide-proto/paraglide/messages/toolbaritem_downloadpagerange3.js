/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Toolbaritem_Downloadpagerange3Inputs */



/**
* | output |
* | --- |
* | "Download page range…" |
*
* @param {Toolbaritem_Downloadpagerange3Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const toolbaritem_downloadpagerange3 = /** @type {((inputs?: Toolbaritem_Downloadpagerange3Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Toolbaritem_Downloadpagerange3Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("הורד טווח עמודים…")
	return /** @type {LocalizedString} */ ("Download page range…")
});
export { toolbaritem_downloadpagerange3 as "toolbarItem.downloadPageRange" }
