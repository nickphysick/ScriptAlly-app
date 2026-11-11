# Retired by Query Centre v154

v154 replaced the Query Centre list's slips with a 3-across card grid (`QcCard154`) and the header's stage ring with a
weekly goal chart (`QcGoal154`) (`design-refs/query-centre-v154.html`).

Found by sweeping `tests/e2e/` for the retired SELECTORS (`[data-qc153="slip"]`, `.qc153-slip`,
`data-qc153="fact|head|word|cta|cta-btn|cta-open|window"`, `data-qc1531="ring|legend|lg-head|seg-n"`,
`data-qc1534="ann"`), not by filename. Every one of these files opens the page by waiting for a slip, so none can run.

| file | what it measured | status |
| --- | --- | --- |
| `qc153.measure.ts` | v153's slips (S1–S6), the rail, the slim bar | retired: the slip is gone; the rail and bar halves are re-measured by `qc154.measure.ts` M6 |
| `qc1531.measure.ts` | v153.1's compact slip header, policy box, the ring card | retired: slip and ring are gone |
| `qc1532.measure.ts` | v153.2's open ring, quiet words, the Next line on the slip | retired: subject gone (the Next line is now the card's, `qcNext154.test.tsx`) |
| `qc1533.measure.ts` | v153.3's paperclip tab on the slip, the chips rail | retired: the paperclip is re-measured on the card by `qc154.measure.ts` M4 |
| `qc1534.measure.ts` | v153.4's ground, title, aligned header, sidebar rail, the ring alone | retired: the ring is gone; header height re-measured by `qc154.measure.ts` M5 |

The v154 locks are `qc154.measure.ts` (M1–M6) and the unit suites `qcCard154.test.tsx`, `qcNext154.test.tsx`,
`qcTrack154.test.tsx`, `qcGoal154.test.tsx`, `qcSticky154.test.tsx`, `lib/qc154goal.test.ts`.
