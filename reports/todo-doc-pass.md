# To-do — the document pass (search · width tiers · ledger v2 · undo)

Run against HEAD `6cbf3ba` (the polish pack). Both refs fresh in Downloads (23 Jul 10:14–15),
read in full, committed with P1: `todo-fix6.html` → `design-refs/todo-doc-pass-a.html` ·
`todo-fix7.html` → `design-refs/todo-doc-pass-b.html`. Ref A's drawn ledger labels (✓ Done ·
＋ Today · ☾ Later ▾) are superseded by ref B's + the pack's baked decisions — recorded in the
a-ref's fence. Phase 0 confirmed the polish state live with no drift (press buttons, the three
sibling containers, the reactive rail).

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the search pill | `36d595b` | 1308 |
| P2 — the ≥1700 width tier | `cadfc77` | 1312 |
| P3 — the document header | `9ce0931` | 1316 |
| P4 — ledger v2 | `dc3468b` | 1319 |
| P5 — the undo-toast system | `b7e28ad` | 1324 |
| P6 — sweep + tour retarget | `ff7fa0e` | 1327 |
| report | `<this commit>` | 1327 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging.

## What shipped

- **P1** — the search pill narrows to **380px**; the ⌘K badge is gone (the shortcut still
  focuses the pill — only the advert went); the glass grew to a **19px stroke icon** riding a
  **34px oat roundel at the right end**. The reactive rail composes with the same state,
  untouched.
- **P2** — the width contract gains a tier: **≥1700px viewports run 4-up WITH Today** (sheet
  1072, assembly 1624), fitting because the page edge gutter relaxed to the new **32px
  `--tdb-edge` token** (the breakpoint arithmetic already assumed 32 — the code never actually
  held a 48; the token makes it real and padded). The full matrix: Today hidden → 4-up at
  every tier; Today visible → 4-up from 1700, 3-up below; compact tiers untouched. Cards stay
  `var(--tdb-cardw)` in every cell. The step rides the existing 220ms width transitions (the
  Today-mount mechanics; reduced-motion instant); the run sheet consumes the same widths
  through the stack.
- **P3** — the sheet gained the **document header**: a warm-grey toolbar band
  (`#edecea→#e7e6e3`, 1px `#d9d7d2` rule) across its full top edge on both views — mono meta
  left (on-grey ink `#7d776f`), the view segment right, restyled to sit on grey (`#f4f3f1`
  track, `#cfcdc8` border, 30×22 chips, the active chip keeping its half-pressed ink
  treatment on a white fill). The body padding starts below the band (`.tdb-sheetbody`
  16/18/18); the band carries its **own 15px top corners** instead of the ref's
  `overflow:hidden` — hidden would re-scope the lane headings' sticky away from the page
  scroll.
- **P4** — **ledger v2**: each lane's rows live in a rounded **family-washed section** —
  Urgent whisper pink (`#fbf1ed→#faeee9` / `#f3ddd4`), Housekeeping whisper latte
  (`#faf6ee→#f8f3e8` / `#ede4d2`), Notes a **derived** whisper at the same strength — with
  rows as **white cards** inside (radius 11, hairline, 8 apart). The heading (play · Playfair
  19 · count chip) sits on the wash, **sticks** within the page scroll on wash-coloured
  backing, and **folds on click** (the play button opts out; chevron + `aria-expanded`;
  persisted per-lane under `sa.todoLedgerFold`). Actions per the baked labels, 32px and
  vertically centred: press **"Action now"** — it *opens* the acting surface (unit → journey,
  batch → Batch fix), exactly as row-click, and never completes — beside ghosts **"＋ Today's
  list"** and **"☾ Snooze or dismiss ▾"** (the same Later menu items under the renamed
  trigger). **Quick-complete moved to the row's head**: the 24px family roundel grows its
  tick on row hover/focus and completes immediately (offers + batches keep the plain dot —
  an offer needs its moment, a batch has no single completion). The cards view keeps its
  short verbs — the divergence is baked.
