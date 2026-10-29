/** DOM comparisons preserve consumer edits while avoiding duplicate animation writes. */
export function writeAttribute(element: HTMLElement, name: string, value: string | null): void {
	if (element.getAttribute(name) === value) return;
	if (value === null) element.removeAttribute(name);
	else element.setAttribute(name, value);
}

export function writeStyle(element: HTMLElement, name: string, value: string): void {
	if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
}

export function writeHidden(element: HTMLElement, value: boolean): void {
	if (element.hidden !== value) element.hidden = value;
}

export function writeInert(element: HTMLElement, value: boolean): void {
	if (element.inert !== value) element.inert = value;
}
