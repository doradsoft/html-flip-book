// App.tsx
import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import BookmarkExample from "./BookmarkExample";
import type { EnBookConfig } from "./EnBook";
import EnBook from "./EnBook";
import type { HeBookConfig } from "./HeBook";
import HeBook from "./HeBook";

export type ExampleId =
	| "ltr-bookmarks"
	| "ltr-no-shadow"
	| "ltr-buffer"
	| "ltr-history"
	| "ltr-debug"
	| "ltr-download"
	| "ltr-initial-position"
	| "ltr-no-snapshot"
	| "ltr-hold-hotkeys"
	| "ltr-comprehensive"
	| "rtl-bookmarks"
	| "rtl-no-shadow"
	| "rtl-buffer"
	| "rtl-history"
	| "rtl-debug"
	| "rtl-download"
	| "rtl-initial-position"
	| "rtl-no-snapshot"
	| "rtl-hold-hotkeys"
	| "rtl-comprehensive";

const EXAMPLES: { section: "LTR" | "RTL"; id: ExampleId; label: string }[] = [
	{ section: "LTR", id: "ltr-bookmarks", label: "Bookmarks" },
	{ section: "LTR", id: "ltr-no-shadow", label: "No shadow" },
	{ section: "LTR", id: "ltr-buffer", label: "Buffer" },
	{ section: "LTR", id: "ltr-history", label: "History mapping" },
	{ section: "LTR", id: "ltr-debug", label: "Debug" },
	{ section: "LTR", id: "ltr-download", label: "Download" },
	{ section: "LTR", id: "ltr-initial-position", label: "Initial position" },
	{ section: "LTR", id: "ltr-no-snapshot", label: "No snapshot" },
	{ section: "LTR", id: "ltr-hold-hotkeys", label: "Hold hotkeys" },
	{ section: "LTR", id: "ltr-comprehensive", label: "Comprehensive" },
	{ section: "RTL", id: "rtl-bookmarks", label: "Bookmarks" },
	{ section: "RTL", id: "rtl-no-shadow", label: "No shadow" },
	{ section: "RTL", id: "rtl-buffer", label: "Buffer" },
	{ section: "RTL", id: "rtl-history", label: "History mapping" },
	{ section: "RTL", id: "rtl-debug", label: "Debug" },
	{ section: "RTL", id: "rtl-download", label: "Download" },
	{ section: "RTL", id: "rtl-initial-position", label: "Initial position" },
	{ section: "RTL", id: "rtl-no-snapshot", label: "No snapshot" },
	{ section: "RTL", id: "rtl-hold-hotkeys", label: "Hold hotkeys" },
	{ section: "RTL", id: "rtl-comprehensive", label: "Comprehensive" },
];

function getEnBookConfig(id: ExampleId): EnBookConfig | undefined {
	switch (id) {
		case "ltr-hold-hotkeys":
			return { mouseMode: "select", debug: false, enableHistory: false, enableDownload: false };
		case "ltr-no-shadow":
			return {
				showPageShadow: false,
				debug: false,
				enableHistory: false,
				enableDownload: false,
			};
		case "ltr-buffer":
			return { leavesBuffer: 3, debug: false, enableHistory: false, enableDownload: false };
		case "ltr-history":
			return { enableHistory: true, enableDownload: false, debug: false };
		case "ltr-debug":
			return { debug: true, enableHistory: false, enableDownload: false };
		case "ltr-download":
			return { enableDownload: true, enableHistory: false, debug: false };
		case "ltr-initial-position":
			return {
				leavesBuffer: 3,
				initialTurnedLeaves: Array.from({ length: 5 }, (_, i) => i),
				debug: false,
				enableHistory: false,
				enableDownload: false,
			};
		case "ltr-no-snapshot":
			return {
				leavesBuffer: 3,
				snapshotDuringFlip: false,
				debug: false,
				enableHistory: false,
				enableDownload: false,
			};
		case "ltr-comprehensive":
			return {
				leavesBuffer: 3,
				debug: true,
				enableHistory: true,
				enableDownload: true,
			};
		default:
			return undefined;
	}
}

