/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Toolbaritem_Fullscreenunsupported2Inputs */



/**
* | output |
* | --- |
* | "Fullscreen is not supported by this browser" |
*
* @param {Toolbaritem_Fullscreenunsupported2Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const toolbaritem_fullscreenunsupported2 = /** @type {((inputs?: Toolbaritem_Fullscreenunsupported2Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Toolbaritem_Fullscreenunsupported2Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("מסך מלא אינו נתמך בדפדפן זה")
	return /** @type {LocalizedString} */ ("Fullscreen is not supported by this browser")
});
export { toolbaritem_fullscreenunsupported2 as "toolbarItem.fullscreenUnsupported" }
