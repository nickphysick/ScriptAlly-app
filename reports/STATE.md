**Last updated: 9 August 2026 (sixteenth pass — the Tasks consolidation, Phase 1).**

## Tasks consolidation — ⚠️ PHASE 1 + P2's FOUNDATION ONLY (pack: tasks-consolidation-prompt.md)

**⚠️ PHASE 2's COMPONENT IS NOT BUILT, AND PHASES 3–7 ARE UNTOUCHED.** The page still renders the
board. `1e920c6` lands P2's grouping DERIVATION only — pure, 13 locks, nothing wired — because a
half-rebuilt page body is a broken page, which is worse than an unstarted one. What the next
session needs is listed at the foot of this section.

- **`lib/todoGroups.ts` is the seam P2's component builds against**: `taskGroups(cols)` →
  five groups from the ONE `assembleBoardColumns`; `taskStats(cols, estMin)` → the header chips;
  `groupSlice`/`showMoreLabel` → the housekeeping fold. Laws locked: a card lands in exactly one
  group · **an empty group does not render** · **only Housekeeping folds, never the urgent group**
  · **`Outstanding` is deliberately NOT the sum of the visible panels** (Snoozed is live work
  merely asleep; Done is not outstanding at all) · the estimate chip is absent at zero · a sweep
  counts once · nothing about a group is stored.
- **The board's To-do/Today split is retired in the model, not reproduced** — both columns flatten
  into the kinds, because placement is what the consolidation removes.

**For the next session, in order:** the row component (six tracks
`34px minmax(0,1fr) 144px 172px 104px 216px`, ONE element — never `display: contents`, which
fractures hover/focus/selected into per-cell rectangles), the four-slot action grid
(`68px 30px 30px 30px`, empty slots preserved so every primary starts at the same x), the white
panels (`#fff`, `1px #ece4d6`, radius 16, `padding: 6px 16px`, 26px between sections), the header
block (mono eyebrow → Playfair title → tool row at 38px), and the stat chips (`height: 38px`,
radius 99, Playfair figures). All measures are in `design-refs/tasks-page.html`; the pills come
from the existing `todoFamily` map — import it, never restate it.

## Tasks consolidation — Phase 1 (landed)

`440a652` (the extraction) → `f8ea950` (the constants move) → `3c51b1e` (P1). Suite **3287 | 2
skipped, 213 files**; tsc + production build green. **NOT DEPLOYED** — dev still runs the
pre-consolidation build.

- **⚠️ TODAY IS RETIRED.** Three nav rows: To-do list · Calendar · Noteboard, all read from
  `TODO_ROUTES` so the sidebar, the palette and the router cannot drift. Seven files deleted
  (page, css, `lib/todoToday` + its test, three Today-only suites); everything shared was kept.
- **⚠️ THE CONSTANTS MOVED FIRST, IN THEIR OWN COMMIT.** `TODO_WORK_THE_LIST` /
  `TODO_ADD_TO_TODAY` were declared in the page being deleted and imported by the page that
  survives — an inverted dependency whose failure is SILENT (an unresolved event name is a
  listener that never fires). They live in `lib/todoRoutes` now.
- **NO REDIRECT CODE.** `todoPageForPath` already falls back to `list` for any unmatched
  `/todo*`, so `/todo/today` lands on the page that absorbed the job. Asserted against the
  retired path — a behaviour relied on by accident is now pinned on purpose.
- **⚠️ `public/todo-seize-the-day.png` IS AN UNUSED ASSET, DELIBERATELY KEPT.** Still registered
  in `ArtSlot` (`seize-the-day`, 100×100, the only slot with a real src). It has no mount until
  the consolidated page gives it one. **Do not delete it in a cleanup sweep** — Nick's call: an
  illustration is worth more than the page it happened to sit on.
