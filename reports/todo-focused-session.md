# To-do — the focused session (opening · room · the deal · the close)

Run against HEAD `c228f01` (the grouping pass). All three refs fresh in Downloads (23 Jul
16:41), read (and the live ones played) in full, committed with P1: `todo-fix17b.html` →
`design-refs/session-opening.html` (v3.1 normative; earlier fix15/16/17 variants superseded) ·
`todo-fix18.html` → `design-refs/session-room.html` (frames A + D; frame B's pulse superseded
by the deal — not built) · `todo-fix19.html` → `design-refs/session-deal.html` (option A only;
B/C/D rejected).

## Phase 0 — the recon's queue findings

**The engine is coherent and retained as-is:**

- **Entry**: Begin focused session → the whole board. **Queue derivation**:
  `boardCards = [...board.do, ...board.hk, ...board.nt]` — urgent → housekeeping → notes,
  the board's own lane order. The session captures it at launch.
- **Progression**: FocusFlow's `items + qi + advance()` — strictly sequential;
  `atReview = qi >= items.length` ends it. **No requeue exists anywhere** — the sweep's
  skip ("Leave it" / "→") is a plain advance; a passed task stays on the board.
- **Per-task actions**: the per-type journeys (offer doors, staged mark-sent, dq fill,
  stale close, note) + the immediate quick primitives. `quickDone`'s honest one-tap arms:
  notes · no-response-close · nudge · the mark-sent family. **Offers and dq member cards
  have no one-tap arm** (the standing offers-need-the-moment rule; dq completes through
  its journey).
- **Exits**: requestExit (the styled ask when staged) → onClose.
- The Begin/review pair wiring and the reduced-motion utilities confirmed as the hero-pair
  pass left them.

**What the new session keeps as the engine**: the queue derivation + order, the journeys
(Action now opens them unchanged), the quick primitives, the undo-toast system, and the
shared board derivation as the single source of truth. **What was superseded**: the Begin
entry's direct whole-board FocusFlow walk (the wiring only) + ToDoPage's dead strip-era
`focus-art` import. FocusFlow itself stands for the lane sweeps, the ritual, the Sunday
review and every journey.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the opening | `82cc921` | 1376 |
| P2 — the room | `eb87f03` | 1391 |
| P3 — the deal | `90b8df4` | 1396 |
| P4 — the close | `e75b5e4` | 1400 |
| P5 — wiring + sweep | `d073424` | 1404 |
| report | `<this commit>` | 1404 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging. New
files: `FocusedSession.tsx` · `sessionStage.ts(+test)` · `sessionContext.ts(+test)` ·
`todoSession.test.ts`. The stage maths and the context templates are REAL-unit-tested
(nearest-edge incl. the equidistant corner case; template-per-kind + the omission law).

## What shipped

- **P1 — the opening** (≤4.5s, tokens in `sessionStage.OPENING`): the ink wash rises to
  0.74 over 1.1s; the board wrap's CONTENTS (cards, group bars, the containers' contents —
  never the shells, never the app chrome) fly through their nearest viewport edges,
  staggered 90ms with the travel tilt; the three ritual lines play large in italic Playfair
  cream; the veil deepens to 0.9 (canvas radial mask) with the first task mounted UNSEEN
  beneath it — the spotlight enters from below, wanders two waypoints and locks, the card
  existing only inside the beam (z-locked); the pair pops 110ms apart. Any click/keypress
  skips to the final composition; reduced motion starts there; Back to desk reverses
  compressed (600ms) and strips every inline style from any exit path.
- **P2 — the room**: the slim bar (mono count · the live ink progress line · the lane
  label · End session ✕) over one centred 560px sheet — family band + tag, Playfair 26
  title, the italic manuscript · agent line, and "Where this stands" composed by TEMPLATES
  from existing derived fields only (offer / awaiting-send / nudge / stale / dq; a missing
  field drops its clause; an empty composition hides the card; notes say nothing). Actions:
  **Action now** (opens the existing journey OVER the session; a surviving task resumes in
  place), **✓ Mark handled** (gated on `quickDone`'s honest arms; it fires the primitive
  with its undo toast — the task's VANISH from the live board drives the deal, so a
  declined dup-guard honestly stays put, and a task completed inside its journey deals the
  same way), **Skip for now**. The footer whispers NEXT UP.
