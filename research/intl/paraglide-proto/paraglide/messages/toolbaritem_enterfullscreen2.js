/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Toolbaritem_Enterfullscreen2Inputs */



/**
* | output |
* | --- |
* | "Enter fullscreen" |
*
* @param {Toolbaritem_Enterfullscreen2Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const toolbaritem_enterfullscreen2 = /** @type {((inputs?: Toolbaritem_Enterfullscreen2Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Toolbaritem_Enterfullscreen2Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("כניסה למסך מלא")
	return /** @type {LocalizedString} */ ("Enter fullscreen")
});
export { toolbaritem_enterfullscreen2 as "toolbarItem.enterFullscreen" }
