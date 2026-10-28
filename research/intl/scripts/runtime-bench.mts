/**
 * #341 runtime microbench: t(key, locale) lookup throughput.
 * LCG-varied inputs defeat constant folding so each iteration does a real
 * lookup. Reports median ns/op over repeated samples.
 */
import { performance } from "node:perf_hooks";
import { directionFromLocale, isRtl, t } from "../../../base/src/intl";
import { t as pt } from "../paraglide-proto/intl-paraglide";
import * as m from "../paraglide-proto/paraglide/messages/_index.js";

const dl = (m as Record<string, (i?: object, o?: { locale?: "en-US" | "he-IL" }) => string>)["toolbarItem.download"];

const keys = [
	"toolbarItem.download",
	"command.jumpToToc",
	"toolbarItem.exitFullscreen",
	"toolbarItem.downloadPageRange",
	"command.downloadEntireBook",
	"toolbarItem.missing",
];
const locales = ["en-US", "he-IL"] as const;

let seed = 123456789;
const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);

let checksum = 0;
function bench(name: string, fn: (k: string, l: "en-US" | "he-IL") => string, iters = 500_000, samples = 9) {
	for (let i = 0; i < 100_000; i++) checksum += fn(keys[next() % keys.length], locales[next() & 1]).length;
	const times: number[] = [];
	for (let s = 0; s < samples; s++) {
		const t0 = performance.now();
		let acc = 0;
		for (let i = 0; i < iters; i++) {
			acc += fn(keys[next() % keys.length], locales[next() & 1]).length;
		}
		times.push(((performance.now() - t0) * 1e6) / iters);
		checksum += acc;
	}
	times.sort((a, b) => a - b);
	const med = times[Math.floor(samples / 2)];
	const p95 = times[Math.floor(samples * 0.95)] ?? times[samples - 1];
	console.log(`${name.padEnd(34)} median ${med.toFixed(1)} ns/op   p95 ${p95.toFixed(1)}`);
}

bench("baseline t()", (k, l) => t(k, l));
bench("paraglide adapter t()", (k, l) => pt(k, l));
// static-call idiom: the LCG still varies the locale argument
bench("paraglide static call", (_k, l) => dl({}, { locale: l }));
bench("baseline isRtl+direction", (_k, l) => String(isRtl(l)) + directionFromLocale(l));

if (checksum === 0) console.log("unreachable", checksum);
