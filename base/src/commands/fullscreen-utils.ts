/**
 * Fullscreen API helpers with vendor-prefix fallbacks (webkit/Safari).
 * Some engines (iOS Safari on iPhone) expose no element fullscreen API at all —
 * use canUseFullscreen to detect that and degrade gracefully.
 */

interface FullscreenDocument extends Document {
	webkitFullscreenEnabled?: boolean;
	webkitFullscreenElement?: Element | null;
	webkitExitFullscreen?: () => void;
}

interface FullscreenElement extends HTMLElement {
	webkitRequestFullscreen?: () => void;
}

const doc = (): FullscreenDocument => document as FullscreenDocument;

/** Events that may change fullscreen state: standard + webkit, changes and rejected requests. */
export const fullscreenStateEvents: readonly string[] = [
	"fullscreenchange",
	"webkitfullscreenchange",
	"fullscreenerror",
	"webkitfullscreenerror",
];

/** Element currently in fullscreen (standard or vendor-prefixed), if any. SSR-safe. */
export function getFullscreenElement(): Element | null {
	if (typeof document === "undefined") return null;
	return doc().fullscreenElement ?? doc().webkitFullscreenElement ?? null;
}

/**
 * Whether the target (default: the page root) can be made fullscreen.
 * Honors the standard/webkit fullscreenEnabled flag; where no flag exists the
 * capability check alone decides. False without a DOM (SSR) or on engines
 * lacking an element fullscreen request (e.g. iOS Safari).
 */
export function canUseFullscreen(target?: HTMLElement | null): boolean {
	if (typeof document === "undefined") return false;
	const element = (target ?? doc().documentElement) as FullscreenElement;
	const request = element.requestFullscreen ?? element.webkitRequestFullscreen;
	if (typeof request !== "function") return false;
	return (doc().fullscreenEnabled ?? doc().webkitFullscreenEnabled) !== false;
}

/** Request fullscreen on the target via the standard or vendor-prefixed API. */
export async function requestFullscreen(target: HTMLElement): Promise<void> {
	const el = target as FullscreenElement;
	if (el.requestFullscreen) {
		await el.requestFullscreen();
		return;
	}
	if (el.webkitRequestFullscreen) {
		el.webkitRequestFullscreen();
		return;
	}
	throw new Error("Fullscreen API is not available");
}

/** Exit fullscreen via the standard or vendor-prefixed API. No-op when unsupported. */
export async function exitFullscreen(): Promise<void> {
	const d = doc();
	if (d.exitFullscreen) {
		await d.exitFullscreen();
		return;
	}
	if (d.webkitExitFullscreen) {
		d.webkitExitFullscreen();
	}
}