- **P5** — **the undo-toast system**: quick actions fire immediately and offer takeback. The
  ink pill (bottom-centre, above the help FAB's line) slides up with a **paper Undo** on a
  **6-second window**; hover pauses the timer (remaining-time model); **one toast at a
  time** — a new action replaces the current toast, committing the previous; **Esc
  dismisses** (= commits); reduced motion fades instead of sliding. Grammar per action type:
  `Done — "{title}"` · `Snoozed until {when}` · `Hidden — {type}` — applied to every quick
  path and unified across FocusFlow's sweep toasts (same pipe, same surface). Undo reverses
  via each action's **existing inverse** only (`undoQueryStatus` / `deleteActivity` /
  `unbumpSnooze` / `done:false` / the profile filter-out) — asserted, nothing new built.
  **Today's committed rows gained the leading tick** (grows on hover/focus, completes via
  quickDone with the toast; offers keep the plain dot).
- **P6** — `quickPause` deleted (call-less since the 9-col table died); the tour's card stop
  retargeted `.tdb-step` → `.tdb-lrow`; orphan scan clean; the reactive rail + press law
  verified untouched.

## In-browser checklist (dev)

1. The 380px pill with the right-hand glass in its oat roundel; ⌘K still lands in it; no badge.
2. A **1920** window: 4 cards beside Today; a **1512** window: 3-up — cards identical width
   in both; crossing 1700 slides the sheet width (220ms) while the column count steps.
3. The grey toolbar on BOTH views — meta left, the restyled segment right, the active chip
   half-pressed; the band's corners follow the sheet's radius.
4. The washed ledger: pink Urgent block, latte Housekeeping, the pale Notes wash — white row
   cards inside; **"Action now" opens the journey** (and Batch fix on the batch row), exactly
   like clicking the row.
5. Hover a row: the family dot becomes the tick; click it — the row completes and the ink
   toast offers **Undo, and the undo actually undoes** (the row returns). Same from a card's
   ✓ DONE and Today's tick.
6. A snooze choice → `Snoozed until tomorrow/next week` with Undo; "Don't show these again" →
   `Hidden — {type}` with Undo; hovering the toast holds it; a second quick action replaces
   it; Esc dismisses.
7. Click the **Urgent heading**: the section folds to its heading (chevron flips), survives a
   reload; the play button still starts the focused session without folding.
8. Scroll a long ledger: each heading holds at the top on its wash backing while its rows
   slide beneath — in the cards view the lh2 headings behave as before.
9. The tour end to end — the card stop now spotlights a ledger row when the ☰ view is up.

## Deviations

- **The 32px press row size** extends the button law (40/34/32) — the pack's own "per the
  button law … 32px tall" instruction; recorded in the a-ref's fence.
- **The gutter "48 → 32"**: the code never held a 48 — the compact breakpoint already encoded
  32 implicitly (1428 = 1364 + 2×32). The pass lands the 32 as a real padded token
  (`--tdb-edge`); nothing visually shrank.
- **The band's corners**: own 15px radius instead of the ref's `overflow:hidden` (sticky
  would re-scope; fenced in the b-ref).
- **The Notes wash is derived** (`#fcf9ee→#faf5e3` / `#e9e0c8`) — the pack specified two
  washes; a washless Notes section would break the "each lane's rows live in a washed block"
  sentence, so the yellow family got the same whisper strength.
- **The ledger batch row dropped the avatar roundels** (ref A draws desc + progress only;
  the batch *card* keeps its faces).
- **"− Today's list"** on a committed row — the pack bakes the ＋ form; the toggle needs an
  off face, so only the sign flips. The rename-sweep lock re-legalised exactly the toggle's
  two forms.
- **Collapse is ledger-only** — the pack's collapse sentence sits inside Phase 4 (the ☰
  rebuild); the cards view keeps its always-open lanes.
- **Today's tick was built, not found** — the P5 scope names it, but the committed rows had
  no completion control; they now follow the ledger's head-checkbox pattern (offers exempt).
- **FocusFlow's sweep toasts** adopted the P5 grammar (the pack scopes "both views"; the
  sweep raises the same bottom toast — two grammars on one surface would read as a bug).
- jsdom limits as ever: the tier reflow, stickiness, the tick swap, the toast timing and the
  fold feel are source/rule-text locks — the browser walk confirms the pixels.

## Close

**The redesign is complete; nothing queues before dev deploy and the prod sequencing pass.**
