/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Key_Group9_Item159Inputs */



/**
* | output |
* | --- |
* | "Value omega 159 in en-US language text" |
*
* @param {Key_Group9_Item159Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }} options
* @returns {LocalizedString}
*/
const key_group9_item159 = /** @type {((inputs?: Key_Group9_Item159Inputs, options?: { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Group9_Item159Inputs, { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("Value omega 159 in he-IL language text")
	if (locale === "fr-FR") return /** @type {LocalizedString} */ ("Value omega 159 in fr-FR language text")
	if (locale === "de-DE") return /** @type {LocalizedString} */ ("Value omega 159 in de-DE language text")
	if (locale === "ar-SA") return /** @type {LocalizedString} */ ("Value omega 159 in ar-SA language text")
	return /** @type {LocalizedString} */ ("Value omega 159 in en-US language text")
});
export { key_group9_item159 as "key.group9.item159" }
