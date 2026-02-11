declare module "*.md";

declare module "pdf-merger-js/browser" {
	class PDFMerger {
		add(input: Blob | File | ArrayBuffer | Uint8Array, pages?: number | number[]): Promise<void>;
		saveAsBuffer(): Promise<Uint8Array>;
		saveAsBlob(): Promise<Blob>;
		reset(): void;
	}
	export default PDFMerger;
}
