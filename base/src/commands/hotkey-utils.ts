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
	if (!!modifiers.ctrl !== event.ctrlKey) return false;
	if (!!modifiers.shift !== event.shiftKey) return false;
	if (!!modifiers.alt !== event.altKey) return false;
	if (!!modifiers.meta !== event.metaKey) return false;

	return true;
}
