# Query Centre v154: card grid, weekly goal chart, sticky toolbar

Branch `query-centre-v154`, cut from the tip of `query-centre-v153-4` (e1c0cdc40). v153.4 is not on `main`.
Design reference: `design-refs/query-centre-v154.html`, sha256 `911cdb25…71a03` (checked).

## False or adjusted premises (Step 0)

1. **The slips' action labels are not "Nudge Sophie" or "Send pages".** The existing labels (lib/qc1512 `rowAct`) are
   "Nudge", "Close it", "Answer the offer", "Send your partial", "Send your full", "Send your revision", and the slip's
   "Open the card →" for anything else. The brief says to use the existing labels, so the card does. No agent name is
   added.
2. **There is no weekly goal in the harness account, and the goal can have another cadence.** `User.queryingGoals`
   (Streaks & goals) holds a target with a cadence of week, fortnight or month. Only a weekly target is read. With none
   in force the chart uses the constant `FALLBACK_WEEKLY_GOAL = 3`, which is **deferred** (see below). The harness
   account has none, so every screenshot shows the fallback.
3. **A scheduled nudge exists (`Query.nudgeDate`), but no harness query has one still to come.** So "Nudge on [date]"
   appears in no screenshot; it is covered by `qcNext154.test.tsx` only.
4. **The header's height did not stay at 218px. It fell to 198.2px** at 1440 and 1920. The stage ring (214px tall) was
   the row's tallest item; the chart is 194px. So the brief's rule ("must not grow") holds, but the list starts 20px
   higher than in v153.4.