- **⚠️ THE CHOKE POINTS WERE EXTRACTED BEFORE ANY OF THIS** (`440a652`): `clampSnooze`,
  `snoozeVia`, `completionVia`/`isTickable` and `cardLane` live in `lib/todoActions`, unit-tested
  away from any component, because a choke point inside the 2,247-line page about to be rebuilt
  is a coincidence rather than a guarantee. The offer cap turned out to live in THREE places
  (the page, FocusFlow's sweep snooze, its staged runner); all three call the one ceiling now.
- **Sixteen suites hand-edited**, one at a time. **⚠️ NEVER CODEMOD THIS CLEANUP** — two scripted
  attempts damaged the tree (one matched the word `today` and gutted 39 unrelated files, one
  miscounted braces inside strings). Every removed spec leaves its RULE written where it stood,
  so Phase 2 rebuilds against them rather than rediscovering them.
- **Phases 2–7 remain**: the page body, task types and verbs, the snooze dial, states/loading/
  empty, toasts/motion/keyboard/batch, narrow and touch.

## The Tasks viewport pack is COMPLETE (report: `reports/tasks-viewport.md`)

`c8e6e79` (P1 lock) → `04e15aa` (the calendar fit) → `12c18ba` (P2 Today) → `d558b49` (P3
Calendar) → `5cdd71b` (P4 Noteboard) → `5aa51a3` (P5 two doors). Suite **3349 | 2 skipped, 211
files**, verified in an isolated worktree at the tip.

- **⚠️ THE CALENDAR FIT NEEDED A SECOND PASS, and the cause was a lesson written that morning.** A
  bare `1fr` grid row is `minmax(auto, 1fr)` — its floor is min-content, so rows could not shrink
  — and `.cal-cell` carried `min-height: 104px`. Measured before: rows `12.75px 104px ×6`, 17px
  past the frame at 1440×900. After: zero overflow from 900px down to 560px. Same law as the
  board's column measure: **a capped track needs a zero minimum**.
- **Today reads as a Dashboard sibling** — eyebrow + 32px Playfair + pill stat row (both
  derivations IMPORTED from dashboardStats), two named regions each with its own zone, no sidebar
  and no filter control. The plan card stores the DAY, not a boolean, in localStorage.
- **⚠️ TWO COPY LAWS, ENFORCED IN THE SUITE:** the app reports and never appraises; no private
  metaphors for functional elements ("the bench" is dead — it is "Up next"). Both in themes.md.
  Corollary: a suggestion region carries **no count**.
- **The Calendar's fold derives from the resolved row height** (ResizeObserver; `CAL_CELL_CAP` is
  the ceiling, one pip always shows) and its facet moved to the tool row — it had no control at
  all between P1 and P3.
- **Task settings has two doors, ONE sheet.** The Settings page does not re-render the four
  behaviours, and the route lands before the event (the sheet is hosted by the To-do page).
- **⚠️ THE PAGE NEVER SCROLLS.** `.tdb-wrap` was `overflow-y: auto` — inverted AT ITS OWN RULE in
  todo.css (a second single-class rule elsewhere resolves on import order). Designated
  `.tpl-zone`s below the fixed header own all scrolling, hem iff overflow.
- **⚠️ IT IS A CHAIN, NOT A RULE, AND jsdom CANNOT VERIFY IT.** `flex:1; min-height:0` must hold on
  all seven links (slot → `.spine-root` → `.tdb-wrap` → `.tdb-col.tpl` → `.tpl-cols` →
  `.tpl-body` → `.tpl-zone`); one link at `auto` and the page scrolls as before with every
  declaration below it still correct. **The table is in the report for the browser walk.**
- **The scroll-restore contract followed the scroller** to the zone — the wrap's scrollTop is
  permanently 0 now, so batch collapse would have jumped to the top of the board in silence.
  Calendar **compresses instead of scrolling** (`grid-auto-rows: 1fr`) and is deliberately the one
  region with no zone.
- **⚠️ The sidebar is the To-do list's alone.** Two carried consequences, both stated in the
  report: **Calendar has no filter control until P3**, and **Task settings needs its second door
  (P5)** because three of four pages can no longer reach the sheet.
- Four locks superseded in place, dated. **And a rule-text helper fixed twice-over:** assert on
  DECLARATIONS, not raw rule text — the house style explains a rule by quoting what it replaced,
  so a naive reader fails a correct rule.



## ⚠️ P6 (collapsible columns + reflow) IS REVERTED — parked, not paused (report: `reports/board-fold-revert.md`)

Nick's call. `todoFold.ts` and its 24 locks are DELETED; the fold state, the `foldOverride` prop,
the rail, the ▾ control, the span, the `SHOWING · WAS` figures and the lane split are out of
`TodoBoard`; the whole P6 CSS block is out of `todoBoard.css`. **No dormant code and no stored
preference** — the fold used `localStorage["sa.todoFolded"]` and never reached Firestore, so the
rules and types needed no change; the orphaned key is inert and gets NO cleanup shim (that would
be the dormant code the revert exists to avoid). P7's estimate locks moved to
`boardEstimate.test.tsx` rather than dying with the file they were appended to.

- **⚠️ `todoPrefs` SURVIVES and the prod queue does NOT shorten.** It is P5's (`6c0fb97`) — the
  four settings-sheet behaviours — not the fold's. Live readers: TaskSettingsSheet, `wipLine`,
  `todoEstimate`, TodoBoard, ToDoPage. **The queue stands: rejectedDate · detail/surfaceOffset ·
  committedDate · tags · todoPrefs · estimateMin.**
- **⚠️ THE CARD GAP WAS P6's DOING, AND IT IS NOW LOCKED.** `.tbd-body > .tbd-card` is a
  DIRECT-CHILD selector; the lane div put a node in between and the rule stopped matching — the
  12px between cards AND the 21px under a sweep. The wrapper rendered **unconditionally**, so
  every card on every column went flush even with nothing folded. tsc, the build and 3264 tests
  all stayed green: **a CSS combinator can stop applying in perfect silence.** `boardMeasure.
  test.tsx` now asserts the rule TOGETHER WITH the DOM shape it needs (no element opens between
  the body and its cards; all siblings; no competing `gap`) — a value-only lock would have sailed
  through the entire regression. Verified red under the reintroduced wrapper before being kept.

