/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Toolbaritem_Download1Inputs */



/**
* | output |
* | --- |
* | "Download" |
*
* @param {Toolbaritem_Download1Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const toolbaritem_download1 = /** @type {((inputs?: Toolbaritem_Download1Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Toolbaritem_Download1Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("הורדה")
	return /** @type {LocalizedString} */ ("Download")
});
export { toolbaritem_download1 as "toolbarItem.download" }
