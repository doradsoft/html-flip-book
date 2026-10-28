/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Command_Toggledebug1Inputs */



/**
* | output |
* | --- |
* | "Toggle debug toolbar" |
*
* @param {Command_Toggledebug1Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const command_toggledebug1 = /** @type {((inputs?: Command_Toggledebug1Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Command_Toggledebug1Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("סרגל כלים לדיבוג")
	return /** @type {LocalizedString} */ ("Toggle debug toolbar")
});
export { command_toggledebug1 as "command.toggleDebug" }
