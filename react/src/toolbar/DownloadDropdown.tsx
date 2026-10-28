import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SemanticPageInfo } from "../download/types";
import { isRtl, t } from "../i18n";
import { DownloadIcon } from "../icons";
import { useToolbar } from "./ToolbarContext";
import "./DownloadDropdown.css";

/** Strip Hebrew punctuation (geresh, gershaim) from a name for use in filenames. */
function sanitizeForFilename(name: string): string {
	return name.replace(/[׳'״"]/g, "");
}

function triggerDownload(result: { ext: string; data: string }, filenameBase: string): void {
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
}

/** Collect pages that have a semantic name for range selector options.
 *  Pages without a semantic name (covers, blanks, TOC) are excluded. */
function getSelectablePages(
	totalPages: number,
	pageSemantics?: {
		indexToSemanticName: (i: number) => string;
		indexToTitle: (i: number) => string;
	},
): SemanticPageInfo[] {
	const list: SemanticPageInfo[] = [];
	for (let i = 0; i < totalPages; i++) {
		const semanticName = pageSemantics?.indexToSemanticName(i) ?? "";
		const title = pageSemantics?.indexToTitle(i) ?? "";
		// Only include pages with a real semantic identity
		if (!semanticName && !title) {
			// No semantics at all — fall back to 1-based index only when
			// no pageSemantics provider exists (plain book without metadata).
			if (!pageSemantics) {
				list.push({ pageIndex: i, semanticName: String(i + 1), title: `Page ${i + 1}` });
			}
			continue;
		}
		list.push({
			pageIndex: i,
			semanticName: semanticName || String(i + 1),
			title: title || semanticName,
		});
	}
	return list;
}

export interface DownloadDropdownProps {
	/** Label for "Download" button. Default: "Download" */
	ariaLabel?: string;
	className?: string;
	/**
	 * Extra content rendered at the end of the open menu — for
	 * application-specific hints or additional download actions.
	 * Rendered as real children of the menu element, so interactive
	 * children keep inside-menu click behavior, keyboard tabbing,
	 * `dir` and React context. Re-mounts with each open.
	 */
	children?: React.ReactNode;
}

const DownloadDropdown: React.FC<DownloadDropdownProps> = ({
	ariaLabel = "Download",
	className,
	children,
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
	const [error, setError] = useState<string | null>(null);
	const [openUp, setOpenUp] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const selectablePages = useMemo(
		() => getSelectablePages(totalPages, pageSemantics),
		[totalPages, pageSemantics],
	);

	const hasSefer = Boolean(downloadConfig?.onDownloadSefer);
	const hasRange = Boolean(downloadConfig?.onDownloadPageRange);
	const showDropdown = hasSefer || hasRange;

	// Pre-compute primitive values from the memoised list so the effect deps stay stable
	const firstSelectablePage = selectablePages[0]?.pageIndex ?? 0;
	const lastSelectablePage = selectablePages[selectablePages.length - 1]?.pageIndex ?? 0;

	// When opening, default mode to "entire" if available, else "range"; init range to first/last selectable page
	useEffect(() => {
		if (!open) return;
		setDownloadMode(hasSefer ? "entire" : "range");
		setFromIndex(firstSelectablePage);
		setToIndex(lastSelectablePage);
	}, [open, hasSefer, firstSelectablePage, lastSelectablePage]);

	const closeDropdown = useCallback(() => {
		setOpen(false);
		setError(null);
	}, []);

	// One lifecycle for handler rejections and browser-side save failures:
	// notify the host, open the menu so command-triggered failures stay visible
	// and retryable, and show a localized alert. A host onDownloadError hook that
	// throws (or an async hook whose promise rejects) falls back to the
	// localized message instead of escaping as an unhandled rejection; an async
	// hook that resolves a string replaces the fallback once it settles.
	const reportError = useCallback(
		(cause: unknown) => {
			const fallback = t("toolbarItem.download.error", locale);
			const config = flipBookRef.current?.getDownloadConfig?.();
			let custom: unknown;
			try {
				custom = config?.onDownloadError?.(cause);
			} catch {
				custom = undefined;
			}
			const applyMessage = (value: unknown) =>
				setError(typeof value === "string" && value ? value : fallback);
			if (custom && typeof (custom as PromiseLike<unknown>).then === "function") {
				applyMessage(undefined);
				void (custom as PromiseLike<unknown>).then(applyMessage, () => {});
			} else {
				applyMessage(custom);
			}
			setOpen(true);
		},
		[flipBookRef, locale],
	);

	// Anchor to the trigger while keeping both axes inside the viewport, including scrolled toolbars.
	useLayoutEffect(() => {
		if (!open || !menuRef.current || !dropdownRef.current) return;
		const menu = menuRef.current;
		const trigger = dropdownRef.current.querySelector(".flipbook-toolbar-download-trigger");
		const updatePosition = () => {
			const triggerRect = trigger?.getBoundingClientRect();
			if (!triggerRect) return;
			const padding = 8;
			const gap = 6;
			const spaceBelow = window.innerHeight - triggerRect.bottom - gap - padding;
			const spaceAbove = triggerRect.top - gap - padding;
			const desiredHeight = Math.min(menu.scrollHeight, window.innerHeight * 0.7, 480);
			const above = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
			menu.style.maxHeight = `${Math.max(0, Math.min(desiredHeight, above ? spaceAbove : spaceBelow))}px`;
			const bounds = menu.getBoundingClientRect();
			const left = isRtl(locale) ? triggerRect.left : triggerRect.right - bounds.width;
			menu.style.left = `${Math.max(padding, Math.min(left, window.innerWidth - bounds.width - padding))}px`;
			const top = above ? triggerRect.top - gap - bounds.height : triggerRect.bottom + gap;
			menu.style.top = `${Math.max(padding, Math.min(top, window.innerHeight - bounds.height - padding))}px`;
			setOpenUp(above);
		};
		updatePosition();
		const ro = new ResizeObserver(updatePosition);
		ro.observe(menu);
		const toolbar = dropdownRef.current.closest('[role="toolbar"]');
		if (toolbar) ro.observe(toolbar);
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
		};
	}, [open, locale]);

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
		setError(null);
		try {
			const result = await config.onDownloadSefer();
			if (result) triggerDownload(result, config.entireBookFilename ?? "book");
			closeDropdown();
		} catch (e) {
			reportError(e);
		} finally {
			setLoading(null);
		}
	}, [flipBookRef, closeDropdown, reportError]);

	const runRangeDownload = useCallback(
		async (from: number, to: number) => {
			const config = flipBookRef.current?.getDownloadConfig?.();
			if (!config?.onDownloadPageRange) return;
			const pages: number[] = [];
			const semanticPages: SemanticPageInfo[] = [];
			for (let i = from; i <= to; i++) {
				pages.push(i);
				const info = selectablePages.find((sp) => sp.pageIndex === i);
				if (info) semanticPages.push(info);
			}
			setLoading("range");
			setError(null);
			try {
				const result = await config.onDownloadPageRange(
					pages,
					semanticPages,
					config.downloadContext,
				);
				if (result) {
					const fromName = sanitizeForFilename(semanticPages[0]?.semanticName ?? String(from));
					const toName = sanitizeForFilename(
						semanticPages[semanticPages.length - 1]?.semanticName ?? String(to),
					);
					triggerDownload(result, `${config.rangeFilename ?? "pages"}-${fromName}-${toName}`);
				}
				closeDropdown();
			} catch (e) {
				reportError(e);
			} finally {
				setLoading(null);
			}
		},
		[flipBookRef, selectablePages, closeDropdown, reportError],
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
					{error && (
						<div role="alert" className="flipbook-toolbar-download-error">
							{error}
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
					{children && <div className="flipbook-toolbar-download-extra">{children}</div>}
				</div>
			)}
		</div>
	);
};

export { DownloadDropdown };
