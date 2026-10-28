/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Command_Toggledebugdesc2Inputs */



/**
* | output |
* | --- |
* | "Show or hide the debug toolbar (Ctrl+Alt+D)" |
*
* @param {Command_Toggledebugdesc2Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const command_toggledebugdesc2 = /** @type {((inputs?: Command_Toggledebugdesc2Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Command_Toggledebugdesc2Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("הצג או הסתר סרגל הדיבוג (Ctrl+Alt+D)")
	return /** @type {LocalizedString} */ ("Show or hide the debug toolbar (Ctrl+Alt+D)")
});
export { command_toggledebugdesc2 as "command.toggleDebugDesc" }
