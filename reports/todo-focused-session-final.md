# To-do — the focused session, FINAL (the gather · the pool of light · the deal)

Run against HEAD `05e9c25` (the room-based session, deployed to dev). This pack SUPERSEDES
that presentation entirely — the session now happens **in place**: the chrome and the
"What's on your desk?" title never leave; the board transforms around them. All four refs
verified in Downloads, read (the live ones played) in full: `todo-fix23.html` →
`design-refs/session-final.html` (the master; its vignette superseded by the pool) ·
`todo-fix24.html` → `design-refs/session-focus-signal.html` (option 5 only; 0–4 rejected) ·
`todo-fix18.html` → `design-refs/session-content.html` (frames A/D; frame B + the dark-room
framing superseded) · `todo-fix19.html` → `design-refs/session-deal.html` (option A;
unchanged from the room pack).

## Phase 0 — recon

- **The engine** (unchanged, kept whole): the queue is `boardCards = [...board.do,
  ...board.hk, ...board.nt]` captured at launch; sequential advance; **no requeue exists**
  in FocusFlow — the session's skip-to-order's-end and the vanish-driven handled advance
  carry over from the room pack as the session's own bookkeeping.
- **What the room pack built** (mapped for removal): the dark opening — ink dim wash,
  canvas veil (radial destination-out), the wandering spotlight, cream ritual lines, the
  Begin-session/Back-to-desk pair — plus the oat room ground, the session bar with its
  progress line, and the 560 room sheet. **All removed**; the engine seat, the
  `sessionContext` templates, the deal mechanics, the close ledger and the write-nothing
  guarantee carried over intact.
- Begin's wiring (`setSession({ queue: boardCards })`) and the reduced-motion utilities
  stand as the room pack left them.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the gather (the in-place rewrite) | `3d8e34c` | 1398 |
| P2 — the pool of light | `6bb4cf3` | 1402 |
| P3 — the deal, polished | `a0c90c2` | 1402 |
| P4 — the close, in place | `57b285e` | 1403 |
| P5 — wiring + the supersession sweep | `77231b2` | 1403 |
| report | `<this commit>` | 1403 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging.
**Transitional note**: P1's rewrite necessarily carried the relocated card, deal and close
skeletons (they are one component); P3/P4 then closed their real gaps — the same
transitional-commit shape the Final Shape pass used.

## What shipped

- **P1 — the gather** (≤3.5s, tokens in `sessionStage.GATHER`): the filter card and Today
  slide off ∓140% fading; the search, the hero pair, the free centre cards and the headings
  fade; the document bar slides up and out; the sheet's white dissolves — the items float
  on the bare desk under the standing title. The ritual lines play in the search's vacated
  slot (italic Playfair 19, ink-muted; the middle line is now **"Stacking the deck…"**).
  The gather flies every other visible item — cards, group bars or ledger rows, whichever
  view — onto the **first task's footprint** (first-from-the-engine via new `data-tdbkey`
  attributes; a collapsed member falls back to the sheet's centre), staggered with the
  budget cap (`staggerFor` — 44 items still land on time), scaling with the alternating
  ±1.5–6° tilt, settling at 85% opacity **beneath** the first. The morph grows the pile in
  one 700ms motion to the computed rest (`restTop`, min 24px clearance, remeasured on
  resize), arriving as the deal's stack; the subtitle and the mono session line take their
  seats. Any input skips to the composed state; reduced motion starts there; every styled
  board element is tracked in one set and stripped on any exit.
- **P2 — the pool of light** (option 5, and only option 5): the lit seat deepens the
  card's shadow to `0 26px 60px rgba(58,28,20,.38)` over a 500ms ride landing with the
  morph; the soft elliptical pool (640px against the 500 card, `rgba(58,28,20,.14)` →
  transparent) sits at z 0 — under the edges (1), under the card (3) — following the
  card's seat through every deal beat and leaving with the close.
- **P3 — the deal**: the option-A mechanics stand from the rewrite (stamp −8°/350ms pop →
  520ms hold → sweep left → the **450ms** rise with the session-line advance; skip
  down-and-behind to the session order's end; the two-edge stack thinning live;
  reduced-motion instant). The polish: the NEXT UP whisper now names the next **live**
  task (never a ghost), and the leaving clone's face carries the manuscript · agent line.
- **P4 — the close, in place**: the `willClose` deferral lets the **last card's sweep
  complete** before the close fades into the same centre region — previously the phase
  flipped mid-flight. "Desk cleared." / "Good session." by state, the honest ledger
  (handled / skipped-with-destination / the frozen timer), the per-task review expansion,
  and Back to your desk reversing the opening compressed (~700ms) — the board reassembles,
  already correct via the shared derivation; **the session writes nothing** (grep-banned).
- **P5**: popstate lands safely; the overture plays every session with its instant skip;
  the room-era presentation and its two refs removed (the fix18 source lives on re-fenced
  as `session-content.html`); the tour's Begin copy stands true; `focus-art.png` stays
  reserved; orphan scan clean.

## The in-browser script (dev)

1. **Play the gather from cards**: Begin — the sidebars slide away, the sheet dissolves,
   the lines play under the title, the cards fly onto the first task with their tilts, the
   pile grows to centre and the stack edges settle beneath the deepened shadow and pool.
2. **Play it from the ledger**: identical choreography — the rows gather onto the first
   row; both views converge on one session.
3. **Skip it mid-line**: any keypress — the composed session snaps in.
4. **Work a task via Action now** and return: the journey opens over the session;
   complete it and the stamp lands on return; abandon it and the same card resumes.
5. **Stamp one handled**: stamp → sweep → the next rises at centre, the session line
   ticking with the rise; the undo toast offers takeback.
6. **Skip one to the bottom**: down and behind; watch it come around at the queue's end.
7. **End early** via END SESSION ✕ → "Good session." with the ledger.
8. **Clear a queue** → the last card's sweep finishes, then "Desk cleared."; **Back to
   your desk** — watch the board reassemble in ~0.7s: sheet, bar, sidebars, search and
   buttons all return.
9. Reduced motion: the session starts composed; deals swap instantly.

## Deviations

- **The review card and the colophon fade with the exits** — the pack names the sidebars,
  search, bar and sheet; the centre stack's two free cards would otherwise stand orphaned
  mid-gather, so they ride the fade list (they return with the reverse).
- **The gather stagger is budget-capped** (`staggerFor`) — the pack's ~95ms would blow the
  ≤3.5s total on a 44-item board; small boards keep the full 95.
- **First-task fallback**: a queue-first whose element is hidden (a dq member inside a
  collapsed group) gathers onto the sheet's centre — the engine's identity holds, the
  target rect approximates.
- **Skip-to-close is instant** (no sweep): the early-close path fires before any clone
  mounts — the last-sweep ceremony belongs to the handled path, which the deferral now
  honours.
- **The pool leaves by unmount under the close's 500ms fade-in** — reading "the pool
  fades" as the crossfade the close provides rather than a separate exit animation.
- **The engine's requeue** remains the session's own (recon: FocusFlow has none) — skip
  to the session order's end, exactly as the room pack resolved it.
- jsdom limits: the gather geometry, the morph, the pool and the reassembly are
  source/rule-text locks over unit-tested maths — the browser script confirms the pixels.

## Close

**The focused session and the To-do redesign are complete. The entire remaining queue:
dev deploy → prod sequencing pass → Correction UI.**
