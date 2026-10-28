/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Command_Downloadentirebook2Inputs */



/**
* | output |
* | --- |
* | "Download entire book" |
*
* @param {Command_Downloadentirebook2Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const command_downloadentirebook2 = /** @type {((inputs?: Command_Downloadentirebook2Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Command_Downloadentirebook2Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("הורד את כל הספר")
	return /** @type {LocalizedString} */ ("Download entire book")
});
export { command_downloadentirebook2 as "command.downloadEntireBook" }
