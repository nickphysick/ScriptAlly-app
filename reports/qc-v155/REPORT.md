# Query Centre v155: quiet state, day one, loading skeleton

Branch `query-centre-v155` (pushed), cut from `query-centre-v154-1` at `fb0e4e4d3`. v154.1 is not on `main`.
Design ref `design-refs/query-centre-v155.html`, sha256 `dc384d58…6e79e818`, verified before Step 1.

## False or inexact premises

1. **"On dev, load the Query Centre…" for Step 0.** The "before" captures were taken on the emulator (`demo-scriptally`, harness account) from a clean checkout of the base commit, not on live dev. CLAUDE.md makes the emulator the default and live Firestore opt-in. The harness account has queries in every group, so the quiet and day-one states come from a new dev-only review aid that takes rows away (`window.__SA_QC_STATE`, below). The base build has no such aid, so "quiet, before" was read from the code, not captured.
2. **Day one's chart is "v154's empty state".** That holds only when the writer has no sends at all. The chart counts every manuscript's sends (v154's design), but day one is decided per manuscript. A writer with sends on another book sees those bars on a manuscript with no queries. The chart's rendering was left alone (it is on the do-not-touch list).
3. **"The loading skeleton … header renders straight away."** It did, but it was not stable. Before this work the chart's loading box was 0px tall against 194.19px loaded, so the header grew 11.06px when the data landed and the toolbar and rail moved down 11.06px. While loading, the list also said **"No queries match · this view · Reset filters"**, which was false. Both are fixed (Phase 3).
4. **The 200ms threshold.** The page already had a loading model (`useQcLoad`: blank under 150ms, then a skeleton held for at least 400ms), shared with To-do and Analytics. It now takes a timing argument. The desktop Query Centre passes `QC155_LOAD` (200ms, no floor); every other reader keeps 150/400.

## Commits

| Phase | Commit |
|---|---|
| 1 · shared panel + quiet state | `7980b4bcd` |
| 2 · day one | `1e70bf688` |
| 3 · loading skeleton | `3a8a593b8` |
| 4 · measured, two fixes | `c2b9fe46f` |
| 4 · report + screens | this commit |
| dev line merges | `7efd8d88a`, then `da2a05a60` on `dev/…-qc154-qc1541-pa4-qc155` |

## Gates against baseline

| Gate | Baseline (`fb0e4e4d3`) | Now |
|---|---|---|
| `tsc --noEmit` | 2 errors (functions/ modules unresolved; the worktree had no `functions/node_modules`) | 0 errors |
| `vite build` | clean | clean (no error, no warning) |
| Vitest | 8 files / 5 tests failed, 11541 passed, 3 skipped | 4 files / 5 tests failed, 11612 passed, 3 skipped |

The remaining reds are all pre-existing and none touch this work: `functions/eval/generate.test.ts`, `src/test/emuGuard.test.ts` and `src/test/firestoreTarget.test.ts` (both list 28 older e2e helper scripts), plus one timeout under load. The baseline's `functions/` reds cleared once `functions/node_modules` was linked. A new red this work caused, `marketingTokens.test.ts` (the panel named its font families instead of reading `--sp-type` / `--sp-serif`), was fixed in `c2b9fe46f`.

Measurement: `tests/e2e/qc155.measure.ts` passed all of S1, S2, S3 and S3-reduced-motion at 1440 and 1920 through the test slot. S4 is covered under "The everyday page".

## What the three conditions rendered before

- **No queries:** v138's desktop empty page (`QcEmpty138`): the navy "Every query, in one place" header, "How it works" with an example query, and "Ways to get started". Screens: `dayone-before-1440.png`, `dayone-before-1920.png`.
- **Nothing needing the writer:** the ordinary list from Watch and wait down, with nothing said about it (read from code).
- **Slow load:** the real header with an empty title and an empty chart box, the rail, and a false "No queries match · this view · Reset filters" in the list. The page shifted by 11px when the data landed. Screens: `loading-before-*.png`, readings `shift-before-*.json`.

## Earlier empty-state files now unused

`src/components/queries/centre/QcEmpty138.tsx` and `qcvEmpty138.css` were deleted in Phase 2. Only `Queries.tsx` imported them. The phone's `QcEmpty` and `QcExhibit` stay, because the phone's first-run branch still uses them. Two older measurements still mention v138's empty page and would now fail on it: `tests/e2e/qcV138Shots.measure.ts` and the `[data-qc138="empty-header"]` selector in `tests/e2e/hp2Lib.ts`. Both measure pages long superseded and were left as history. Comments in `EmptyPanel.tsx` and `A21Empty.tsx` still name `QcEmpty138` as a past sibling.

## Header height and layout shift

