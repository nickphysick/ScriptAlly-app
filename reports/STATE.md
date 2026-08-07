# STATE — where the repo stands

**Last updated: 6 August 2026 (tenth pass — the sidebar's TASKS section).**

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

- **dev** — hosting at `4d42807`; **rules DONE 6 Aug on both databases**.
- **prod** — untouched, and still behind. ⚠️ The sequencing constraint stands and has GROWN: the
  prod `firestore.rules` deploy must land **before or with** any prod hosting deploy of this code,
  and it now carries `rejectedDate` (queries allowlist), `detail`/`surfaceOffset` (tasks) **and
  `committedDate`** (tasks update). Until it lands, a prod user's Today's-list commit is denied in
  silence. Prod deploys are Nick's alone.

## The queue

1. **Calendar + Noteboard pack** — the two routes ship as honest placeholders; their bodies are
   the next build.
2. **Tags pack** — blocked by fact, not order: **no tag model exists** anywhere in the repo, so
   TAGS ships as a disabled affordance until one does.
3. **Prod sequencing pass** (Nick) — rules before hosting, per the constraint above.
4. **Correction UI.**
5. **Notes-store convergence.**

Smaller, flagged rather than done: the six remaining orphan-component candidates (verdicts and
evidence in `reports/todo-pages.md`), the orphaned `.sv2-*` rules left by the retired capsule
panel, and "Help me pick", which survives as a function but lost its mount with the Today corner —
its next home is the Today page's add flow.
