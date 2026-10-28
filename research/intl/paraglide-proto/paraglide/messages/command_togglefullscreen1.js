/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Command_Togglefullscreen1Inputs */



/**
* | output |
* | --- |
* | "Toggle fullscreen" |
*
* @param {Command_Togglefullscreen1Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const command_togglefullscreen1 = /** @type {((inputs?: Command_Togglefullscreen1Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Command_Togglefullscreen1Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("מסך מלא")
	return /** @type {LocalizedString} */ ("Toggle fullscreen")
});
export { command_togglefullscreen1 as "command.toggleFullscreen" }