- **Header height:** 198.19px populated and 198.19px on day one, with the toolbar at y 347.94 in both (1440 and 1920).
- **Layout shift from skeleton to loaded list** (`shift-after-*.json`): header, title, buttons, chart, toolbar, bar and rail all moved **0** (dx, dy, dw and dh), at both widths. Before this work: header dh +11.06, chart dh +194.19, toolbar, bar and rail dy +11.06.
- **The "for" line:** the harness account has several manuscripts and no scope, so it draws no "for" line, loaded or not. On an account that does draw one, the line will appear when the data lands and push the buttons down. This is deferred (below).

## Screens and comparison with the ref

| State | Build | Ref |
|---|---|---|
| Quiet | `quiet-after-1440.png`, `-1920` | `ref-quiet-*.png` |
| Day one | `dayone-after-*.png` | `ref-dayone-*.png` |
| Loading | `loading-after-*.png`; reduced motion `loading-reduced-1920.png` | `ref-loading-*.png` |
| Everyday | `everyday-after-*.png` vs `everyday-before-*.png` | `ref-everyday-*.png` |

Measured values that match the ref: the panel (white, 16px radius, `0 0 0 1px #e6dfd4`, padding 34px 30px, margins 14px and 18px, full list width); the heading (Special Elite, 26px, 400, `#1c130f`, 8px below); the body (Source Serif 4, 16px/24px, `#5b4f47`, 60ch = 498.56px); the links (navy `#2a3a52`, 600, underline offset 3px). The day-one body wraps on the same words as the ref. The skeleton: heading bars 22 × 220px with 6px radius, `#ebe5db`, 26px above and 14px below; a 3-across grid with 14px gaps, built on the real `.qc154-grid` so its breakpoints match the cards'; cards 168px tall with 16px radius and a `#ebe5db` ring; a 1.3s sweep; 2 cards, then 6.

Where the build departs from the ref, and why:

1. **The skeleton's seal disc and third fact bar.** The ref's gradient stack paints the band over the disc and puts the third bar on top of the first, so neither shows. The brief names both, so the disc is layered above the band and the third bar sits in the Next column.
2. **Reduced motion.** The sweep's `::after` is not drawn (`display: none`), so the placeholders are static.
3. **Faces.** These are read from `--sp-type` and `--sp-serif` (the house rule) and resolve to the ref's families.
4. **Mock-only parts left out.** The ref's state switch bar, its 55px offset, the sample header ("26 queries sent", "for Murphy's Day Out") and its chart data.

## The everyday page

The frame boxes (header, title, buttons, chart, toolbar, bar, rail, list) are identical to the before build at both widths. Pixel comparison of the full viewport:

- **1440:** identical below the shell's beta banner. The banner's text row (y 14–26) differs by 1535px, the same in every run.
- **1920:** run to run, 0, then 190, then 6 pixels differed. The last 6 are all at x 28–56, which is the shell's sidebar icons, not this page.

The only things that differ are shell chrome this work does not touch. The everyday Query Centre itself has no measured change.

## When the list fails to load (unchanged)

If the queries read errors, `lib/db.tsx` marks it loaded anyway ("don't hang the loading state on a read error") and `handleFirestoreError` logs and throws inside the snapshot callback. The page then renders with no queries. Before this work that was v138's empty page; now it is day one ("No queries yet"). Both state something false about the account. The error state is deferred.

## Deferred

- An error state for a failed load, as above.
- Reserving the header's "for" line while loading, on accounts that have one.
- Day one's chart on an account with sends on another manuscript (premise 2).
- `docs/decisions/query-centre.md` exists only on `main`. This branch predates the CLAUDE.md diet, so the decisions in this report move there when v155 merges.

## Dev, and how to see each state

Dev serves `index-CLC0PZ_h.js`, deployed from `dev/…-qc154-qc1541-pa4-qc155` at `da2a05a60` (pushed; the first v155 deploy, `7efd8d88a`, served `index-BFB1ptDH.js`). That is the dev line that was served before (`index-CzLH0sbg.js`, rebuilt byte-identical before the merge) plus v155. Open https://scriptally-dev.web.app/queries at 768px wide or more, open the browser console, run one line, then reload:

- **Quiet:** `localStorage.setItem("sa.qc155.state", "quiet")`. Rows in Offers, Materials requested and Nudge due are hidden from the list.
- **Day one:** `localStorage.setItem("sa.qc155.state", "first")`. Alternatively, pick a manuscript with no queries; that state is real, not an aid.
- **Loading:** `localStorage.setItem("sa.qc155.holdMs", "6000")`. The skeleton holds for 6 seconds after each load. This key also holds the To-do and Analytics skeletons, which share the hook.
- **Back to everyday:** `localStorage.removeItem("sa.qc155.state"); localStorage.removeItem("sa.qc155.holdMs")`.

The aids take rows away or delay readiness. They never write, and production drops them (the call sites are gated on the build mode). The measurement sets the older `window.__SA_QC_STATE` and `__SA_QC_HOLD_MS` through `addInitScript`; both forms work.
