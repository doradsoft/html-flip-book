// App.tsx
import type { FC } from "react";
import { useMemo, useState } from "react";
import "./App.css";
import type { EnBookConfig } from "./EnBook";
import EnBook from "./EnBook";
import type { HeBookConfig } from "./HeBook";
import HeBook from "./HeBook";

export type ExampleId =
	| "ltr-shadow"
	| "ltr-buffer"
	| "ltr-history"
	| "ltr-debug"
	| "ltr-download"
	| "ltr-comprehensive"
	| "rtl-shadow"
	| "rtl-buffer"
	| "rtl-history"
	| "rtl-debug"
	| "rtl-download"
	| "rtl-comprehensive";

const EXAMPLES: { section: "LTR" | "RTL"; id: ExampleId; label: string }[] = [
	{ section: "LTR", id: "ltr-shadow", label: "Shadow" },
	{ section: "LTR", id: "ltr-buffer", label: "Buffer" },
	{ section: "LTR", id: "ltr-history", label: "History mapping" },
	{ section: "LTR", id: "ltr-debug", label: "Debug" },
	{ section: "LTR", id: "ltr-download", label: "Download" },
	{ section: "LTR", id: "ltr-comprehensive", label: "Comprehensive" },
	{ section: "RTL", id: "rtl-shadow", label: "Shadow" },
	{ section: "RTL", id: "rtl-buffer", label: "Buffer" },
	{ section: "RTL", id: "rtl-history", label: "History mapping" },
	{ section: "RTL", id: "rtl-debug", label: "Debug" },
	{ section: "RTL", id: "rtl-download", label: "Download" },
	{ section: "RTL", id: "rtl-comprehensive", label: "Comprehensive" },
];

function getEnBookConfig(id: ExampleId): EnBookConfig | undefined {
	switch (id) {
		case "ltr-shadow":
			return { debug: false, enableHistory: false, enableDownload: false };
		case "ltr-buffer":
			return { leavesBuffer: 3, debug: false, enableHistory: false, enableDownload: false };
		case "ltr-history":
			return { enableHistory: true, enableDownload: false, debug: false };
		case "ltr-debug":
			return { debug: true, enableHistory: false, enableDownload: false };
		case "ltr-download":
			return { enableDownload: true, enableHistory: false, debug: false };
		case "ltr-comprehensive":
			return {
				leavesBuffer: 3,
				debug: true,
				enableHistory: true,
				enableDownload: true,
				showPageShadow: false,
			};
		default:
			return undefined;
	}
}

function getHeBookConfig(id: ExampleId): HeBookConfig | undefined {
	switch (id) {
		case "rtl-shadow":
			return { leavesBuffer: 7, debug: false, enableHistory: false, enableDownload: false };
		case "rtl-buffer":
			return { leavesBuffer: 7, debug: false, enableHistory: false, enableDownload: false };
		case "rtl-history":
			return { leavesBuffer: 7, enableHistory: true, enableDownload: false, debug: false };
		case "rtl-debug":
			return { leavesBuffer: 7, debug: true, enableHistory: false, enableDownload: false };
		case "rtl-download":
			return { leavesBuffer: 7, enableDownload: true, enableHistory: false, debug: false };
		case "rtl-comprehensive":
			return {
				leavesBuffer: 7,
				debug: true,
				enableHistory: true,
				enableDownload: true,
				showPageShadow: false,
			};
		default:
			return undefined;
	}
}

export const App: FC = () => {
	const [selectedId, setSelectedId] = useState<ExampleId>("ltr-comprehensive");

	const ltrExamples = useMemo(() => EXAMPLES.filter((e) => e.section === "LTR"), []);
	const rtlExamples = useMemo(() => EXAMPLES.filter((e) => e.section === "RTL"), []);

	const isLtr = selectedId.startsWith("ltr-");

	return (
		<div className="app">
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
					{isLtr ? (
						<div className="en-book-container">
							<EnBook config={getEnBookConfig(selectedId)} />
						</div>
					) : (
						<div className="he-book-container">
							<HeBook config={getHeBookConfig(selectedId)} />
						</div>
					)}
				</section>
			</div>
		</div>
	);
};

export default App;
