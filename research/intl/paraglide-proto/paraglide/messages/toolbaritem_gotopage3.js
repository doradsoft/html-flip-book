/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Toolbaritem_Gotopage3Inputs */



/**
* | output |
* | --- |
* | "Go to page" |
*
* @param {Toolbaritem_Gotopage3Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const toolbaritem_gotopage3 = /** @type {((inputs?: Toolbaritem_Gotopage3Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Toolbaritem_Gotopage3Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("מעבר לעמוד")
	return /** @type {LocalizedString} */ ("Go to page")
});
export { toolbaritem_gotopage3 as "toolbarItem.goToPage" }
