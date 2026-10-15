# Responses v2: report

Branch `responses-v2`, cut from the commit dev served at the start (954a9413, which is also `origin/main`). Ref: `design-refs/responses-v4/`. Locks: `tests/e2e/rs2.measure.ts` and `src/lib/responses.test.ts`.

## False premises

1. **"Personal note = `feedbackType === "Yes"`".** That is the form's value, not what is stored. `recordResponse.ts` maps it: Yes is stored as `rejectionFeedbackType: "detailed"`, No as `"standard"`, Form as `"form"`. Only "detailed" keeps `rejectionFeedbackText`. The page reads the stored value.
2. **"Any note recorded with a request (for the card's quote)".** There is no note field on a partial or full request in the model. Only a revise-and-resubmit has one (`rrNotes`). So only a revision card can carry a quote.
3. **"The next card peeks" (B2).** This is not true of the reference at 1512 either: three whole cards fit, and the fourth starts just past the edge. B2 asserts what holds at every width instead: cards keep their width, the track scrolls, and at least one card lies past its right edge.
4. **"Shared parts" (§0.4).** None of the named parts is shared:
   - Page-local on their home pages: the light header and card (`ContactLightHeader`, `PkgHeader4`), the white sheet and navy row (`PkgSheets4`), v138's heading strip and in-sheet search, the empty-page frames, and the Contact list's index card.
   - The pinning hook is private to `QcCentre`; only its pure `nextPinned` is exported.

   Each is restated page-local from the same values (see Lifts and copies).
5. **"Compact means a window 1440px wide or less, as on v17 and v138".** On v17, v138 and packages v4, compact is the shell's `sheet-wide` switch: a page sheet 1440 or less. A 1512 window gives a 1256 sheet, so it is compact. The page follows the built switch. A1 therefore asserts 44px at both 1512 and 1280, not 50 at 1512.
6. **The six answers.** The data layer places queries by their current status. The pack's six answers leave out **Withdrawn** and **Signed**: a signed query's offer has been answered, and a withdrawn query was closed by the writer. Both are kept off the page, as is **Queried** (no answer yet). The three sent states (Partial sent, Full sent, Resubmitted) are "Asked for more", because the agent's latest answer is still the request.
7. **The seeders.** No seeder sets `rejectionFeedbackType`, `rejectionFeedbackText`, `offerResponseDeadline` or `rrNotes`. On the harness account all 11 rejections carry no feedback type. `tests/e2e/seedRs2.mjs` writes those branches as fixtures and removes them after each run.
8. **"Hidden below 1100" for the empty page's hawk.** Packages v4 hides its art with a container query on the column, which drops it at a 1280 window (column 976). The pack and the reference mean below 1100 of window, so this page uses a window media query.
9. **The list's grid at 1024 (L1).** The reference has no rule below 1280 except 900. Its 1280 floors need about 860px of row, and a 1024 window's column is 720, so the sheet scrolled sideways by 94px. At 1100 and below, the flexible columns now shrink.

## Base

- **Tip used:** 954a9413, the merge of `packages-v4` into the dev integration branch. Dev served `index-BOw0IoMj.js` from it at the start.
- **What it holds:**
  - Query Centre v138 to v138.4 (`query-centre-v138-4` merged)
  - Contact list v16, v17 and v17.1
  - Submission packages v4 and v4.1
  - query panel v2 (`SidePanel`, masthead, `StandCard`, `QueryLedger`, `QadHead`)
  - `SheetLip`
- **Baseline before any edit:**
  - tsc 0
  - production build 0
  - dev build 0
  - Vitest: 1 failed file (`functions/src/email.test.ts`, which fails at import without `functions/node_modules`), 584 passed; 8807 tests passed, 3 skipped
- **Every commit:** the same single failed file, plus this pack's own files and tests.

## §0 findings

### Routing and chrome

| Piece | How it is added |
|---|---|
| Shell | `src/lib/shellForRoute.ts` (`WORKSPACE_SHELL_PATHS`) |
| Route tier | `src/marketing/routeTiers.ts` |
| Folder tabs and sidebar | One source: `src/lib/workspaceNav.ts` (a child of the `queries` section). Tabs are the section's siblings in `WorkspaceShell`. |
| Sidebar icon | `WORKSPACE_ICONS` in `AppShell.tsx`: a new `replies` key, the reference's envelope |
| Crumb | `shellV2Nav.ts` CRUMB_EXTRAS |
| Slot | `App.tsx` `StagePage`. The Query Centre's slot and its `routeActive` stand aside, as for Analytics. |

The keyboard sheet lists scopes, not pages, so a "Responses" scope was added with `respFind` (`/`), `respDown` and `respUp`.

