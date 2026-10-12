# Query panel v2 — the masthead, the ledger, and actions that dim the page

Branch `query-panel-v2`, cut from `query-panel-v1` at `64582db6` (which holds `fb1aa70a` and `fix-delete-entry` at
`12805f56`). One commit per part, A to F, then one for the locks and what they found. Not merged to `main`.

## False premises, and where the build differs from the brief

1. **The step's title is kept, in the drawer's head.** Part D says to drop v1's "replacement step title". The
   reference and lock V9 both show the per-query title ("What did Eleanor say?", "Who replied?"). I dropped the
   element that stood in for the head and kept the words: they are the head's title while a journey runs in
   the panel. The standalone drawer still reads "Record a response".
2. **"Log a query" was pressable, but its menu was not.** The menu opened underneath the panel and could not be
   pressed. While a panel is open and the page is not dimmed, the shell's bar now sits one level above the
   panel. While an action runs it goes back under the scrim.
3. **"{first} is late" is a word the Query Centre has not used before.** The page's standing rule is "past the
   expected date", never "late" or "overdue". The stand card says "is late" as the brief's table does. Say if
   you want the older wording.
4. **Source Serif 4 has no italic loaded.** `index.html` loads its upright 400 and 600 only, so every italic in
   this pack is slanted by the browser. Adding the italic to the font link is one line; I left it because it
   also adds weight to the public pages.
5. **Leaving a step needed one timing change in the drawer's host.** Closing waited 240ms for a slide-out the
   panel does not have, so the dim lingered. In the panel the wait is now 0. No journey's save, park or cancel
   rule changed.
6. **The correction sheets were each a second dialog.** Every sheet declares `role="dialog"`. In the panel
   they are a group, so the panel stays the one dialog (V8).
7. **The harness account has no query that is waiting and not yet due.** Every agent's-turn query on it is past
   its window. V5 meets that state on a query of its own, seeded and removed in the run.
8. **The stand card needs three states the table does not have.** A query with the agent and no reply date
   recorded reads "Waiting on {first}" and "No reply date is recorded for this query.", with no figure and no
   bar. A withdrawn query reads "You withdrew it"; a signed one "You signed with {first}".
9. **Minor entries are nudges and holding replies.** The brief names nudges only. A holding reply carries no
   status either, so it takes the 12px dot too.
10. **"Add what you sent" steps the panel into the correction.** It used to open the standalone drawer.

## Where the build follows the brief over the mock

- **Agent tab labels.** The mock reads "reply window", "how to query", "if they're silent". The built tab says
  "window", "method", "silence". Kept as built ("content as built").
- **The agent card in the acting head.** The mock draws the agency in italics with "QUERIED" and "DAY 938" tags.
  The drawer's own card is used unchanged (agency, status and sent date on one small-capitals line).
- **The fork's four choices** keep their built copy and icons; the mock's are sketches.
- **History rows** keep the status swatch and the status line; the mock draws a StatusDot and ", queried".

## §0 Recon

**0.1 The font leak.** `brand.tsx` injects `p, span, div, button, input, select, textarea, label { font-family:
"Source Sans 3" }` at run time. The page's reset stops at `.qcv-legacy`, where the tab bodies sit, and never
named `button`, `input` or `textarea`. Found in Source Sans 3: the timeline's title, date, chapter label and ⋯;
the Agent tab's place, link chips, ask chips and history status. In Inter (written inline or in a rule): the
timeline's sub line, the Notes tab's empty text, field and Save, and the correction sheets' Cancel and Save.
In Playfair: the "Your move" line, the Agent tab's figures and history titles. Full list:
`recon-fonts.json`.

The fix, for the panel's subtree only: the panel states the serif; those elements inherit it through a rule of
specificity 0-0-2, which beats brand's element rule and loses to every class rule; the tokens the tab bodies
read for their faces resolve to the three allowed families; headings take the typewriter.

**0.2 The drawer's head.** `.qad-head`, the quill, the agent card and `.qad-stepper` render in the panel's slot
with their existing CSS. v1 had swapped the head for a court band, "← Back to query" and a title element; all
three are gone. The head is now one component (`QadHead`) used by the drawer, a journey in the panel and the
correction desk there.

**0.3 Doors that open the standalone drawer** (left as they are, except the two in Part E):

| Door | Where |
| --- | --- |
| Dashboard: next actions, "Log a query", "Send your first", the feed's row actions | `Dash58.tsx` |
| To-do list: a task's door (three call sites) | `ToDoPage.tsx`, `useTaskPaneSession.tsx` |
| Agent card: Log a query and the query actions | `AgentCardHost.tsx` |
| Contact list: a row's Log and query actions | `AgentList.tsx` |
| Submission packages: "Log a query with this" | `SubmissionPackages.tsx` |
| Manuscripts: an activity row | `v12/ManuscriptPage.tsx` |
| Analytics: the two empty-state buttons | `QueryAnalytics.tsx`, `A17Empty.tsx` |
| Query Centre: "Log a query", the Birds-eye drawer's action pill, "Log another" | `Queries.tsx`, `LogJourney.tsx` |
| A parked journey resumed from its chip when no panel is open | `QueryDrawer.tsx` |

