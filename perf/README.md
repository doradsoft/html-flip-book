# Performance benchmarks

Paired base/head performance regression testing on ordinary GitHub-hosted
runners (issue #289). This directory is deliberately outside `e2e/`:
benchmarks are excluded from normal E2E discovery and never produce
coverage output.

## Commands

```bash
# Head-only smoke (builds this checkout, samples it once)
npm run perf

# Paired comparison — what CI runs on PRs
npm run perf:compare -- <base-ref>

# Same-revision A/A calibration (establishes the noise floor)
npm run perf:compare -- HEAD

# Dev iteration without rebuilding
node scripts/perf-run.mts --base <sha> --pairs 20 --skip-build
```

## Design

- `scripts/perf-run.mts` builds each immutable revision from its own
  worktree and lockfile (`npm ci` + `npm run build` + `npm run
  build:example`), serves both production builds statically on fixed
  ports (base `4101`, head `4102`), then runs `playwright.perf.config.ts`.
  Build/install time never enters the samples.
- `playwright.perf.config.ts` pins `workers: 1`, `fullyParallel: false`,
  `retries: 0`, no coverage reporter, no video/trace/screenshot capture.
  One measured browser at a time; fixtures, fonts and builds are all
  settled before the first sample.
- Scenarios sample in balanced alternating pair order (base→head,
  head→base) with a fresh browser context per leg. Cold start and warmed
  interaction stay separate measurements.
- A leg is invalid when the scenario does not do the work — e.g. the page
  never advances — so a broken build cannot look "faster".

## Statistics and outcomes

Per metric the report records raw per-pair samples, the paired diffs
`head - base`, median diff, median ratio, the paired-diff IQR and
direction agreement. Uncertainty is computed at the run/pair level —
individual frames inside one run are not independent repetitions.

Three outcomes per metric (thresholds in `perf/harness/report.mts`):

| outcome | meaning |
| --- | --- |
| `ok` | no meaningful change: relative and absolute deltas below policy |
| `regression` | `medianRatio-1 >= rel` **and** `medianDiff >= absFloor` **and** ≥ 80% of pairs agree |
| `improvement` | same test with the sign flipped — reported, never a gate |
| `inconclusive` | < 6 valid pairs, invalid legs, or paired-diff IQR above the noise bound |

Frame-gap tails (p95/max) catch regressions that average FPS hides. rAF
gaps are callback-cadence proxies, not presented-frame proof; a >16.7ms
gap is not automatically a dropped frame. Hosted runners give a relative
signal — real-device runs remain necessary for display-smoothness claims.

## Calibration

Budgets start advisory. Run the A/A comparison (`--base HEAD`, or the
workflow_dispatch `perf_base=HEAD` default) across several workflow runs
to measure same-revision noise before tightening `rel`/`absFloor` or
promoting the job to a required gate.

## Boundaries

- Results go only to `perf-results/` (`samples.json`, `report.json`,
  `summary.md`) and the `perf-results` workflow artifact (30-day
  retention). Nothing lands in `.coverage/`, `e2e-coverage-*`,
  Codecov/Codacy reports or coverage badges.
- The CI job is PR + workflow_dispatch only, `contents: read`, no
  secrets, `timeout-minutes: 45` on the job plus Playwright's own
  per-test timeout. Local runs are bounded the same way.
- `--pairs` (default 10, CI uses 10) is the documented bounded sample
  count; raise it only with evidence the noise floor needs more data.
