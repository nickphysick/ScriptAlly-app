# Query card v158.1 — report

## 1. False premises, first

1. **The To-do desk's card has no footer to show.** Its preview is a read-only picture, and todoWs.css hides the
   whole footer (`display: none` on `[data-qc152="reply"]`) as it did before v158.1. The card the To-do desk opens,
   when its preview is clicked, is the shared Query Centre panel. QC1581-10 proves the two-row footer there, and
   proves the preview's footer is still hidden.
2. **The reference's Nudge due has two actions; the app's has three.** It has Nudge, Close it and "{first} replied"
   (`lib/qcFoot1522`, unchanged). The app wins, so the only two-action states are the offer ones (§3).
3. **The fixture held no two-action state.** The deciding offer needs `tellLater` on the offer step and other queries
   still to tell. `seedQc158.mjs --deciding` sets both on seed-query-12 (and on seed-query-9 / -20 as the agents to
   tell), and `--undeciding` removes them in the same run.
4. **Phase 3 found no problem**, so QC1581-8's named mutation ("remove the room under the list") has nothing to
   remove. It was proved red by pulling the writing box up over the last note's actions instead.
5. **QC1581-4's mutation (180px minimum per button) did not wrap the row; it pushed it past the footer's edge.** The
   row cannot wrap (`nowrap`). The lock now also asserts the row stays inside the footer, which the mutation breaks.

## 2. Branch, base, dev

- Branch `query-card-v158-1`, cut from `query-card-v158` @ aafbe6163, the branch dev served.
- Dev: https://scriptally-dev.web.app
- Bundles:
  - **this pack:** `index-BcOc9gsY.js`, built from a clean checkout of the pushed tip 6140ec84e;
  - **v158** (missed from its report): `index-AOAzoFjK.js`, built from aafbe6163.
- Baseline (aafbe6163): the same two `firestoreTarget.test.ts` failures as on 18 Nov, still failing.

## 3. Footer states (Step 0.3)

- **Three actions** (`button`, `link`, `replied`):
  - Nudge due: Nudge · Close it · {first} replied.
  - Gone quiet, never nudged: Nudge · Close it · {first} replied.
  - Gone quiet, close leads: Close it · Nudge · {first} replied.
  - Gone quiet, nudged: Close it · Nudge again · {first} replied.
- **Two actions:**
  - Deciding on an offer with agents still to tell: Accept or decline · Tell them (footer1522).
  - The older reply box's offer: Answer the offer · Tell other agents (`second`), drawn only when the card has no
    footer data.
- **One action:** everything else.
  - Waiting: Record a response.
  - Your move: Mark partial / full sent.
  - Resubmit: Mark resubmitted.
  - An offer: Answer the offer.
  - Closed: Reopen.
  - Signed: none.

The wrap rule (`qcv1522card.css` `[data-qc1522="footer"] .qc152-rft span { white-space: normal; … }`) and the fixed
`height: 52px` on `.qc152-rf` were as the prompt said.

Step 0.6, the spill: with "Reply was due 11 Apr 2024 · quiet for 135 weeks", the three-action footer's text block was
69px against its 52px pill at 1512, and 88px against 52px at 1280.

## 4. Phase 3: the last note's actions

No problem, at either width, before or after Phase 2's taller footer. With eight notes, the list was scrolled to its
end and the last note hovered. Its "Pin to the top" link was the element on top at its own centre, and a real mouse
click there pinned the note:

| | Before (1512 / 1280) | After (1512 / 1280) |
|---|---|---|
| link box | 967,659 92×23 / 783,568 | 968,617 / 784,526 |

Nothing was changed for Phase 3 and there is no Phase 3 commit.

## 5. Locks

- **Source halves** (Vitest, `qcv1581.test.ts`): each was proved red by its own mutation.
- **Measured halves** (`tests/e2e/qc1581.measure.ts`, 1512 × 982 and 1280 × 800): each read red on the base where the
  base differed, then red in one of two mutation builds (A: 1, 2, 4, 5, 6, 7, 8; B: 3, 9, 10), then green. The final
  after run was 10 tests and 81 readings.

| Lock | Mutation (red) | After |
|---|---|---|
| QC1581-1 nothing spills | the fixed 52px pill with wrapping text | ✓ |
| QC1581-2 rows | one row for two actions | ✓ |
| QC1581-3 places | swap the secondary and the link | ✓ |
| QC1581-4 no wrap | a 180px minimum per button (see 1.5) | ✓ |
| QC1581-5 status width | keep the status beside the buttons (the footer a row again) | ✓ |
| QC1581-6 card holds | the card grows by the footer's extra 42px | ✓ |
| QC1581-7 actions work | drop the outlined button's handler | ✓ |
| QC1581-8 last note | the writing box pulled up over the last note's actions (see 1.4) | ✓ |
| QC1581-9 one row unchanged | every footer two rows | ✓ |
| QC1581-10 hosts | two rows only on the Query Centre's route | ✓ |

## 6. Gates

| Gate | Baseline (aafbe6163) | Final |
|---|---|---|
| `tsc --noEmit` | 0 | 0 |
| Vitest | 12850 passed, 2 failed (firestoreTarget), 4 skipped | 12856 passed, the same 2 failed (same files), 4 skipped |
| `vite build` | clean | clean |

## 7. Screenshots

`design-refs/query-card-v158-1/screens/`, `before-*` and `after-*`:
- one, two and three actions on Tracking and on Notes, at 1512 and 1280;
- the three-action footer with the long reply line (`*-3-long.png`).

## 8. For the writer's ruling

1. **The older reply box** (a card with no footer data) still exists as a path. Today it draws only the offer's
   two-action footer. (a) Leave it. (b) Retire it in a clean-up pack, if every card now carries footer data.
2. **A Signed query's footer has no action.** It stays one row with no button; the pill takes the full width.
   (a) Keep. (b) Something else.
