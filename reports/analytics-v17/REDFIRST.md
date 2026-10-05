# Analytics v17 — red first (Phase 0)

Run against the **unchanged build** — `origin/main` at `3d6bac97` (dev build, `vite preview` on 127.0.0.1:4477), 5 Oct, before any `src/` edit.
`SA_E2E_BASE_URL=http://127.0.0.1:4477 npx playwright test tests/e2e/analyticsV17.measure.ts --project=measure` — **17 red, 1 green (AN17-3)**, plus AN17-15/17 re-run after the phone-open fix (below).

⚠️ **A lock that cannot find its subject has failed, not skipped.** On the old page there is no `[data-a17="page"]`, so most locks read `null`/`0` and say so; that is the honest red for a page that does not exist yet. Each lock is ALSO proved red by its named mutation on the rebuilt page in Phase 9 (`mutation-proofs.md`) — the stronger proof, since it shows the lock fires on a page that otherwise passes.

**Locks the old page passes by accident** (proved by mutation only): AN17-3 (the Query Centre's band, unchanged by construction — the baseline boxes were captured in this run into `qc-band-baseline.json`); the shell readings of AN17-1 and the phone-absence of AN17-15 (the old page has no tab at all).

**A harness fault found and fixed in Phase 0:** the shared `openRoute` waits for the first `.ws-panel, …` to be visible, and at a phone width that first match is the hidden sidebar — AN17-15's phone leg and AN17-17 died after 30s on `unexpected value "hidden"` before reading anything. `openAn` now signs in at 1440 and reloads at the phone size.

| Lock | readings | red | first failing readings |
|---|---|---|---|
| AN17-1 | 32 | 16 | AN17-1 the v17 page is on the route @1280: `false`; AN17-1 page ground @1280: `null` |
| AN17-2 | 8 | 8 | AN17-2 the band exists @1280: `null`; no horizontal overflow of the scroller @1280: `found false over NaN` |
| AN17-3 | 8 | 0 | **green on the unchanged build — proved by mutation (Phase 9)** |
| AN17-4 | 12 | 12 | AN17-4 band and strip found @1280: `false false`; AN17-4 nine sections @1280: `undefined` |
| AN17-5 | 10 | 10 | AN17-5 five cells @1280: `0`; no horizontal overflow of the scroller @1280: `found false over NaN` |
| AN17-6 | 8 | 8 | AN17-6 nine sections @1280: `undefined`; no horizontal overflow of the scroller @1280: `found false over NaN` |
| AN17-7 | 20 | 20 | AN17-7 four bars @1280: `0`; AN17-7 the top bar's population is non-zero @1280: `undefined` |
| AN17-8 | 32 | 28 | AN17-8 the page has dated queries @1280: `undefined`; AN17-8 one dot per dated query @1280: `0 dots, undefined dated` |
| AN17-9 | 8 | 8 | AN17-9 two share bars @1280: `0`; no horizontal overflow of the scroller @1280: `found false over NaN` |
| AN17-10 | 28 | 16 | AN17-10 rows exist @1280: `0`; AN17-10 one row per replied query with a stated window @1280: `0 rows, population undefined` |
| AN17-11 | 16 | 16 | AN17-11 six records @1280: ``; AN17-11 first-request renders StatusDot (and nothing else) @1280: `undefined StatusDot, undefined svg` |
| AN17-12 | 2 | 2 | AN17-12 the chart is on screen @1512: `null`; AN17-12 the readout starts at Today @1512: `null` |
| AN17-13 | 24 | 24 | AN17-13 lanes present @1280: `0`; AN17-13 one line per dated query @1280: `0 lanes, undefined dated, population undefined` |
| AN17-14 | 24 | 24 | AN17-14 the workspace is blush @1280: `undefined`; AN17-14 radius 22 @1280: `undefined` |
| AN17-15 | 47 | 42 | AN17-15 the tab exists @1280: `null`; AN17-15 fixed @1280: `null` |
| AN17-16 | 2 | 2 | AN17-16 the page is cut to one query @1512: `undefined`; AN17-16 figures were found @1512: `undefined` |
| AN17-17 | 3 | 3 | AN17-17 the page renders @390: `false`; AN17-17 the page renders @414: `false` |
| AN17-18 | 4 | 3 | AN17-18 the page reads a manuscript @1512: `{"ms":null,"sent":-1,"strip":null,"funnel":null}`; AN17-18 switched to another manuscript with queries @1512: `null` |
