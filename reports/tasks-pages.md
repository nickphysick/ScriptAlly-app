# Tasks workspace — alignment, Calendar, Noteboard, and tags (run report, 7 Aug 2026)

**Pack:** one shared page grid, the two remaining pages, tags shipped for real.
**Ref:** `todo-fix94.html` → `design-refs/tasks-pages.html`, scope-fenced in the file head. Two
places the PACK PROSE wins over the ref's own drawing (the house carve-out): the page sidebar
starts BELOW the header's hairline (the ref draws it full-height beside the title — the exact
Today bug the pack names), and the Noteboard has NO page sidebar.
**Commits (one per phase):** `599d902` (P1) → `3ab2042` (P2) → `96eb7e6` (P3) → `11117d5` (P4)
→ `2a6a247` (P5). Gates green per commit. Suite at close: **2993 passed | 2 skipped, 187 files**
(from 2932 at the pack's start).

---

## P1 — the alignment contract (`599d902`)

**THE TOKEN: `--tdb-chrome-gap` (44px), worn via `.tdb-col`** — the single geometry owner
(max-width 1360, gutters, the top padding). Today's squash was this whole column missing: the
page rendered `.tdw` at its root, so its sidebar mounted level with the title and the header sat
against the top bar.

`TasksPageLayout` (+ tasksLayout.css) is the contract, once: header block (Playfair 30 title →
one-line subtitle → tool row) spanning the full content width → the hairline (the tool row's own
bottom edge) → beneath it, the sidebar and body starting on the same line. The tool row is the
ONLY home for page controls, with the pink creation action in the right slot (`TplGrow` pins
it); the sidebar is the one `TodoSideContainer` and is optional per page (absent = no aside at
all). The layout's own stylesheet restates NO top padding — locked, because a second number is
the squash reborn. Both existing pages converted off `PageHeader`; ten PageHeader-era locks
superseded in place.

## P2 — the carry-over fixes (`3ab2042`)

1. **One count derivation.** The badge said 42 beside "fifteen cards"; Today's FILTERS said
   27/24 against 15/12. Causes: the badge was still on the member-unit law (`todoBadgeCount`)
   after the cards-unit move, and Today fed its FILTERS the raw lanes (members, structurally
   blind to the flags-built Snoozed). `assembleBoardColumns` (todoColumns) is now the one
   assembly — assemble → group housekeeping → sweeps → columns, identically scoped — and the
   badge, both pages' boards and both pages' FILTERS counts all walk it. Locked: badge == page
   == Everything over one input; the raw-lane feed asserted extinct.
2. **The offer cap, every path. THE PATH THAT BYPASSED IT: FocusFlow's generic snooze** — a
   flat `dismissTask(…, 7)` for any derived card, reachable via dock → More → the sheet; that is
   the "BACK 7 AUG" offer from the walk. Clamped there (toast says tomorrow), at the
   staged-payload write, and at the page's `snoozeCard` choke point. **Found en route: the
   dock's clock button was silently DEAD** — it set `laterKey` for a popover that only ever
   mounted on the retired ledger rows. It owns a real tier menu now (opens upward; an offer sees
   ONLY the tomorrow tier — absent, not disabled) and routes through the clamped choke point.
   The board's drag + ⋯ tiers were already capped (board fixes II).
3. **Snoozed titles.** "Tom Ellery — put away" told you who, not what. A snoozed card keeps the
   work's ORIGINAL title: derived cards rebuild it through `derivedCopy` (exported — THE title
   source, never a second template); a snoozed user task reads its own text from the raw
   collection the board filtered. The band carries the sleeping state: `SNOOZED · BACK {date}`.
4. **The done band.** Done cards carried kind "" / due "" — blank bands. They read `✓ DONE` with
   the completion time (16:44) from the instant they already carried.

## P3 — the Calendar (`96eb7e6`)

