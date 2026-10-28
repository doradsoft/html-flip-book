/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Key_Group9_Item249Inputs */



/**
* | output |
* | --- |
* | "Value omega 249 in en-US language text" |
*
* @param {Key_Group9_Item249Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }} options
* @returns {LocalizedString}
*/
const key_group9_item249 = /** @type {((inputs?: Key_Group9_Item249Inputs, options?: { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Group9_Item249Inputs, { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("Value omega 249 in he-IL language text")
	if (locale === "fr-FR") return /** @type {LocalizedString} */ ("Value omega 249 in fr-FR language text")
	if (locale === "de-DE") return /** @type {LocalizedString} */ ("Value omega 249 in de-DE language text")
	if (locale === "ar-SA") return /** @type {LocalizedString} */ ("Value omega 249 in ar-SA language text")
	return /** @type {LocalizedString} */ ("Value omega 249 in en-US language text")
});
export { key_group9_item249 as "key.group9.item249" }
