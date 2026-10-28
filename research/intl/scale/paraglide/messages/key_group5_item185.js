/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Key_Group5_Item185Inputs */



/**
* | output |
* | --- |
* | "Value alpha 185 in en-US language text" |
*
* @param {Key_Group5_Item185Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }} options
* @returns {LocalizedString}
*/
const key_group5_item185 = /** @type {((inputs?: Key_Group5_Item185Inputs, options?: { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Group5_Item185Inputs, { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("Value alpha 185 in he-IL language text")
	if (locale === "fr-FR") return /** @type {LocalizedString} */ ("Value alpha 185 in fr-FR language text")
	if (locale === "de-DE") return /** @type {LocalizedString} */ ("Value alpha 185 in de-DE language text")
	if (locale === "ar-SA") return /** @type {LocalizedString} */ ("Value alpha 185 in ar-SA language text")
	return /** @type {LocalizedString} */ ("Value alpha 185 in en-US language text")
});
export { key_group5_item185 as "key.group5.item185" }
