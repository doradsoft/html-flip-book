/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Toolbaritem_Download_To1Inputs */



/**
* | output |
* | --- |
* | "To" |
*
* @param {Toolbaritem_Download_To1Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const toolbaritem_download_to1 = /** @type {((inputs?: Toolbaritem_Download_To1Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Toolbaritem_Download_To1Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("עד")
	return /** @type {LocalizedString} */ ("To")
});
export { toolbaritem_download_to1 as "toolbarItem.download.to" }
