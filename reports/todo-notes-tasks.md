# To-do — notes and tasks (the composer, the two natures)

The Notes section gets a purpose, and a user-created item gets two distinct natures: a **note**
(pinned, dateless, nothing chases you) and a **task** (dated, joins the work). Design authority:
`design-refs/notes-and-tasks.html` (todo-fix62) — frame 1 the empty section · frame 2 the live
composer · frame 3 the resulting cards.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| the ref (fenced) | `224f87e` | — |
| P1 — the empty Notes section | `69ac38e` | 1932 |
| P2 — the composer + the schema | `7b55d23` | 1941 |
| P3 — the two natures on the board | `d9cef6a` | 1948 |
| P4 — the sweep + this report | `<this commit>` | 1949 |

Gates green per commit (`tsc` + production build + full Vitest, pipefail); explicit-path staging.
The feature's own suite is `todoNotesTasks.test.ts`. **Built on the claude-il-merged To-do page
(`463a218`)**, not the pre-merge panel-final structure — the merge landed a divergent To-do rebuild
(`renderFilterChips` / `Lane` "Notes to self" / the app-shell-v2 chrome) that `main` now carries.

## Phase 0 — model findings + the gate

**GATE PASSED — user-created items have a persisted model.** `UserTask` (`src/types.ts`) lives in
`users/{uid}/tasks`, written through `addUserTask` / `updateUserTask` (`src/lib/db.tsx`). It already
carried **`dueDate`** — and the note↔task distinction is **derived from its presence** (the file's
own comment: "with one, the note is also a To-do task"). So the two natures were already latent in
the data; this pack made them legible.

**Schema change made (P2, shared with P3).** The composer needed two fields `UserTask` lacked:
- **`detail?: string`** — the optional detail line beneath the title.
- **`surfaceOffset?: SurfaceOffset`** (`"on-day" | "day-before" | "week-before"`) — an **in-app
  surfacing lead**. Per the spec correction, this is **NOT a reminder/notification**: there is no
  delivery mechanism (no push, no email). It only decides **how early a dated task joins Today's
  list**, derived at render from `dueDate`. The composer field reads **"Show it in Today's list"**,
  and the card chip reads "SHOWS A DAY/WEEK EARLY" — no notification vocabulary anywhere.

Wired through `types.ts` (`UserTask` + the `SurfaceOffset` union), `addUserTask` (detail trimmed;
`surfaceOffset` only on a dated task, the `on-day` default omitted for the leanest write), and the
`isValidUserTask` rules allowlist + the `/tasks` update `affectedKeys`.

## ⚠️ RULES EDITED, NOT DEPLOYED — exactly which writes silently fail

`firestore.rules` was edited (both new keys added to `isValidUserTask`'s `hasOnly` allowlist, a
`surfaceOffset in ['on-day','day-before','week-before']` clause, and the two keys added to the
`/tasks` update `affectedKeys`). **These are NOT deployed — Nick deploys manually** with:

```
firebase deploy --only firestore:rules
```

(dev via `--config firebase.dev.json --project dev`, then prod). Until that runs, the **live** rules
reject any `UserTask` document carrying a key they don't yet know, because `hasOnly` fails on an
unknown key — the whole write is denied, not just the field. Concretely, **against the undeployed
rules**:

- **Saving a note WITH a detail line → SILENTLY DENIED** (the create carries `detail`).
- **Saving a TASK → SILENTLY DENIED** whenever it carries `detail` or a non-default `surfaceOffset`
  (`day-before` / `week-before`). A task with only a `dueDate` (no detail, `on-day` surfacing, which
  is omitted) writes `dueDate` only and **still saves**.
- **Editing** a task's `detail` / `surfaceOffset` → denied by the update `affectedKeys` until deploy.
- **Still fine** pre-deploy: a plain **dateless note with a title only** (no new keys); completing a
  task (`done` / `completedAt` — already allowed); committing to Today (`committedDate` — unchanged).

The write paths were **NOT tested as if deployed** — the failure surfaces through
`handleFirestoreError` (a caught permission error, graceful), exactly as with every prior
rules-parked feature in this repo.

## What shipped

