# About page v1 — report

21 Oct 2026. Built from `design-refs/about-page-v1/about-page-v1.html` and `about-page-v1.patch`,
applied exactly. Commits on `main`: `b4241120` (the page) and `62998ab2` (the locks), plus this report.
**Not deployed to dev:** Phase 3 stopped by the brief's own rule (see below).

## False premises

1. **"`git rev-list --count HEAD..main` = 0" did not prove the base.** The primary checkout's local
   `main` was 722 commits behind `origin/main` (at `587a0a7f`, left there by another session), so the
   check compared a stale branch with itself. `origin/main` was exactly `1754d132`, the patch's base.
   The work ran in a fresh worktree off `origin/main` instead (amendment); the primary checkout was
   not touched.
2. **The primary checkout was not clean**: 18 modified report screenshots, two deleted run-artifacts
   and several untracked refs and reports, none of them this pack's. Left exactly as found.
3. **The two refs were not in `design-refs/about-page-v1/`.** They were in `~/Downloads/`, with the
   exact hashes the brief gives. They were copied into the worktree after a second hash check.
4. **A5's literal check cannot fail on a public page.** `marketing.css` sets `overflow-x: clip` on
   `html` and `body` (deliberately, so decorations spill off the edge with no scrollbar) and
   `overflow: clip` on `.mk-sheet`. With `.mk-band` forced to 1,700px wide, `scrollWidth` still read
   exactly `innerWidth`. A5 keeps the brief's reading and adds one that can fail: no element in
   `<main>` runs past the window's edge. A5b lifts both clips and proves the `scrollWidth` reading red.
5. **The brief's A4 mutation alone does not move the plate over the text.** `.mk-note` is not
   positioned, so `position: absolute; top: 0` on `.mk-noteart` sends the plate to the page's top,
   outside the note. The mutation used is that plus `position: relative` on `.mk-note`.

## Gates (worktree, `set -o pipefail`, counts read)

| | tsc | build | Vitest |
|---|---|---|---|
| Baseline (`1754d132`) | clean | clean, no warnings | 9,362 passed · 1 failed · 3 skipped; 3 files failing |
| After Phase 1 | clean | clean, no warnings | 9,365 passed · 1 failed · 3 skipped; same 3 files |
| After Phase 2 | clean | clean, no warnings | same as Phase 1 |

`src/marketing`: **288 passed (288)**, as the brief expected. The three failing files are the same in
every run and all under `functions/` (`eval/run.test.ts`, `src/email.test.ts`,
`src/smartImportCore.test.ts`); the worktree symlinks only the root `node_modules`, not
`functions/node_modules`. No worse than baseline. `package.json`/`package-lock.json` are identical
between the primary checkout's commit and `origin/main`, so the symlinked root dependencies are the
right ones.

`design-refs/.refhashes.json` enrols `design-refs/about-page-v1/about-page-v1.html` at
`9183edc1…42d2` (682 refs guarded).

## Locks — `tests/e2e/aboutV1.measure.ts`

Run against a local `build:dev` on `vite preview --host 127.0.0.1` (port 4611),
`--project=measure --no-deps`, at 1512×900, 1280×800 and 390×844. The page needs no sign-in, so the
file sets an empty `storageState`. Clean run: **6 passed, 98 assertions** (floor 60; proved red at 0
assertions on the first run, before the storage-state fix). Each break is a stylesheet injected into
the page (`ABOUT_MUTATE=<lock>`), so no source file was edited. An unknown name throws rather than
running unmutated: one run passed clean because a table entry had gone missing, which is why that
guard exists.

| Lock | Mutation | Red |
|---|---|---|
| A1 headline | `.mk-astl{white-space:normal}` + h1 at 120px | `1512: "stories told." is 254.4px tall against a 127.2px line — it wrapped` |
| A2 navy band | `.mk-agap{background:#fff}` | `1512: the band is rgb(255, 255, 255), not --mk-navy rgb(42, 58, 82)` |
| A3 alternation | `.mk-band--copyfirst .mk-aplate{order:0}` (the `order: 2` dropped) | `1512: band 2's plate (x 222.0) is not right of its copy (x 792.0)` |
| A4 no overlap | `.mk-note{position:relative}.mk-noteart{position:absolute;top:0}` | `1512: 7 overlaps — ".mk-note plate" × "I started querying with a spre…"` |
| A5 overflow (ink) | `.mk-band{min-width:1700px}` | `1512: 12 elements run past the 1512px edge — section.mk-band.mk-band--first 0–1700; …` |
| A5b overflow (scrollWidth) | both clips lifted + the 1700px band | `1512: the page is 1700px wide in a 1512px window` |
| A6 briefs | `.mk-aplatetag{display:none}` | `1512: plate "simplify"'s caption is not visible` |

Each mutation turned exactly its own lock red; the other five stayed green.

Notes from measuring:
- **At 390 the founder plate's brush wash runs from −8 to 398**: the wash is rotated −8° and scaled
  1.3×, and `.mk-sheet` cuts it off invisibly. It is `aria-hidden` decoration and spilling into the
  clip is what the clip is for, so A5's ink reading leaves `aria-hidden` subtrees out. Nothing was
  changed; it is noted in case the real drawing is meant to stay inside the column.
- A4 compares each text node's per-line rects (`Range.getClientRects()`), so two runs on one line
  never count as overlapping. Each plate's own caption is excluded, since it sits on its plate by
  design.
- When a test fails, Playwright restarts the worker and the module's assertion counter resets, so a
  red run also prints a low count. Only a green run's count means anything.

## Dev deploy — NOT DONE

Before deploying, dev was serving `index-CUVPhDL9.js` (last modified 01:36 GMT today): the
integration branch `dev/…-qc1411-raam-hero3-cl20` (bdb89584, Contact list v20, not merged to `main`).
The brief says to stop rather than overwrite someone else's integration branch, so nothing was
deployed. To put the About page on dev, either merge `main` (`62998ab2` or later) into that
integration branch and deploy it, or have Nick confirm `main` alone may replace it.

## Worktrees

`../ScriptAlly-about-v1` (branch `about-v1-tmp`) was removed after the last push, and the branch was
deleted. No second worktree was ever created, because no mutation edited a file.
