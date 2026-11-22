# Set-up and importing on phones v1 — progress

Branch `setup-import-phone-v1`, worktree `/Users/nickphysick/ScriptAlly-sip` (overnight conductor, 30 Oct).
Base: `3c1e5b90` (`origin/dev/…-ppp1-pa2-8`), builds to `index-DyXfq4ti.js` = what dev served at 05:15. Holds phone-app-v2 Part 8 (cf4229cd) and public pages (12b3016b).
Baseline: tsc root 0, tsc functions 0, build clean (0 error/warning lines), Vitest `Test Files 697 passed (697)` · `Tests 10774 passed | 3 skipped (10777)`.

| Phase | Commit | State |
|---|---|---|
| 0 recon | — | done: refs 18/18 OK; today/ matches (fonts aside); base = dev |
| A frame, labels, welcome, your list, your file, pinned foot, tick | `aa2b2a53` | committed |
| B the reading screen | `341539e2` | committed |
| C review header, ready rows, repeats | `e177c380` | committed |
| D questions, one per screen | `73e5c61c` | committed |
| E importing loader and /import | `18844244` | committed |
| F locks, shots and the report | (this commit) | committed; SIP1 11/11, every lock proved red; older suites re-pointed (REPORT.md) |

## Resuming
- Read `git log --oneline -10` and this file; resume at the first phase not committed.

## Phase A notes
- Pinned foot = `PhonePin` (setupParts): portals into `.sf-foothost` (rendered by SetupFrame on phone set-up only) + spacer `--sf-foot-h`. Used by StepFoot, the overview's `.im-nextgo`, the review's `.o9-bargo`.
- Band override for the review: `useSetupBand({name, steps, index})` from SetupFrame (Phase C sets it).
- Measured at 390×844: Welcome's 4th option bottom 830 vs pinned foot top 770 (first three above the fold); Your list title 161 → last card 1002 (841px ≈ one phone height). The fork has no .sf-cfoot (Back row stays in flow).

## Phase B notes
- Phone branch inside `ScatterSettleLoader` (same hooks/timers/settle). Slips follow `prefersReduced()` only (the loader's `reduced` is the <900px static path). Piles: 0 until the result, then count with `resolved/n` to `piles` = the overview's `summaryModel`→`reviewTallies` totals (ImportFlow `readPiles`; lab `labPiles`).
- FALSE PREMISE: the tip card's art is a real drawing (`/images/import/tip-hawk.png`), not a placeholder; kept, shown in a 56px round spot.

## Phase C notes
- Band: "Review: agents|queries|repeats", segments = `importSteps(hadDuplicates)`. Stepper hidden on phone.
- Ready rows: `PhoneRowShell` (reviewRows): tap → the row's own onToggleOpen (details portalled as a sheet into the foot host); left swipe → navy "Don't import" → the row's own onDelete. Row buttons kept, visually hidden (keyboard / screen reader).
- Repeats: `duplicateUnits()` stays the one source; on phone a 2-member open set (no bars) becomes `PhoneDupePick` (held radio, applied by the pinned "Next set" through onRemove/onKeepBoth). Other set shapes (3-way, reconcile) keep their own card, one per screen; "Next set" waits for them to be decided.
- The deck is unchanged in C (D replaces it on the phone).

## Phase D notes
- `PhoneDeck` (v9/ReviewDeck): compact navy card + "Answer this" → full-screen layer portalled to the frame root (`footHost.parentElement`), rendering the SAME `card.body`. "Save and next" clicks the question's own `.o9-ans > .sf-btn` (kept, visually hidden); pick-style questions answer on tap. "Skip" = `firstOpen(cards, at+1)`. Deck's same-render advance does the moving. Layer closes when nothing is left.
- LOCAL layout (lift candidate): PhoneFlowShell takes a query JourneyView; the deck is not one.
- The card's foot shows `card.sub` (DeckCard carries no sheet row number or query count; the mock's "row 14 · 2 queries" is not in the model).

## Phase E notes
- ImportingLoader phone layer (`.im-pldr`, portalled to the frame root): checklist = IMPORTING_MESSAGES[0..4] (ellipsis dropped), ticks on a non-wrapping `beats` counter bumped by the SAME 950ms interval; lifts at LIFT_AT_MS via the existing `revealing`. Timings untouched.
- /import in the app: no SetupFrame, so no band/pinned foot; the review draws `.im-appsegs` (its own steps) at the top of the sheet. Phone deck, rows, repeats and the question layer all apply there too (the layer renders in place, fixed). OPEN: the in-app review's buttons are in flow, not pinned.
