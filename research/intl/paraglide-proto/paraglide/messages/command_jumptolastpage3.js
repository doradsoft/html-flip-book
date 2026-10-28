/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Command_Jumptolastpage3Inputs */



/**
* | output |
* | --- |
* | "Last page" |
*
* @param {Command_Jumptolastpage3Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const command_jumptolastpage3 = /** @type {((inputs?: Command_Jumptolastpage3Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Command_Jumptolastpage3Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("עמוד אחרון")
	return /** @type {LocalizedString} */ ("Last page")
});
export { command_jumptolastpage3 as "command.jumpToLastPage" }
