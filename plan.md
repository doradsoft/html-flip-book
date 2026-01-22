# FlipBook Testing Enhancement Plan

## Overview

The project has 100% code coverage but lacks meaningful behavioral tests. This plan creates a comprehensive test suite that verifies actual user experience across all interaction scenarios.
This branch is based on an older but stable commit e4c0b3d3d796cc3ebeac2193499ef7ac1b674aba. After verifying tests here, we will override master branch remotely.
---

## 1. Code Architecture & Responsibilities

### Core Components

| Component | File | Responsibility |
|-----------|------|----------------|
| **Leaf** | `base/src/leaf.ts` | Single flippable page (2 sides), manages `flipPosition` (0-1), transforms, z-index |
| **FlipBook** | `base/src/flipbook.ts` | Controller — manages leaves, handles Hammer.js events, coordinates animations |
| **FlipDirection** | `base/src/flip-direction.ts` | Enum: `Forward`, `Backward`, `None` |
| **AspectRatio** | `base/src/aspect-ratio.ts` | Page proportions calculation |
| **Size** | `base/src/size.ts` | Dimension calculations, aspect ratio fitting |
| **FlipBookOptions** | `base/src/flip-book-options.ts` | Configuration interface |

### Key State Variables (FlipBook)

| Variable | Type | Purpose |
|----------|------|---------|
| `currentLeaf` | `Leaf \| undefined` | Leaf being manipulated |
| `flipDirection` | `FlipDirection` | Current flip direction |
| `flipStartingPos` | `number` | X position when drag started |
| `isDuringManualFlip` | `boolean` | User is dragging |
| `isDuringAutoFlip` | `boolean` | Animation in progress |
| `flipDelta` | `number` | Current drag distance |

### Key State Variables (Leaf)

| Variable | Type | Purpose |
|----------|------|---------|
| `flipPosition` | `number` (0-1) | Current flip progress |
| `isTurned` | `boolean` | `flipPosition === 1` |
| `isTurning` | `boolean` | `flipPosition !== 0` |

### Critical Thresholds

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `FAST_DELTA` | `500` px/s | `flipbook.ts:11` | Velocity threshold for fast swipe |
| Z-index flip | `0.5` | `leaf.ts` | Position where z-index changes |
> **⚠️ Implementation Note:** `FAST_DELTA` is currently hardcoded as `const FAST_DELTA = 500`. This should become configurable via `FlipBookOptions` for two reasons:
> 1. **Testing efficiency** — Tests can use a lower threshold (e.g., 100px/s) to reduce mouse movement distances and animation times
> 2. **User customization** — Different devices/use cases may need different sensitivity
---

## 2. Observable State (Inspection Points)

### DOM Inspection (E2E)

| Property | Selector/Method | Values |
|----------|-----------------|--------|
| Page visibility | `.page.visible` | Class present/absent |
| Flip rotation | `getComputedStyle().transform` | `rotateY(Xdeg)` |
| Z-index | `getComputedStyle().zIndex` | Number |
| Page index | `data-page-index` | "0", "1", "2"... |
| Transform origin | `getComputedStyle().transformOrigin` | `left` or `right` |

### Code Inspection (Unit)

| Property | Access | Values |
|----------|--------|--------|
| `leaf.flipPosition` | Direct | 0-1 |
| `leaf.isTurned` | Getter | boolean |
| `leaf.isTurning` | Getter | boolean |
| `flipbook.flipDirection` | Private (test via behavior) | Forward/Backward/None |

---

## 3. Test Matrix Dimensions

### Primary Dimensions

| Dimension | Values | Multiplier |
|-----------|--------|------------|
| Book direction | `ltr`, `rtl` | ×2 |
| Input method | `mouse`, `touch` | ×2 |
| Flip direction | `forward`, `backward` | ×2 |
| Velocity | `slow` (<500px/s), `fast` (≥500px/s) | ×2 |
| Drop position | `no-drop`, `before-middle` (<0.5), `after-middle` (≥0.5) | ×3 |
| Target leaf | `first`, `second`, `middle`, `last`, `one-before-last` | ×5 |

** subtotal combinations:** 2 × 2 × 2 × 2 × 3 × 5 = **240 cases**

### inital states

depends on target leaf:
| Target Leaf | Initial States |
|-------------|----------------|
| First Leaf | Closed book, First Leaf turned |
| Second Leaf | First Leaf turned, Second Leaf turned |
| Middle Leaf | Middle Leaf unturned, Middle Leaf turned |
| One-before-last Leaf | Two-before-last Leaf turned, One-before-last Leaf turned |
| Last Leaf | One-before-last Leaf turned, Last Leaf turned |

**Total initial states:** 2 per target leaf × 5 leaves = **10 initial states**
**Total combinations:** 240 cases × 10 states = **2400 total test cases**

### Adjacent Leaf Observations

For each primary case, observe:

