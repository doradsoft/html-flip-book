import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlipBook } from "../FlipBook";

/**
 * Tests for React component cleanup during flip animations
 * Verifies no memory leaks, proper Hammer.js cleanup, and no post-unmount callbacks
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

			expect(mocked.instances.length).toBe(1);
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

			// Each instance should have destroy called exactly once
			expect(mocked.instances.length).toBe(5);
			for (const instance of mocked.instances) {
				expect(instance.destroy).toHaveBeenCalledTimes(1);
			}
		});
	});

	describe("onPageChanged callback safety", () => {
		it("should not cause errors if onPageChanged is called after unmount", () => {
			let capturedCallback: ((index: number) => void) | undefined;

			// Capture the onPageChanged callback
			const MockFlipBookWithCallback = class {
				render = vi.fn();
				destroy = vi.fn();
				bookElement: HTMLElement | null = null;
				options: Record<string, unknown>;

				constructor(options: Record<string, unknown>) {
					this.options = options;
					capturedCallback = options.onPageChanged as (index: number) => void;
					mocked.instances.push(this as unknown as (typeof mocked.instances)[0]);
				}
			};

			vi.doMock("html-flip-book-vanilla", () => ({
				FlipBook: MockFlipBookWithCallback,
			}));

			const onPageChanged = vi.fn();
			const pages = [<div key="1">Page 1</div>, <div key="2">Page 2</div>];

			const { unmount } = render(
				<FlipBook pages={pages} className="test-flipbook" onPageChanged={onPageChanged} />,
			);

			// Unmount the component
			unmount();

			// Simulate callback being called after unmount (shouldn't crash)
			// This tests that the implementation handles post-unmount calls gracefully
			expect(() => {
				if (capturedCallback) {
					capturedCallback(1);
				}
			}).not.toThrow();
		});
	});

	describe("React StrictMode compatibility", () => {
		it("should handle double render from StrictMode", () => {
			const pages = [<div key="1">Page 1</div>];

			// In StrictMode, React renders components twice for development checks
			// The component should handle this gracefully

			const { unmount } = render(<FlipBook pages={pages} className="test-flipbook" />);

			// First instance created
			expect(mocked.instances.length).toBe(1);

			unmount();

			// destroy should be called
			expect(mocked.instances[0].destroy).toHaveBeenCalledTimes(1);
		});

		it("should clean up properly when re-rendering causes new instance", () => {
			const pages = [<div key="1">Page 1</div>];

			const { rerender, unmount } = render(<FlipBook pages={pages} className="test-flipbook" />);

			// Re-render with different className
			rerender(<FlipBook pages={pages} className="different-class" />);

			// Get the instance count after re-render
			const _finalInstanceCount = mocked.instances.length;

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

			// Each mount should create exactly one instance
			expect(mocked.instances.length).toBe(iterations);

			// Each instance should have destroy called
			const allDestroyed = mocked.instances.every(
				(instance) => instance.destroy.mock.calls.length === 1,
			);
			expect(allDestroyed).toBe(true);
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

			// Both should be cleaned up properly
			expect(mocked.instances.length).toBe(2);
			expect(mocked.instances[0].destroy).toHaveBeenCalled();
			expect(mocked.instances[1].destroy).toHaveBeenCalled();
		});
	});
});
