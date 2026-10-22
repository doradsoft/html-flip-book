import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createContext, createRef, StrictMode, useContext, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Bookmark, type BookmarkProvider, FlipBook, type FlipBookHandle } from "../FlipBook";

const chapter: Bookmark = {
	id: "chapter",
	pageIndex: 6,
	label: "Chapter four",
	data: { color: "blue" },
};
const pages = Array.from({ length: 10 }, (_, index) => `Page ${index}`).map((label) => (
	<p key={label}>{label}</p>
));

afterEach(cleanup);

describe("React bookmarks", () => {
	it("renders custom React content with consumer context and follows default navigation", async () => {
		const Theme = createContext("default");
		function Content() {
			return <strong>{useContext(Theme)}</strong>;
		}
		const ref = createRef<FlipBookHandle>();
		const provider: BookmarkProvider = {
			getBookmarks: () => [chapter],
			renderBookmark: () => <Content />,
		};
		render(
			<Theme.Provider value="Custom chapter">
				<FlipBook ref={ref} pages={pages} className="bookmark-test" bookmarkProvider={provider} />
			</Theme.Provider>,
		);
		await screen.findByText("Custom chapter");
		fireEvent.click(screen.getByRole("button", { name: chapter.label }));
		expect(ref.current?.getCurrentPageIndex()).toBe(5);
		await screen.findByText("Custom chapter");
	});

	it("updates a provider without resetting the spread and passes its exact object to the action", async () => {
		const ref = createRef<FlipBookHandle>();
		const onClick = vi.fn();
		const provider: BookmarkProvider = { getBookmarks: () => [chapter], onClick };
		const { rerender } = render(
			<FlipBook ref={ref} pages={pages} className="bookmark-test" bookmarkProvider={provider} />,
		);
		await screen.findByRole("button", { name: chapter.label });
		act(() => ref.current?.jumpToPage(4));
		const next: BookmarkProvider = { ...provider, placement: "bottom", className: "consumer-tabs" };
		rerender(
			<FlipBook ref={ref} pages={pages} className="bookmark-test" bookmarkProvider={next} />,
		);
		await waitFor(() => expect(document.querySelector(".consumer-tabs")).toBeTruthy());
		expect(ref.current?.getCurrentPageIndex()).toBe(3);
		fireEvent.click(screen.getByRole("button", { name: chapter.label }));
		expect(onClick).toHaveBeenCalledWith(1, chapter);
		expect(onClick.mock.calls[0][1]).toBe(chapter);
		expect(ref.current?.getCurrentPageIndex()).toBe(3);
	});

	it("removes tabs when disabled and cleans up strict-mode mounts", async () => {
		const provider: BookmarkProvider = { getBookmarks: () => [chapter] };
		const { rerender, unmount } = render(
			<StrictMode>
				<FlipBook pages={pages} className="bookmark-test" bookmarkProvider={provider} />
			</StrictMode>,
		);
		await screen.findByRole("button", { name: chapter.label });
		expect(document.querySelectorAll(".flipbook-bookmarks")).toHaveLength(1);
		rerender(
			<StrictMode>
				<FlipBook pages={pages} className="bookmark-test" />
			</StrictMode>,
		);
		await waitFor(() => expect(screen.queryByRole("button", { name: chapter.label })).toBeNull());
		unmount();
		expect(document.querySelector(".flipbook-bookmarks")).toBeNull();
	});

	it("keeps custom content after the book container is recreated", async () => {
		const provider: BookmarkProvider = {
			getBookmarks: () => [chapter],
			renderBookmark: () => <em>Chapter content</em>,
		};
		const { rerender } = render(
			<FlipBook pages={pages} className="bookmark-test" bookmarkProvider={provider} />,
		);
		await screen.findByText("Chapter content");
		rerender(<FlipBook pages={pages} className="renamed-book" bookmarkProvider={provider} />);
		await waitFor(() => {
			expect(document.querySelector(".renamed-book .flipbook-bookmark em")?.textContent).toBe(
				"Chapter content",
			);
		});
		expect(document.querySelectorAll(".flipbook-bookmarks")).toHaveLength(1);
	});

	it("replaces data and its renderer together when the provider changes", async () => {
		const provider: BookmarkProvider = {
			getBookmarks: () => [chapter],
			renderBookmark: (bookmark) => <span>{(bookmark.data as { color: string }).color}</span>,
		};
		const { rerender } = render(
			<FlipBook pages={pages} className="bookmark-test" bookmarkProvider={provider} />,
		);
		await screen.findByText("blue");
		const next: BookmarkProvider = {
			getBookmarks: () => [{ ...chapter, data: { marker: "new content" } }],
			renderBookmark: (bookmark) => (
				<span>{(bookmark.data as { marker: string }).marker.toUpperCase()}</span>
			),
		};
		rerender(<FlipBook pages={pages} className="bookmark-test" bookmarkProvider={next} />);
		await screen.findByText("NEW CONTENT");
	});

	it("renders only valid bookmark data and unmounts removed portal content", async () => {
		const ref = createRef<FlipBookHandle>();
		const removed = vi.fn();
		function Content({ label }: { label: string }) {
			useEffect(() => removed, []);
			return <span>{label}</span>;
		}
		let valid = true;
		const invalid = { ...chapter, pageIndex: 100, label: "Invalid duplicate" };
		const provider: BookmarkProvider = {
			getBookmarks: () => (valid ? [invalid, chapter] : [invalid]),
			renderBookmark: (bookmark) => <Content label={bookmark.label} />,
		};
		render(
			<FlipBook ref={ref} pages={pages} className="bookmark-test" bookmarkProvider={provider} />,
		);
		await screen.findByText(chapter.label);
		expect(screen.queryByText(invalid.label)).toBeNull();
		valid = false;
		act(() => ref.current?.jumpToPage(4));
		await waitFor(() => expect(removed).toHaveBeenCalledOnce());
		expect(screen.queryByRole("button", { name: chapter.label })).toBeNull();
	});

	it("keeps bookmark navigation local to its own book", async () => {
		const first = createRef<FlipBookHandle>();
		const second = createRef<FlipBookHandle>();
		const provider: BookmarkProvider = { getBookmarks: () => [chapter] };
		const { container } = render(
			<>
				<FlipBook ref={first} pages={pages} className="first-book" bookmarkProvider={provider} />
				<FlipBook ref={second} pages={pages} className="second-book" bookmarkProvider={provider} />
			</>,
		);
		await waitFor(() =>
			expect(screen.getAllByRole("button", { name: chapter.label })).toHaveLength(2),
		);
		const button = container.querySelector<HTMLButtonElement>(".first-book .flipbook-bookmark");
		if (!button) throw new Error("First book bookmark is missing");
		await act(async () => fireEvent.click(button));
		expect(first.current?.getCurrentPageIndex()).toBe(5);
		expect(second.current?.getCurrentPageIndex()).toBe(0);
	});
});
