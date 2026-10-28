/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Command_Jumptofirstpage3Inputs */



/**
* | output |
* | --- |
* | "First page" |
*
* @param {Command_Jumptofirstpage3Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const command_jumptofirstpage3 = /** @type {((inputs?: Command_Jumptofirstpage3Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Command_Jumptofirstpage3Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("עמוד ראשון")
	return /** @type {LocalizedString} */ ("First page")
});
export { command_jumptofirstpage3 as "command.jumpToFirstPage" }
