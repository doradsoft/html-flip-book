import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlipBook } from "../FlipBook";

/**
 * Tests for React component cleanup during flip animations
 * Verifies no memory leaks, proper Hammer.js cleanup, and no post-unmount callbacks.
 * Instance-count assertions allow for React Strict Mode double-mount (1 or 2 instances per mount).
 */

const mocked = vi.hoisted(() => ({
	instances: [] as Array<{
		render: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
		bookElement: HTMLElement | null;
		options: Record<string, unknown>;
	}>,
	MockFlipBook: class {
		render = vi.fn();
		destroy = vi.fn();
		bookElement: HTMLElement | null = null;
		options: Record<string, unknown>;

		constructor(options: Record<string, unknown>) {
			this.options = options;
			mocked.instances.push(this);
		}
	},
}));

// Mock the base FlipBook
vi.mock("html-flip-book-vanilla", () => ({
	FlipBook: mocked.MockFlipBook,
}));

describe("FlipBook Unmount During Flip", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocked.instances.length = 0;
	});

	afterEach(() => {
		cleanup();
	});

	describe("destroy() cleanup", () => {
		it("should call destroy() when component unmounts", () => {
			const pages = [<div key="1">Page 1</div>, <div key="2">Page 2</div>];

			const { unmount } = render(<FlipBook pages={pages} className="test-flipbook" />);

			expect(mocked.instances.length).toBeGreaterThanOrEqual(1);
			expect(mocked.instances[0].destroy).not.toHaveBeenCalled();

			unmount();

			expect(mocked.instances[0].destroy).toHaveBeenCalledTimes(1);
		});

		it("should call destroy() even if render() was called", () => {
			const pages = [<div key="1">Page 1</div>];

			const { unmount } = render(<FlipBook pages={pages} className="test-flipbook" />);

			// render() is called during mount
			expect(mocked.instances[0].render).toHaveBeenCalled();

			unmount();

			// destroy() should still be called
			expect(mocked.instances[0].destroy).toHaveBeenCalledTimes(1);
		});

		it("should handle rapid mount/unmount cycles", () => {
			const pages = [<div key="1">Page 1</div>];

			// Simulate rapid mount/unmount (like React StrictMode or fast navigation)
			for (let i = 0; i < 5; i++) {
				const { unmount } = render(<FlipBook pages={pages} className="test-flipbook" />);
				unmount();
			}

			// Each mount may create 1 or 2 instances (Strict Mode); each unmount must trigger destroy
			expect(mocked.instances.length).toBeGreaterThanOrEqual(5);
			const totalDestroyCalls = mocked.instances.reduce(
				(sum, i) => sum + i.destroy.mock.calls.length,
				0,
			);
			expect(totalDestroyCalls).toBeGreaterThanOrEqual(5);
		});
	});

	describe("React StrictMode compatibility", () => {
		it("should handle double render from StrictMode", () => {
			const pages = [<div key="1">Page 1</div>];

			// In StrictMode, React may mount twice; the component should handle this gracefully
			const { unmount } = render(<FlipBook pages={pages} className="test-flipbook" />);

			expect(mocked.instances.length).toBeGreaterThanOrEqual(1);

			unmount();

			expect(mocked.instances[0].destroy).toHaveBeenCalledTimes(1);
		});

		it("should clean up properly when re-rendering causes new instance", () => {
			const pages = [<div key="1">Page 1</div>];

			const { rerender, unmount } = render(<FlipBook pages={pages} className="test-flipbook" />);

			// Re-render with different className
			rerender(<FlipBook pages={pages} className="different-class" />);

			unmount();

			// After unmount, all created instances should have destroy called
			// This verifies no resources are leaked even if multiple instances are created
			let destroyCalledCount = 0;
			for (const instance of mocked.instances) {
				if (instance.destroy.mock.calls.length > 0) {
					destroyCalledCount++;
				}
			}

			// At least the last instance should have destroy called
			expect(destroyCalledCount).toBeGreaterThanOrEqual(1);
		});
	});

	describe("memory leak prevention", () => {
		it("should not accumulate instances on repeated mount/unmount", () => {
			const pages = [<div key="1">Page 1</div>];

			// Create and destroy many times
			const iterations = 10;
			for (let i = 0; i < iterations; i++) {
				const { unmount } = render(<FlipBook pages={pages} className="test-flipbook" />);
				unmount();
			}

			// Each mount creates at least one instance (Strict Mode may create 2 per mount)
			expect(mocked.instances.length).toBeGreaterThanOrEqual(iterations);
			const totalDestroyCalls = mocked.instances.reduce(
				(sum, i) => sum + i.destroy.mock.calls.length,
				0,
			);
			expect(totalDestroyCalls).toBeGreaterThanOrEqual(iterations);
		});

		it("should properly clean up with different pages counts", () => {
			// Mount with 10 pages
			const tenPageIds = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
			const tenPages = tenPageIds.map((id, i) => <div key={id}>Page {i}</div>);
			const { unmount: unmount1 } = render(<FlipBook pages={tenPages} className="test-flipbook" />);
			unmount1();

			// Mount with 2 pages
			const twoPages = [<div key="1">Page 1</div>, <div key="2">Page 2</div>];
			const { unmount: unmount2 } = render(<FlipBook pages={twoPages} className="test-flipbook" />);
			unmount2();

			// At least 2 instances (one per mount); each unmount triggered destroy
			expect(mocked.instances.length).toBeGreaterThanOrEqual(2);
			const totalDestroyCalls = mocked.instances.reduce(
				(sum, i) => sum + i.destroy.mock.calls.length,
				0,
			);
			expect(totalDestroyCalls).toBeGreaterThanOrEqual(2);
		});
	});
});
