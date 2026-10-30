# Set-up and importing on phones v1 — progress

Branch `setup-import-phone-v1`, worktree `/Users/nickphysick/ScriptAlly-sip` (overnight conductor, 30 Oct).
Base: `3c1e5b90` (`origin/dev/…-ppp1-pa2-8`), builds to `index-DyXfq4ti.js` = what dev served at 05:15. Holds phone-app-v2 Part 8 (cf4229cd) and public pages (12b3016b).
Baseline: tsc root 0, tsc functions 0, build clean (0 error/warning lines), Vitest `Test Files 697 passed (697)` · `Tests 10774 passed | 3 skipped (10777)`.

| Phase | Commit | State |
|---|---|---|
| 0 recon | — | done: refs 18/18 OK; today/ matches (fonts aside); base = dev |
| A frame, labels, welcome, your list, your file, pinned foot, tick | `aa2b2a53` | committed |
| B the reading screen | (this commit) | committed |

## Resuming
- Read `git log --oneline -10` and this file; resume at the first phase not committed.

## Phase A notes
- Pinned foot = `PhonePin` (setupParts): portals into `.sf-foothost` (rendered by SetupFrame on phone set-up only) + spacer `--sf-foot-h`. Used by StepFoot, the overview's `.im-nextgo`, the review's `.o9-bargo`.
- Band override for the review: `useSetupBand({name, steps, index})` from SetupFrame (Phase C sets it).
- Measured at 390×844: Welcome's 4th option bottom 830 vs pinned foot top 770 (first three above the fold); Your list title 161 → last card 1002 (841px ≈ one phone height). The fork has no .sf-cfoot (Back row stays in flow).

## Phase B notes
- Phone branch inside `ScatterSettleLoader` (same hooks/timers/settle). Slips follow `prefersReduced()` only (the loader's `reduced` is the <900px static path). Piles: 0 until the result, then count with `resolved/n` to `piles` = the overview's `summaryModel`→`reviewTallies` totals (ImportFlow `readPiles`; lab `labPiles`).
- FALSE PREMISE: the tip card's art is a real drawing (`/images/import/tip-hawk.png`), not a placeholder; kept, shown in a 56px round spot.
