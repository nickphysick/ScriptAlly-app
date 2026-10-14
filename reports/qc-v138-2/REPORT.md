# Query Centre v138.2: the peek opens the whole row

**Where this ran:** case 1, "v138.1 is on dev". Branch `query-centre-v138-2` off `dev/…-cl171-qc138-qc1381` at **`7b035a28`**, the branch dev served (`index-CvdwJkYd.js`). The baseline build of that tip was byte-identical to it. All six reference SHA-256 values match; the html is enrolled in `.refhashes.json`.

## False premises, deviations and decisions (read first)

1. **The reference draws the closed row in pale navy.** George Ashworth in `screens/03` is pale navy, where the prompt specifies warm grey `#f5f3f0`. The prompt wins: closed rows are `#f5f3f0` with a `rgba(28,19,15,.15)` rule.
2. **`--gc` is `--qc138-cols` here.** It's the same template the headings and the rows read.
3. **There is no "timeline (ledger)" tab.** The panel's tabs are Tracking, Agent and Notes, and the ledger sits in Tracking, so the link opens Tracking.
4. **Storing the tab alone wouldn't switch a panel that's already open.** Both houses (`QcOpenCard`, `QueryPanel`) read the tab once, when they mount, and the card isn't keyed by query. `requestPanelTab` (`QueryPanel.tsx`) stores the tab and also sends an event that both houses listen for.
5. **v138.1's drawer was `aria-hidden`, so it couldn't hold a focusable link.** The drawer is no longer hidden; the chain inside it still is.
6. **Below 900px of sheet the drawer stacks (my decision; the prompt doesn't cover this width).** The prompt says the same grid applies under 1180. Below 900px (a 1100 window with the sidebar open) the list has five columns, and First queried to Due is about 530px. Five stops then squeezed to their first letter ("Q…"), and QC138 F2 went red. There, the summary sits above the timeline, both starting from the name's left (v138.1's placement). At 1180–900, including the 1280 lock width, the prompt's grid stands. Commit `976cd3c4`.
7. **A gap's floor is 44px, or the width of its own short label if that's wider (my decision).** In the narrower span, the 1100 case squeezed a "7d over" gap to 44px and its label ran out of it. The floor is measured and published as `data-floor`. Commit `83b5d500`.
8. **The "+n more" card no longer shrinks.** The narrower span squeezed it to "+…".
9. **Wordings the prompt doesn't give** (all in `peekSummary`):
   - same day: "Out today", "their reply date is today", "your send-by date is today", "closed the day you queried";
   - no date: "Out, not dated" and "closed, not dated";
   - singulars ("1 day", "1 yr") are the chain's own `gapWords`.
10. **For Nick: an offer that isn't yet due reads "until your send-by date".** The peek already calls that stop "Send by", but an offer's date is a decision deadline, not a send-by date. Same wording as the peek; flagged here, not changed.
11. **My process slip: C went in over a red unit test.** `qcCentre.test.tsx` pinned `QcOpenCard`'s import line verbatim. My gate script exited 0 whatever Vitest said, and I had chained the commit after it. Fixed in the follow-up `b434225a`, not amended: the test now asserts the names in the import and that both houses listen, and was proved red. The gate script now stops on any red other than the known `email.test.ts`.

## Commits

| Part | Commit | |
|---|---|---|
| A | `8d3a483b` | The open peek tints the whole row: `#f3f5f9` waiting, `#fcf3ee` overdue, `#f5f3f0` closed. Lift stands; white before the peek opens. One overdue test (`peekLate`) is shared by the tint and the chain. |
| B | `21370e2d`, `83b5d500`, `976cd3c4` | The drawer on the row's grid, under a dashed rule; the gap floor; stacked below 900px of sheet. |
| C | `b525d109`, `b434225a` | The summary, the link and `requestPanelTab`; the tab-memory lock re-pointed. |
| D | `af589287` | Cards land 60ms apart over 320ms; each line draws in over 500ms after 100ms; nothing moves under reduced motion. |
| E | this commit | Locks, edits, report, CLAUDE.md. |

## Locks (`tests/e2e/qcV1382.measure.ts`, 1512 × 900 and 1280 × 800, with the shell)

Every lock was green on the branch and red on its named mutation (`mutation-proofs.json`):

- **A1 tint:**
  - green: at 200ms white; at 900ms `rgb(252, 243, 238)` overdue, `rgb(243, 245, 249)` waiting, `rgb(245, 243, 240)` closed; drawer transparent.
  - red with a white drawer: `rgb(255, 255, 255)`.
- **B1 grid:**
  - green: summary under the name ±1; first card at First queried ±2; last card at Due ±2; 1px dashed rule.
  - red with the timeline padded: 606.9 against 583.0.
- **C1 summary:**
  - green: "Out {d}" or "Closed" in Special Elite 18; the tone's line, overdue in `rgb(162, 69, 42)` upright. The link is focusable, and opens the panel for that query on Tracking from a stored Notes tab, with no click reaching the row.
  - red with the click re-dispatched to the row, and again with `stopPropagation` deleted in source: 1 row click each time.
  - The instrument is a document-level bubble listener: React handles clicks at its root, so a native listener on the row sees every click whatever React does.
- **D1 motion:**
  - green: at 100ms the first card is under 1 and the last is lower; all are 1 by 900ms; all are 1 at 0ms under reduced motion.
  - red with all cards animated together: 0.21 0.21 0.21.
- **L1:** QC138.2 4 passed, QC138.1 6 passed, QC138 16 passed.

**Edited, each with a note:**
- **QC138.1 D1:** "no container background" now means the drawer itself, and its mutation targets the drawer.
- **QC138.1 D2:** a gap is free when it's wider than its own floor, not a flat 44. Re-proved red under log2 growth.
- **Unit `qcCentre.test.tsx`:** the tab-memory lock asserts its claim, not the spelling of one import line.

**Gates:** tsc clean; both builds clean; Vitest 8787 passed, and the only red is the known `functions/src/email.test.ts`.

## Shots (`shots/`)

- `01-peek-overdue` and `02-peek-waiting` at 1512 and 1280, beside `screens/01` and `02`.
- `04-peek-closed` and `05-peek-nodate` at both widths.

## For Nick: rows whose summary truncated at 1280

At 1280 the Agent column is narrow. In 22 of the 73 rows, line 2 is wider than the column: in each one the line truncates with an ellipsis and the link hides. At 1512, none truncate. Full list in `summary-census.json`:

- **Ten open rows, all "… until their reply date" or "… until your send-by date":**
  - Iris Kwan, Imogen Farr, David Marsh, Tom Ellery, Elinor Hale (`seed-query-1`), Hester Blaine, Alasdair Crewe;
  - three `probe-*` queries for Elinor Hale. These look like residue from earlier e2e runs on the shared account.
- **Twelve closed rows, all "closed {d} after you queried".**

If the full line matters at 1280, the options are a shorter line-2 wording or a wider Agent column.

## Integration and dev

Dev served `index-CvdwJkYd.js`, from `dev/…-cl171-qc138-qc1381` at `7b035a28`. This branch contains that branch, so the integration branch **`dev/…-cl171-qc138-qc1381-qc1382`** is a fast-forward to `80fb8366`: the same commit the gates and locks above ran on. It was built from a clean detached worktree and deployed hosting-only to `scriptally-dev`, after checking the served hash immediately before. **Dev now serves `index-IhaXnpGa.js`**, the gated build's own hash. Not merged to main; prod untouched.
