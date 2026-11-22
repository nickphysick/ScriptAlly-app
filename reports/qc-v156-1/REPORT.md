# Query Centre v156.1 — streak-led top right, lined-up boxes, arrow chip: report

Branch `query-centre-v156-1`, pushed, **not merged to main**. On dev through `dev/srm1-plv3-qc156-clq1-tdi-qc1561` (`dcc4d7ef3`), which serves **`index-DvM-SbUR.js`** at https://scriptally-dev.web.app. Prod untouched.

Ref: `design-refs/query-centre-v156-1.html`, sha256 `f602064d…d8c9`, which matched. It came from `~/Downloads/query-centre-v156-1-pack.zip`; it is committed and on the watchlist.

## False premises (read first)

1. **The action labels are not "Nudge Sophie".** `rowAct` (lib/qc1512) labels the actions "Nudge", "Close it", "Answer the offer", "Send your partial" / "Send your revision" / "Send your full", or "Open the card" for plain ones. The chip's accessible name and tooltip are those labels, exactly. I did not invent names.
2. **"Measure on dev" was done on the emulator harness.** CLAUDE.md keeps measurement off the live dev database. The harness has **no card with a "Nudge on…" line**: none of its 5 waiting cards has a nudge planned. So the "mixed row" checks run on rows that mix plain boxes and progress-bar boxes. A nudge-line box's content adds up to about 84px, which fits inside the 86px minimum.
3. **The header's top-right block is 560px wide in the ref, not v156's 380.** The brief says "the graph stays as built" but also "draw the dot so it stays round at any width". I followed the ref: the block fills the third column (560px at 1920) and the line stretches with it.
   - At 1440 a 560px block runs into "88 queries sent", so on a header narrower than 1380px it keeps v156's 380px.
4. **12px side padding cuts off "Response overdue" on the narrow 1440 cards** (8 cards, measured). The brief says "same padding 10 12 11 on every card" and also "same wording, nothing else changes". Narrow cards (under 380px) keep 8px at the sides; top, bottom and the 86px minimum are as specified, and both boxes still share one padding.
5. **Dev moved twice while I worked.** First the Contact list QC layout (`index-ApIDS8ju.js`), then two-door import (`index-tYxsFXj1.js`).
   - The deploy guard stopped the first attempt.
   - I built the two-door-import branch's tip and got that exact hash, then merged this branch onto it.
   - My earlier dev branch, `dev/srm1-plv3-qc156-clq1-qc1561`, is pushed but superseded and was never served.

## Step 0

- **Base:** `2235e8c3d`, the tip of `query-centre-v156` (navy header, line and collapsed bar present).
- **The streak and the shared code:**
  - `weekGoal154` (lib/qc154goal) builds this week's count, the target (the writer's weekly goal, else 3) and the streak.
  - That streak was the run of **completed** weeks before this one that met their target. This week never counted, even once met.
  - `weekGoal154` is read by **Query Centre files only**: Queries.tsx, QcLine156, QcSlim156, qc156, qcReviewAid156.
  - It builds on the shared `weekStreak` (lib/milestones, read by the Dashboard's F1Book and the phone's GoalsPhone/phoneV4). That function already counts this week once met, against a fallback target of **1**. **It is not changed**, so no STOP was needed.
- **The card's action:**
  - Built by `rowAct` (lib/qc1512).
  - QcCard154 drew it as v154's overlay: `.qc154-act`, `aria-hidden`, holding a `tabIndex -1` button that covers the Next box in navy on hover.
  - On click: nudge / close / sent / offer / resp → `onAct(id, mode)`, which opens the card on that journey's composer; anything else → "Open the card" → `onOpen`.
- **Baseline:** tsc 0; dev build ✓; Vitest 3 failed / 12482 passed / 4 skipped (`emuGuard` ×1, `firestoreTarget` ×2: the known reds).

## Box measurements (emulator harness)

| | 1920 before | 1920 after | 1440 before | 1440 after |
|---|---|---|---|---|
| "your move" card (Answer the offer), Sent and Next | 66.9px, padding 8px 10px | 86px, 10px 12px 11px | 63.2px, 7px 8px | 86px, 10px 8px 11px |
| waiting card (Reply expected by, with the bar) | 68.7px, 8px 10px | 86px, 10px 12px 11px | 65.0px, 7px 8px | 86px, 10px 8px 11px |
| Next box on hover | navy `rgb(42,58,82)` with the label | its own fill (unchanged) | navy | its own fill |

After the change, all 30 rows of cards at each width have their boxes' tops and bottoms within **0.00px** (W2).

## Commits (`query-centre-v156-1`)

| Phase | Commit |
|---|---|
| Base | `2235e8c3d` |
| 1 · streak logic and top right | `bd71a6b99` |
| 2 · lined-up boxes | `98d785be2` |
| 3 · arrow chip | `c348277fa` |
| 4 · block width, screens | `e4660ac3c` |
| dev merge (on two-door import) | `dcc4d7ef3` on `dev/srm1-plv3-qc156-clq1-tdi-qc1561` |

## Gates against baseline

| Gate | Baseline | Branch | Dev merge |
|---|---|---|---|
| `tsc --noEmit` (8 GB heap) | 0 | 0 | 0 |
| builds | dev ✓ | prod ✓, dev ✓ | `build:dev` ✓ → `index-DvM-SbUR.js` |
| `vitest run` | 3 failed / 12482 passed / 4 skipped | 3 failed / 12493 passed / 4 skipped | 3 failed / 12523 passed / 4 skipped |