Month grid per the ref (Monday-start full weeks; ◀ Today ▶, Month ▾ with Week, pink Add in the
right slot, sidebar present), everything derived (todoCalendar.ts):
- **Placement per source:** user tasks on dueDate; agent tasks on the day they LANDED
  (`lastStatusChange`, the REQUESTED figures' own basis, falling back to dateSent); snoozed on
  the flag's return date; **notes only if dated — structurally empty under the two-natures law**
  (a dated user card IS a task); implemented as specified so the butter room exists the day the
  model distinguishes origin. Housekeeping never calendars — a standing pile is not an
  appointment; the legend says so by omission.
- **Roll-forward from the clock:** undone work renders on TODAY; the origin day keeps one
  "{n} ROLLED FORWARD ↗" marker. Nothing moves at midnight because nothing is anywhere.
- **Completed stays put**, struck, from the same clearing union the Done column reads; never
  rolls, opens no sheet, and rides only the unfiltered view (finished work is not waiting — a
  struck pip inside "Urgent" would read as urgent).
- **Pips + legend from the ONE colour module** (CAL_PIP/CAL_LEGEND in todoFamily): agent pink ·
  task sage · snoozed parchment · dated-note butter · done muted. Ink ring on today, corner
  counts, "+N MORE" past three.
- **Clicks:** a pip opens the item sheet (the same FocusFlow every To-do entrance opens); a day
  opens its list panel. The pink Add navigates to the ONE composer and announces (the ＋ New
  pattern — never a second create surface).

## P4 — the Noteboard (`11117d5`)

Masonry (CSS `columns:3`, packing by length), butter Caveat cards with tags, pin dates and the
same reserved-corner ⋯; no page sidebar; tools: search · `#All ▾` · "Read as a column" · pink
"＋ Pin a note". **Notes only** (isNoteTask — lib-level). **The date is the door:** "Give it a
date…" is ONE write; the note leaves this board, joins Your tasks and appears on the Calendar —
locked at the derivation level. The ⋯ menu rides the SAME shell: **PortalMenu extracted from
TodoBoard** (portal, placement, closers, keyboard move whole; the board becomes a thin feed of
its own model). Delete asks first and holds an **8s undo** re-creating the same document id
(flash gained a duration override on the same timer). Pinning/editing happen in place (a butter
in-flow composer over addUserTask/updateUserTask). The teaching empty state explains what notes
are for and how one becomes a task. TodoPlaceholderPage deleted with its last consumer.

## P5 — tags, for real (`2a6a247`)

**The model as built:** `TagDef { id, label, colour }` on **User.tags** (the mutedTaskRules
pattern — small, listener-free); items carry **UserTask.tags: string[]** (ids). Labels
lowercase, no spaces, unique per user (normalised at every entrance); colour from the FIXED
five-tone family palette (`TAG_PALETTE` in todoFamily, the one colour module), assigned at
creation by least-used rotation, changeable in settings, never free-form. Deleting a tag
detaches it from every item (id leaves each task, then the def leaves the user doc) and never
deletes the items. Tags survive note→task conversion by construction — the conversion writes
only dueDate.

**One TagPicker, three mounts** — the composer (compact; draft ids land with the one save), the
item sheet (the dock's user-task surface via `tagsSlot`; derived work cannot be tagged), and the
⋯ menu's "Tags…" (landed NOW, with the picker, on the board's user-task menu and the note menu).
Typing an unmatched label offers "Create #{label}" inline. The sidebar's TAGS section is real on
all three sidebar pages (palette swatches, live usage counts, multi-select, Clear); tag filters
combine ADDITIVELY with FILTERS through one narrow helper (facet ∧ tags) on the board, Today and
the Calendar. Task settings gained the CRUD list.

**Rules:** task + user validators and update allowlists gained `tags` (the safe hasAny pattern).
**Deployed to dev, BOTH databases** — release updateTimes verified 07 Aug 09:41 UTC.
⚠️ **PROD RULES REMAIN NICK'S** — tag writes on prod are silently denied until his
`firestore:rules` deploy (which now carries: rejectedDate · detail/surfaceOffset ·
committedDate · **tags**, per the prod sequencing queue).

---

## The walk (dev — auth-gated, so these are yours)

1. **Alignment:** flip between To-do list and Today — the titles sit at the same offset, the
   sidebar starts below the hairline on both, and Today's header no longer touches the top bar.
2. **Counts:** the sidebar badge == the page subtitle's cards == FILTERS' Everything, and
   Today's FILTERS figures match the list page's.
3. **The cap:** snooze an offer from every door (⋯ menu, drag to Snoozed, the dock's clock, the
   sheet) — nothing offers more than tomorrow, and nothing lands past it.
4. **Snoozed + Done:** a snoozed card reads its real title with SNOOZED · BACK {date}; every
   Done card reads ✓ DONE | its time.
5. **Calendar:** items sit on their days; yesterday's undone work sits on today with a marker
   where it left; completed days are struck; a pip opens the sheet, a day opens its list; the
   legend matches the pip tones; Week view works; the ink ring sits on today.
6. **Noteboard:** pin a note (masonry packs by length); Read as a column; give one a date and
   watch it leave for the To-do list + Calendar; delete asks and the undo waits 8 seconds.
7. **Tags:** create #synopsis from the composer; see it in the sidebar with a count; select
   Urgent + #synopsis together (additive); rename/recolour/delete in Task settings — deleting
   detaches, the note survives.

## Incidents / notes

- The tsc gate ran cleanly in-tree throughout this pack (the prior pack's parallel-stream WIP
  had been committed before it began).
- The "dated notes" calendar family is structurally empty under the two-natures law — built as
  specified, documented above.

## Deploy

Dev rules: both DBs, verified (above). Dev hosting: `main` at the pack's tip →
https://scriptally-dev.web.app. Prod untouched.
