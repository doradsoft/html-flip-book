import { expect, test } from "./fixtures/coverage-test";

test("starts input observation at pointer receipt and discards earlier background mutations", async ({
	page,
}) => {
	await page.goto("/?example=ltr-comprehensive");
	await expect(page.locator(".flipbook")).toBeVisible();
	const result = await page.evaluate(async () => {
		const moduleUrl = performance
			.getEntriesByType("resource")
			.find((entry) => new URL(entry.name).pathname.endsWith("/base/src/flipbook.ts"))?.name;
		if (!moduleUrl) throw new Error("The example's FlipBook module has not loaded");
		const { installInstrumentation } = await import(
			moduleUrl.replace("/base/src/flipbook.ts", "/perf/fixture/instrumentation.ts")
		);
		const perf = installInstrumentation();
		const target = document.querySelector<HTMLElement>(".flipbook");
		if (!target) throw new Error("Missing book fixture");
		perf.input.arm();
		target.dataset.backgroundProbe = "before input";
		await Promise.resolve();
		const backgroundAt = perf.mutations.firstAt();
		await new Promise(requestAnimationFrame);
		document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
		const receivedAt = perf.input.receivedAt();
		const clearedAtInput = perf.mutations.firstAt() === null;
		target.dataset.foregroundProbe = "after input";
		await Promise.resolve();
		return { backgroundAt, receivedAt, clearedAtInput, observedAt: perf.mutations.firstAt() };
	});
	expect(result.backgroundAt).not.toBeNull();
	expect(result.receivedAt).toBeGreaterThan(result.backgroundAt);
	expect(result.clearedAtInput).toBe(true);
	expect(result.observedAt).toBeGreaterThanOrEqual(result.receivedAt);
});
