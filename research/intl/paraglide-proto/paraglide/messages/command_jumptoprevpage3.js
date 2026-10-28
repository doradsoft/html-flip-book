/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Command_Jumptoprevpage3Inputs */



/**
* | output |
* | --- |
* | "Previous page" |
*
* @param {Command_Jumptoprevpage3Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const command_jumptoprevpage3 = /** @type {((inputs?: Command_Jumptoprevpage3Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Command_Jumptoprevpage3Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("עמוד קודם")
	return /** @type {LocalizedString} */ ("Previous page")
});
export { command_jumptoprevpage3 as "command.jumpToPrevPage" }