- **P3 — the deal** (option A): at most two sheet-edges beneath the current sheet (.975 /
  .95 faded), thinning honestly. Handled: the sage stamp (−8°, 350ms pop) → the 520ms
  hold → the sweep off left → the next rises 180ms in, the advance (progress + footer)
  firing WITH the rise. Skip: no stamp — down and behind (450ms) as the requeue to the
  session order's end (the engine has no requeue of its own — recon; skipping the last
  live task closes). Reduced motion: instant swaps, the stamp without its pop.
- **P4 — the close** (frame D): "Desk cleared." / "Good session." by state over the honest
  ledger — ✓ Handled {n} · dashed-ring "Skipped — back on your desk" {n} (the one uniform
  destination) · ⏱ Session length from the frozen session timer — with "Review what you
  did" expanding to the per-task list in the board's mark grammar. Back to your desk
  returns via onClose; **the session writes nothing, ever** (every write primitive
  grep-banned from the component) — the board already reflects the work through the shared
  derivation.
- **P5**: popstate lands safely on the board; the overture plays every start (no
  seen-flag, grep-locked) with its instant skip; the dead focus-art import swept (the
  asset stays reserved); the tour's Begin copy verified true unchanged.

## The in-browser run-through script (dev)

1. **Play the full opening**: Begin focused session — darken, the desk clearing through
   its edges under the ritual lines, full dark, the light wandering up from below and
   finding the first card, the pair popping. (~4.5s.)
2. **Skip it**: run it again and press any key mid-flight — the lit card + pair snap in.
3. **Back to desk** from the pair: the veil lifts and the cards return (~0.6s), the board
   intact.
4. **Begin session** → the room: the bar's count/progress/lane, the sheet with its "Where
   this stands" card (check an offer's line against the real dates/names).
5. **Work a task via Action now**: the journey opens over the room; complete it — on
   return the stamp lands and the deal runs; abandon it instead — the same sheet resumes.
6. **Stamp one handled** (✓ Mark handled where offered): stamp → sweep → the next rises,
   the progress ticking with the rise; the undo toast offers takeback.
7. **Skip one**: the sheet slides down behind the stack; watch it come around again at the
   queue's end.
8. **End early** → "Good session." with the ledger; "Review what you did" expands the
   per-task marks.
9. **Finish a queue** → "Desk cleared."; Back to your desk — the board stands complete,
   nothing "syncing".
10. Reduced motion (OS toggle): the opening starts at the final composition; deals swap
    instantly.

## Deviations

- **The ref's raw opening timings trimmed** (lines 840ms · wander 380/540) to hold the
  pack's ≤4.5s budget exactly — fenced in the ref; the spine is unit-locked.
- **Mark handled advances via the VANISH**, not its own callback: the button fires the
  primitive; the task leaving the live board drives the stamp+deal. This is what makes a
  declined dup-guard stay put honestly and lets journey-completed tasks deal identically
  ("returning resumes at the same task" holds for survivors).
- **Mark handled hides where no honest one-tap exists** (offers, dq members) — the pack's
  fixed three-action row meets the standing offers-no-✓ rule; Action now + Skip remain.
- **Skip requeues to the session order's end** — the pack's drawn/written behaviour; recon
  found no engine requeue to defer to, and a skipped-only queue would loop, so skipping
  the last live task ends the session.
- **Dead queue entries fast-forward silently** (completed outside the session's own
  stamps) — they were never session actions, so the ledger doesn't claim them.
- **The close's skipped row names the destination** ("back on your desk") — uniform by
  construction; session skips never snooze.
- **The "StatusDot-consistent marks"** in the review list are the board's mark grammar
  (sage tick / dashed ring) — StatusDot itself is locked to query statuses and is not
  co-opted.
- jsdom limits: the choreography, the canvas beam, stacking and the fly are
  source/rule-text locks over unit-tested maths — the browser run-through confirms the
  pixels.

## Close

**The focused session is built; the To-do redesign is functionally complete; dev deploy →
prod sequencing pass → Correction UI.**
