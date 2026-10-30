/** Measure real readiness, releasing the fallback timer and mounted fixture on every path. */
export async function measureReadyMount(
	mount: (ready: () => void) => void,
	dispose: () => void,
): Promise<number> {
	const started = performance.now();
	try {
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error("React mount did not become ready within 10000ms"));
			}, 10_000);
			try {
				mount(() => {
					clearTimeout(timer);
					resolve();
				});
			} catch (error) {
				clearTimeout(timer);
				reject(error);
			}
		});
		return performance.now() - started;
	} finally {
		dispose();
	}
}
