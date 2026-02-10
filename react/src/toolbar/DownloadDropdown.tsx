import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PageRangesDownloadContext, SemanticPageInfo } from "../download/types";
import { isRtl, t } from "../i18n";
import { DownloadIcon } from "../icons";
import { useToolbar } from "./ToolbarContext";
import "./DownloadDropdown.css";

function triggerDownload(result: { ext: string; data: string }, filenameBase: string): void {
	try {
		const binary = atob(result.data);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		const blob = new Blob([bytes]);
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${filenameBase}.${result.ext}`;
		a.click();
		URL.revokeObjectURL(url);
	} catch (e) {
		console.error("Download failed:", e);
	}
}

/** Collect pages that have a semantic name (or use index as fallback) for range selector options */
function getSelectablePages(
	totalPages: number,
	pageSemantics?: {
		indexToSemanticName: (i: number) => string;
		indexToTitle: (i: number) => string;
	},
): SemanticPageInfo[] {
	const list: SemanticPageInfo[] = [];
	for (let i = 0; i < totalPages; i++) {
		const semanticName = pageSemantics?.indexToSemanticName(i) ?? String(i + 1);
		const title = pageSemantics?.indexToTitle(i) ?? `Page ${i + 1}`;
		list.push({ pageIndex: i, semanticName, title });
	}
	return list;
}

export interface DownloadDropdownProps {
	/** Called when user chooses "Download entire book". Return result or null. */
	onDownloadSefer?: () => Promise<{ ext: string; data: string } | null>;
	/** Called when user chooses "Download page range" with selected pages. Return result or null. */
	onDownloadPageRange?: (
		pages: number[],
		semanticPages: SemanticPageInfo[],
		context?: PageRangesDownloadContext,
	) => Promise<{ ext: string; data: string } | null>;
	/** Optional context passed to onDownloadPageRange (e.g. seferName) */
	downloadContext?: PageRangesDownloadContext;
	/** Label for "Download" button. Default: "Download" */
	ariaLabel?: string;
	/** Suggested filename base for entire book download */
	entireBookFilename?: string;
	/** Suggested filename base for range download */
	rangeFilename?: string;
	className?: string;
}

const DownloadDropdown: React.FC<DownloadDropdownProps> = ({
	onDownloadSefer,
	onDownloadPageRange,
	downloadContext,
	ariaLabel = "Download",
	entireBookFilename = "book",
	rangeFilename = "pages",
	className,
}) => {
	const { totalPages, pageSemantics, locale } = useToolbar();
	const [open, setOpen] = useState(false);
	const [rangeOpen, setRangeOpen] = useState(false);
	const [fromIndex, setFromIndex] = useState(0);
	const [toIndex, setToIndex] = useState(0);
	const [loading, setLoading] = useState<"sefer" | "range" | null>(null);
	const [openUp, setOpenUp] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const selectablePages = getSelectablePages(totalPages, pageSemantics);

	const hasSefer = Boolean(onDownloadSefer);
	const hasRange = Boolean(onDownloadPageRange);
	const showDropdown = hasSefer || hasRange;

	const closeDropdown = useCallback(() => {
		setOpen(false);
		setRangeOpen(false);
	}, []);

	// Keep dropdown menu inside viewport: open upward when near bottom
	useLayoutEffect(() => {
		if (!open || !menuRef.current || !dropdownRef.current) return;
		const menu = menuRef.current;
		const trigger = dropdownRef.current.querySelector(".flipbook-toolbar-download-trigger");
		const updateOpenUp = () => {
			const triggerRect = trigger?.getBoundingClientRect();
			if (!triggerRect) return;
			const menuHeight = menu.getBoundingClientRect().height;
			const spaceBelow = window.innerHeight - triggerRect.bottom;
			const padding = 8;
			setOpenUp(spaceBelow < menuHeight + padding);
		};
		updateOpenUp();
		const ro = new ResizeObserver(updateOpenUp);
		ro.observe(menu);
		return () => ro.disconnect();
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				closeDropdown();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open, closeDropdown]);

	const handleEntireBook = useCallback(async () => {
		if (!onDownloadSefer) return;
		setLoading("sefer");
		try {
			const result = await onDownloadSefer();
			if (result) triggerDownload(result, entireBookFilename);
			closeDropdown();
		} finally {
			setLoading(null);
		}
	}, [onDownloadSefer, entireBookFilename, closeDropdown]);

	const handleOpenRange = useCallback(() => {
		setFromIndex(0);
		setToIndex(Math.max(0, totalPages - 1));
		setRangeOpen(true);
		setOpen(true);
	}, [totalPages]);

	const handleRangeDownload = useCallback(async () => {
		if (!onDownloadPageRange) return;
		const from = Math.min(fromIndex, toIndex);
		const to = Math.max(fromIndex, toIndex);
		const pages: number[] = [];
		const semanticPages: SemanticPageInfo[] = [];
		for (let i = from; i <= to; i++) {
			pages.push(i);
			const info = selectablePages[i];
			if (info) semanticPages.push(info);
		}
		setLoading("range");
		try {
			const result = await onDownloadPageRange(pages, semanticPages, downloadContext);
			if (result) triggerDownload(result, `${rangeFilename}-${from + 1}-${to + 1}`);
			closeDropdown();
		} finally {
			setLoading(null);
		}
	}, [
		onDownloadPageRange,
		fromIndex,
		toIndex,
		selectablePages,
		downloadContext,
		rangeFilename,
		closeDropdown,
	]);

	if (!showDropdown) return null;

	return (
		<div className={`flipbook-toolbar-download-wrap ${className ?? ""}`.trim()} ref={dropdownRef}>
			<button
				type="button"
				className="flipbook-toolbar-button flipbook-toolbar-download-trigger"
				onClick={() => setOpen((o) => !o)}
				aria-label={ariaLabel ?? t("toolbar.download", locale)}
				aria-expanded={open}
				aria-haspopup="true"
				disabled={loading !== null}
			>
				<DownloadIcon size={18} />
			</button>
			{open && (
				<div
					ref={menuRef}
					className={`flipbook-toolbar-download-menu ${openUp ? "flipbook-toolbar-download-menu--open-up" : ""}`.trim()}
					role="menu"
					dir={isRtl(locale) ? "rtl" : "ltr"}
				>
					{hasSefer && (
						<button
							type="button"
							role="menuitem"
							className="flipbook-toolbar-download-menuitem"
							onClick={handleEntireBook}
							disabled={loading !== null}
						>
							{loading === "sefer" ? "…" : t("toolbar.downloadEntireBook", locale)}
						</button>
					)}
					{hasRange && (
						<>
							<button
								type="button"
								role="menuitem"
								className="flipbook-toolbar-download-menuitem"
								onClick={handleOpenRange}
								disabled={loading !== null}
							>
								{t("toolbar.downloadPageRange", locale)}
							</button>
							{rangeOpen && (
								<div className="flipbook-toolbar-download-range">
									<label className="flipbook-toolbar-download-range-label">
										{t("download.from", locale)}
										<select
											value={fromIndex}
											onChange={(e) => setFromIndex(Number(e.target.value))}
											className="flipbook-toolbar-download-range-select"
										>
											{selectablePages.map((p) => (
												<option key={p.pageIndex} value={p.pageIndex}>
													{p.semanticName || p.title || `Page ${p.pageIndex + 1}`}
												</option>
											))}
										</select>
									</label>
									<label className="flipbook-toolbar-download-range-label">
										{t("download.to", locale)}
										<select
											value={toIndex}
											onChange={(e) => setToIndex(Number(e.target.value))}
											className="flipbook-toolbar-download-range-select"
										>
											{selectablePages.map((p) => (
												<option key={p.pageIndex} value={p.pageIndex}>
													{p.semanticName || p.title || `Page ${p.pageIndex + 1}`}
												</option>
											))}
										</select>
									</label>
									<button
										type="button"
										className="flipbook-toolbar-download-range-download"
										onClick={handleRangeDownload}
										disabled={loading !== null}
									>
										{loading === "range" ? "…" : t("download.download", locale)}
									</button>
								</div>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
};

export { DownloadDropdown };
