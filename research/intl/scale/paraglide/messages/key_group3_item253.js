/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Key_Group3_Item253Inputs */



/**
* | output |
* | --- |
* | "Value delta 253 in en-US language text" |
*
* @param {Key_Group3_Item253Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }} options
* @returns {LocalizedString}
*/
const key_group3_item253 = /** @type {((inputs?: Key_Group3_Item253Inputs, options?: { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Group3_Item253Inputs, { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("Value delta 253 in he-IL language text")
	if (locale === "fr-FR") return /** @type {LocalizedString} */ ("Value delta 253 in fr-FR language text")
	if (locale === "de-DE") return /** @type {LocalizedString} */ ("Value delta 253 in de-DE language text")
	if (locale === "ar-SA") return /** @type {LocalizedString} */ ("Value delta 253 in ar-SA language text")
	return /** @type {LocalizedString} */ ("Value delta 253 in en-US language text")
});
export { key_group3_item253 as "key.group3.item253" }
