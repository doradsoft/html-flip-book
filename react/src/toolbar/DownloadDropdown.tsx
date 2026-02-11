import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SemanticPageInfo } from "../download/types";
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
	/** Label for "Download" button. Default: "Download" */
	ariaLabel?: string;
	className?: string;
}

const DownloadDropdown: React.FC<DownloadDropdownProps> = ({
	ariaLabel = "Download",
	className,
}) => {
	const {
		totalPages,
		pageSemantics,
		locale,
		openDownloadMenuRef,
		downloadExecutorRef,
		flipBookRef,
	} = useToolbar();
	const downloadConfig = flipBookRef.current?.getDownloadConfig?.() ?? undefined;
	const [open, setOpen] = useState(false);

	useEffect(() => {
		openDownloadMenuRef.current = () => setOpen(true);
		return () => {
			openDownloadMenuRef.current = null;
		};
	}, [openDownloadMenuRef]);
	type DownloadMode = "entire" | "range";
	const [downloadMode, setDownloadMode] = useState<DownloadMode>("entire");
	const [fromIndex, setFromIndex] = useState(0);
	const [toIndex, setToIndex] = useState(0);
	const [loading, setLoading] = useState<"sefer" | "range" | null>(null);
	const [openUp, setOpenUp] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const selectablePages = getSelectablePages(totalPages, pageSemantics);

	const hasSefer = Boolean(downloadConfig?.onDownloadSefer);
	const hasRange = Boolean(downloadConfig?.onDownloadPageRange);
	const showDropdown = hasSefer || hasRange;

	// When opening, default mode to "entire" if available, else "range"; init range from flipbook ref (source of truth)
	useEffect(() => {
		if (open) {
			setDownloadMode(hasSefer ? "entire" : "range");
			const total = flipBookRef.current?.getTotalPages?.() ?? totalPages;
			setFromIndex(0);
			setToIndex(Math.max(0, total - 1));
		}
	}, [open, hasSefer, totalPages, flipBookRef]);

	const closeDropdown = useCallback(() => {
		setOpen(false);
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
		const config = flipBookRef.current?.getDownloadConfig?.();
		if (!config?.onDownloadSefer) return;
		setLoading("sefer");
		try {
			const result = await config.onDownloadSefer();
			if (result) triggerDownload(result, config.entireBookFilename ?? "book");
			closeDropdown();
		} finally {
			setLoading(null);
		}
	}, [flipBookRef, closeDropdown]);

	const runRangeDownload = useCallback(
		async (from: number, to: number) => {
			const config = flipBookRef.current?.getDownloadConfig?.();
			if (!config?.onDownloadPageRange) return;
			const pages: number[] = [];
			const semanticPages: SemanticPageInfo[] = [];
			for (let i = from; i <= to; i++) {
				pages.push(i);
				const info = selectablePages[i];
				if (info) semanticPages.push(info);
			}
			setLoading("range");
			try {
				const result = await config.onDownloadPageRange(
					pages,
					semanticPages,
					config.downloadContext,
				);
				if (result)
					triggerDownload(result, `${config.rangeFilename ?? "pages"}-${from + 1}-${to + 1}`);
				closeDropdown();
			} finally {
				setLoading(null);
			}
		},
		[flipBookRef, selectablePages, closeDropdown],
	);

	useEffect(() => {
		downloadExecutorRef.current = (from?: number, to?: number) => {
			if (from === undefined && to === undefined) {
				void handleEntireBook();
			} else if (from !== undefined && to !== undefined) {
				void runRangeDownload(from, to);
			}
		};
		return () => {
			downloadExecutorRef.current = null;
		};
	}, [downloadExecutorRef, handleEntireBook, runRangeDownload]);

	if (!showDropdown) return null;

	return (
		<div className={`flipbook-toolbar-download-wrap ${className ?? ""}`.trim()} ref={dropdownRef}>
			<button
				type="button"
				className="flipbook-toolbar-button flipbook-toolbar-download-trigger"
				onClick={() => setOpen((o) => !o)}
				aria-label={ariaLabel ?? t("toolbarItem.download", locale)}
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
					<fieldset
						className="flipbook-toolbar-download-mode"
						aria-label={t("toolbarItem.download", locale)}
					>
						{hasSefer && (
							<label className="flipbook-toolbar-download-radio-label">
								<input
									type="radio"
									name="download-mode"
									className="flipbook-toolbar-download-radio"
									checked={downloadMode === "entire"}
									onChange={() => setDownloadMode("entire")}
								/>
								<span>{t("command.downloadEntireBook", locale)}</span>
							</label>
						)}
						{hasRange && (
							<label className="flipbook-toolbar-download-radio-label">
								<input
									type="radio"
									name="download-mode"
									className="flipbook-toolbar-download-radio"
									checked={downloadMode === "range"}
									onChange={() => setDownloadMode("range")}
								/>
								<span>{t("toolbarItem.downloadPageRange", locale)}</span>
							</label>
						)}
					</fieldset>
					{downloadMode === "range" && (
						<div className="flipbook-toolbar-download-range">
							<label className="flipbook-toolbar-download-range-label">
								{t("toolbarItem.download.from", locale)}
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
								{t("toolbarItem.download.to", locale)}
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
						</div>
					)}
					<button
						type="button"
						role="menuitem"
						className="flipbook-toolbar-download-menuitem flipbook-toolbar-download-primary"
						onClick={() => {
							if (downloadMode === "entire") {
								void handleEntireBook();
							} else {
								const total = flipBookRef.current?.getTotalPages?.() ?? totalPages;
								const from = Math.min(fromIndex, toIndex);
								let to = Math.max(fromIndex, toIndex);
								if (total > 0 && to >= total) to = total - 1;
								if (to < from) return;
								void runRangeDownload(from, to);
							}
						}}
						disabled={loading !== null}
					>
						{loading === "sefer"
							? "…"
							: loading === "range"
								? "…"
								: t("toolbarItem.download.download", locale)}
					</button>
				</div>
			)}
		</div>
	);
};

export { DownloadDropdown };