function getHeBookConfig(id: ExampleId): HeBookConfig | undefined {
	switch (id) {
		case "rtl-hold-hotkeys":
			return { mouseMode: "select", debug: false, enableHistory: false, enableDownload: false };
		case "rtl-no-shadow":
			return {
				leavesBuffer: 7,
				showPageShadow: false,
				debug: false,
				enableHistory: false,
				enableDownload: false,
			};
		case "rtl-buffer":
			return { leavesBuffer: 7, debug: false, enableHistory: false, enableDownload: false };
		case "rtl-history":
			return { leavesBuffer: 7, enableHistory: true, enableDownload: false, debug: false };
		case "rtl-debug":
			return { leavesBuffer: 7, debug: true, enableHistory: false, enableDownload: false };
		case "rtl-download":
			return { leavesBuffer: 7, enableDownload: true, enableHistory: false, debug: false };
		case "rtl-initial-position":
			return {
				leavesBuffer: 7,
				initialTurnedLeaves: Array.from({ length: 20 }, (_, i) => i),
				debug: false,
				enableHistory: false,
				enableDownload: false,
			};
		case "rtl-no-snapshot":
			return {
				leavesBuffer: 7,
				snapshotDuringFlip: false,
				debug: false,
				enableHistory: false,
				enableDownload: false,
			};
		case "rtl-comprehensive":
			return {
				leavesBuffer: 7,
				debug: true,
				enableHistory: true,
				enableDownload: true,
			};
		default:
			return undefined;
	}
}

function getExampleFromUrl(): ExampleId {
	const params = new URLSearchParams(window.location.search);
	// Keep older shadow-enabled links pointing to a shadow-enabled example.
	const example = params.get("example")?.replace(/^(ltr|rtl)-shadow$/, "$1-buffer");
	return EXAMPLES.find((entry) => entry.id === example)?.id ?? "ltr-comprehensive";
}

export const App: FC = () => {
	const [selectedId, setSelectedId] = useState<ExampleId>(getExampleFromUrl);

	// Sync from URL on mount so E2E and direct links always show the right example
	useEffect(() => {
		setSelectedId(getExampleFromUrl());
	}, []);

	const ltrExamples = useMemo(() => EXAMPLES.filter((e) => e.section === "LTR"), []);
	const rtlExamples = useMemo(() => EXAMPLES.filter((e) => e.section === "RTL"), []);

	const isLtr = selectedId.startsWith("ltr-");
	const isBookmarkExample = selectedId.endsWith("-bookmarks");

	return (
		<div className={isBookmarkExample ? "app app--bookmark-example" : "app"}>
			<header>
				<h1>HTML Flip Book Example</h1>
			</header>
			<div className="app-body">
				<nav className="examples-nav" aria-label="Examples">
					<div className="examples-nav-section">
						<div className="examples-nav-section-title">LTR</div>
						<ul className="examples-nav-list">
							{ltrExamples.map(({ id, label }) => (
								<li key={id}>
									<button
										type="button"
										className={`examples-nav-item ${selectedId === id ? "active" : ""}`}
										onClick={() => setSelectedId(id)}
									>
										{label}
									</button>
								</li>
							))}
						</ul>
					</div>
					<div className="examples-nav-section">
						<div className="examples-nav-section-title">RTL</div>
						<ul className="examples-nav-list">
							{rtlExamples.map(({ id, label }) => (
								<li key={id}>
									<button
										type="button"
										className={`examples-nav-item ${selectedId === id ? "active" : ""}`}
										onClick={() => setSelectedId(id)}
									>
										{label}
									</button>
								</li>
							))}
						</ul>
					</div>
				</nav>
				<section className="example-container" aria-live="polite">
					{(selectedId.endsWith("-hold-hotkeys") || selectedId.endsWith("-comprehensive")) && (
						<p className="hold-hotkey-hint">
							With text selection on, hold <kbd>Ctrl</kbd> to turn pages with the mouse. Release it
							to restore selection. The text-selection button follows the held state.
						</p>
					)}
					{isBookmarkExample ? (
						<BookmarkExample
							key={selectedId}
							direction={isLtr ? "ltr" : "rtl"}
							config={
								isLtr ? getEnBookConfig("ltr-comprehensive") : getHeBookConfig("rtl-comprehensive")
							}
						/>
					) : isLtr ? (
						<div className="en-book-container" key={selectedId}>
							<EnBook config={getEnBookConfig(selectedId)} />
						</div>
					) : (
						<div className="he-book-container" key={selectedId}>
							<HeBook config={getHeBookConfig(selectedId)} />
						</div>
					)}
				</section>
			</div>
		</div>
	);
};

export default App;
