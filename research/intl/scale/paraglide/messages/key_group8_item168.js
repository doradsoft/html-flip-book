/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Key_Group8_Item168Inputs */



/**
* | output |
* | --- |
* | "Value delta 168 in en-US language text" |
*
* @param {Key_Group8_Item168Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }} options
* @returns {LocalizedString}
*/
const key_group8_item168 = /** @type {((inputs?: Key_Group8_Item168Inputs, options?: { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Group8_Item168Inputs, { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("Value delta 168 in he-IL language text")
	if (locale === "fr-FR") return /** @type {LocalizedString} */ ("Value delta 168 in fr-FR language text")
	if (locale === "de-DE") return /** @type {LocalizedString} */ ("Value delta 168 in de-DE language text")
	if (locale === "ar-SA") return /** @type {LocalizedString} */ ("Value delta 168 in ar-SA language text")
	return /** @type {LocalizedString} */ ("Value delta 168 in en-US language text")
});
export { key_group8_item168 as "key.group8.item168" }