**0.4 Facts for the stand card.**

| Fact | Source |
| --- | --- |
| The agency's stated reply window | `agent.responseTimeWeeks` (absent: not stated) |
| The expected-reply date | the Query Centre's own clock, `expectedFor` (`QcRow.expectedMs`) |
| Nudges sent and their dates | the ledger's nudge rows; "no reply" is `nudgeOutcomeLabel` |
| The send-by date for a request | `expectedSendDate`, through the same `expectedMs` |
| The offer's answer-by date | `offerResponseDeadline`, through the same `expectedMs` |
| The closing date and how it closed | `QcRow.stageStartMs` and `closedHow` |

**0.5** Dimming needed no change to any journey's save, park or cancel logic.

## The ledger's sentences (Part B)

| Entry | Sentence | Manner |
| --- | --- | --- |
| Queried | You sent the query | by email · by post · through an online form · through QueryManager |
| Partial requested | They asked for a partial | |
| Partial sent | You sent the partial | |
| Full requested | They asked for the full manuscript | |
| Full sent | You sent the full manuscript | version 2 (from the second round) |
| Revise & resubmit | They asked you to revise and resubmit | |
| Resubmitted | You sent the revision | |
| Offer | They offered representation | |
| Rejected | They passed | |
| Withdrawn | You withdrew the query | |
| No response | You closed the query | no reply |
| Signed | You signed with them | |
| A nudge | You nudged them | no reply (only while nothing has come back) |
| A holding reply | They replied | no decision yet |
| A step the import wrote | the entry's own sentence | from the imported status |

A request that came from a package adds "from the {name} package" under it.

## What the stand card and the ledger removed, with no home elsewhere

- **"Set a date"**: setting your own expected-reply date from the Tracking tab. The response and send journeys
  still set it; there is no control for it on the panel now.
- **"Set send date"** for a query with no send date recorded.
- **The nudge count line** ("Nudged twice, last on …"). Each nudge is still its own entry.
- **The agency's policy line** ("They treat silence as a pass"). The Agent tab's "Means no" figure says it.
- **The offer tray's buttons**: "Nudge now", "Remind me later", "Keep tracking", "Mark closed". Nudge and Close
  are in the footer; "Remind me later" and "Keep tracking" have no control on the panel.
- **The scheduled-nudge reminder row**, which opened the reminder on the To-do list.
- **Round headings** ("The query", "The partial").
- **Per-piece changes on a send based on a package** (what each piece was in the package). The slip lists what
  went and names the package it was based on.

## Locks: `tests/e2e/queryPanelV2.measure.ts`

Green at 1512 × 900 and 1280 × 800 on the branch and on the integration build. Each went red under its named
mutation (`mutation-proofs.json`, `mutation-runs/`).

| Lock | Green reading | Mutation | Red reading |
| --- | --- | --- | --- |
| V1 masthead | `rgb(45, 58, 80)`; name Special Elite 30px in `rgb(244, 238, 229)`; underline 3px in the court's mid colour; 5px top edge; no capitals. 50 of 50 with V2 | White masthead | masthead `rgb(255, 255, 255)` |
| V2 under the bar | top 105.75 = the bar's bottom 105.75; right and bottom 8; "Log a query" and Search on top at their centres; the menu opens over the panel | `top: 8px` | top 8 against 105.75 |
| V3 faces | 80 scans, none with another face: three tabs, every reachable step of every footer action for four queries, the fork, the correction's details, the picker | Remove the leak fix | "Sent 5 Jan", "Expected 2 Mar", "···" in Source Sans 3 (32 readings) |
| V4 ledger | 92px 26px columns, 14 apart; every date right-aligned at 0 to 92; every StatusDot within 1px of the spine; text at 146; the sent entry holds the slip | Put the date after the text | dates at 146, left-aligned |
| V5 stand card | one card, last in the ledger, the court's tint; states met: 14 late, 4 to send, 1 offer, 3 closed, 1 over a year, 1 waiting. 492 of 492 with V4 | Leave the old verdict lines | "last false"; 1 old verdict line |
| V6 browse is light | scrim opacity 0, not pressable; a row click swaps the query | Dim on open | opacity 1; the click did not swap |
| V7 act is dim | within 250ms: opacity 1, alpha 0.45, covers the window; the drawer's head and quill; within 250ms of Escape, opacity 0 | No scrim when acting | opacity 0, covers false (14 readings) |
| V8 one surface | 1 dialog and 0 drawers outside the panel at every step, the fork and "Something changed since" | The fork opens the standalone drawer | 2 dialogs, 1 drawer outside |
| V9 top-right door | "Who replied?" in the panel; the open query first under "The query you had open"; choosing another continues to "What did Ana say?" in the same panel, which becomes that query's | Open the standalone drawer | title empty, 2 dialogs, 1 drawer outside |
| V10 tabs kept | place, door, links, figures, wishlist, asks, history and footer equal the v1 capture for three agents; a note saved, edited, pinned, unpinned and deleted; the composer replaces the footer (48px field, navy Save) | Drop the history list | history `[…2 rows]` → `[]` |

