# Tasks consolidation — Phase 2, the page body

**Refs:** `design-refs/tasks-page.html` (the third frame — the page), `design-refs/tasks-states.html`
(sheet 1's rows only; sheets 2–8 are Phases 5–7). Normative for the **page body**; the chrome, nav
and breadcrumbs drawn around them belong to other surfaces and were not copied.

**Gates:** `tsc --noEmit` 0 · production build clean · **217 files, 3361 passed | 2 skipped**.
Not deployed — dev still runs the pre-consolidation build, prod is untouched.

---

## What replaced what

The four-column board is retired as this page's body. `TodoBoard` and `TodoSideContainer` are no
longer mounted; both files stand, with their own locks, awaiting a sweep commit of their own (the
house rule on orphans is flag-then-sweep, never delete-by-grep).

The body is now `TaskList` over `taskGroups(boardCols)` — the five groups Phase 2's foundation
landed in `lib/todoGroups.ts`, rendered as white panels separated by space.

**The argument, restated because it is the whole phase:** a column asked *where* a card belonged
and then required four columns to agree about one set. A group asks *what kind of thing it is*,
which the app can already answer from the same object the sidebar badge and every count read. The
ranked order inside a group is the plan. Nothing about a group is stored, so the rebuild needed no
migration.

## The measures, and where they are locked

`tasksList.test.tsx` (36 cases) is the phase's lock file.

| Measure | Value |
|---|---|
| Row tracks | `34px minmax(0,1fr) 144px 172px 104px 216px` — **one** flexible track, and its min is zero |
| Action grid | `68px 30px 30px 30px`, gap 7, empty slots preserved |
| Panel | `#fff` · `1px #ece4d6` · radius 16 · `padding: 6px 16px` |
| Section rhythm | 26px, and **no hairline** does the separating |
| Stat chip | height 38 · radius 99 · Playfair figures |
| Row padding | `16px 14px`, divider a `::after` inset line that yields to hover |

**⚠️ The row is ONE element carrying its own grid** — never `display: contents`. That change lays
out identically at rest and then deletes the row's box: hover, focus and any future selected band
fracture into six rectangles with the grid gaps showing between them, and the divider has nothing
to hang off. Asserted twice — against the stylesheet, and against rendered markup.

**⚠️ The family tones are `todoFamily`'s, restated in CSS under lock.** That map has shipped wrong
twice in this repo, both times through a second copy; CSS cannot read TypeScript, so the pill fills
have to be restated — and the lock is what stops the restatement being silent.

## Which verb slots fill — asked of `cardMenu`, never of a second table

All three optional slots read the **menu model**, so the row and the ⋯ menu cannot disagree about
what a card allows:

- **primary** — Undo on Done, Return on Snoozed, absent where `completionVia` says the tick is the
  act (a writer's own item), else the menu's `action` leaf (`Action` / `Start`);
- **clock** — `snooze-1` offered and live; absent on Done and Snoozed;
- **✕** — `dismiss-week` offered and **not disabled**, which is exactly the ref's rule: an offer's
  dismiss line exists in the menu, disabled, stating its reason, so the row's slot stands empty;
- **⋯** — always.

The clock and the ✕ are doors into that one menu, opened at a pre-expanded submenu. Phase 4 swaps
the snooze submenu for the dial at **one call site**.

## Two faults the browser walk found (and neither was visible to the suite)

The page is auth-gated, so verification used the prescribed harness: the **built**
`dist/assets/index-*.css`, real rendered markup, measured with `getBoundingClientRect`.

1. **The right lane mirrored its neighbour.** A sweep nobody has started takes `c.due` as its meter
   label ("16 TO FIX") — and the age lane read the same field, so the row printed one figure twice,
   side by side. The board's band grammar carries this law already; the list inherited the fault.
   A sweep's age is now `—`, the ref's own value.
2. **A sweep refused a snooze on the row and offered one in its menu.** The clock was gated on
   `snoozeVia`, which answers *which write path a snooze takes* — a sweep has no `relatedRecordId`
   because it stands for many, so it answered "none". Two answers to one question, on one card.
   That is what moved the permission onto `cardMenu` for all three slots.

A third, cosmetic: the age ended at exactly the x the primary begins. The six tracks are the
measure and are untouched; the 10px clearance is padding **inside** the cell.

## Deliberate deviations from the ref

- **Title stays "To-do list".** The ref titles the page "Tasks" and relabels its nav row to match.
  That is an IA change across the sidebar, both breadcrumbs and the ⌘K palette, all of which derive
  from `TODO_ROUTES` — chrome, and out of a page-body phase.
- **Tool row at 34px, not the ref's 38px.** One control height across the tool row is a standing
  lock (tasks-audit P3), and the ref draws no shared tool row at all. The stat chips ARE 38px.
- **A user task's ✕ is absent.** The ref's sheet-1 row draws one; the ref's own prose says your own
  tasks and notes get Delete in the ⋯ instead, "because they are the only things you own outright".
  Prose with a reason beats an unreasoned artefact — the house carve-out. Phase 3 settles it.
- **The journey meter is reserved, not filled.** Per-kind stage meters are Phase 3's. The sweep
  rail is present because it is live today and dropping it in transit would be a regression rather
  than a phase boundary; the ref draws an empty meter for six of its thirteen kinds anyway.

## Carried consequences — ⚠️ BOTH RESOLVED, 9 Aug (Nick's calls; see reports/tasks-consolidation-p3-p4.md)

1. ~~**The tag NARROWING is gone from this page.**~~ **RESOLVED:** it returned to the tool row as
   the Noteboard's own `#All ▾` control (`a353434`). Tags themselves were never touched: the
   composer writes them, the ⋯ sheet edits them, the Calendar and the Noteboard still filter by
   them.
2. ~~**`todoPrefs.goodDay` has no live reader.**~~ **RESOLVED:** retired whole — control, reader
   and stored field (`9582c87`). The prod rules queue did NOT shorten: the allowlist entry is
   `todoPrefs`, the whole map, and three other settings still write it.

   *(the original finding, kept because the reasoning is the record)* **`todoPrefs.goodDay` has no live reader.** "A GOOD DAY IS 3–5" advised on the size of the day's
   *commitment*, and committing work to a day is precisely what the consolidation removed. The ref
   draws no such line, and the copy law agrees ("the app reports and never appraises" — "THAT'S A
   FULL DAY" is an appraisal). `wipLine` and the Task-settings control both stand; a stored setting
   over nothing is the fault board-optimise P5 fixed, so this needs deciding rather than leaving.
3. **`boardFigures` / `boardSubtitleCopy` are dead-but-tested.** The prose subtitle went because the
   stat chips state the same facts over the same object, and two statements of one derivation is
   the fault the counting law exists to prevent.

## Orphaned by this phase, deliberately not swept

`TodoBoard.tsx` · `TodoSideContainer.tsx` · `performBoardPlan` + `dropPlan`'s mount (drag was the
board's; the list has no drop targets, and every verb a drag performed is on the ⋯ menu) ·
`applyFacet` / `facetCounts` / `matchesTags`' page-level callers. All keep their own locks.

`public/todo-seize-the-day.png` is **still unmounted** and still deliberately kept — the `seize-the-day`
slot was Today's, and the consolidated page has not earned it. `desk-clear` HAS been re-earned, and
its trigger reads unfiltered so a search can never fake a clear desk.

## What remains

Phase 3 (kinds and verbs — the per-kind primary labels, the pill tones, the journey meters) ·
Phase 4 (the snooze dial) · Phase 5 (row states, the loading shell, the empty states) ·
Phase 6 (toasts, motion, keyboard, many-at-once) · Phase 7 (narrow and touch).
