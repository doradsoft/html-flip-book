/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Command_Jumptotoc2Inputs */



/**
* | output |
* | --- |
* | "Table of contents" |
*
* @param {Command_Jumptotoc2Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const command_jumptotoc2 = /** @type {((inputs?: Command_Jumptotoc2Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Command_Jumptotoc2Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("תוכן העניינים")
	return /** @type {LocalizedString} */ ("Table of contents")
});
export { command_jumptotoc2 as "command.jumpToToc" }