V10's "as v1" is a capture of the v1 build (`tests/e2e/fixtures/qp2AgentTabV1.json`).

### L1

| Suite | Result on the integration build |
| --- | --- |
| `queryPanelV2.measure.ts` | 7 passed |
| `queryPanelV1.measure.ts` (QP1) | 11 passed, after re-pointing P1 (the top edge), P7 (the scrim is the panel's), P8 (a typographic apostrophe) and P13 (the ledger's sentence). P13 still asserts the clean delete |
| `qcV137.measure.ts` | 12 passed, **1 failed: C4** ("Partial Requested" on two lines at 1280). It fails the same way on the v1 build, so it is not from this pack; a row on the shared account is the likely cause |
| `feedDrawerV2.measure.ts` | 4 passed |
| `queryActions.measure.ts` (the journeys) | 3 passed |
| `deleteEntry.measure.ts` (the correction desk's delete) | 8 passed, after matching the timeline's titles in both dresses |

Not re-run: the older correction-desk suites (`deskBounds`, `deskPaint`, `drawer3`, `moveEntry`, `qcMove`).

## Gates

| | Base `64582db6` | `query-panel-v2` | Integration |
| --- | --- | --- | --- |
| tsc | clean | clean | clean |
| Production build | clean | clean | clean |
| Dev build | clean | clean | clean |
| Vitest | 8,591 passed, 3 skipped, 1 file fails to load | 8,609 passed, 3 skipped, the same 1 file | 8,684 passed, 3 skipped, the same 1 file |

Each of A to F was type-checked, built and unit-tested on its own before the next.

## Shots

`reports/query-panel-v2/shots/`, beside the references in `design-refs/query-panel-v2/`.

| Shot | Reference |
| --- | --- |
| `track-year-1512.png`, `track-year-1280.png` (over a year) | `ref-track-1512@2x.png`, `ref-track-1280@2x.png` |
| `track-you-1512.png`, `track-you-1280.png` | `ref-track-you-1512@2x.png` |
| `track-waiting-1512.png`, `track-offer-1512.png`, `track-closed-1512.png` | none |
| `agent-1512.png`, `notes-1512.png` | `ref-agent-1512@2x.png`, `ref-notes-1512@2x.png` |
| `act-correct-1512.png`, `act-correct-preview-1512.png` | `ref-act-correct-1512@2x.png`, `ref-act-correct-preview-1512@2x.png` |
| `act-response-1512.png`, `act-review-1512.png` | `ref-act-response-1512@2x.png`, `ref-act-review-1512@2x.png` |
| `act-picker-1512.png` | `ref-act-picker-1512@2x.png` |
| `track-800.png` | none |

## Deploy

Dev moved twice while this pack ran, so the integration was built twice. I did not deploy over either.

1. Dev served `index-wc5ZEw5i.js`: `dev/query-panel-v1-onb9-tip-onb9-comps25` at `aa478623` (confirmed by
   building it). I merged this branch onto it as `dev/query-panel-v1-onb9-tip-onb9-comps25-qp2` (`d9e12cd2`),
   ran the gates and the locks, and found dev had moved again before I could deploy. That branch is pushed and
   superseded.
2. Dev then served `index-C1gu_Aki.js`: `dev/query-panel-v1-onb9-tip-onb9-comps26` at `5990b6f5` (confirmed by
   building it). I merged onto that as **`dev/query-panel-v1-onb9-tip-onb9-comps26-qp2`** at **`30ec3d00`**,
   re-ran the gates and the locks, and deployed it from a clean checkout of the pushed tip.

**Dev now serves `index-D73WoptB.js`.** Both merges conflicted in `design-refs/.refhashes.json` only, resolved
as the union of the two lists (no reference had two different hashes).

On the second integration build: QP2 7 passed; QP1 10 passed and P3 failed once on a panel that had not
mounted yet, then passed twice when re-run alone; QC137 12 passed and C4 failed as on the v1 build; feed
drawer v2 4 passed; the journeys 3 passed; delete entry 8 passed.

The next session to deploy to dev should base its integration on `dev/query-panel-v1-onb9-tip-onb9-comps26-qp2`.

## For Nick

- **Stand cards that dropped a clause for a missing fact** (of 23 read at 1512): three requests with no
  send-by date, so no figure and no "expecting it by" sentence (`cv25-q-09` Jonathan, `rj-dupe` Tobias,
  `seed-cal-passed865-q` Ottoline); one offer with no answer-by date (`cv25-q-08`).
- **Cramped at 520:** the stepper's labels wrap to two lines ("CHECK AND SAVE") at both widths. I did not look
  at every journey step at 520 by eye; V3 read their faces only.
- **"is late"** (premise 3) and **the italic font** (premise 4) are yours to rule on.
- **Controls with no home now**: "Set a date", "Set send date", "Remind me later" and "Keep tracking".
- **The notes' time of day** sits at the top right of each card beside Edit, Pin and Delete; the mock shows the
  date only.
