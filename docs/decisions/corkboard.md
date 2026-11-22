# Corkboard — decisions

> Merged 22 Nov 2026 (consolidate-main-v2): the dev line's newer sections come first, then main's earlier rounds, as the dev copy's own note asked.

## Current state (Corkboard v15, 18 Nov 2026)

- **Route** `/todo/corkboard`, page `src/components/todo/TodoNoteboardPage.tsx`. Ref: `design-refs/corkboard-v15/`
  (html sha256 `1ac9fb0d…11fe2`, 23 screens; all enrolled in `design-refs/.refhashes.json`).
- **Two pages in one file, split at 768px** (`useCbWide`). From 768px up: the shared navy header (`CbNavyHeader`) with
  v15's right-hand block, then `corkboard/Cb15Desk.tsx` and the pop-ups in `corkboard/Cb15Dialogs.tsx`, styled by
  `corkboard/corkboard15.css` under `.cb15` / `.cb15-layer`. Below 768px: the phone keeps v2's panel (`CbHeader`),
  `CbToolRow`, `CbWall`, `CbPiles`, `CbMenu`, `CbNoteDialog`, `CbTaskDialogs`, `CbStartPile`, `CbEmpty` and
  `corkboard.css` — its layout unchanged; only its words changed (Piles → Stacks).
- **Every figure the desktop states is `lib/corkboard`'s**: `figures` / `figureRows` / `inFigure`, `wallSections`
  (on `sortBoard`), `columnCount` + `dealColumns`, `aboutRows` / `aboutOf`, `quietBoard`, `DAY_ONE_EXAMPLES`,
  `sectionLine`, `findPieces`, `addedWhen`. The locks (`tests/e2e/corkboardV15.measure.ts`) call the same functions.
- **Data unchanged.** Notes are `UserTask`s; a dated note keeps its paper and is on the to-do list; a stack is a note's
  first tag (`pileOf` / `tagsForPile`); started-but-empty stacks are `todoPrefs.noteboard.started`; the view, sort and
  order are `todoPrefs.noteboard.{view,sort,order}`. The stored view value is still `piles`; internal names say pile.

## Decisions (v15)

- **Stacks, not Piles, in every word a writer reads** (desktop and phone). Identifiers, `data-cb2` probes, the stored
  value and comments keep "pile".
- **The header's right-hand block** is up to three figures — linked to agents, on your to-do list, pinned to top. A
  figure at zero is not shown. **Linked means an agent or a query, never a manuscript** (v2's `glance` counted
  manuscripts too, and still does for the phone's panel). Each figure is a filter; pressing it again clears it. No
  figure above zero → "Pick a colour"; an empty board → "Pick a colour to start" (v1 headers showed no right block on
  an empty board; v15 does).
- **Filtering hides on the desktop** (find, a tag, a figure, an agent): v2 faded non-matches to 22%; the ref hides.
- **The wall is dealt, not flowed**: columns from the wall's own width (4 from 1240px, 3 from 900, 2 from 580), note
  i in column i mod n, so it still reads left to right while notes keep the height of their words (min 196px).
- **Pinned is always first**, in its own section, in every order; a drag never crosses the pinned line.
- **Every write answers through `useTodoToast` with Undo, never a confirm** — including Remove (v2 asked first). Undo
  of colour, save and remove writes the captured document back (`noteReceipt` → `restoreUserTask`); order and sort
  are written together and put back together.
- **Status is the real `StatusDot` plus its word**: on a link chip for a query; on an agent card, that agent's query
  on the active manuscript (`resolveScopedManuscript` over `scriptally_active_manuscript_id`), else no status line.
- **Add a task is still the To-do list's own `AddTask`**, hosted in the v15 pop-up shell (its own heading hidden); the
  write is unchanged. The ref's sub-line "…and stays on your board as a note" is not true here (an added task has no
  paper, so `sortNotes` keeps it off the board), so the pop-up says only "It goes on your to-do list."
- **Turn into a task offers the ref's three** (This week / Next week / Later, each by its Sunday). v2's "Pick a date"
  is not on the desktop.
- **Start a stack is a name and suggestions** (`PILE_SUGGESTIONS`); v2.1's "put notes in it" picker and "Add notes to
  this stack" are the phone's only. "Remove stack" for an empty started stack is the phone's only.
- **Targets**: every desktop control is at least 32px tall. Two ref values were raised to meet it: Read all (28 → 32)
  and the link chip (30 → 32).
- **The tool row sticks at the collapsed bar's foot**, read off the bar (`--cb15-stick` = its sticky top + height),
  never a constant.
- **Shortcuts**: N new note (`corkboardNew`), "/" Find a note (`corkboardFind`), both through the registry and its
  guard; Escape in the find field clears it.
- **The header drawing** stays the "Art to come" slot (`corkboard-header`) until delivered.

---

# Earlier rounds (main's copy, moved from CLAUDE.md on 11 Nov)

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
