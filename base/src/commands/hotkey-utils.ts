import type { HotkeyBinding } from "./types";

/**
 * For RTL: arrow keys perform the opposite (ArrowLeft -> next, ArrowRight -> prev).
 * Returns the key to use when matching against command bindings.
 */
export function getEffectiveKey(key: string, direction: "ltr" | "rtl"): string {
	if (direction !== "rtl") return key;
	if (key === "ArrowLeft") return "ArrowRight";
	if (key === "ArrowRight") return "ArrowLeft";
	return key;
}

/**
 * Check if a hotkey binding matches a keyboard event.
 * When direction is rtl, ArrowLeft/Right are matched as their opposite for flip prev/next.
 */
export function hotkeyMatches(
	binding: HotkeyBinding,
	event: KeyboardEvent,
	direction: "ltr" | "rtl",
): boolean {
	const effectiveKey = getEffectiveKey(event.key, direction);
	if (effectiveKey !== binding.key) return false;

	const modifiers = binding.modifiers ?? {};
	if (binding.key !== "Control" && !!modifiers.ctrl !== event.ctrlKey) return false;
	if (binding.key !== "Shift" && !!modifiers.shift !== event.shiftKey) return false;
	if (binding.key !== "Alt" && !!modifiers.alt !== event.altKey) return false;
	if (binding.key !== "Meta" && !!modifiers.meta !== event.metaKey) return false;

	return true;
}

/** Whether a keyup releases the primary key or any modifier required by a hold. */
export function hotkeyReleased(
	binding: HotkeyBinding,
	event: KeyboardEvent,
	direction: "ltr" | "rtl",
): boolean {
	const key = getEffectiveKey(event.key, direction);
	if (key === binding.key) return true;
	// Shift may change a printable key's case before it is released.
	if (key.length === 1 && key.toLowerCase() === binding.key.toLowerCase()) return true;
	const modifierKeys = {
		ctrl: "ctrlKey",
		shift: "shiftKey",
		alt: "altKey",
		meta: "metaKey",
	} as const;
	return (Object.keys(modifierKeys) as (keyof typeof modifierKeys)[]).some(
		(modifier) => !!binding.modifiers?.[modifier] && !event[modifierKeys[modifier]],
	);
}
