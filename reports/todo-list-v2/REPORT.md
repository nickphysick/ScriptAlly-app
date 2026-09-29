# To-do list v2 — overnight run report (28–29 Sep)

Oracle: `design-refs/todo-list-v2.html`, SHA256 `67da1fb4…7992e` (verified before enrolment; the
measurement fails on a stale anchor). Worktree `../ScriptAlly-todov2`, detached, rebased onto
`origin/main` at `f7599e60`. **Nothing was deployed. Nothing was pushed.**

## 1. False premises in the brief, named before any fix

1. **`TaskModal` does not exist.** It was deleted on 27 Sep (`4eae6e71`). Query actions v1 made
   the rule "every page finishes in the query drawer". Phase 7 therefore opens the **query drawer**
   for a task with a query journey (`drawerDoorForTask`), and the **task pane** (in a SlideOver)
   for everything else — your own tasks and housekeeping. Both open over a full-screen scrim. The
   drawer slides in from the right; it is not centred. A centred modal beside the drawer would be
   a second asking surface, which is exactly what the drawer rule exists to prevent.
2. **`src/__measure__/` does not exist.** Measurements live in `tests/e2e/*.measure.ts`, which is
   Playwright's `testDir`. The suite is `tests/e2e/todoV2.measure.ts`.
3. **"Short-lived branch" contradicts CLAUDE.md** ("Direct-to-`main` only … if you find yourself
   creating a branch, stop"). I used a detached worktree with no branch. The eight commits land as
   a fast-forward of `main`.
4. **"No date" cannot be a *task*.** In this app a user item with no due date **is a note**
   (`isNoteTask`; the task/note split is derived from `dueDate` alone). A dateless task could only
   be written as a note wearing a task's label, so the Task mode has no "No date" pill; the Note
   toggle is that choice. A week pill records the **end of that week**, and the confirmation line
   says so ("due by Sun 11 Oct").
5. **The shared full header draws its section eyebrow** ("TASKS / TO-DO LIST") on every page that
   mounts it. The brief asked for no eyebrow line. The shell is out of scope, so the eyebrow stays;
   the measurement reports it rather than asserting its absence.
6. **1480 max-width / the ref's 1330.** The page sits in the **shared column** that the workspace
   grid pays (page header v1: 1360 with the gutter inside). The shell wins.
7. **The ref's row grid overlaps itself.** Measured in the ref at 1440: its action cell (status +
   button, about 175px) is given 116px and spills over the date ("28 June · 3 months" under
   "Partial requested"). The brief says dates and actions are never squished, so the last two tracks
   are `minmax(128px, max-content) max-content`. The deed and agent columns keep the ref's 1.5 : 1.

## 2. The shell wait

- Step 0.5 was satisfied when I checked: the last commit touching a shell path was at 18:23 on
  28 Sep, and the shared `PageHeader variant="full"` was already consumed by the Query Centre,
  Contact list, Comparable titles and Submission packages. No shell work was visible in any worktree.
- Phase 2 started on `a05702c1`.
- **The shell landed a commit after that:** `f7599e60` "Quiet bar P1" (Nick, 00:00, 29 Sep). It
  touches `PageHeader.tsx`, `WorkspaceShell.tsx`, `workspaceShell.css` and the ref manifest.
- All eight commits were **rebased** onto it. The only conflict was `.refhashes.json`, and both
  entries were kept.
- Every gate and the full `todoV2.measure.ts` were **re-run after the rebase: 19/19 green.**
- **"Quiet bar" is P1 of a pack, so the shell may still be moving.** Re-check before landing.

## 3. Phase by phase

| Phase | Commit | Landed | Measured | Proved red by |
|---|---|---|---|---|
| 1 Ref | `d8cb748b` | ref enrolled, SHA-gated suite | SHA ✓; page case red on old main | one byte appended to the ref; page case failed for want of `[data-todo-v2]` |
| 2 Anatomy | `aeb83d52` | opts out of the masthead (OPTED_OUT 5→6); shared full header over its own group; desk rail as PageRail; empty art slot 250×132 on the rule; loading cover on the QC clock | 1440×860 / 1280×800 / 1920×1080: header spans the group's content box, rail below the rule, centred, no painted frame, art slot empty, cover frames don't move | header held to one track (off 368px); background + shadow on `.tdv2-main` |
| 3 Tiles | `0c35b145` | three tiles over the badge's population; v2 row list; the seven tiles, the grid/board/list bodies and the split no longer rendered | three tiles, Your move default, sub-lines sum to headlines, **total = sidebar badge**, each tile a non-empty population of its own (≥2 entered) | Your move counting requests only (13+2 vs 13); list ignoring the tile |
| 4 Controls | `e77836cd` | search · Filter (sectioned) · Group · Sort · Export CSV; floating active-filters bar; view switch and `renderGrid/Board/List` deleted | no view switch; exact Group and Sort options; the retired word in no text or attribute across every tile and menu; bar moves nothing (tiles, controls, rail, scroll height); a pick keeps the panel's scroll; outside press closes | bar in flow; scroll box re-keyed per pick; "Overdue" as the past label |
| 5 Rows | `3557b3af` | row cards, flush 5px state band, 14px corners, no frame; Your move tag; inset ink past edge; sticky anthracite heads | declared grid read from the stylesheet; band flush and edge to edge; no cell spill; no ink overlap; past edge 3px inset 8/8 rounded; heads stick; no burgundy | ref's own grid; action cell pulled 90px left; band 3px down; edge run to the card's edge; heads not sticky |
| 6a+6b Desk | `fb624f21` | composer (Task/Note, pills, attach an agent, Cmd/Ctrl+Enter); "Yours on the list"; notes; Noteboard link; "Add a task" out of the header; rail height from its own top | tray; rail on screen at 860; task from Chase switches to Your move, lands under Next week with the agent and the arrival ring, same key in the rail, survives reload; note in the rail, never in the list, **on the Noteboard** | write removed; note written with a date; rail-height rule removed (1001 > 860) |
| 7 Doors | `62d70e3a` | every door is `openV2Row`; keys walk the v2 rows | tick / action / row open the drawer over a scrim; own task's tick and rail row open the pane over a scrim; **zero Firestore write requests** | opening a row made to write a probe task: both "no write" assertions failed |
| 8 Sweep | `136c70d0` | RETIRED manifest; census entries re-pointed | see §6 | — |