## The board optimisation is IN — P1–P5 + P7 (board-optimise pack; report: `reports/board-optimise.md`)

`2fb9287` (four scope-fenced refs) → `97fddcc` (P1 column measure) → `d3b5efd` (P2 sidebar) →
`f2c49c0` (P3 ArtSlot) → `a2d1d6b` (P4 dock work surface) → `6c0fb97` (P5 settings + tag sheets)
→ ~~`8d5dedc` (P6)~~ **reverted, see above** → `b83154b` (P7 estimates). Suite after the revert:
**3248 | 2 skipped, 207 files**.

- **⚠️ PHASE 8 (multi-select) IS NOT BUILT — ITS PREMISE IS FALSE, and this needs Nick's call.**
  The pack says "reuse the list's batch model wholesale — no second selection system" and "the
  existing batch bar". **There is no batch bar and no selection model in live code**:
  `ToDoPage.tsx:342` records "the ledger's selection/keyboard/kebab machinery retired with the run
  sheet — Final Shape P5"; `todoLedger`'s `batch*` helpers are the housekeeping COHORT (agents
  under one rule), not selection; `git log -S "SELECTED ·"` finds no bar ever shipped. Building it
  fresh would contradict the phase's own central test ("selection model reuse, asserted not
  reimplemented") and is a pack of its own. **Nothing is half-built** — no selection state, no
  checkbox, no bar exists on the board. Options are argued at the foot of the report.
- **The column measure caps at 290px** — `repeat(4, minmax(0, --tbd-col-w))` + `justify-content:
  start`; the surplus is margin, never card width. The **zero min is load-bearing** (it lets a
  column shrink rather than overflow), so both narrow breakpoints keep the same track function
  with fewer tracks.
- **ONE stored map for the four behaviours** (`User.todoPrefs`: staleMonths · goodDay ·
  rollForward · weeklyBriefing) — one rules entry, one write path; every reader goes through the
  TOTAL `todoPrefs()`, and **the defaults are the behaviour the app already had**. `wipLine`'s
  hardcoded 3–5 now takes the writer's number — the row was a control over nothing.
- **`UserTask.estimateMin?: number`** — the one new stored field, justified in full in the report
  and in `src/lib/todoEstimate.ts`'s head: nothing in the app knows how long *your* redraft takes,
  so it is a judgement rather than a derivation; a scalar on the object the writer already owns;
  the "none" rung `deleteField`s it. The ladder is offered on **Today only**, and the head sums
  only what carries an estimate — it never guesses.
- **ArtSlot** is one component, six named slots, each reserving its brief's RATIO so nothing
  shifts when art lands (no `src` today; degrades to the caption). **The two rejections are
  enforced, not noted** — no art in a page header, none per card, both asserted.
- **Both sheets, never routes** (a route would take the board off screen and make Back the way out
  of a rename); tags moved to their own sheet; the dismissed ledger is a door that states its
  count. Tag WRITES consolidated into `useTagWrites` — four pages needed them, so four copies of
  the null-detach convention were one edit away.

## The Tasks audit fixes are IN (tasks-audit pack; report: `reports/tasks-audit-fixes.md`)