| Observation Target
|--------------------|
| Held leaf |
| Previous leaf |
| Next leaf |

| Observation properties |
flipPosition, isTurned, isTurning, z-index, translateX, scaleX, rotateY, visibility |

**Total observations per case:** 3 leaves × 8 properties = **24 observations**
**Total observations:** 2400 cases × 24 observations = **57,600 data points**

### Future Dimensions

Planned additions that will further multiply the matrix:
- Flip axis: `horizontal`, `vertical` — ×2

**Future total:** 57,600 × 2 = **115,200 data points**

### Scale Problem & Solution

**Problem:** Even at 1 second per test, 57,600 tests = 16 hours. The code to represent all combinations would be massive and unmaintainable.

**Solution: Randomized Parametrized Testing**

Instead of exhaustive enumeration, we implement:

1. **Parametrized Arrange & Act, fixed Assert** — Dimensions are split between Arrange and Act phases. Assert verifies expected outcomes based on the parameter combination.
2. **Random sampling** — Each CI run tests a random subset of the full matrix
3. **Seed-based reproducibility** — Failed runs can be reproduced with the same seed
4. **Coverage tracking** — Track which combinations have been tested over time
5. **Priority weighting** — Edge cases (first/last leaf, boundary velocities) run more often

**Dimension → Phase Mapping:**

| Dimension | Phase | Notes |
|-----------|-------|-------|
| Book direction | Arrange | `ltr` / `rtl` — set at FlipBook init |
| Initial state | Arrange | Which leaves are pre-turned — **depends on target leaf (Act)** |
| Input method | Act | `mouse` / `touch` |
| Flip direction | Act | `forward` / `backward` |
| Velocity | Act | px/s value |
| Drop position | Act | 0-1 (where drag ends) |
| Target leaf | Act | Which leaf to interact with |

> **⚠️ Dependency:** Initial state (Arrange) depends on target leaf (Act). This means test generation must first pick the Act parameters, then derive valid Arrange states. For example, to flip the "middle leaf backward," the middle leaf must already be turned.

**Test Structure:**
```
Arrange (parametrized):
├── direction: ltr/rtl
├── initialState: derived from target leaf
├── DOM container setup (hardcoded)
├── FlipBook instantiation (hardcoded)
└── Page content (hardcoded)

Act (parametrized):
├── targetLeaf: which leaf to interact with
├── inputMethod: mouse/touch
├── flipDirection: forward/backward
├── velocity: px/s
└── dropPosition: 0-1

Assert:
└── Verify expected state based on parameters
    (flipPosition, z-index, visibility, animation completion)
```

**Stratified Sampling Approach:**

To ensure equal representation across behavior-changing thresholds, use stratified random sampling:

| Parameter | Categories | Distribution | Rationale |
|-----------|------------|--------------|------|
| `velocity` | slow / fast | 50% / 50% | Equal coverage of `FAST_DELTA` threshold |
| `dropPos` | no-drop / before / after | 33% / 33% / 33% | Equal coverage of flip completion outcomes |
| `leafIndex` | first / last / one-before-last / middle | 15% / 15% / 10% / 60% | Edge cases over-sampled |

Implementation: First pick the category randomly, then randomize within that category's range.

**CI Strategy:**
- Mocked tests: Run 50-100 random cases per build (~1 min)
- Integration tests: Run 20-50 random cases per build (~2 min)
- Nightly: Run 500+ cases to increase coverage
- Store tested combinations in artifact to track cumulative coverage

---



### Expected Outcomes Matrix

| Drop Position | Velocity | Expected Flip Completion |
|---------------|----------|--------------------------|
| Before middle (<0.5) | Slow | ❌ Returns to start |
| Before middle (<0.5) | Fast (toward flip) | ✅ Completes flip |
| After middle (≥0.5) | Slow | ✅ Completes flip |
| After middle (≥0.5) | Fast (toward flip) | ✅ Completes flip |
| After middle (≥0.5) | Fast (against flip) | ❌ Returns to start |

---

## 5. Testing Infrastructure

### Directory Structure

```
base/src/__tests__/
├── test-utils.ts              # Shared utilities for unit tests
├── leaf.test.ts               # Existing + enhanced
├── flipbook.test.ts           # Existing + enhanced
└── state-inspection.test.ts   # New: verify inspection methods work

e2e/
├── fixtures/
│   ├── flip-book-page.ts      # Page object model
│   ├── hammer-mock.ts         # Inject synthetic Hammer events
│   ├── dom-inspection.ts      # DOM state extraction helpers
│   └── test-cases.ts          # Shared test case definitions
├── mocked/                    # Fast tests (mocked Hammer + page.clock)
│   ├── hold-drag.spec.ts
│   ├── velocity-threshold.spec.ts
│   └── z-index-transitions.spec.ts
├── integration/               # Slow tests (real browser events)
│   ├── hold-drag.spec.ts
│   ├── velocity-threshold.spec.ts
│   └── browser-compatibility.spec.ts
├── direction.spec.ts          # Existing (enhance with RTL)
├── mouse.spec.ts              # Existing
├── navigation.spec.ts         # Existing
├── styling.spec.ts            # Existing
└── touch.spec.ts              # Existing

react/src/__tests__/
├── FlipBook.test.tsx          # Existing
└── unmount-during-flip.test.tsx  # New: cleanup verification
```

