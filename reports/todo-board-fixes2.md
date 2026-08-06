# Board fixes II + the editorial board — run report (6 Aug 2026)

**Pack:** patch fixes from Nick's dev walk + the board's settled visual design.
**Ref:** `todo-fix93.html` → committed as `design-refs/todo-board-settled.html` (`678e733`),
scope-fenced in the file head: NORMATIVE for the board's appearance and the card grammar; the
chrome around it is demonstration only — the repo shell wins.
**Commits (one per phase):** `05fa643` (P1) → `c3b26d4` (P2) → `7b9eeea` (P3) → `ee0b0d6` (P4)
→ `7f2546f` (P5) → `58cb2c9` (P6). Gates green per commit (production build + full Vitest with
pipefail; tsc — see the incident note at the foot). Suite at close: **2884 passed | 2 skipped,
178 files** (from 2815 at the pack's start — +69 tests).

---

## P1 — the ⋯ menu: portal, seat, contents (`05fa643`)

**Cause of the clipped menu:** the menu rendered inside the card's foot
(`.tbd-foot > .tbd-menu`, `position:absolute; bottom:100%`) while `.tbd-card` carried
`overflow:hidden` — so the card's own box sheared it.

**Fix:** the menu is a **portal to `document.body`**, positioned fixed from the trigger's rect by
the pure `placeMenu` (right-aligned, opens downward, flips UP at the viewport's bottom edge,
clamps to an 8px inset — all locked as arithmetic). Closes on outside press, Escape (focus
returns to the trigger), any scroll (capture phase — the stage scrolls, not the window), resize,
and history navigation. Keyboard: focus lands on the first enabled item, ↑↓ walk and wrap, Enter
fires, ArrowRight/Left open/close submenus.

**The seat (ref option A):** ONE always-present ⋯ bottom-right (26×24 at 8/8), faint at rest,
darkening with a soft chip on the CARD's hover; the card's title and meta carry a permanent
**42px right padding** so text never runs under it and nothing is hover-summoned. The old foot
row is gone. *(The pack's "three-icon hover cluster" was not on main's board — main already had a
single ⋯; dev at the walk ran an older build. The removal that applied here was the foot row and
the in-card menu.)*

**Contents = the pure `cardMenu` model (`src/lib/todoMenu.ts`)** — three intent groups
`DO IT · PUT IT OFF · GO ELSEWHERE`, with every per-kind/per-column shape in one testable
function: offer (disabled "Dismiss — not for offers" + snooze capped at a tomorrow-only tier) ·
sweep ("Start the sweep" → its batch sheet, no ＋Today, the third dismiss tier, no GO ELSEWHERE)
· Today ("− Remove from today") · Snoozed ("Return it now" / "Change the date…") · Done
(collapses to Undo + Open the query) · user task (gains "Edit the task…" / "Delete the task…",
loses Dismiss — its put-off is snooze, its removal is Delete). Every tier routes to an EXISTING
primitive (snoozeCard/snoozeGroup, the fork's own arms, quickDone's undo machinery). Openers say
so: "…" in dialogue labels, ▸ on goers and submenu parents.

**Rode along, because the menu needed receiving ends:**
- **Composer EDIT mode** — the ⋯ Edit seeds the one composer; save routes to `updateUserTask`;
  clearing the date downgrades task → note via explicit nulls (`updateUserTask` learned the
  null → `deleteField()` convention for detail/dueDate/surfaceOffset, extending committedDate's).
- **Done user-task cards carry `userTaskId`** so Undo can find the untick.
- **"View the agent"** lands via a one-shot `sessionStorage["sa.agentReveal"]` key that
  AgentList consumes once (scrolls the card into view, centre; a gesture, not an address —
  never in history, never survives the tab).
- **The board's drag-to-Snoozed now actually asks for a date.** Found during the build: the
  drop's `snooze-popover` plan called `setLaterKey`, whose popover only ever mounted on the
  ledger rows — on the board the drop did nothing. The drop now opens the ⋯ menu with the date
  tiers pre-expanded, which is the zone label's promise ("DROP TO CHOOSE A RETURN DATE") kept.

`cardVerbs`/`CardVerb` retired from todoColumns (supersession noted in place). Tests:
`todoBoardMenu.test.tsx` (portal/not-a-descendant, placeMenu arithmetic, reserved lane, seat
chip, per-kind/per-column tables, wiring, focus round trip) + five source locks re-anchored
(per-branch slices in todoSaveMachine, per the slice law).

## P2 — the dock's doors (`c3b26d4`)

Card click docks that card (the page wiring existed; the gesture guard did not): **click vs drag
by MOVEMENT** — a dragstart poisons the gesture (consumed on read, so one drag never eats the
next click) and a press travelling > 5px is a drag even when dragstart never fired. Enter docks;
the ⋯ seat stops propagation. **OPEN ▸** whispers under the band in the seat's corridor — always
in the DOM, opacity-revealed on hover (nothing reflows). Locks in todoDockSurface ("the dock's
DOORS").

## P3 — retire the session launcher; wire the Add (`7b9eeea`)

**Deleted:** the tool-row "▶ Focused session" button (`tdb-ghb`) and its one-line opener
function (`openDock(dockAllCards())` — its only caller was the button). **Kept, whole and
untouched:** `openDock`, `dockAllCards`, `TodoDock`, the FocusFlow engine (the dock's journeys,
the batch sheet, the weekly review), Today's "Work the list" listener, and the dormant
FocusedSession component + renderHero exactly as the board+dock pack left them (unreachable,
deliberately undeleted).

**The Add bug's cause:** "＋ Add task or note" set `composerAt` and **nothing rendered it** — the
`renderComposer()` mount lived in the retired lane/grid views (one definition, zero invocations).
It now mounts above the board body in every desk state. A created item appears in its correct
column with no reload logic because the board derives from the live userTasks set — locked:
fresh task → To do, surfaced task → Today, via boardColumns.

## P4 — the colour maps, consolidated (`ee0b0d6`)

**The pack asked whether the map exists in more than one place. It existed in FIVE, and
consolidation is what fixed it — say so: it did.**

1. `bandFamily` (todoColumns) — classifier copy #1, keyed on `c.hk`;
2. `facetOf` (todoBoardSort) — classifier copy #2, same key;
3. `--td-sw-*` tokens (index.css) — the swatch VALUES, written under a different semantic
   entirely ("sage = your live work"), so the FILTERS drew **Urgent with a sage dot and
   Your-tasks with a pink one — the exact reverse of the bands**;
4. the band gradients (todoBoard.css);
5. `TODO_LISTS` swatches (todoRoutes) — the same tokens again.

**The STALE-renders-pink cause, precisely:** `c.hk` is the housekeeping *glyph* flag, and
`derivedCopy` sets it **false** on STALE cards — so both classifier copies filed STALE under
urgent while the counting law (`hkItemCount`) filed it under housekeeping.

**The consolidation:** `src/lib/todoFamily.ts` is the one home — `cardFamily`/`liveFamily`
(classification by the LANE, the counting law's own split, so colour and count cannot disagree),
`FAMILY_SWATCH` + `EXTRA_SWATCH` (the ref's hexes: #e8a68e / #d9c49a / #a8bca4), `FAMILY_BAND`
(the band paint — restated in CSS because CSS cannot read TS, **under a lock that fails the
moment the two diverge**). `bandFamily` survives as a delegating re-export; `facetOf` delegates;
both list rows read the module; the tokens are deleted and extinction-locked. The 1px ink border
is worn **iff family === urgent** — same map as the band (a promoted user task keeps its sage,
unbordered). The law: OFFER + AGENT WAITING pink · STALE/MATERIALS/WISH LIST latte · user tasks
sage · done muted sage.

## P5 — the counts reconcile (`7f2546f`)

**The 42 / 27 / 12+1+1 trace:** three derivations in two units —
- the **subtitle** summed `tiles` (urgent + housekeeping + notes), where housekeeping =
  `hkGapCount + stale` — a **MEMBER** count, every agent inside a sweep counted loose;
- the **FILTERS' Everything** counted the raw lanes (`board.do + board.hk + board.nt`) — members
  again, and **structurally blind to the flags-built Snoozed column** (everything asleep is
  filtered out of the lanes before the board assembles);
- the **columns** rendered collapsed sweep cards + Snoozed from the flags.
The suspected cause (batch children counted somewhere the collapse doesn't reach) is confirmed —
both the subtitle and the panel counted pre-collapse members.

**The root rule, landed: CARDS ARE THE UNIT.** `boardColumns` is computed once (hoisted
`boardCols`) and all three figures read it: the subtitle via `boardFigures`/`boardSubtitleCopy`
("Everything waiting on you — six cards, two urgent." — the noun is *cards* now, which is also
the ref's own subtitle wording), the FILTERS via `facetCounts(liveBoardCards(boardCols))`, and
`renderBoard` narrowing the same object. A sweep is ONE card; its member figure appears only
INSIDE it (the band's n-of-m; `cardWeight` still bridges card→items for the badge invariants).
Done stays outside every live figure. `tiles` survives only for the desk state and the assistant
band, whose subjects genuinely are items.

**Locks run against the RENDERED DOM** (`todoBoardCounts.test.tsx`): one fixture with every
shape; sections split from real markup; Everything == rendered To do + Today + Snoozed == the
subtitle's figure; the facet counts partition to the total; Done outside; copy edges.

## P6 — the editorial board + finishing touches (`58cb2c9`)

Per the ref, normative: sticky **Playfair heads** over 2px ink rules (sage on Done, count
"N TODAY") with the short ground gradient; **tinted wells removed** (the rule is the column;
cards carry the surface — rest shadow, 140ms hover lift); **sweep stacks** (two paper edges
outside the box — which is why the card no longer clips; the band rounds its own corners) with a
slim **progress rail** whose baseline is session view memory ("16 TO FIX" until you fix some,
then "5 OF 16" — a pile you have not started is a pile, not a 0% failure); the **ghost drop
slot** (hatched card-shaped target, still labelling the act); the **completion ring** (sage
keyline + halo, ~600ms, only on NEW arrivals in Done); the **fade hem + "+ N MORE ▾"** past
eight cards (`columnSlice` pure); the **WIP line** on Today's head (advice, never a block);
**speaking empty states** (Snoozed's is the ref's verbatim); **tabular numerals page-wide**;
**one easing** `cubic-bezier(.2,.7,.3,1)` — 140ms hovers, **220ms cross-column FLIP over WAAPI**
(no fill, per the house motion trap; same-column reshuffles don't travel) — all off under
`prefers-reduced-motion`, where the lift becomes border darkening.

**One deliberate deviation, fenced in the ref itself:** the ref's done card reuses the live sage
band; the pack's written law gives done the MUTED sage, and a reasoned value in prose beats an
unreasoned one in an artefact (the house mockup-wins carve-out).

---

## The walk (dev — auth-gated, so these are yours)

1. **The ⋯ menu**: open it on a bottom-row card (should flip upward, whole, never clipped);
   Esc returns focus to the ⋯; scroll closes it; the groups read DO IT / PUT IT OFF /
   GO ELSEWHERE; an offer's Dismiss is greyed with its reason; a sweep says "Start the sweep".
2. **Doors**: click a card → the dock opens ON it; drag one without dropping — no dock; hover
   shows OPEN ▸ in the band corner.
3. **Add**: ＋ Add task or note opens the composer (task mode); save → the card appears in
   To do (or Today if due) without a reload. ⋯ → Edit the task… → change/clear the date →
   Save changes.
4. **Colours**: STALE cards wear the latte band (never pink); FILTERS dots — Urgent pink dot,
   Housekeeping latte, Your tasks sage — match the bands beside them; only pink-band cards have
   the ink border.
5. **Counts**: the subtitle's number == the FILTERS' Everything == To do + Today + Snoozed as
   rendered; a sweep counts once, with its n-of-m inside the card.
6. **Editorial**: heads stick while a long column scrolls; drag-over shows the hatched DROP
   slot; tick a task → the sage ring flashes in Done; a >8 column fades into "+ N MORE ▾";
   Today's head whispers A GOOD DAY IS 3–5 (or THAT'S A FULL DAY past five).
7. **Reduced motion** (a real device with Reduce Motion on): no lift, no travel, no ring —
   hover darkens borders instead.

## Incident — a second session in this checkout

Throughout this pack a **parallel dashboard stream committed to main from this same working
tree** (`dd95ddb`, `1770ce7`, `b2cec34`, …) and left `src/lib/dashboardStats.ts`/`.test.ts`
modified-uncommitted, at one point with a duplicate-identifier tsc break. Handled per the house
rules: their files never touched, never staged (explicit-path staging); my tsc gates for P5/P6
ran in an **isolated worktree** (clean HEAD + my files → green both times); Vitest and the
production build were green in-tree throughout. This is the one-session-per-worktree rule being
violated upstream — flagged here, not fixed. **The dev deploy below was likewise built from a
clean worktree at the committed tip, so no uncommitted foreign WIP shipped.**

## Deploy

Dev hosting: built `main` at the pack's tip **in a clean worktree** and deployed
`--only hosting --config firebase.dev.json --project scriptally-dev` → https://scriptally-dev.web.app.
(Prod untouched, as ever.)
