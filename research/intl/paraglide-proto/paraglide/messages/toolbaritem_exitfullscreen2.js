/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Toolbaritem_Exitfullscreen2Inputs */



/**
* | output |
* | --- |
* | "Exit fullscreen" |
*
* @param {Toolbaritem_Exitfullscreen2Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const toolbaritem_exitfullscreen2 = /** @type {((inputs?: Toolbaritem_Exitfullscreen2Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Toolbaritem_Exitfullscreen2Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("יציאה ממסך מלא")
	return /** @type {LocalizedString} */ ("Exit fullscreen")
});
export { toolbaritem_exitfullscreen2 as "toolbarItem.exitFullscreen" }
