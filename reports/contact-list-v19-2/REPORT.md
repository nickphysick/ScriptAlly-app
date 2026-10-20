# Contact list v19.2 — report

Pack `cc-prompt-contact-list-v19-2.md`: Nick's last pass on the Contact list, plus his decisions on the first draft.
The mock and screens are enrolled at `design-refs/contact-list-v19-2/`; all seven SHA256s matched the pack. Branch
`contact-list-v19-2`. Nothing outside the Contact list changed, apart from the column-matcher import's flag (decision 2).

## False premises

1. **"~6 wks" was stored data, not a display default.** The Replies cell shows `agent.responseTimeWeeks` as stored.
   - From `9a60db13` (16 Jun, "smart-import: review working model") until `92bd6485` (11 Oct, "Import truth 1/5"), the
     import review filled 6 weeks for every agent whose file gave no reply time, and the commit saved it.
   - Nothing recorded which stored values came from that fill, so per agent they cannot be told apart from an entered 6.
   - Nick ruled a cleanup (below).
2. **The current import no longer fills a reply time.** `smartImportReviewModel` leaves `weeks` null when the file
   gives none, and `importedAgentDoc` omits the field, so such an agent shows "Not stated".
   - Other old defaults, for the record: ImportCsv wrote 8 until `c7832e11` / `92bd6485`. The smart and email import
     commits wrote 0 (`c1798b1c`, `4a11a905`), which shows as "Not stated".
   - `AddAgentFocusForm`'s slider still starts at 8, so an untouched slider saves 8. That's outside this pack and is
     flagged, not changed.
3. **The template import does set the import flag;** the pack and my first read assumed it didn't. `importedNeedsReview`
   is written by `smartImportCommit` (which covers Smart import and the template) and `emailImportCommit`. The gap was
   the column matcher ("match your own columns", and "Create from this row" in `ImportCsv.tsx`), now fixed by decision 2.
4. **Dev's spacing was tighter than the pack said:** the top gap measured 14px (the pack said about 20), and the gap
   under the hero 22px (the pack said about 24).
5. **Part F's "the email's top within 2px of the name's top line" is false as written.** The email is 14px type beside a
   19px name, so their tops are 3px apart while their centres are 1.9px apart. CL192-F1 compares centres, and says so.
6. **Part B says it may touch the shared hero spacing; it is Part A that does.** And it didn't need to: the vertical
   spacing was in the Contact list's own sheets (`.clv-group > .cl17-hd` and v19's list gap), not a shared token.
   `shell/pageHeroFrame.css` only sets the horizontal inset. The new rules are Contact-list-scoped.
7. **The live page Nick checked after "the v19.2 deploy" was not v19.2.** Dev then served `index-BH-rXrRP.js`, another
   session's build (v19.1 plus Query Centre v140), so "OPEN TO QUERIES", "~6 wks" and "61 gaps to fill" were v19.1's.
   v19.2 was deployed afterwards; see Deploy.
8. **Agents whose door is Unknown keep "Not known"** under the reply time (the import-truth ruling). That says nothing
   about whether they are open.
9. **Clicking the Date added text doesn't open the row.** That has been true since v19 (the row's click guard skips
   `.cl19-c [data-cl19]`). Found by the CL183 F3 re-point and not changed; worth a decision.

## Base

`2f17874f` (`dev/…-cl19-cl191`), which dev served as `index-bC-f_N1T.js`, reproduced byte for byte. It carries v19.1.
Baseline: Vitest 9120 passed, with only `functions/src/email.test.ts` red.

## Per part

