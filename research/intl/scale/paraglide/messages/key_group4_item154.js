/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Key_Group4_Item154Inputs */



/**
* | output |
* | --- |
* | "Value omega 154 in en-US language text" |
*
* @param {Key_Group4_Item154Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }} options
* @returns {LocalizedString}
*/
const key_group4_item154 = /** @type {((inputs?: Key_Group4_Item154Inputs, options?: { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Group4_Item154Inputs, { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("Value omega 154 in he-IL language text")
	if (locale === "fr-FR") return /** @type {LocalizedString} */ ("Value omega 154 in fr-FR language text")
	if (locale === "de-DE") return /** @type {LocalizedString} */ ("Value omega 154 in de-DE language text")
	if (locale === "ar-SA") return /** @type {LocalizedString} */ ("Value omega 154 in ar-SA language text")
	return /** @type {LocalizedString} */ ("Value omega 154 in en-US language text")
});
export { key_group4_item154 as "key.group4.item154" }
