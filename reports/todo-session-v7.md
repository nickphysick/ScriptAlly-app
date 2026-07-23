# To-do — the focused session, v7 (curtains · the carriage · "Clearing the desk")

Run against HEAD `4641504` (the pool-of-light v6, deployed to dev). This pack SUPERSEDES both
earlier session packs — the room (v5) and the pool-of-light (v6) — and is the single target.
Refs: `todo-fix25.html` → `design-refs/session-v7.html` (the master; transition A only —
B/C/D and the vignette rejected; "Let's clear your desk" → "Clearing the desk"; the
overlapping-lines hero → the spacing law) · `todo-fix18.html` → `design-refs/session-content.html`
(frame A/D). The v6 refs (session-final, session-focus-signal) are retired.

## Phase 0 — recon

- **The engine** (kept whole): the queue is `boardCards = [...board.do, ...board.hk,
  ...board.nt]` captured at launch; sequential advance; **no requeue in FocusFlow** — the
  session's skip-to-order's-end and the vanish-driven handled advance are the session's own
  bookkeeping.
- **What v6 built** (transformed in place, not rebuilt): the gather + morph + the templated
  card + the close carried over; the **pool of light + deck edges** were removed, and the
  **dark-room remnants** were already gone. The measured-overlay hero pieces (`.tdb-fssub`,
  `.tdb-fsslot`) were replaced by the real stacked-flow hero.
- Begin's wiring (`setSession`) and the reduced-motion utilities stand.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the hero: title crossfade · fixed slot · ritual | `2f5d0ab` | 1402 |
| P2 — the curtains + the dim | `fd762f3` | 1403 |
| P3 — the gather + morph, deck retired | `b2db7cc` | 1406 |
| P4 — the card + the carriage (transition A) | `bbb905a` | 1407 |
| P5 — the close · wiring · the supersession sweep | `1a66c83` | 1411 |
| report | `<this commit>` | 1411 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging. An
in-place transform, so each commit is a real behavioural swap over the v6 session.

## What shipped

- **P1 — the hero**: the title crossfades gently (opacity only, 800ms) between "What's on
  your desk?" and "Clearing the desk" — a stacked pair sharing the line. The hero is a real
  stacked flow (the overlap bug fixed): the sub-slot is **fixed height** (min 46, ≥10px even
  gaps) hosting exactly ONE occupant that crossfades — the search at rest → the ritual lines
  (italic Playfair 19, ink-muted, 780ms, rise-in/out) → the mono "TASK i OF n · END SESSION
  ✕". The hero owns this via one lifted view-model: FocusedSession reports `HeroSession` up
  through `onHero`, ToDoPage renders it; the v6 measured `.tdb-fssub`/`.tdb-fsslot` are
  retired.
- **P2 — the curtains + the dim**: ink panels (`#1d100c→#2a1a13` toward centre) close from
  the L/R screen edges over 1.1s and withdraw on Back; their width is a viewport token
  (`curtainWidth` — 200 at ≥1500, else ~13vw floored 96, unit-tested, resize-aware) and the
  card wrap insets by it so they clip nothing. A slight `rgba(58,28,20,.16)` wash dims the
  work area; the card renders above it (z dim 0 < card 3 < curtains 6, curtains at the edges
  only). The pool of light + deck edges are extinct.
- **P3 — the gather + morph**: every other item flies onto the engine's first task (via
  `data-tdbkey`), staggered 90ms, ~85% opacity beneath it; the morph grows the pile to the
  computed rest (min 20, between the curtains) and the pile **fully fades** — no residual
  stack. Exits slide ∓150.
- **P4 — the carriage** (transition A): on handled the sage stamp lands (−8°, 350ms), holds
  440ms, then the card slides straight OUT LEFT while the next slides IN from the RIGHT,
  overlapping (170ms in); skip is the same out-left slide with no stamp, the engine's
  requeue sliding in. Down-and-behind is retired; `DEAL`→`CARRIAGE` tokens.
- **P5 — the close · wiring · sweep**: the close resolves in place; Back to your desk
  reverses the opening compressed — curtains withdraw, dim lifts, title crossfades back,
  board reassembles from the one styled-set, then strips. Board back / END SESSION / popstate
  all safe; the overture always plays; the v6 presentation + the dead `line` state swept;
  the tour's Begin copy stands; `focus-art.png` reserved.

## In-browser script (dev)

1. **From cards**: Begin — the sidebars slide off, the sheet dissolves, "Clearing the desk"
   fades in with the ritual lines evenly beneath it (no overlap, nothing shifting), the
   curtains close from both edges, the cards gather onto the first and grow to centre
   between the curtains under the slight dim.
2. **From the ledger**: the rows gather identically onto the first row.
3. **Skip it** mid-line: the composed session snaps in.
4. On a **wide window** the curtains are 200px; on a **laptop** they're narrower (~13vw).
5. **Action now** → the journey over the session; return resumes the same task.
6. **Stamp one handled**: the card slides out left as the next slides in from the right, the
   session line ticking over; the undo toast offers takeback.
7. **Skip one**: the same out-left slide, no stamp; the requeue slides in.
8. **End early** → "Good session."; **clear a queue** → the last card slides off, then "Desk
   cleared."; **Back to your desk** — the curtains withdraw, the dim lifts, the title
   crossfades back and the board reassembles.
9. Reduced motion: the session starts composed; swaps instant.

## Deviations

- **The title crossfade pair overlaps** (t1/t2 share the line) — the one intended absolute
  overlap; the spacing law's "nothing absolute over anything" is honoured for the sub-slot
  and the board below (a crossfade cannot be done without the pair overlapping). Flagged.
- **The dim covers the work area below the hero**, not the full stage — the title strip
  stays crisp and the z-fight for the hero is sidestepped; a defensible improvement over the
  ref's full-inset dim.
- **The curtains sit at the screen edges** (the centred card/title never under them), so
  their z vs the hero never conflicts regardless — no hero z-raise needed.
- **The carriage clips at the curtain inner edge** (the wrap's `overflow:hidden` inset by
  the curtain widths) — the card exits the visible stage between the wings, which reads
  right for transition A.
- **The hero view-model is lifted** (`onHero`), not portalled — ToDoPage owns the hero DOM,
  so the session reports its title/slot state up; a clean single prop.
- The engine's requeue remains the session's own (recon: FocusFlow has none); the write-
  nothing guarantee, the templates and the ledger are unchanged from v6.
- jsdom limits: the crossfades, the curtains, the gather geometry and the carriage are
  source/rule-text locks over unit-tested maths — the browser script confirms the pixels.

## Close

**The focused session and the To-do redesign are complete. The entire remaining queue: dev
deploy → prod sequencing pass → Correction UI.**
