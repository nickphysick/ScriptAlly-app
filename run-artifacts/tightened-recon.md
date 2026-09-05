# Tightened round — Phase 0 recon (5 Sep, against `0646480e`)

Contract `todo-belongs.html` md5 `d1ed244136c7bbf9d9d72f3ad4dead7f` — the tree had no copy; the
Downloads copy matched the brief's hash byte-for-byte and was installed + enrolled (30 guarded)
as `0646480e`. `todo-sort-filter.html` already in the tree, matching. Nothing stale, nothing to
hunt.

## 1 · Row height and density

Nothing states a row height today — `.tlc .row` is content-sized: `padding: 11px 16px 11px 13px`
plus whatever the tallest cell renders (`taskList.css:68`). The two states share ONE `.row` rule
and differ only by the `--row-cols` token (`taskList.css:74–77`): wide is a 7-track grid
(pill · deed+meta · agent · agency · [ms] · wait · actb), folded is 3 tracks with `.cell:not(.keep)`
display-none and **`.r-deed { white-space: normal }`** — so folded rows WRAP to two lines
(~58px measured in the drawer round) while wide rows are ~50px. Phase 2's 44px-single-line-both-
states therefore means: a `height: 44px` (or exact padding + one `line-height`) on the shared
rule, `nowrap` on the deed in BOTH states, the meta line retired (the agent goes inline in the
deed per the contract), and the fold's row-anchor restore (drawer round) RE-EXAMINED — with equal
heights in both states the fold no longer changes any row's height, so the anchor restore has
nothing to compensate; it stays harmless (restores an unchanged position) but the comment must
stop claiming a fold changes heights. `data-rowkey` stays — the strip and keys need row identity.

The held/leaving fade caps `max-height: 120px` "comfortably above any row" — still true at 44.

## 2 · The page header — BELONGS TO THE HEADER STREAM → Phase 1 is coordination

The "To-do list" H1 is drawn by **`PageHeader` inside `WorkspacePageGrid`'s masthead slot**,
mounted via `TasksPageLayout` (`TasksPageLayout.tsx:159`) — the app-wide masthead format
("ONE FORMAT, ONE BEHAVIOUR", 30 Aug), whose ten-page census (`mastheadFormat` suites) asserts
the opted-out count is ZERO. Removing the masthead from `/todo` would red the header stream's
locks on a surface this session does not own. `TasksPageLayout` is also shared with Calendar and
Noteboard — the calendar stream is mid-flight in `TodoCalendarPage.tsx` (uncommitted WIP in the
tree right now).

