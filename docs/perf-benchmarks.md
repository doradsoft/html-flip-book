# Performance benchmarks

Isolated performance harness for regression detection (issues #289, #290, #291).
It lives outside the unit test and Playwright E2E coverage paths: it produces
no coverage output and does not affect merged LCOV, Codecov, Codacy or badges.

## What runs

`scripts/perf/compare.mts` builds two variants of the library, base (a git ref)
and candidate (the working tree), then drives byte-identical fixture pages in
one chromium instance. Paired samples interleave base and candidate so
machine-wide drift hits both sides of a pair.

- `npm run perf -- --base origin/master` compares a ref against the checkout.
- `npm run perf:selfcheck` runs candidate-vs-candidate with an injected
  per-frame delay; it must report `regression`, proving the harness detects a
  representative slowdown. CI runs this gate before the real comparison.

Options: `--samples N` (default 8 paired samples per side), `--audit-pairs N`
(default 4 paired audit passes per side), `--scenario turn,scaling`,
`--sizes 20,200,1000`, `--out <dir>`.

## A/A calibration and verdicts

Every run also collects `samples` base-vs-base pairs. A metric's noise floor
is `|median A/A diff| + 2 * MAD`. Verdicts per metric:

- `regression`: paired median diff exceeds `max(threshold, noiseFloor)` **and**
  the median ratio exceeds the metric's ratio budget **and** the bootstrapped
  90% CI on the paired diff is entirely positive.
- `inconclusive`: the noise floor or sample spread swallows the budget, or
  >25% of samples were invalid. Not a pass.
- `no-regression`: effect within budget and noise floor.
- `unsupported`: metric unsupported on the platform (e.g. LoAF observer).
- `error`: invalid samples dominated — skipped work never counts as an
  improvement.

Scenario outcome is the worst metric verdict. Exit codes: `0` all
no-regression, `1` regression/error, `2` inconclusive only. The CI
workflow maps `2` to a step warning, not a failure — inconclusive is
advisory while per-run calibration matures; a calibrated regression
(`1`) still fails the job.

## Scenarios

- `turn` (#290): rAF gap distribution during 4 awaited `flipNext()` turns,
  budgets over 16.7/33.3/50 ms, command-to-completed-turn timing,
  pointer-event-to-first-visible-mutation latency, long task and (where
  supported) long animation frame counts. rAF callback fps is reported as
  supplemental cadence only. Custom markers are not labelled INP.
- `scaling` (#291): 20/200/1000-page books with proportional bookmark
  density. Separate windows: fixture DOM build (harness overhead), init +
  render, bookmark provider refresh, fixed navigation sequence, resize
  relayout, destroy/recreate cycles, and React `createRoot` mount-to-ready.
  Instrumented audit passes report retained DOM nodes, event listeners,
  documents, heap delta (after forced GC), pending timers/rAF and live
  observers after teardown. Audits run as real base/candidate pairs on
  fresh pages — Performance counters include objects retained from earlier
  documents in the same renderer, so reusing the sampling page would leak
  the previous fixture into the baseline. Audit metrics join the same
  paired-statistics pipeline with their own A/A calibration. Growth is
  reported as a table per size — no complexity class is inferred from
  three points.

## Artifacts

`perf-results/<run>/result.json` records raw paired samples, A/A calibration
pairs, per-metric stats (median diff, MAD, median ratio, CI90), the noise
floor, thresholds, verdict reasons, environment metadata (node, chromium,
platform, cpus, memory), exact base and candidate SHAs, sample counts and
the outcome. CI uploads `perf-results/` with 30-day retention.

## Limits

- One browser; a shared page for timed samples, a fresh page per audit
  pass. Video, screenshots and tracing stay off.
- Default runtime budget: ~30 min job timeout; `--samples` over 20 doubles
  run time linearly and rarely changes verdicts.
- The workflow runs on `pull_request` with `contents: read` and no secrets,
  so untrusted PR code executes read-only.
- Timing noise on shared CI runners can push metrics to `inconclusive`;
  rerun or increase `--samples` rather than widening thresholds.