Probe writes (tasks and notes prefixed `Zz v2 probe`) are removed in the same run by
`tests/e2e/cleanupTodoV2Probe.mjs`. The final run deleted 0, because every earlier run had
already cleaned up after itself.

## 4. Gates

| | Baseline (`a05702c1`) | Final (rebased, `136c70d0`) |
|---|---|---|
| tsc | 0 errors | 0 errors |
| production build | clean (no error or warning lines) | clean |
| Vitest | 506 files · 8,243 passed · 3 skipped | 508 files · 8,256 passed · 3 skipped |
| `todoV2.measure.ts` | red (by design) | **19 / 19** |

The Vitest baseline also counts `functions/src/email.test.ts`. That file fails to import in a bare
worktree until `functions/node_modules` is linked; once linked, it passes.

## 5. The notes gate — PASSED, 6b shipped

The Noteboard's store is `users/{uid}/tasks`, `UserTask` with no `dueDate` (`isNoteTask`), written
by `addUserTask` — the same writer the Noteboard page uses. A note from the desk is that and nothing
more. No type, collection or rule was added. (The older `users/{uid}/notes` collection is the
dashboard's post-its and was left alone.) 6a and 6b are one commit because the toggle is one
component; they are measured as separate cases.

## 6. What I could not build, and faults left behind

- **89 e2e suites have lost their subject by design** (the view switch, grid, list card, board,
  split and old toolbar). They are swept by selector into `tests/e2e/RETIRED-todo-v2.md`. The
  shared door `todoOpen.ts` now throws, naming the retirement, so they fail loudly rather than
  vacuously. A sample of four (18 cases): 17 failed, all on missing subjects.
- **The eight page censuses were red on `main` before this rebuild:** `barBinding`,
  `chromeGround`, `compactHeader`, `contentGeometry`, `headerFix`, `illoRules`,
  `toolbarIsContent` and `washEdges`. They fail on the Query Centre, Analytics or Packages entry
  first, so they never reach the To-do list. Their To-do entry is re-pointed to `tdv2-wpg`.
- **Seven components are now mounted nowhere, dead but still tested:** `TaskList`, `TaskTicket`,
  `TaskBoard`, `QueryViewSwitch`, `StatTiles`, `ToolbarSearch` and `ToolbarButton`. The same goes
  for their CSS and for `ToDoPage`'s old view machinery (`railGroups`, `tileScope`, `view`/
  `FilterMenu`, the old composer, which only the empty desk states still reach). Deleting them is
  its own pass, because each has suites.
- **No visible keyboard focus on v2 rows.** j/k walk the v2 order, but there is no focus ring to
  show where. Enter opens the pane, even for a query task, which the drawer would otherwise take.
- **The tour is still largely stale.** Its filter stop was re-pointed, but `.spine-rail`,
  `.tdb-herobegin`, `.svh-btn-primary`, `.l-search` and `.tdb-tile` all predate this pass.
- **The hero illustration and the hawk head are empty slots**, as briefed.
- **The Filter panel can run below the fold at 1440×900**, and the floating bar (z 60) can sit over
  its foot. The panel's own box scrolls, so nothing is lost; the only fault is that they overlap.
- **The shell is live** (`f7599e60` Quiet bar P1). Re-check `origin/main` before landing.

## 7. Nothing deployed; no shell file in any commit

- No `firebase deploy` was run for any target.
- Every commit was staged by explicit path. `git show --stat` across the eight commits lists no
  shell-owned path: no `WorkspaceShell*`, sidebar, bar, `PageHeader` or `index.css`.
- The only shell-adjacent edits are two **tests**: `workspacePageGrid.test.tsx`, which gained the
  OPTED_OUT register row, and `tests/e2e/optedOut.ts`.
- `ToDoPage.tsx` imports and consumes `PageHeader` without modifying it.
- To land: from the worktree, `git push origin HEAD:main` (a fast-forward of `f7599e60`). Pushing
  is Nick's call.

Screenshots: `page-1280.png`, `page-1440.png`, `page-1920.png` and `filter-1440.png` (Filter open,
with the active bar showing).
