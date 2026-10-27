import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, normalize } from "node:path";

/**
 * Minimal static server for a built example dist (issue #289). The CI
 * build uses base /html-flip-book/ (GitHub Pages), so a leading
 * /html-flip-book prefix is stripped before resolving — the same server
 * then works for both CI and local `base: ""` builds. Requests that do
 * not map to a file fall back to index.html (SPA routing).
 */
const MIME: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".webp": "image/webp",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".pdf": "application/pdf",
	".md": "text/markdown; charset=utf-8",
	".ico": "image/x-icon",
	".map": "application/json",
};

export function serveDirectory(root: string, port: number): Promise<Server> {
	const server = createServer((req, res) => {
		const url = new URL(req.url ?? "/", "http://localhost");
		let pathname = decodeURIComponent(url.pathname);
		if (pathname.startsWith("/html-flip-book")) {
			pathname = pathname.slice("/html-flip-book".length) || "/";
		}
		const resolved = normalize(join(root, pathname));
		if (!resolved.startsWith(normalize(root))) {
			res.writeHead(403).end("forbidden");
			return;
		}
		const file =
			existsSync(resolved) && statSync(resolved).isFile()
				? resolved
				: join(root, "index.html");
		res.writeHead(200, {
			"content-type": MIME[extname(file)] ?? "application/octet-stream",
			"cache-control": "no-store",
		});
		createReadStream(file).pipe(res);
	});
	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(port, "127.0.0.1", () => resolve(server));
	});
}
