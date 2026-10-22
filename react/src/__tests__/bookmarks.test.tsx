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
	it("excludes the default React cover without requiring explicit cover indices", async () => {
		render(
			<FlipBook
				enableBookmarks
				pages={pages}
				className="bookmark-test"
				tocPageIndex={2}
				pageSemantics={{
					indexToTitle: (index) => (index === 0 ? "Front cover" : index === 4 ? "Chapter" : ""),
					indexToSemanticName: (index) => String(index + 1),
					semanticNameToIndex: (name) => Number(name) - 1,
				}}
			/>,
		);
		await screen.findByRole("button", { name: "Chapter" });
		expect(screen.queryByRole("button", { name: "Front cover" })).toBeNull();
	});

	it("requires an explicit opt-in even when a provider is supplied", async () => {
		const provider: BookmarkProvider = { getBookmarks: vi.fn(() => [chapter]) };
		const { rerender } = render(
			<FlipBook pages={pages} className="bookmark-test" bookmarkProvider={provider} />,
		);
		expect(screen.queryByRole("button", { name: chapter.label })).toBeNull();
		expect(provider.getBookmarks).not.toHaveBeenCalled();
		rerender(
			<FlipBook
				enableBookmarks
				pages={pages}
				className="bookmark-test"
				bookmarkProvider={provider}
			/>,
		);
		await screen.findByRole("button", { name: chapter.label });
		rerender(<FlipBook pages={pages} className="bookmark-test" bookmarkProvider={provider} />);
		await waitFor(() => expect(screen.queryByRole("button", { name: chapter.label })).toBeNull());
	});

	it("uses page semantics for built-in bookmarks and keeps the spread when toggled", async () => {
		const ref = createRef<FlipBookHandle>();
		const titles = new Map([
			[4, "Fourth chapter"],
			[6, "Sixth chapter"],
		]);
		const pageSemantics = {
			indexToTitle: (index: number) => titles.get(index) ?? "",
			indexToSemanticName: (index: number) => String(index + 1),
			semanticNameToIndex: (name: string) => Number(name) - 1,
		};
		const { rerender } = render(
			<FlipBook
				ref={ref}
				enableBookmarks
				pages={pages}
				className="bookmark-test"
				pageSemantics={pageSemantics}
				tocPageIndex={2}
			/>,
		);
		await screen.findByRole("button", { name: "Fourth chapter" });
		fireEvent.click(screen.getByRole("button", { name: "Sixth chapter" }));
		expect(ref.current?.getCurrentPageIndex()).toBe(5);
		rerender(
			<FlipBook
				ref={ref}
				pages={pages}
				className="bookmark-test"
				pageSemantics={pageSemantics}
				tocPageIndex={2}
			/>,
		);
		await waitFor(() => expect(screen.queryByRole("button", { name: "Sixth chapter" })).toBeNull());
		expect(ref.current?.getCurrentPageIndex()).toBe(5);
	});

	it("renders custom React content with consumer context and follows default navigation", async () => {
		const Theme = createContext("default");
		function Content() {
			return <strong>{useContext(Theme)}</strong>;
		}
		const ref = createRef<FlipBookHandle>();
		const provider: BookmarkProvider = {
			getBookmarks: () => [chapter],
			renderBookmark: () => <Content />,
			renderExpandedBookmark: (bookmark) => (
				<div>
					<Content />
					<em>{bookmark.label} details</em>
				</div>
			),
		};
		render(
			<Theme.Provider value="Custom chapter">
				<FlipBook
					ref={ref}
					enableBookmarks
					pages={pages}
					className="bookmark-test"
					bookmarkProvider={provider}
				/>
			</Theme.Provider>,
		);
		await screen.findByText(`${chapter.label} details`);
		expect(screen.getAllByText("Custom chapter")).toHaveLength(2);
		fireEvent.click(screen.getByRole("button", { name: chapter.label }));
		expect(ref.current?.getCurrentPageIndex()).toBe(5);
		await screen.findByText(`${chapter.label} details`);
		expect(screen.getAllByText("Custom chapter")).toHaveLength(2);
	});

	it("updates a provider without resetting the spread and passes its exact object to the action", async () => {
		const ref = createRef<FlipBookHandle>();
		const onClick = vi.fn();
		const provider: BookmarkProvider = { getBookmarks: () => [chapter], onClick };
		const { rerender } = render(
			<FlipBook
				ref={ref}
				enableBookmarks
				pages={pages}
				className="bookmark-test"
				bookmarkProvider={provider}
			/>,
		);
		await screen.findByRole("button", { name: chapter.label });
		act(() => ref.current?.jumpToPage(4));
		const next: BookmarkProvider = { ...provider, placement: "bottom", className: "consumer-tabs" };
		rerender(
			<FlipBook
				ref={ref}
				enableBookmarks
				pages={pages}
				className="bookmark-test"
				bookmarkProvider={next}
			/>,
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
				<FlipBook
					enableBookmarks
					pages={pages}
					className="bookmark-test"
					bookmarkProvider={provider}
				/>
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
			<FlipBook
				enableBookmarks
				pages={pages}
				className="bookmark-test"
				bookmarkProvider={provider}
			/>,
		);
		await screen.findByText("Chapter content");
		rerender(
			<FlipBook
				enableBookmarks
				pages={pages}
				className="renamed-book"
				bookmarkProvider={provider}
			/>,
		);
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
			renderExpandedBookmark: (bookmark) => (
				<p>{(bookmark.data as { color: string }).color.toUpperCase()} details</p>
			),
		};
		const { rerender } = render(
			<FlipBook
				enableBookmarks
				pages={pages}
				className="bookmark-test"
				bookmarkProvider={provider}
			/>,
		);
		await screen.findByText("blue");
		await screen.findByText("BLUE details");
		const next: BookmarkProvider = {
			getBookmarks: () => [{ ...chapter, data: { marker: "new content" } }],
			renderBookmark: (bookmark) => (
				<span>{(bookmark.data as { marker: string }).marker.toUpperCase()}</span>
			),
			renderExpandedBookmark: (bookmark) => (
				<section>{(bookmark.data as { marker: string }).marker} details</section>
			),
		};
		rerender(
			<FlipBook enableBookmarks pages={pages} className="bookmark-test" bookmarkProvider={next} />,
		);
		await screen.findByText("NEW CONTENT");
		await screen.findByText("new content details");
		expect(screen.queryByText("blue")).toBeNull();
		expect(screen.queryByText("BLUE details")).toBeNull();
	});

	it("unmounts both brief and expanded content when bookmarks are removed", async () => {
		const ref = createRef<FlipBookHandle>();
		const removed = vi.fn();
		function Content({ kind }: { kind: string }) {
			useEffect(() => () => removed(kind), [kind]);
			return <span>{kind}</span>;
		}
		let include = true;
		const provider: BookmarkProvider = {
			getBookmarks: () => (include ? [chapter] : []),
			renderBookmark: () => <Content kind="brief" />,
			renderExpandedBookmark: () => <Content kind="expanded" />,
		};
		render(
			<FlipBook
				ref={ref}
				enableBookmarks
				pages={pages}
				className="bookmark-test"
				bookmarkProvider={provider}
			/>,
		);
		await screen.findByText("brief");
		await screen.findByText("expanded");
		include = false;
		act(() => ref.current?.jumpToPage(4));
		await waitFor(() => expect(removed).toHaveBeenCalledTimes(2));
		expect(removed.mock.calls.map(([kind]) => kind).sort()).toEqual(["brief", "expanded"]);
		expect(screen.queryByRole("button", { name: chapter.label })).toBeNull();
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
			<FlipBook
				ref={ref}
				enableBookmarks
				pages={pages}
				className="bookmark-test"
				bookmarkProvider={provider}
			/>,
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
				<FlipBook
					ref={first}
					enableBookmarks
					pages={pages}
					className="first-book"
					bookmarkProvider={provider}
				/>
				<FlipBook
					ref={second}
					enableBookmarks
					pages={pages}
					className="second-book"
					bookmarkProvider={provider}
				/>
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
