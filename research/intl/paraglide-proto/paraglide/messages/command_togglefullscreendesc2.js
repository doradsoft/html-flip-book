/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Command_Togglefullscreendesc2Inputs */



/**
* | output |
* | --- |
* | "Enter or exit fullscreen mode" |
*
* @param {Command_Togglefullscreendesc2Inputs} inputs
* @param {{ locale?: "en-US" | "he-IL" }} options
* @returns {LocalizedString}
*/
const command_togglefullscreendesc2 = /** @type {((inputs?: Command_Togglefullscreendesc2Inputs, options?: { locale?: "en-US" | "he-IL" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Command_Togglefullscreendesc2Inputs, { locale?: "en-US" | "he-IL" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "he-IL") return /** @type {LocalizedString} */ ("כניסה או יציאה ממסך מלא")
	return /** @type {LocalizedString} */ ("Enter or exit fullscreen mode")
});
export { command_togglefullscreendesc2 as "command.toggleFullscreenDesc" }
