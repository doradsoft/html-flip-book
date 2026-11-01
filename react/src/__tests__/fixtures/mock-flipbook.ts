import { vi } from "vitest";

interface MockFlipBookInstance {
	render: ReturnType<typeof vi.fn>;
	destroy: ReturnType<typeof vi.fn>;
	setDownloadConfig: ReturnType<typeof vi.fn>;
	bookElement: HTMLElement | null;
	options: Record<string, unknown>;
	currentPageIndex: number;
}

export const mocked: {
	instances: MockFlipBookInstance[];
	MockFlipBook: new (options: Record<string, unknown>) => MockFlipBookInstance;
} = {
	instances: [],
	MockFlipBook: class {
		render = vi.fn();
		destroy = vi.fn();
		setDownloadConfig = vi.fn();
		bookElement: HTMLElement | null = null;
		currentPageIndex = 0;
		options: Record<string, unknown>;

		constructor(options: Record<string, unknown>) {
			this.options = options;
			mocked.instances.push(this);
		}
	},
};