**So, per the brief's own fallback: the toolbar is built as the LIST CARD's own top chrome**
(the `.l-bar` region grows the meter and the three actions; the H1 stays the masthead's), and the
page header is untouched. What CAN come out without touching header-stream code: ToDoPage already
passes `TasksPageLayout` no `tools`/`eyebrow` (the tool row went in corrections P4 — "renders no
row and no hairline when neither is passed"), so the ~150px reclaim is partly already banked;
what remains between masthead and list is the page's own `.tdb-centre` chrome, which is ours.

**Duplication noted for the header stream**: the masthead carries title + description + (optional)
primary; the contract's toolbar carries title + meter + actions on one 32px row. Until the header
stream offers a compact/toolbar masthead variant, `/todo` renders the masthead's title AND a
list-card toolbar without a title — one element carries the page title (the masthead's), which is
what Phase 1's assert checks.

## 3 · Status tint — `stageFor(status)` + `var(--stage-*)`, derived never stored

`src/lib/queryCardFacts.ts` exports **`stageFor(status): Stage`** (`out-1|out-2|out-3|in-1|in-2|
in-3|offer|closed`) — "THE ONE MAPPING, EXPORTED", exhaustive with `closed` as the safe default.
Components paint `var(--stage-${stageFor(status)})`; the eight hexes live ONCE under `.t-f12`
(`f12.css:4608`) — and the `/todo` page root **already wears `t-f12`** (`ToDoPage.tsx:1612`), so
the tokens resolve here without the Calendar's documented-copy debt. The ref's TINT table matches
those eight values exactly. The status word comes from **`getStatusLabel`** (`StatusPill.tsx`, the
one status-word function — the slip already routes through it), and the dot is the real
**`StatusDot`** component (locked: every dot renders through it; the ref's hand-drawn SVGs are the
mockup's, not ours).

## 4 · Keyboard today

Three live bindings on `/todo`: **`/`** focuses search (window listener, `focusesSearch` +
`isTypingTarget` from `lib/taskShortcuts`, `offsetParent` visibility guard — ToDoPage:486);
**Escape** closes the drawer, LAST in a chain (search clears first), not captured/stopped;
**↑/↓** walk the docked task (drawer round, ends don't wrap), all three refusing inside
editables (ToDoPage:1252). The fork has NO number keys today.

**`lib/taskShortcuts.listKey` already DECIDES j/k/Enter/s/x/./o/e/Escape/? — and nothing on the
page calls it** (only `tasksKeys.test.tsx` does). The icon cluster that paired with it is gone;
rows render an inert `.actb` "Action ›" span (aria-hidden, no handler — the row's click opens).
Phase 2 wires the decision module rather than re-deciding in the handler; **divergence to
resolve there: the module says `x` dismisses, the contract and brief say `d`** — the module gains
`d` (and the map/`KEY_MAP` follows; `x`'s selection-convention note in the module stays true).
Focus today: nothing — there is no focused-row concept; `sel` exists only as the docked card.

## 5 · Suites over retired objects (Phase 5's population)

Retired this round: the sheet's header **`.band`** (deed + `.b-sub` + `.b-nav` ‹ › Close), the
floating slip (**`.qrwrap`/`.qr`/`.rrim`/`.qrtab`** + its sage **`.rhead`**), the row's
**`.actb`** affordance, and the wide row's meta/agent/agency/ms cells (**`.r-meta`**, `.r-ag`,
`.r-agc`, `.r-ms`). No `.qa` exists in this build — the ref's `.qa` maps to our `.actb`.

Measurement suites touching them (grepped by token, comments included — each needs reading, not
believing): **sheetSlip** (the slip end-to-end — mostly deleted/rebuilt for the column),
**finishRound** (band, rims, deed), **workspaceRound** (band, deed, actb), **journeyRound**
(band, deed, actb), **deedRound** (deed treatment, actb, the slip's sage head), **listWide**
(band?, deed, actb — the row geometry suite), **unitNext** (r-deed), **completionLeaves** (deed,
r-deed), **steerRound** (actb), **drawerMotion** (band), **contract** (name-offender sweeps).
Unit: **taskListWide.test.tsx** (row structure/`--row-cols`), **taskPanePort.test.tsx** (pane
markup port), **completionHold.test.ts** (held-row source locks — the map/expiry laws survive,
selectors may move). `viewPanels`, `qcPanel`, `paneMounts` look untouched. Standing reds carry
over: qcPanel (log-sheet stream's card class), journeyRound P8.3.

## Corrections to the brief

None of substance. Two notes: (a) the ref binds `1`/`2`/`3` (crossover options excluded from
keys); the brief says `1`/`2` — built as "digit picks a non-crossover fork option", which
satisfies both. (b) The ref's `.stage.open` keeps a 480px list; our split token is 520px from the
drawer round's contract — the sort-filter contract's header is unchanged, and nothing in
`todo-belongs` states the split width outside its own demo CSS, so 520 stands unless the
measured strip needs otherwise.

## Where things live, for the phases

- Meter derivation: the same `groupsForList()` the rows render from (ids `urgent`/`housekeeping`/
  `yours`, labels "Needs you now"/"Housekeeping"/"Your tasks") — the meter states the groups'
  own lengths, one derivation, satisfying the counting law.
- The three toolbar actions: "Add a task" exists as `.l-add` (opens the composer in task mode);
  "Add a note" = the composer's note mode (the `＋ New` shell event pattern shows the wiring);
  "Calendar" = a nav to `/todo/calendar` (route per `todoRoutes`).
- The slip's data (`d.tiles`, `d.tl`, `d.statusWord`, `d.queryHref`) is already derived in
  `useTaskPaneSession`/its paneFacts — Phase 4 restyles the container, reusing the derivations;
  new needs: the agent row (name/agency/initials — `listAvatarInitials` pattern), the "since
  {date} · {n} weeks" line, and `stageFor` for the header tint.