### The data

| Fact | Field or derivation |
|---|---|
| Every query for the book | `queries` filtered by `manuscriptId` of `resolveScopedManuscript(…, scriptally_active_manuscript_id)`, keyed on `location.key` |
| Latest answer | `q.status` (`recomputeQuery`'s latest rung), via `buildQcRows` |
| Answer date | the stage history's last span of the answer's status (`stageHistory`; the doc's own dates win inside it), then `partialRequestedDate` / `fullRequestedDate` / `offerDate` / `rejectedDate` / `lastStatusChange` |
| Feedback | `rejectionFeedbackType` ("detailed" = Yes), `rejectionFeedbackText` |
| Request sent? / date sent | the status (Partial sent / Full sent / Resubmitted) and its span start, else `partialSentDate` / `fullSentDate` |
| Due to send | `expectedSendDate` (QcRow `expectedMs` with kind `sendBy`) |
| Reply expected | `expectedFor` → `resolveExpectedDate` (kind `reply`) |
| Offer answer-by | `offerResponseDeadline` (kind `offer`) |
| Request note | none, except `rrNotes` on an R&R |
| Steps so far | `QcRow.history.spans` |
| How far a no got | `QcRow.furthest` (from analytics' `reachedRequest` / `reachedFull`) |
| Still out | status Queried (`stillOut`) |

### Counts on the harness account (outside the fixtures)

| Status | Whole account | The Smoke Test |
|---|---|---|
| Offer | 1 | 1 |
| Revise & Resubmit | 1 | 1 |
| Rejected | 11 | 10 |
| No Response | 2 | 1 |

On the whole account: 0 of the 11 rejections carry a feedback type, 0 R&Rs carry `rrNotes`, and 0 offers carry an answer-by date.

### The journeys and the door

- The response, sent, offer and edit journeys run in a side panel's slot through the drawer's own `panel` request (`openQueryDrawer({ …, panel })`), without changing what they write.
- Query panel v2's top-right "Record a response" door is `openResponsePicker()` (`queryPanelStore`), hosted by the Query Centre's always-mounted component.
- No write is new. "Edit the response" is the built edit journey (`mode: "edit"`) on the closing entry's id.

## Lifts and copies

No lift. Every part is a page-local copy (`rsp-` / `rsn-`):

| Part | Copied from |
|---|---|
| Header and card | `packagesV4.css` §A |
| Sheet, navy row, search, heading strip | `packagesV4.css` §C–E |
| Banner | `packagesV4.css` §E |
| Empty page | `packagesV4.css` §F |
| Stand card styles and index card | `agentPanel.css` |
| `nextPinned` | `QcCentre.tsx` |

Reused as built:
- `SidePanel`, `StandCard`, `QueryLedger`, `buildTimelineRows` and `StatusDot`;
- the query panel's dress (`qsp`, `qcv-open-*`) and the drawer's act look;
- `AppFooter`.

One shared union gained a member: `RightPanelOwner` gained `"answer"`.

## Toast for a recorded rejection

"**Passed · {agent}**", with "CLOSED AS PASSED" under it. This is the response journey's own toast.

## Decisions to know about

- **An offer's card reads "HAS MADE / An offer".** The pack gives only "WANTS TO READ" / "IS READING", which an offer is not.
- **No ⋯ menu in the panel's footer.** The query panel's ⋯ holds only nudge and snooze actions, which do not apply to an answered query.
- **The card's counts box sizes to its rows**, with 212 / 236 as its minimum. At a fixed 212, "Asked for more" ran under the ring.
- **The header row wraps** rather than using packages v4's three-track grid. The card's right edge sits on the column's edge and drops under the buttons only when the title and the card cannot share a line. At 1512 and 1280 they share one.
- **The canvas faces come from CSS variables, and its months from `lib/dates`.** The marketing font-family lock allows only named files to spell the families, and the dates lock allows one month table. Both locks were kept rather than widened.

## Locks

The table is filled from the consolidated run (see below).

## Shots

`reports/responses-v2/shots/`, named after each `design-refs/responses-v4/screens/*` file: `{screen}-{width}.png`, plus `x-1920-*` and `x-1024-*`.

## For Nick

- **Lines dropped for a missing fact** (`answerStand`, `answerIndex` and the card foot drop a clause rather than invent one):
  - On The Smoke Test, the third request card has no send-by date (`expectedSendDate` is unset), so its foot shows no date.
  - Most index cards drop "They saw", because the harness queries record no `materialsWanted`.
  - The trail on a few cards shows Full sent before Full asked for. That comes from the fixture's dates, not from the page.
- **Most real rejections do not carry `feedbackType`.** On the harness account, 0 of 11 do. Prod was not read.