| Part | Commit | What changed |
|---|---|---|
| A + G | `d0f5be0b` | Unpinned only: the eyebrow sits 36px below the content card's top (was 14), and the list card sits 44px below the hero's lowest element (was 22). Contact-list-scoped (`:not([data-full])`), no shared token. G: the List health card's "N gaps to fill" line is gone; the count stays on "Fill in the gaps N", and the ring still opens Housekeeping. The pinned band keeps its gaps count (Nick's ruling: pinned has no Fill button). |
| B | `acdc50e6` | Open agents show the reply time only; "OPEN TO QUERIES" is gone. Closed agents show "Closed till 1 Nov" (when `reopensOn` is known) or "Closed to queries" in rust (#a2452a) italic serif 13px. The Filters menu still filters open and closed. |
| C | `753a9a2d` | "~6 weeks" / "~1 week" (`replyWeeksLabel`), never "wks". "Not stated" in ink at 55%; it already sorted last. An absent or zero reply time was already a List health gap (`reply` in contactHousekeeping). |
| D | `8b99d7da` | An agent's-court reply more than 30 days past reads "Overdue since 14 May", with the year when it isn't the current year. 1–30 days keeps "Expected … · Nd over". `rowDateLine` is the Contact list's own (the agent card and panel read it too). The Query Centre computes its overdue line separately (`lib/qcBirdsEye` `dueCell`) and is unchanged, as Nick ruled. |
| E | `e4e5e2e6` | An agent with `importedNeedsReview === true` shows "Imported" (serif italic 12.5px, ink at 50%) under its date. The column is measured from the date line, and the cell is a flex column sized to its content. |
| E follow-up | `225a9d92` | Decision 2: the column matcher's two calls go through `matcherAgentDoc` (`lib/importedAgent.ts`), which sets the flag. No backfill. |
| F | `e4a199dc` | In the stacked column, a row with an email and no website puts the email on line 1 and the hidden "+ Add website" on line 2. |
| Locks | `6b5e12a2` | CL192 locks, re-points, references, shots. |

## Decision 1 — the reply-time cleanup (run on scriptally-dev only)

- **Rule:** agents with `importedNeedsReview === true`, `dateAdded` before 2026-10-11 and `responseTimeWeeks === 6`
  have the field removed, so they now show "Not stated".
- **How:** the Firestore REST API, authorised by the Firebase CLI's login, reading every user's agents with no index
  added (filtered in the script).
- **Result:** 365 agents scanned; 272 flagged as imported; **253 cleared across 18 accounts**. A re-scan found 0 left,
  and no writes failed.
- **Per account** (anonymised, highest first): 25, 25, 21, 16, 15, 15, 15, 14, 13, 13, 13, 13, 13, 10, 9, 8, 8, 7.
- All cleared agents were added between 17 and 25 Jun 2026. One account with 14 imported agents had none to clear.
- A reversal list (document path and old value) is kept locally, outside the repo.

## Locks (CL192, `tests/e2e/contactV192.measure.ts`)

Each lock was red on the base build (v19.1 as on dev) and red under its named mutation, then green. Source mutations
were made from path-derived backups and restored by copy. The fixtures (imported, overdue at 10/30/31/400 days, closed
with a reopening date, stacked) are temporary `zz192-` agents and queries, removed in each run. The harness account's
document counts were identical before and after.

| Lock | Base | Mutation | Green |
|---|---|---|---|
| A1 top | 4/6 (14.0) | 4/6 (old padding) | 6/6 (36.0) |
| A2 gap | 20/22 (22.0) | 20/22 (old margin) | 22/22 (44.0; pinned as v19.1 ±1) |
| B1 open | 2/34 ("Open to queries" on open rows) | 2/34 (caption restored) | 34/34 |
| C1 reply | 4/56 ("~8 wks") | 48/56 ("wks" restored) | 56/56 |
| D1 overdue | 18/22 ("Expected 18 Sep · 31d over") | 20/22 (`LONG_OVER = 365`) | 22/22 |
| E1 imported | 10/20 (no label) | 10/20 (cell block, label inline) | 20/20 |
| F1 stacked | 3/57 (centres 21.9 apart) | 3/57 (old order) | 57/57 (centres 1.9 apart) |
| G1 gaps | 6/10 ("78 gaps to fill") | 6/10 (line re-inserted) | 10/10 |

Notes:
- **E1's mutation:** the literal "make the cell a block" changes nothing measurable, because the label is already
  `display: block`. That run is recorded as `mut-CL192-E1-literal.json`, and it is green. The mutation that counts
  makes the cell a block and the label inline.
- **E1's matcher clause:** its red-first is the unit test (`importedAgent.test.ts`) failing when the flag is removed
  from `matcherAgentDoc`.
- **B1 runs on the test account's real rows**, every open row on the page. It cannot run on Nick's own account, because
  the test sign-in only works for the harness account.

## Re-points (each because v19.2 changed what it read)

- **contactV18, the reply-time save case:** reads `^~\d+ weeks?$` (Part C).
- **CL183 E3 (Replies sort):** its parser reads "weeks". With the new wording the old one read every row as Infinity,
  so it passed while checking nothing; it now reads the numbers.
- **CL183 F3:** clicks the row's name. The old click landed on the Date added text (see false premise 9) and had only
  passed because a still pointer happened to hover the first row open.
- **No CL191 or CL19 lock needed a change.**

## L1 (each file alone, on this branch's build)

- **Green:** contactV192, contactV191, contactV183, contactV18, and QC138.1, .3, .4, .5 and .6.
- **CL19-G1 failed once at 1280,** then passed on re-runs on both builds (flaky, not a regression).
- **Red, identical on the v19.1 base:** CL17 FS1, CL16 C3/F7, QC138.2 D1, and QC138 E1 ("no day in a detail — 1 day
  over"), which looks date-dependent.

## Shots

`reports/contact-list-v19-2/shots/`: 01, 02 and 03 at 1512 and 1280, on the harness account, not Nick's. 02 and 03 use
temporary fixtures, removed afterwards.

## Deploy

_Filled in below._
