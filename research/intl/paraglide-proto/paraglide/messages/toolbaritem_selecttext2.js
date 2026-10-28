/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Toolbaritem_Selecttext2Inputs */



/**
* | output |
* | --- |
* | "Select text with mouse" |
*
* @param {Toolbaritem_Selecttext2Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const toolbaritem_selecttext2 = /** @type {((inputs?: Toolbaritem_Selecttext2Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Toolbaritem_Selecttext2Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("בחירת טקסט עם העכבר")
	return /** @type {LocalizedString} */ ("Select text with mouse")
});
export { toolbaritem_selecttext2 as "toolbarItem.selectText" }