### Animation Testing Strategy

| Event Source | Timing Control | Test Location | Speed | Use Case |
|--------------|----------------|---------------|-------|----------|
| Mocked Hammer.js | `page.clock` | `e2e/mocked/` | Fast (~30s) | Intermediate positions, z-index at 0.5 |
| Real browser events | Real timing | `e2e/integration/` | Slow (~2-5min) | Completion, browser compat |

### Playwright Configuration

Add two project configurations:
- `mocked-fast` — Matches `e2e/mocked/*.spec.ts`, minimal config
- `integration-slow` — Matches `e2e/integration/*.spec.ts`, with retries and longer timeout
```

---

## 6. React Testing Scope

### In Scope

| Scenario | Test Type | Verification |
|----------|-----------|--------------|
| Component unmounts mid-flip | Unit (vitest) | No memory leaks, Hammer cleanup, no post-unmount callbacks |

### Out of Scope (Unrealistic)

- `direction` prop changes mid-flip
- `pagesCount` prop changes mid-flip
- `onPageChanged` callback ref changes mid-flip

---

## 7. Implementation Order

### Phase 1: Infrastructure

1. **Test utilities** (`base/src/__tests__/test-utils.ts`)
   - `createMockContainer()` — Enhanced DOM setup
   - `getLeafState(leaf)` — Extract flipPosition, isTurned, isTurning
   - `triggerHammerEvent(type, options)` — Synthetic Hammer events

2. **E2E fixtures** (`e2e/fixtures/`)
   - `FlipBookPage` class — Page object model
   - `injectHammerMock()` — Browser-side Hammer interception
   - `getDOMState()` — Extract all leaf transforms, z-indices

3. **Shared test cases** (`e2e/fixtures/test-cases.ts`)
   - Randomized test case generator with stratified sampling
   - Seed-based reproducibility
   - Helper to generate test names from parameters

### Phase 2: Mocked Fast Tests

4. **Mocked hold-drag tests** (`e2e/mocked/hold-drag.spec.ts`)
   - All leaf position scenarios
   - Using `page.clock` for intermediate states

5. **Velocity threshold tests** (`e2e/mocked/velocity-threshold.spec.ts`)
   - Verify `FAST_DELTA` (500px/s) behavior
   - Edge cases at threshold

6. **Z-index transition tests** (`e2e/mocked/z-index-transitions.spec.ts`)
   - Verify z-index flips at 0.5 position
   - Adjacent leaf z-index correctness

### Phase 3: Integration Slow Tests

7. **Real hold-drag tests** (`e2e/integration/hold-drag.spec.ts`)
   - Same cases as mocked, real browser events
   - Verify mocked tests catch same issues

### Phase 4: React & Cleanup

8. **Unmount mid-flip test** (`react/src/__tests__/unmount-during-flip.test.tsx`)
   - Memory leak detection
   - Event listener cleanup

### Phase 5: RTL Coverage

9. **RTL E2E tests** (`e2e/direction.spec.ts`)
   - Mirror all LTR tests with RTL
   - Verify delta calculation inversion

---

## 8. Success Criteria

### Quantitative

- [ ] Randomized tests cover all dimension categories over multiple CI runs
- [ ] Mocked tests run in < 60 seconds
- [ ] Integration tests run in < 5 minutes
- [ ] No test flakiness (mocked: 0 retries needed, integration: ≤2 retries)

### Qualitative

- [ ] Intermediate flip positions (25%, 50%, 75%) verified
- [ ] Z-index transitions at 0.5 threshold verified
- [ ] Velocity threshold (500px/s) boundary verified
- [ ] Adjacent leaf state during flip verified
- [ ] Both LTR and RTL fully covered
- [ ] React cleanup on unmount verified

---

## 9. CI/CD Integration

```yaml
# Suggested workflow
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm test  # vitest

  e2e-mocked:
    runs-on: ubuntu-latest
    steps:
      - run: npx playwright test --project=mocked-fast
    # Runs on every push

  e2e-integration:
    runs-on: ubuntu-latest
    steps:
      - run: npx playwright test --project=integration-slow
    # Runs on PR merge / nightly
```

---

## 10. Open Questions

1. **Hammer.js mock approach** — Inject via `page.addInitScript` or expose `window.__flipbook_hammer__`?
2. **Touch simulation** — Use Playwright's touch API or Hammer's programmatic trigger?
3. **Animation easing** — Should tests verify easing curve accuracy or just endpoints?
