/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Toolbaritem_Download_Error1Inputs */



/**
* | output |
* | --- |
* | "Download failed — try again" |
*
* @param {Toolbaritem_Download_Error1Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const toolbaritem_download_error1 = /** @type {((inputs?: Toolbaritem_Download_Error1Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Toolbaritem_Download_Error1Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("ההורדה נכשלה — נסו שוב")
	return /** @type {LocalizedString} */ ("Download failed — try again")
});
export { toolbaritem_download_error1 as "toolbarItem.download.error" }
