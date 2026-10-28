# #341 — Paraglide JS vs current intl: measured comparison

**Verdict: retain current intl.** At our catalog scale (22 keys × 2 locales)
Paraglide is worse on every measured axis: +0.7–1.7KB brotli even in its
best case, ~90MB of devDependencies, a 4–10s codegen step, and pressure
toward a breaking API change. Its tree-shaking advantage is real but only
materializes at catalog sizes we do not have (demonstrated crossover at
500 keys × 5 locales). The one capability worth having — invalid-key type
safety — is available in the current impl for ~1 line (`keyof typeof`).

## Environment

- Baseline: `master` (`6a943fd`), `base/src/intl` = 82 lines runtime,
  23 keys en-US + 23 he-IL, `t(key, locale)` + `isRtl`/`directionFromLocale`/`getConfig`/`defaultLocale`.
- Prototype: `@inlang/paraglide-js@2.29.1` (2026-10-19) +
  `@inlang/plugin-message-format@4.5.5`, offline `modules` resolution.
- Toolchain: Bun 1.4.4, repo's own Vite 8.3.5 (rolldown) `minify:true`,
  gzip -9 / brotli-11 via `research/intl/scripts/measure.mts`.
- Windows 11 x64. Numbers are same-machine medians; bundle diffs are exact.

## Shipped code (consumer bundles, minified)

| Fixture | raw (B) | gzip (B) | brotli (B) |
|---|---|---|---|
| baseline: 1 message used | 3,928 | 1,064 | 874 |
| baseline: full intl API, all keys | 4,736 | 1,212 | 1,002 |
| Paraglide: 1 message, static call | 4,036 | 1,736 | 1,553 |
| Paraglide: 1 message via `t()` adapter | 8,622 | 2,835 | 2,460 |
| Paraglide: full adapter API | 9,653 | 3,070 | 2,668 |
| Paraglide: 3 msgs × 2 locales | 4,427 | 1,832 | 1,618 |
| **scale**: baseline, 500×5 catalog, 10 msgs used | 163,871 | 13,179 | 3,735 |
| **scale**: Paraglide static, same 10 msgs | 7,575 | 2,037 | 1,787 |

Published artifact today: `base/dist/intl-*.js` = 3,989 raw / 1,109 gz / 914 br
(the whole intl module; also inlined into `react/dist/toolbar/index.js`).

### Reading

- **Current impl has zero tree-shaking** — one message still ships ~3.9KB
  (eager `configs` object = both catalogs always). Paraglide's pitch is
  aimed at this.
- But **Paraglide can't beat it at our size**: each generated message fn
  closes over `experimentalStaticLocale ?? options.locale ?? getLocale()`,
  which drags in the locale-strategy runtime (cookie/URL machinery,
  `document.cookie` refs survive minification). Floor ≈ 1.5KB brotli.
- **Our `t(key, locale)` API kills Paraglide's only advantage**: dynamic
  `messages[key]` lookup forces the bundler to retain all 22 messages +
  runtime → 8.6KB/2.4KB br for one message. Keeping API compatibility
  under Paraglide is strictly worse on every axis.
- **Crossover is real at scale**: 500 keys × 5 locales with 10 used —
  baseline ships everything (3.7KB br), Paraglide static calls shake to
  1.8KB br (-52%). If the catalog ever grows hundreds of keys or many
  locales, revisit.

## Runtime (Bun 1.4.4, LCG-varied inputs, 500K iters × 9 samples)

| Path | median ns/op | p95 |
|---|---|---|
| baseline `t()` | 68.7 | 211 |
| Paraglide adapter `t()` | 256.8 | 1,499 |
| Paraglide static call | 56.4 | 94.5 |

All ≪1µs. A toolbar render performs ~10 lookups → worst case ≈2.6µs —
immaterial either way. No UI benefit exists to distinguish here.

## Build/tooling

| Metric | baseline | Paraglide |
|---|---|---|
| codegen step | none | ~4–10s compile (22 keys), ~5.7s (500×5) |
| generated output | 82 lines (hand-written) | 133KB/9 files (22 keys), 2.2MB/502 files (500×5) |
| base typecheck | ~1.4s | generated `.js` ships precompiled → uncounted; committing it under `src/` would add ~500 files to lint/vcs scope |
| incremental edit | save file | edit JSON + re-run compile (or adopt unplugin/vite plugin in the lib build) |

## Dependency cost

- **+2 devDeps** (`@inlang/paraglide-js`, `@inlang/plugin-message-format`),
  **+27 transitive packages, ~90MB** in node_modules (incl. `@lix-js` 81MB,
  `@inlang/sdk`, `urlpattern-polyfill`, `jiti`, `valibot`, `unplugin`…).
- Consumers need **zero** new deps/tooling if output is precompiled into
  our dist (generated code is dependency-free JS).

## Migration / maintenance

| Task | current | Paraglide |
|---|---|---|
| add a key | edit 2 TS files | edit 2 JSON files + compile |
| add a locale | 1 file + union member + config entry | 1 JSON + settings + compile |
| invalid key | silent fallback (spec'd behavior) | **compile error** (static idiom) — the one genuine DX upgrade |
| call sites | `t(key, locale)` — 0 changes needed | adapter: 0 changes (but forfeits tree-shaking); idiom: ~10 toolbar files → `import { "key" as fn }` + `fn({}, {locale})` |
| public API | `html-flip-book-vanilla/intl` entry | static idiom **breaks** `/intl` consumers (no dynamic `t`) |

Compat gates: per-call `options.locale` → two toolbars in different
locales works (verified); fallback chain reproduced in adapter (verified
5/5 cases vs baseline); unknown-locale → base-locale string. SSR caveat:
generated `runtime.js` carries cookie/URL strategy machinery — inert when
`options.locale` is always passed but ships `document.cookie` refs.

## Alternatives that capture the benefit without Paraglide

1. **Drop `enFallbacks`** — verified 100% redundant: all 19 keys exist
   identically in en-US.ts. Pure deletion, ~150B bundle + one lookup hop.
2. **Type the keys** — `t(key: keyof typeof enUS.translations, …)` gives
   Paraglide's invalid-key compile error for one line (breaking change for
   external `t` callers — same cost as Paraglide's, none of its deps).
3. Revisit Paraglide if the catalog grows >~100 keys or >4 locales.

## Reproduce

```
bun run research/intl/scripts/measure.mts   # bundle table
bun run research/intl/scripts/runtime-bench.mts  # ns/op table
bunx paraglide-js compile --project ./research/intl/paraglide-proto/project.inlang \
  --outdir ./research/intl/paraglide-proto/paraglide
```

Prototype adapter: `research/intl/paraglide-proto/intl-paraglide.ts`
(API-compatible, verified). Scale catalogs: `research/intl/scale/`.
