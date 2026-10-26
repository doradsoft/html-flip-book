import { describe, expect, it } from "vitest";
import { createDefaultDownloadConfig } from "../download/default-config";
import type { DownloadResult, SemanticPageInfo } from "../download/types";
import { FlipBook } from "../flipbook";
import type { PageSemantics } from "../page-semantics";

const NAMES = new Map([
	[1, "א"],
	[3, "ב"],
]);
const TITLES = new Map([
	[0, "Cover"],
	[3, "Chapter bet"],
]);
const SEMANTICS: PageSemantics = {
	indexToSemanticName: (i) => NAMES.get(i) ?? "",
	indexToTitle: (i) => TITLES.get(i) ?? "",
	semanticNameToIndex: () => null,
};

function decode(result: DownloadResult | null | undefined): SemanticPageInfo[] {
	if (!result) throw new Error("expected a download result");
	const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
	return JSON.parse(new TextDecoder().decode(bytes));
}

describe("createDefaultDownloadConfig", () => {
	it("exports every page with generated names when there is no pageSemantics", async () => {
		const config = createDefaultDownloadConfig({ pagesCount: 3 });
		const result = await config.onDownloadSefer?.();
		expect(result?.ext).toBe("json");
		expect(decode(result)).toEqual([
			{ pageIndex: 0, semanticName: "1", title: "Page 1" },
			{ pageIndex: 1, semanticName: "2", title: "Page 2" },
			{ pageIndex: 2, semanticName: "3", title: "Page 3" },
		]);
	});

	it("lists only pages with a semantic name or title for the entire book", async () => {
		const config = createDefaultDownloadConfig({ pagesCount: 4, pageSemantics: SEMANTICS });
		const result = await config.onDownloadSefer?.();
		expect(decode(result)).toEqual([
			{ pageIndex: 0, semanticName: "", title: "Cover" },
			{ pageIndex: 1, semanticName: "א", title: "" },
			{ pageIndex: 3, semanticName: "ב", title: "Chapter bet" },
		]);
	});

	it("exports the selected page range with semantic info", async () => {
		const config = createDefaultDownloadConfig({ pagesCount: 4, pageSemantics: SEMANTICS });
		const result = await config.onDownloadPageRange?.([1, 2, 3], [], undefined);
		expect(result?.ext).toBe("json");
		expect(decode(result)).toEqual([
			{ pageIndex: 1, semanticName: "א", title: "" },
			{ pageIndex: 2, semanticName: "", title: "" },
			{ pageIndex: 3, semanticName: "ב", title: "Chapter bet" },
		]);
	});

	it("round-trips non-Latin-1 text through the base64 payload", async () => {
		const config = createDefaultDownloadConfig({ pagesCount: 4, pageSemantics: SEMANTICS });
		const result = await config.onDownloadSefer?.();
		expect(decode(result)[1]?.semanticName).toBe("א");
	});
});

describe("FlipBook default download integration", () => {
	it("provides the built-in config when none is given", () => {
		const book = new FlipBook({ pagesCount: 4 });
		const config = book.getDownloadConfig();
		expect(config?.onDownloadSefer).toBeTypeOf("function");
		expect(config?.onDownloadPageRange).toBeTypeOf("function");
	});

	it("disables download entirely with enableDownload: false", () => {
		const book = new FlipBook({ pagesCount: 4, enableDownload: false });
		expect(book.getDownloadConfig()).toBeUndefined();
	});

	it("prefers a consumer-provided config over the default", () => {
		const onDownloadSefer = () => Promise.resolve(null);
		const book = new FlipBook({ pagesCount: 4, downloadConfig: { onDownloadSefer } });
		expect(book.getDownloadConfig()?.onDownloadSefer).toBe(onDownloadSefer);
		expect(book.getDownloadConfig()?.onDownloadPageRange).toBeUndefined();
	});
});
