/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Command_Jumptonextpage3Inputs */



/**
* | output |
* | --- |
* | "Next page" |
*
* @param {Command_Jumptonextpage3Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const command_jumptonextpage3 = /** @type {((inputs?: Command_Jumptonextpage3Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Command_Jumptonextpage3Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("עמוד הבא")
	return /** @type {LocalizedString} */ ("Next page")
});
export { command_jumptonextpage3 as "command.jumpToNextPage" }
