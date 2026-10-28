/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Key_Group7_Item287Inputs */



/**
* | output |
* | --- |
* | "Value gamma 287 in en-US language text" |
*
* @param {Key_Group7_Item287Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }} options
* @returns {LocalizedString}
*/
const key_group7_item287 = /** @type {((inputs?: Key_Group7_Item287Inputs, options?: { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Group7_Item287Inputs, { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("Value gamma 287 in he-IL language text")
	if (locale === "fr-FR") return /** @type {LocalizedString} */ ("Value gamma 287 in fr-FR language text")
	if (locale === "de-DE") return /** @type {LocalizedString} */ ("Value gamma 287 in de-DE language text")
	if (locale === "ar-SA") return /** @type {LocalizedString} */ ("Value gamma 287 in ar-SA language text")
	return /** @type {LocalizedString} */ ("Value gamma 287 in en-US language text")
});
export { key_group7_item287 as "key.group7.item287" }