5. **This branch lacks workspace width v2** (the dev line has it), so a local build caps the page column at 1256px and
   the list at 960px. Locally the card is 310.7px wide at both widths. On dev the list is 992px at 1440 (~321px cards)
   and 1300px at 1920 (~424px cards, the ref's 419). The measurements below are local, so 1920 was measured at the
   narrow width. The dev deploy shows the wide card.
6. **The group headings were never sticky in v153.** There was nothing to remove. A test now locks it.

## Commits

| phase | commit |
| --- | --- |
| 1 card grid and anatomy | 93cc2815b |
| 2 Next box states | bbce3c1c5 |
| 3 draw the journey | 32029bfb9 |
| 4 weekly goal chart | eee2641b7 |
| 5 sticky toolbar | 61930371b |
| 6 verify and ship (fixes below, measurement, this report) | 76064cbc5 |

## Gates against baseline

Baseline was taken on the clean base. The baseline `tsc` ran out of memory (exit 134), so it was re-run with an 8 GB
heap after the first edits.

| gate | baseline | after |
| --- | --- | --- |
| tsc | 2 errors, both `functions/` modules missing (no `functions/node_modules` in the worktree) | 0 errors (`functions/node_modules` now symlinked to the primary's) |
| build | clean | clean |
| Vitest | 5 failed / 11507 passed / 3 skipped; 8 failing files | 5 failed / 11571 passed / 3 skipped before the dates fix (4 files); the dates failure is fixed in Phase 6, leaving 4 baseline failures in 3 files |

The four that remain also fail on the base (`functions/eval/generate`, `src/test/emuGuard`, `src/test/firestoreTarget`
×2). The `functions/` suites that failed at baseline for want of modules now pass.

**Regression found and fixed in Phase 6.** Phase 4's `qc154goal.ts` carried its own month table, which
`src/lib/dates.test.ts` forbids ("there is one month table"). Phase 4's gate ran only the Query Centre specs, so it
missed this. It is now `MONTHS_SHORT` from lib/dates.

## Data sources

- **Expected reply date:** `QcRow.expectedMs` (lib/qcSummary `expectedFor(query, agent)`: the sent date plus the
  agent's reply time). Once a nudge has reset the window it is `replyMs`, the same date the slip's "reply by" used.
- **Window bar:** the share of the window gone, from the stage's start (`stageStartMs`; the sent date for a query) to
  that date. This is v153's bar, restyled.
- **Nudge reminder:** `Query.nudgeDate`, shown only while it is today or later.
- **Action:** lib/qc1512 `rowAct`, the slip's own, with the same handler (`onAct(id, mode)`).
- **Goal:** the weekly target in force (lib/queryingGoals `resolveGoal`). With none, **constant 3, deferred**.
- **Weekly counts:** lib/milestones `weekStreak` (London Monday weeks, every manuscript's `dateSent`, as the Streaks &
  goals card counts). Each past week is judged against the weekly target in force that week, or else the chart's goal.

## Measurements (`tests/e2e/qc154.measure.ts`, local emulator build, 1440 and 1920)

All six cases pass at both widths. M1, M2, M4 and M6 came from one full run. M3 and M5 were re-run after a check's
tolerance was corrected (an opacity read mid-fade as 2×10⁻⁸) and after the tooltip anchoring fix. Ledgers are in
`ledger/`.

- **M1:** three columns, 14px gap, 33 cards. No status word on show; the band is in the stage tone. No fact label,
  value or line is cut, and nothing wraps. At 310.7px, 8 of 33 names or agencies end in an ellipsis (the brief's
  nowrap + ellipsis rule; `ellipsis-*.json`).
- **M2:** 6 waiting, 7 overdue (all in Nudge due), 20 other. The overdue cards read "Next · Response overdue · Send
  nudge now" with no bar.
- **M3:** the action is hidden at rest and shows on hover. With the track hovered the action hides, the draw runs, and
  after the draw exactly one label shows, under the current step and inside the frame (the far-right step too).
  Reduced motion: no animation, and the label shows at once.
- **M4:** pop-ups in the first and third columns open inside the window, and nothing paints over them.
- **M5:** the ring is gone; the headline, pill, line, 2px navy rule and 20 weeks are present. The chart is
  right-aligned to the list's right edge (1624 = 1624). The header is 198.2px (was 218). The tooltip reads
  "w/c 9 Nov · 0 sent" and stays inside the chart.
- **M6:** at rest the bar's y and the first group's y match the page after scrolling back. Mid-scroll in Offers,
  Materials requested and Nudge due, the toolbar names the group over the 22px fade. No heading is sticky. The rail
  sticks unless it is taller than the window (it is at 1440 and 1920 with this account's packages), and then it
  scrolls with the page.

Screenshots in this folder: `header-*`, `group-*` (every group), `hover-card-*`, `hover-track-*`, `hover-track-last-*`,
`pop-col1-*`, `pop-col3-*`, `scroll-*` (three groups), `rest-*`, `next-wait|over|other-*`, `goal-hover-*`.

## Where the build departs from the ref

- **Narrow cards (under 380px):** smaller track steps (21/28px), a 32px seal, the name at 15.5px and the fact values at
  13.5px with 8px padding. Reason: at 1440 the card is ~311–321px, and at the ref's sizes the name kept ~80px and
  "Response overdue" (134px at 15px) could not fit. The ref only draws the 419px card. This is a container query on
  the card, so the 1920 dev card keeps the ref's sizes.
- **The track's current-step label:** on the far-right step it ends on the step's right edge instead of centring, so
  the frame never clips it.
- **The goal label:** "your goal · 3 a week" is drawn above the bars with a halo in the page's colour. With an
  11-query week (the harness has one) the goal line sits low, and the ref's label would sit behind the bars.
- **The tooltip:** the two end weeks anchor it inward. The ref's centred tooltip runs past the chart's edge on the
  last week.
- **The overdue Next box** takes the warm fill (#f6eee8) without the navy dot, as the ref does.
- **The pulse runs once** (the ref runs it twice); the brief says once.
- **The window bar's track is #ece6dc** (the ref uses rgba(28,19,15,.08)); the brief wins.

## Left on disk, now unused

- `QcSlip153` (the component). The file stays because `Track153`, `MatTab1533`, `FACT_ICON` and `POP_FLIP_BELOW` are
  imported from it. `qcSlip153.test.tsx` still runs against it.
- `QcStageRing1531.tsx` and its test, and lib/qc1531 `ringCounts` and `policyWords`. Nothing renders them now.
- The v153.x measurement specs (`qc153`, `qc1531`, `qc1532`, `qc1533`, `qc1534`). All wait for a slip, so none can
  run. They are retired in `tests/e2e/RETIRED-query-centre-v154.md`.

## Dev

https://scriptally-dev.web.app serves `index-hyqKHEqz.js` (checked after deploy). It was built from
`dev/…-laq13-pa3-laq131-qc154` at d553a9925 (pushed), which is the served dev line `…-pa3-laq131` (4a53b37c8, rebuilt
here to the bundle it served, `index-DMVm1gN9.js`, before merging) with `query-centre-v154` merged in cleanly. The
merged tree's gates: tsc 0, build clean, 40 Query Centre, goal and dates spec files (418 tests) green. Prod is
untouched.

## Deferred

- **The weekly goal fallback** (`FALLBACK_WEEKLY_GOAL = 3`) for a writer with no weekly target. What the chart should
  show then (prompt to set one, convert a fortnight or month target, or hide the goal line) is open.
- **Measuring on the wide layout:** a local build of this branch cannot reach the dev line's 1300px list, so the wide
  card was not measured.