The same 3 failures throughout. My browser locks W1–W3 were re-run on the first dev merge (with the Contact list layout, which touched QC CSS) and all passed. Two-door import changed no Query Centre file.

## How the streak counts

- **Before (v154–v156):** the run of completed weeks before this one that met their target. This week did not count, even once met.
- **Now (lib/qc1561 `streakLead`):**
  - The same run, plus this week as soon as its target is met, so 6 becomes 7 on the third query.
  - While this week is not yet met, it neither adds nor breaks.
  - A completed week that missed breaks it.
- **Who reads it:** the Query Centre only (the header block and the collapsed bar).
- **Other pages:** the Dashboard's book card and the phone's Goals page read the shared `weekStreak`, which already counted this week once met. It still uses a fallback target of 1 where the writer has no weekly goal, while the Query Centre uses 3. So for a writer without a goal the two can differ, as they could before.

## Locks

**Unit** (all written red first):
- `lib/qc1561.test.ts` (10): the brief's five series, plus no queries, in-progress-neither-adds-nor-breaks, the alt text, the caption, and that no v156 strings remain.
- `qcLine156.test.tsx` and `qcSlim156.test.tsx`: rewritten to the new copy.
- `qcv1561.test.ts` (4): the boxes.
- `qcCard154.test.tsx`: the chip as a real button, its name, `stopPropagation`, and its visibility rules.
- `qcNext154.test.tsx`: its box-finder now finds the chip.

**Browser** (`tests/e2e/qc1561.measure.ts`, 1920 and 1440):
- **W1:** the three situations through the dev aid (flame 38 × 48, 14px gap, type, 6px to the graph, dot rust or cream and round, caption, alt, block width clear of the title), and the collapsed bar (flame 17 × 22, streak, line, no "n of goal").
- **W2:** the boxes in every row.
- **W3:** all seven action kinds. Fill unchanged on hover; chip hidden at rest and shown on hover; 32 × 32 at 8px in; accessible name = label; Tab reaches it with its ring and tooltip; "Answer the offer" opens on its composer; "Open the card" opens with none.
- **W4:** screens; Birds-eye has no chip.

**Removed:** the v156 copy helpers `goalHeadline`, `streakWords`, `goalNudge`, `goalLineWords`, `barTip` and `monthLabels` (no reader left), with their test cases. The dev aid's comment now gives the new copy.

## Screenshots (`shots/`)

- **Before:** `before-header-1920`, `before-page-1920`, `before-hot-hover-1920`, `before-wait-hover-1920`.
- **Ref:** `ref-go-1920`, `ref-hit-1920`, `ref-none-1920` (its "Show it when" switch), `ref-hover-1920`, `ref-collapsed-1920`.
- **Header:** `w1-header-{streak,met,none}-1920`, and `w4-page-{streak,met,none}-{1920,1440}` (header at rest).
- **Collapsed bar:** `w1-slim-{streak,met,none}-1920`, `w4-collapsed-{…}-{1920,1440}`.
- **Boxes:** `w2-group-{1..6}-*-1920`, one per group.
- **Chip:** `w3-hover-{offer,sent,nudge,open,close}-1920`, `w4-hover-{offer,sent,nudge,open}-1440`, `w3-focus-chip-1920`, `w3-after-click-1920`.
- **Birds-eye:** `w4-birds-{1920,1440}`, unchanged.

## Departures from the ref, with the reason

- **Narrow cards keep 8px side padding** (premise 4).
- **The top-right block is 380px on a header under 1380px** (premise 3); at 1920 it matches the ref (560px, starting at x 1204 against the ref's 1205).
- **Label copy:** the ref's chip says "Answer the offer →"; the app uses `rowAct`'s labels (premise 1).
- **The focused chip's tooltip sits over the Next value** ("No date yet") while shown. The brief accepts the chip covering a nudge line; the tooltip is transient.
- **No nudge-line card on the harness to screenshot** (premise 2).

## Deferred (named)

- **`tests/e2e/qc154.measure.ts`** (v154's suite, run on demand) still asserts the navy overlay (lines 148–154). It is superseded by W3 and will be red if run.
- **The streak's fallback target** differs between the Query Centre (3) and the shared `weekStreak` (1) for writers with no weekly goal. Aligning them means changing shared code: Nick's call.
- **Merge to main**, and delete the superseded remote branch `dev/srm1-plv3-qc156-clq1-qc1561`.
- **Dead rules left in the older sheets** (qcv154's `.qc154-act` overlay, qcv156's `.qc156-big` / `.qc156-ft`): the brief said not to edit them.

## Lasting decisions (for docs/decisions/query-centre.md at merge)

- **The Query Centre streak counts this week once its target is met** (`streakLead`, lib/qc1561). The shared `weekStreak` is untouched.
- **The card's action is the arrow chip,** a real button named by `rowAct`'s label. Its click stops propagation, so the card's own click doesn't also run.
- **Fact boxes:** 86px minimum, padding 10 12 11; narrow cards 10 8 11.
- **The dev aid `__SA_QC156_GOAL`** = streak | met | none gives "6 week streak" / "7 week streak" / "No streak yet".