- **P1 — the empty Notes section.** When the Notes lane is empty it renders the dashed butter card
  (frame 1): a pin glyph in a tile, Playfair "Nothing pinned here yet", the explanatory line, and
  the ink "＋ Write a note" that opens the composer in **note** mode. The section head + honest count
  stay; the card vanishes the moment a note exists. Introduces the `composerMode` +
  `openComposer(mode)` nature seam. Retired the v4 quiet-＋ ghost + its `.tdb-ghostcard` CSS.
- **P2 — the composer.** One composer, two natures (frame 2). The type segment leads; switching
  transforms it live — Caveat ↔ typeset title/detail, butter ↔ sage offset block (`--nt-comp-block`),
  the date + surfacing fields task-only (surfacing only once a date is set), the note's NO-DATE line,
  the changing save verb. Content survives every switch. Two entry points (Notes → note, hero →
  task). Title always required; a task also requires a date. ⌘⏎ saves; Esc runs the styled
  `useConfirmAsk` discard only when dirty — no native dialog. Retired the old `.tdb-composer`
  textarea.
- **P3 — the two natures on the board.** `renderUserCard` draws the frame-3 grammar: a **note** is
  butter (✎ NOTE, Caveat, PINNED footer, **no tick**); a **task** is the **sage** user-created family
  (✓ YOUR TASK, typeset, a date chip, a completion **tick** → the existing `quickDone` + undo). A
  task **PROMOTES** on its due day — pink offset + band, a DUE TODAY tag (OVERDUE past it), the Urgent
  lane, Today's list — and `surfaceOffset` joins it to Today's list `lead` days early. Every part is
  **derived by the clock** (`taskDueState` / `taskSurfaced` / `SURFACE_LEAD_DAYS`, pure + unit-locked;
  `todaySplit` reads a derived `surfaced` flag, writing nothing). **Sage is user-created; blue is
  Pro** and never appears on a user card. Supersedes the old linked-reminder split.
- **P4 — the sweep + record.** `themes.md` gains "Notes and tasks — the two natures". The tour gains
  a step at the hero's "Add task or note" (`.svh-btn-primary`) teaching the two natures — eight stops.

## In-browser script (dev — after the rules deploy, so writes land)

1. Open `/todo`. The empty Notes section shows the dashed butter card; press **＋ Write a note** — the
   composer opens in **note** mode (butter shadow, Caveat, "NO DATE · NOTHING WILL CHASE YOU").
2. Type a title; **switch to ✓ Task** — watch it transform: the shadow goes **sage**, the type goes
   **typeset**, the **date** field appears — and your words survive. Switch back to **Note**: still
   there, handwriting again.
3. Save a **note** — it pins with the ✎ NOTE band and a PINNED footer, **no tick**.
4. From the **hero**, "Add task or note" opens **task** mode. Give it **today's date** and save —
   it appears **urgent (pink)** with a **DUE TODAY** tag, in the Urgent lane and on **Today's list**.
5. Add another task dated **next week**, "Show it in Today's list → A week early" — it saves as a
   **sage** task in Notes, and (because it's within a week) already shows on **Today's list**; dated
   further out with "On the day", it waits in Notes until its day.

## Deviations (flagged)

- **A task requires a date** (title is always required). A dateless "task" would be indistinguishable
  from a note (the nature is dueDate-derived), so the save is gated until a date is set — the spec
  named only "title (required)"; this keeps the two natures honest.
- **Surfacing chip / field wording** is in-app ("Show it in Today's list", "SHOWS A WEEK EARLY"), per
  the spec correction — never "Remind me" and never any notification copy.
- **Glyphs are lucide** (the empty-state Pin) where TypeGlyph can't serve — TypeGlyph is locked to the
  three material `ComponentType`s, as in every prior To-do pack.
- **`reminderDue` is retained but no longer drives the board** — the linked-reminder derivation it
  fed is superseded by due-state promotion; it and its unit test are a candidate for a later sweep.
- jsdom mounts nothing: geometry, grammar, wiring, schema and rules are source/rule-text locks; the
  pixels + the live saves (post-deploy) are Nick's in-browser checklist.

## Close

The queue: **dev deploy (incl. `firestore:rules`) → prod sequencing pass → Correction UI.**
