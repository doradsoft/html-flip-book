import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TocPage } from "../TocPage";

const pageSemantics = {
	indexToTitle: (index: number) => (index === 1 ? "Chapter One" : ""),
	indexToSemanticName: (index: number) => (index === 1 ? "I" : ""),
	semanticNameToIndex: () => null,
};

describe("TocPage links", () => {
	it("uses the page handler for an ordinary click instead of following the href", () => {
		const onNavigate = vi.fn();
		render(
			<TocPage
				onNavigate={onNavigate}
				totalPages={2}
				pageSemantics={pageSemantics}
				getHref={() => "/929/1?book"}
			/>,
		);

		const link = screen.getByRole("link", { name: /Chapter One/ });
		expect(link.getAttribute("href")).toBe("/929/1?book");
		const click = createEvent.click(link);
		fireEvent(link, click);
		expect(click.defaultPrevented).toBe(true);
		expect(onNavigate).toHaveBeenCalledExactlyOnceWith(1);
	});

	it.each([
		"ctrlKey",
		"metaKey",
		"shiftKey",
		"altKey",
	] as const)("lets the browser handle a %s click", (modifier) => {
		const onNavigate = vi.fn();
		render(
			<TocPage
				onNavigate={onNavigate}
				totalPages={2}
				pageSemantics={pageSemantics}
				getHref={() => "/929/1?book"}
			/>,
		);

		const link = screen.getByRole("link", { name: /Chapter One/ });
		const click = createEvent.click(link, { [modifier]: true });
		fireEvent(link, click);
		expect(click.defaultPrevented).toBe(false);
		expect(onNavigate).not.toHaveBeenCalled();
	});

	it("keeps a button when no href is available", () => {
		const onNavigate = vi.fn();
		render(<TocPage onNavigate={onNavigate} totalPages={2} pageSemantics={pageSemantics} />);
		fireEvent.click(screen.getByRole("button", { name: /Chapter One/ }));
		expect(onNavigate).toHaveBeenCalledExactlyOnceWith(1);
	});
});
