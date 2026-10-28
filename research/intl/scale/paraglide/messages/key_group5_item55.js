/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Key_Group5_Item55Inputs */



/**
* | output |
* | --- |
* | "Value alpha 55 in en-US language text" |
*
* @param {Key_Group5_Item55Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }} options
* @returns {LocalizedString}
*/
const key_group5_item55 = /** @type {((inputs?: Key_Group5_Item55Inputs, options?: { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Group5_Item55Inputs, { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("Value alpha 55 in he-IL language text")
	if (locale === "fr-FR") return /** @type {LocalizedString} */ ("Value alpha 55 in fr-FR language text")
	if (locale === "de-DE") return /** @type {LocalizedString} */ ("Value alpha 55 in de-DE language text")
	if (locale === "ar-SA") return /** @type {LocalizedString} */ ("Value alpha 55 in ar-SA language text")
	return /** @type {LocalizedString} */ ("Value alpha 55 in en-US language text")
});
export { key_group5_item55 as "key.group5.item55" }