`9091b30` (the return boundary) → `64f1d7d` (band + count grammar) → `17d2f30` (control laws)
→ `9c134ad` (legend + butter retired) → `77f9de9` (teachings + Today's filter scope). Suite
**3054 | 2 skipped, 194 files**.

- ⚠️ **THE RETURN BOUNDARY has ONE choke now** — `taskFlags.flagSleeps` / `flagReturnedToday`,
  DAY-level on the calendar's local clock; isFlagSuppressing + todoListPage's isSnoozed/
  returnedToday all delegate. Sleeping = Snoozed column only; returned = the lanes only, chipped
  "🕐 SNOOZED · BACK TODAY" that day, parchment calendar pip. **An offer's flag NEVER enters the
  Snoozed column** (it is the "I need time" quiet reminder; an offer cannot be put away) — the
  column-side pickup was the audit's double render. THE ADMISSION: the partition tests passed
  through the bug because no fixture sat ON the boundary; the today-row fixture now exists and
  fails on the old code.
- **Band grammar**: a sleeping card reads "{KIND} · 🕐 | BACK {date}" — kind from the same
  derivedCopy rebuild as the title, never bare SNOOZED. The bench header counts CARDS
  (cols.todo.length, the column head's own figure) — it was summing member lanes (24 vs a
  16-card world). Why-lines locked per reason with the distinctness law.
- **Control laws**: Work-the-list disabled = paper/hairline/faint/not-allowed (the .tpl-tools
  attribute selector outweighs the ink fill); one 34px control height per tool row; TAGS
  swatches are SOLID dots (the FILTERS grammar — the outlined ring is extinct).
- **The butter "dated notes" calendar family is RETIRED** (structurally empty under two-natures;
  type + tone + legend row + placement branch all gone; themes.md carries the return condition).
  The legend is locked to exactly the live families.
- **Done teaches** ("Tick anything and it settles here until midnight."); **FILTERS on Today
  reach BOTH regions** — the bench narrows through the same facet ∧ tags and its header says
  "…OF THE {n} MATCHING" while narrowed (no bench exemption; argued in the report).
- **ADDENDUM — the horizontal half**: the board's header started further LEFT because THREE
  Tasks slots still carried the placeholder-era `contentVariant="read"` cap while the board slot
  was bare (two owners on one axis — the inverse of the pack's guess). The slot caps are gone;
  TasksPageLayout/.tdb-col owns both axes (`--tdb-chrome-gap` + `--tdb-col-gutter`, one 1360
  cap, auto-centred) — a stated carve-out from the ultrawide opt-in law. Left-offset equality
  locked beside the top-offset locks; the three pages widen 1200 → 1360 (one max width).

## The Tasks workspace is COMPLETE (tasks-pages pack; report: `reports/tasks-pages.md`)

`599d902` (P1 alignment) → `3ab2042` (P2 carry-overs) → `96eb7e6` (P3 Calendar) → `11117d5`
(P4 Noteboard) → `2a6a247` (P5 tags). Suite **2993 | 2 skipped, 187 files**. Ref
`design-refs/tasks-pages.html` (scope-fenced; pack prose wins on sidebar-below-hairline and
Noteboard-has-no-sidebar). All four routes are REAL pages now — TodoPlaceholderPage is deleted.

- **THE ALIGNMENT CONTRACT = `TasksPageLayout`**: every Tasks page stands on it; the title
  offset is `--tdb-chrome-gap` via `.tdb-col` (the single geometry owner — the layout's own CSS
  restates NO top padding, locked); header block → hairline (the tool row's bottom edge) →
  sidebar+body below; the tool row is the ONLY control home, pink creation in the right slot;
  the sidebar (TodoSideContainer) is optional per page.
- **ONE COUNT DERIVATION**: `assembleBoardColumns` (todoColumns) feeds the badge
  (ShellSidebar), both pages' boards and every FILTERS count — the badge shows the SAME cards
  figure the subtitle speaks. todoCount's member-unit badge law is superseded in place.
- **THE OFFER CAP holds on every path** — the bypass was FocusFlow's generic 7-day snooze
  (clamped, three points); the dock's clock was a DEAD button (popover never mounted there) and
  now owns a capped tier menu. Snoozed cards keep their ORIGINAL titles (derivedCopy exported;
  band = SNOOZED · BACK {date}); Done bands read ✓ DONE | time.
- **CALENDAR** (`/todo/calendar`): placement per source (user tasks dueDate · agent tasks the
  lastStatusChange landing day · snoozed returns · dated notes = structurally empty under
  two-natures, built as specified); roll-forward DERIVED from the clock ("{n} ROLLED FORWARD ↗"
  markers); completed struck from the clearing union, never rolls; pips + legend from
  todoFamily's CAL_PIP; FILTERS ∧ tags narrow before placement; pip → FocusFlow sheet, day →
  its list panel.
- **NOTEBOARD** (`/todo/noteboard`): CSS-columns masonry, notes only (isNoteTask), NO page
  sidebar, tag filter in the tool row; ⚠️ THE DATE IS THE DOOR — one write converts note→task
  (leaves the board, joins Your tasks, appears on the Calendar); PortalMenu extracted from
  TodoBoard (one menu shell, two content models); delete = confirm + 8s same-id undo.
- **TAGS ARE REAL**: TagDef on User.tags, ids on UserTask.tags; lowercase/unique/palette-only
  (TAG_PALETTE in todoFamily); ONE TagPicker in three mounts (composer · dock item sheet ·
  ⋯ Tags…) with inline creation; sidebar TAGS list live with counts + additive filtering;
  settings CRUD (delete DETACHES, never deletes). ⚠️ RULES: dev deployed BOTH DBs (07 Aug
  09:41, verified by updateTime); **prod rules pending Nick** — the sequencing deploy now
  carries rejectedDate · detail/surfaceOffset · committedDate · **tags**.

## The sidebar IA: To-do left WORKSPACE for its own TASKS section (sidebar-IA fix, Nick's call)

**This REVERSES the eighth pass's one-row fold** (which itself reversed the earlier four-row
group — the row's history is two reversals deep; the current shape is Nick's explicit call and
the comments at each site say so). `workspaceSections` now yields **five groups**: WORKSPACE
(Dashboard alone) · **TASKS** (directly after, same section grammar, no new variant) · QUERIES ·
AGENTS · MATERIALS. TASKS' four rows **ARE `TODO_ROUTES`** — To-do list (default, `/todo`) ·
Today · Calendar · Noteboard — with the urgency dot + count riding the To-do list row ALONE
(still the nav's only count, Amendment 1 H5 intact). One definition drives every surface:
- the **sidebar + rail rib** (workspaceNav → WorkspaceShell; `tasks` rib icon in
  WORKSPACE_ICONS, the dead `todo` group key deleted);
- the **desktop breadcrumb** ("Tasks / To-do list") via shellCrumb over the same sections;
- the **mobile capsule bar's crumb** — shellV2Nav's section relabelled "Tasks" (key stays
  `todo`; an identifier, not a caption) and its pages now DERIVE from TODO_ROUTES instead of
  restating them;
- the **⌘K palette** — the four page entries derive from TODO_ROUTES (ids keep their
  established `page:todo*` form).
Locks: `workspaceTasksNav.test.tsx` (rendered rows/order, the one chip, both crumbs, the
palette) + supersessions in workspaceNav/todoWorkspace/shellV2Nav suites. The mobile you-menu's
"To-do" row is deliberately untouched (a demoted page link, not the sidebar; mobile pass 1 is
locked). **DEV-DEPLOYED at `daca7ce`** (hosting-only, 6 Aug — the same deploy carries board
fixes II and the parallel stream's dashboard work, i.e. everything on `main`).

## Board fixes II + the editorial board — COMPLETE (`678e733` ref → `05fa643`→`c3b26d4`→`7b9eeea`→`ee0b0d6`→`7f2546f`→`58cb2c9`)

The patch pack from Nick's dev walk, plus the board's settled visual design (normative ref
committed at `design-refs/todo-board-settled.html`; the chrome around it is demonstration only).
Full report: `reports/todo-board-fixes2.md`. Suite **2884 passed | 2 skipped** at close.

- **P1** — the ⋯ menu is a **portal to document.body** (it used to render inside the card, which
  clips), placed by the pure `placeMenu` (edge-flip locked as arithmetic); the seat is ONE
  always-present ⋯ bottom-right in a permanently reserved 42px lane; contents are the pure
  `cardMenu` model in **`src/lib/todoMenu.ts`** — three intent groups with per-kind/per-column
  shapes (offer capped + disabled dismiss · sweep "Start the sweep" · Today reverses · Snoozed
  "Return it now"/"Change the date…" · Done collapses · user task gains Edit/Delete). The
  composer gained EDIT mode (updateUserTask learned null→deleteField clears); "View the agent"
  lands via the one-shot `sa.agentReveal` sessionStorage key AgentList consumes once; the board's
  drag-to-Snoozed now actually asks for a date (it opened a popover that never mounted there).
- **P2** — the card is the dock's door: click docks (5px movement threshold + dragstart poison —
  browsers don't reliably suppress post-drag clicks), Enter docks, OPEN ▸ whispers on hover.
- **P3** — the "▶ Focused session" tool-row launcher is DELETED (button + one-line opener);
  KEPT whole: openDock, dockAllCards, TodoDock, FocusFlow, Today's "Work the list". The ＋ Add
  composer is finally MOUNTED (`{composerAt && renderComposer()}` — the button used to set state
  nothing rendered).
- **P4** — ⚠️ **ONE kind→family map: `src/lib/todoFamily.ts`.** The map had shipped wrong twice,
  both times via a second copy: `bandFamily` + `facetOf` were duplicate classifiers keyed on the
  `hk` GLYPH flag (false on STALE → urgent pink), and the `--td-sw-*` tokens were a third home
  with sage/pink SWAPPED. Classification keys on the LANE (the counting law's split); swatches
  are the module's hexes; the CSS band paint is restated UNDER LOCK (todoBoardFamily fails if
  they diverge); the ink border is worn iff family === urgent. The tokens are deleted and
  extinction-locked.
- **P5** — ⚠️ **CARDS ARE THE UNIT.** 42 / 27 / fourteen were three derivations in two units
  (tiles = members; facet feed = raw lanes, blind to Snoozed; columns = cards). `boardColumns`
  is computed once (hoisted `boardCols`) and the subtitle (`boardFigures`/`boardSubtitleCopy` —
  "…six cards, two urgent."), the FILTERS counts (`liveBoardCards`) and the rendered columns all
  read it. Locked against the RENDERED DOM in todoBoardCounts.test.tsx. Done stays outside.
- **P6** — the editorial board: sticky Playfair heads over 2px ink rules (sage on Done, "N
  TODAY"), tinted wells REMOVED, sweep cards as stacks with a session progress rail (n-of-m
  inside the card only), ghost hatched drop slot (still labels the act), completion ring
  (~600ms), fade hem + "+ N MORE ▾" past eight, WIP line ("A GOOD DAY IS 3–5" / past five
  "THAT'S A FULL DAY" — advice, never a block), speaking empty states, tabular numerals
  page-wide, one easing `cubic-bezier(.2,.7,.3,1)` with 220ms cross-column FLIP over WAAPI
  (no fill — the house motion trap), all off under reduced motion.

⚠️ **A PARALLEL DASHBOARD STREAM WAS COMMITTING IN THIS SAME CHECKOUT throughout this pack**
(three+ commits landed under it; `src/lib/dashboardStats.*` sat modified-uncommitted with a
duplicate-identifier tsc break for part of the run). Handled per the house rules: never touched,
never staged; my tsc gates ran in an isolated worktree at HEAD + my files. This is exactly the
one-session-per-worktree rule being violated upstream — flagged, not fixed.

## The sidebar is FLAT GROUPS now — the accordion is retired

`design-refs/shell-workspace-doubledecker.html` was replaced in place with the final ref Nick
attached (`scriptally-workspace-final (2).html`). **The committed ref had been lagging the real
one, and every comparison run against it agreed with a document nobody was designing to.** Read
the ref, not a screenshot, and not last week's copy of it.

**What actually differed, and it was structural, not cosmetic:** our nav was an **accordion** —
parent rows with chevrons revealing collapsible children. The ref has **flat groups**: a mono
group label (pure typography — not clickable, no state) and *every destination as its own row with
its own icon*. Ten rows, all visible, no disclosure to discover. Groups map 1:1 to the rail ribs,
which is what makes the collapsed rail a complete map of the app rather than a subset of it.

- `workspaceSections()` rewritten to five flat groups; every child now carries an `icon`.
- `WORKSPACE_ICONS` rekeyed by BOTH group id (rail ribs) and item icon key (panel rows).
- ~12 accordion-era locks retargeted rather than deleted — including the `SECTIONS` fixture and
  the two-scroller lock.
- **One deviation, taken on the ref's own principle:** To-do keeps its own group with four items.
  The mock files it as a single row under Workspace, but To-do is four routes now, and folding it
  to one row would hide three destinations — the exact thing "every destination is visible"
  forbids.

⚠️ **THE PANEL HAS NO SPACER — THE NAV IS THE GROWER,** and the lock that used to *require* a
`ws-grow` between nav and collapse row was wrong. That lock was written against a real bug (the
row sat under the last nav item), and it fixed it — but a spacer beside a `flex:1` nav is two
claimants on one pool of slack. The browser splits it: browser-measured, the nav got **279px for
540px of content**, so Agents and Materials sat below a fold with empty panel underneath them. The
lock now states the ref's structure — nav grows, nothing between it and the row.

⚠️ **A ONE-ITEM GROUP CONTRIBUTES NO CRUMB SEGMENT** (ref: `items.length > 1 ? "Group / Current" :
"Current"`). "Workspace / Dashboard" states a grouping that exists for the nav's benefit; a crumb
whose first half never varies has one real step in it.

⚠️ **THE BAR TINT IS OFF-WHITE, NOT THE REF'S OAT** — `--shell-bar-tint: rgba(251,249,245,.92)`
(solid fallback `#fbf9f5`), per Nick's amendment. That reverses the help button's hover direction
too: the ref lifts toward white, which is invisible on an off-white bar, so `.sp-help:hover` went
back to parchment. **Contrast follows the surface, not the spec sheet.**

## The app-wide smoke pack is COMPLETE

`85edee7` (P1, the inventory) → `834700b` (the harness + structural check) → `60ce046` (workspace
pages) → `0190b9c` (settings · marketing · front door · dev labs) → `cf69e5b` (P3's correction) →
`<this>` (docs). **172 files, 2770 passed | 2 skipped** — up from 163 / 2676, so **+9 files and
+94 tests**. Tests only; no deploy needed. Detail: `reports/app-smoke.md`.

Every routed surface in the app now renders in a test: `renderToStaticMarkup` + a mocked db hook,
asserting the page renders at all plus one distinctive chrome string. The big pages are smoked
**twice — empty and populated** — because a first-run panel and the real page are not the same
component, and smoking only the empty one leaves every derivation unexecuted.

⚠️ **THE PACK'S REAL FINDING: `tsc` DOES NOT CATCH THE TDZ BUG, and the guard written for it did
not either.** The shape that shipped reads the `const` from inside a **hoisted helper the render
calls** — TS2448 fires only when the reference shares a scope with the declaration, so TypeScript
sees nothing. The *tempting* shape to test a guard with (`description={helper()}` straight in the
JSX) **is** caught by tsc, which is why proving a tripwire against it proves nothing.

Verified against the pre-fix file rather than assumed (`ToDoPage` at `c0698c4^`): return at 933 →
hoisted `renderPageHeader` at 1119 → reads `boardSubtitle` at 1135 → `const boardSubtitle` at
1594. **Neither the original structural check nor its first correction could see that** — one
searched the region above the return, the other searched the returned JSX, and the reference is in
neither. It now follows the render's **call graph**, and returns `["boardSubtitle"]` on the real
buggy file and `[]` on the fixed one.

⚠️ **CLAUDE.md gained two rules:** a new routed page ships with a smoke test from day one; and a
green typecheck is not evidence against this bug class.

⚠️ **`/queries/analytics` is UNREACHABLE** — `App.tsx` renders `QueryAnalytics` in its own
`StagePage`, but the path is not in `WORKSPACE_PATHS`, so the unknown-path guard redirects to
`/dashboard` first. Nothing in the nav links to it, so no user meets a dead link. **Flagged, not
fixed** — adding the path publishes a "coming soon" page, which is Nick's call.

## The board+dock pack is COMPLETE

`72f6138` (P1+P2) → `0aafdea` (P3) → `eb41345` (P5) → `a303ef3` + `c0698c4` (two fixes) →
`ca96721` (git discipline) → `afbf5e4` (**P4, the dock**). **163 files, 2676 passed | 2 skipped.**
Detail: `reports/todo-board-dock.md`.

**The dock is the one place work gets finished** — 30/70, queue left, work surface right, per-kind
flows inline. ⚠️ **ONE ACT, THREE RECORDS, and only two are writes**: `recordMaterialsSent`
appends the activity and moves the status; the task going away is DERIVED, not written.
⚠️ **ONE SURFACE, EVERY ENTRANCE** — Action now, the bounce toast's Open, "Focused session" and
Today's "Work the list". `FocusedSession` is RETIRED; `FocusFlow` survives as the flow engine.

⚠️ **CLAUDE.md gained two rules this session, both paid for:** after explicit-path staging,
`git status` must be CLEAN before the gates are believed (a fix left in the working tree made
"green locally" meaningless, and CI was right); and **comments are not guards** — a constraint
worth a warning comment is worth a test (a file's own ⚠️ against post-return consts did not stop
that bug being written into it, shipping a page that would not load through a green suite).

## The board+dock pack — Phases 1–3 landed, ⚠️ PHASE 4 (THE DOCK) NOT STARTED

`72f6138` (P1+P2: the tool row is the page's one instrument; LISTS becomes FILTERS) → `0aafdea`
(P3: the band family map, the move matrix, the undo repair) → `<this>` (P5, scoped to what
landed). **159 files, 2636 passed | 2 skipped.** Detail: `reports/todo-board-dock.md`.

**The To-do list page is the BOARD now — cards only.** The Lane/ledger grammar, the standalone
control bar and the view toggle are retired. Sort and FILTERS apply to all four columns. Done
accepts user-task ticks only; a derived card BOUNCES with a per-kind verb phrase. The ⋯ menu
speaks verbs, never "Move to X".

⚠️ **PHASE 4 IS UNSTARTED, deliberately** — the brief named this the clean split point. `Action
now` and the bounce toast's `Open` route to the existing item sheet, which is the interim the
brief specifies. Building a dock that mounted but could not finish work would be worse than
none: every card would gain an Action that opens something unusable.

⚠️ **Two causes recorded**, both in the report: the family map never regressed — it was never
CARRIED between two grammars (hence the lock is on the MAP and on the tints being DISTINCT); and
the drag path bypassed undo by writing the completion field directly instead of calling the
primitive that raises the toast.

## Corrections landed (from the walk of `ffc1f45`)

Eight faults, three of them law violations, each fixed with the test that should have caught it:
`a0cb634` (Snoozed split + the partition) → `32682f5` (the list page's chrome) → `56cae1e` (band
lanes + ink border) → `7bf8316` (Today's buttons, bench register, empty column). **158 files,
2605 passed | 2 skipped.**

⚠️ **Two failure modes worth carrying forward**, both in `reports/todo-corrections.md`:
a test can assert a **derivation against a fixture built to satisfy that derivation** (the Snoozed
invariant passed while the page disagreed with itself), and a **source-string test cannot prove
the code it reads is reached** (Phase 2's group cards lived in a view that is not the default, and
its tests only ever read inside that function).

⚠️ **Still open, flagged not taken:** the sum/column equalities assert the derivation, not the
DOM — this repo has no jsdom, and adding one is a tooling decision across 158 test files.

## Landed this session (Phases 2–5)

The To-do workspace pack is **complete through Phase 5**. `e806b7a` (deploy-target rule) →
`ce894a1` (P2, the list page's three group cards, fold and snoozed band) → `16dca29` (P3, the
Today page + the corner's retirement) → `4eb58db` (P4, the board as four derived states) →
`6309a22` (P5, the sweep + themes.md). **155 files, 2583 passed | 2 skipped.**

⚠️ **CLAUDE.md's Deployment section is amended and is now a hard rule:** every `firebase deploy`
NAMES ITS TARGET. `.firebaserc`'s default is **prod**, so a bare deploy typed in a dev session
goes to production. The dual-database note is rewritten too — both configs print the identical
success line, so verify by release `updateTime`, never by the message.

Detail, the orphan verdicts and Nick's walk: **`reports/todo-pages.md`**.

## Landed this session

- **Pushed.** `origin/main` had been 33 commits behind, holding the entire shell rebuild on one
  laptop. It now reaches `4d42807`. CI green on every commit.
- **Dev rules deploy — DONE, 6 Aug 2026, BOTH dev databases** (`(default)` and the `ai-studio` one
  the dev app actually reads; verified by release `updateTime`, because the CLI's success line
  never names which database it hit).
- **`committedDate` silent denial FIXED** (`49ec1d7`) — every Today's-list commit had been denied
  without a word for as long as the rules have existed. Proven allowed in CI: 129 rules tests.
- **`ShellSidebarBody` retired** (`4d42807`, −241 lines) — the panel nothing had rendered since the
  rebuild.
- **Dev hosting** deployed from merged main at **`4d42807`**.

Full detail, the gap map and the walk Nick needs to do: **`reports/todo-pages.md`**.

## One line, and it is `main`

`claude-il` has been **merged into `main` and is retired.** `main` is the sole line of work. Do not
branch from `claude-il`, deploy from it, or resume work in
`/Users/nickphysick/ScriptAlly-il` — its worktree can be removed
(`git worktree remove ../ScriptAlly-il`) once its session has read this.

### Why the merge happened

Two sessions ran the same pack (`todo-workspace-prompt.md`) at the same time in two worktrees,
neither aware of the other, because neither checked. `main` produced three commits; `claude-il`
produced twenty-nine — the whole app-shell rebuild (double-decker shell, mega-menus, decoupled
rail, full-screen geometry, polish pass) **and** a further-along run of the same pack. A dev deploy
from `main` briefly reverted the shell on `scriptally-dev`, which is how the collision was found.

`claude-il` was the base; `main` contributed four named items. The full conflict charter, written
before the merge and recording every resolution and three deviations, is
**`reports/todo-workspace-port-plan.md`** — read it before touching anything it names.

### What survived from each side

| From `claude-il` (the base) | From `main` |
|---|---|
| The entire app-shell rebuild | The `kind` facet **copied in `derivedCard`** — the cause, not the symptom |
| `dedupeAgentCards` (supersedes main's duplicate fix) | The `agentPrimary` fallback in the task engine |
| The four To-do pages, `TodoPlaceholderPage`, `TodoTodayPage`, the page side container | The `clearedToday` `queryId` dedupe (a *separate* bug — it stands alongside `dedupeAgentCards`) |
| `silentDays` (both lines wrote the same fix independently; theirs kept) | `shellV2Nav.ts`'s To-do section — still live for the mobile crumb |
| **`lib/todoCount.ts` — the surviving counting law** | The end-to-end counting-law test (see below) |

### ⚠️ The counting law lives in ONE module: `src/lib/todoCount.ts`

`todoCounts` / `todoBadgeCount`. Main's rival `actionableCount` was **deleted**, and with it
`LedgerTiles.actionable` and the narrowed `deskNotice` signature that served it. Both
implementations were tested against the same promoted-task double-count fixture before the choice
was made; **both passed**, so the charter's tiebreak applied — theirs is the richer shape and
already feeds the side container's LIST rows.

`shellSidebar.ts`'s `LedgerTiles` is the **ribbon's three numbers and nothing more**. Do not add an
`actionable` field back to it: two answers to one question is the exact fault the law was written
to end.

The law is tested in two places, deliberately: `todoWorkspace.test.ts` proves the sum over
hand-built boards, and `todoBoard.test.ts` proves the **premise** by running the real
`assembleBoard` — that a task dated today is promoted into the urgent lane at all. Keep both; the
first cannot catch a promotion that silently stops.

## Known loose ends from the merge

- ~~`ShellSidebarBody` is no longer mounted~~ — **SWEPT 6 Aug** (`4d42807`). Seven other
  export-without-import candidates are listed with their evidence in `reports/todo-pages.md`;
  `TasksDropdown` among them is a documented deliberate keep, which is why they were not swept on
  the grep alone. Many orphaned `.sv2-*` CSS rules also survive the panel — named there, not
  removed, because deleting CSS by grep breaks surfaces nobody tested.
- **`reports/onboarding-recon.md`** was uncommitted in the `claude-il` worktree and is **NOT in this
  merge.** It is that session's to finish, on this `main`.
- Phases 2–4 of the pages pack remain **unstarted** (Phase 5's named sweep item is done). The gap
  map in `reports/todo-pages.md` records exactly what each phase still needs, so the next session
  starts at Phase 2 without re-deriving anything.

## Gates at the merge commit

`tsc --noEmit` 0 · production build clean · **152 files, 2566 passed | 2 skipped**.

## Deploy state

- **dev** — hosting + rules at the board-optimise tip (7 Aug, both databases).
- **prod** — untouched, and still behind. ⚠️ The sequencing constraint stands and has GROWN
  AGAIN: the prod `firestore.rules` deploy must land **before or with** any prod hosting deploy of
  this code, and it now carries `rejectedDate` (queries allowlist), `detail`/`surfaceOffset`
  (tasks), `committedDate` (tasks update), **`tags`**, **`todoPrefs`** (user doc) and
  **`estimateMin`** (tasks, both allowlists). Until it lands, a prod user's Today's-list commit,
  their tags, their task settings and their estimates are all denied in silence. Prod deploys are
  Nick's alone.

## The queue

1. **The P8 call** (Nick) — multi-select: its own pack, skip it, or the minimal gesture. The
   premise finding is at the foot of `reports/board-optimise.md`; nothing is half-built.
2. **Prod sequencing pass** (Nick) — rules before hosting, per the grown constraint above.
3. **Correction UI.**
4. **Notes-store convergence.**

Smaller, flagged rather than done: the six remaining orphan-component candidates (verdicts and
evidence in `reports/todo-pages.md`), the orphaned `.sv2-*` rules left by the retired capsule
panel, and "Help me pick", which survives as a function but lost its mount with the Today corner —
its next home is the Today page's add flow.
