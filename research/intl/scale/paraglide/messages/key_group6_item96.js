/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Key_Group6_Item96Inputs */



/**
* | output |
* | --- |
* | "Value beta 96 in en-US language text" |
*
* @param {Key_Group6_Item96Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }} options
* @returns {LocalizedString}
*/
const key_group6_item96 = /** @type {((inputs?: Key_Group6_Item96Inputs, options?: { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Group6_Item96Inputs, { locale?: "en-US" | "he-IL" | "fr-FR" | "de-DE" | "ar-SA" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("Value beta 96 in he-IL language text")
	if (locale === "fr-FR") return /** @type {LocalizedString} */ ("Value beta 96 in fr-FR language text")
	if (locale === "de-DE") return /** @type {LocalizedString} */ ("Value beta 96 in de-DE language text")
	if (locale === "ar-SA") return /** @type {LocalizedString} */ ("Value beta 96 in ar-SA language text")
	return /** @type {LocalizedString} */ ("Value beta 96 in en-US language text")
});
export { key_group6_item96 as "key.group6.item96" }
