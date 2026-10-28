/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Toolbaritem_Selectionletters2Inputs */



/**
* | output |
* | --- |
* | "Aa" |
*
* @param {Toolbaritem_Selectionletters2Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const toolbaritem_selectionletters2 = /** @type {((inputs?: Toolbaritem_Selectionletters2Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Toolbaritem_Selectionletters2Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("אב")
	return /** @type {LocalizedString} */ ("Aa")
});
export { toolbaritem_selectionletters2 as "toolbarItem.selectionLetters" }
