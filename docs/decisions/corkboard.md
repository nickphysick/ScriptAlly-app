# Corkboard — decisions

## Current state

- Corkboard v1 (12 Oct): the Noteboard renamed and redrawn at `/todo/corkboard`; ref design-refs/corkboard-v4/, report reports/corkboard-v1/REPORT.md.
- Moved verbatim from CLAUDE.md on 11 Nov 2026 (CLAUDE.md diet; map in docs/claude-md-diet/MAP.md). Sections are newest first by the date in their heading; undated sections come last. A section headed “Branch-only” was recorded as not merged; the note under it says what the 11 Nov check found.
- Later work than the newest section here may exist on branches, with its report under reports/<name>/REPORT.md on that branch. Check `git log` before trusting any “current” claim below.

## Branch-only (not on main): `corkboard-v1`

_Recorded in CLAUDE.md as not merged. Checked 11 Nov 2026: no branch of this name exists any more, local or on origin (CLAUDE.md records that merged branches were deleted on 15 Oct when main took the dev stack)._

## Corkboard v1 — the Noteboard renamed and redrawn (12 Oct; ref = design-refs/corkboard-v4/corkboard-v4.html + screens/*.png; report reports/corkboard-v1/REPORT.md; on branch `corkboard-v1`, NOT merged)
- **Corkboard (v1, `/todo/corkboard`; `/todo/noteboard` redirects): the Noteboard renamed. Navy number panel ('n notes pinned / to your corkboard'), an 'Add to your board' bar (Note in three colours, Task) with find, tag chips and 'Tidy into columns' beside it, then a framed cork board. Notes are `UserTask` documents as before; free positions live in `todoPrefs.noteboard.layout` (a preference, never a source), the view in `todoPrefs.noteboard.view`. Tilt and pin/tape are derived from the note id. One 'Your tasks' card lists own dated tasks; its tick opens `TaskModal`. Internal names (`nb-`, `TodoNoteboardPage`, `todoPrefs.noteboard`) are unchanged.**
- **⚠️ "`TaskModal`" IN THAT SENTENCE IS THE TO-DO LIST'S TASK PANE.** `TaskModal` was deleted on 27 Sep; an own task is finished in the pane on `/todo`. The card's tick sets the one-shot `sa.todoOpenTask` key and navigates; `ToDoPage` opens its pane on that task on arrival (through `openDockRef`) and writes nothing.
- **The Task button and "+ Add a task" are the Calendar's "New task" door** (`sa.todoCompose`, then `/todo`): the To-do list's own composer. The Corkboard has no task composer, so it cannot write a dateless task.
- **The page scrolls under the shared full panel** (`masthead={null}`, the To-do list's arrangement). It left `TasksPageLayout`: a 260px number panel fixed above an internal scroller leaves the board a 400px window.
- **The board is `CorkBoard.tsx`; every item is placed by `arrange` (lib/corkboard)** from the board's measured width and each item's measured height. Free: a saved place, else the first free space in the built order plus an id-derived jitter. Tidy: the built order flowed into columns; saved places are kept and not read.
- **⚠️ A saved place is one LEAF (`updateUserPaths`, `todoPrefs.noteboard.layout.<id>`): `x` = left edge ÷ the board's inner width, `y` = top in px.** The order write is a leaf now too. The card's key is `__tasks`.
- **⚠️ `idHash` ends in an avalanche.** Bare FNV-1a barely moves its high bits when only the last character of an id changes; eight notes drew eight navy pins at one tilt.
- **Filtering fades (22%), it does not hide.** The header counts the board, never the filter.
- **⚠️ The header's words may wrap on this page only** (`.nb-group .hp3 …`, balanced lines): the shared panel sets a number page's words `nowrap`, and these are the longest. One line at 1512, two at 1280, three at 1024. The lock reads the words' INK (a `Range`'s rects), not the element's box: an unbreakable tail overflowed its box into the drawing while the box measured clear.
- **Retired with the old tool row:** Board / Column, the Examples button (the drawer is reached from the empty state only), the pink "Pin a note" and the ghost tile. Zero notes is the built empty state alone, under the open header ("Nothing pinned yet").
- **Dev-only review aid (`lib/corkboardReviewAid`, gated at the call site):** `window.__SA_CB_ONLY = "cbseed-"` narrows the page to one id prefix; `__SA_CB_HOLD_MS` holds the loading beat. `tests/e2e/seedCorkboard.mjs` writes the `cbseed-*` fixture.
- **⚠️ The locks read the store through `tests/e2e/cbStore.ts` (one sign-in per run).** Shelling out to a seeder per read throttled the harness account mid-suite.
- **Locks:** `tests/e2e/corkboardV1.measure.ts` A1–A2, B1–B3, C1–C7, D1–D2, L1 at 1512 × 900 and 1280 × 800; unit `src/lib/corkboard.test.ts`. Retired: `tests/e2e/RETIRED-corkboard-v1.md`.
