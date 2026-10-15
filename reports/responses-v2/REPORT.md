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

Readings are from the integration build (see Deploy). `tests/e2e/rs2.measure.ts`: **18 passed, 0 failed** (5.2 min, one worker). Unit locks: `src/lib/responses.test.ts`, 14 passed.

Every lock was proved red with its named break (`tests/e2e/rs2Mutate.sh`, `reports/responses-v2/mutation-proofs.jsonl`). The unit lock D1 data was proved red by placing a query by its first answer instead of its latest (3 failed). Ledger: `reports/responses-v2/ledger/<lock>.json` and `mut-<lock>.json`.

| Lock | Readings (all held) | Widths | Mutation (`RS2_MUTATE=<lock>`) | First failing reading under the mutation |
|---|---|---|---|---|
| A1 | 16 (yes) | 1280, 1512 | red | 1512: header images ["shadow","http://127.0.0.1:4621/images/responses/responses-wall-hawk.webp"] |
| A2 | 22 (yes) | 1280, 1512 | red | 1512: scrollTop 0 → 180 on Passed |
| B1 | 6 (yes) | 1280, 1512 | red | 1512: heading label 272.0 vs h1 426.0 |
| B2 | 14 (yes) | 1280, 1512 | red | 1512: card widths 11.7 vs 340 |
| B2one | 1 (yes) | 1512 | red | 1512: {"cards":1,"arrows":1,"dots":0} |
| B3 | 50 (yes) | 1280, 1280 rs2-q-offer, 1280 rs2-q-rr, 1280 rs2-q-send, 1280 rs2-q-sent, 1512, 1512 rs2-q-offer, 1512 rs2-q-rr, 1512 rs2-q-send, 1512 rs2-q-sent | red | 1512 rs2-q-send: quote true (a quote only where a note is recorded) |
| B4 | 6 (yes) | 1280, 1512 | red | 1512: arrows 1, dots 0 |
| C1 | 10 (yes) | 1280 2, 1280 34, 1512 2, 1512 34 | red | 1512 2: gates [2,2] |
| C2 | 22 (yes) | 1280, 1512 | red | 1512: no dividers on Wait (1) |
| C3 | 14 (yes) | 1280, 1512 | red | 1512: navy row -1400.4 from the sheet top |
| C4 | 8 (yes) | 1024, 390 | red | 1024: scroller 1073,768 |
| D1 | 42 (yes) | 1280 card rs2-q-send, 1280 row rs2-q-form, 1280 row rs2-q-note, 1512 card rs2-q-send, 1512 row rs2-q-form, 1512 row rs2-q-note | red | 1512 card rs2-q-send: edge rgb(139, 155, 179) for more |
| D2 | 19 (yes) | card button, header, record a no, row primary | red | card button: scrim alpha 0.000 within 250ms |
| E1 | 7 (yes) | names, no nos, save, square, story | red | names: Agent names starts on |
| F1 | 10 (yes) | 1280, 1512, first answer | red | 1512: populated parts on the empty page: {"card":1,"carousel":0,"banner":0,"tally":0,"list":0,"share":0,"panel |
| F2 | 6 (yes) | 1280, 1512 | red | 1512: {"zero":1,"h":"Rejections are part of querying","tags":0,"tally":1,"list":0,"share":0,"toShare":0} |
| L1 | 15 (yes) | 1024, 1180, 1280, 1512, 1920 | red | 1920: sheet scroller 8038,1664 |

## L2 (the neighbouring pages)

Each suite ran on this build and, where anything was red, on the unchanged base build (954a9413) as well.

| Suite | This build | Base |
|---|---|---|
| qcV138 | 17 passed | — |
| qcV1381 | 7 passed | — |
| qcV1382 | D1 (motion) red | **D1 red** |
| qcV1383 | 4 passed | — |
| qcV1384 | 6 passed | — |
| contactV17 | 14 passed | — |
| contactV171 | 7 passed | — |
| pk4 | 39 passed | — |
| queryPanelV2 | V6 V7 V8 red; V10 red once, green re-run alone | **V6 V7 V8 red**; V10 passed |
| inkShell | INK19, INK4 red | **INK19, INK4 red** |
| shellV2 | B1, B2 B3, L1 red | **B1, B2 B3, L1 red** |

Every red also fails on the base build, so none comes from this work. V10 reads the Notes tab on the shared account, whose data moved during that run.

## Shots

`reports/responses-v2/shots/`, `{screen}-{width}.png`, named after each `design-refs/responses-v4/screens/*` file:
- on The Smoke Test (`RS2_SET=base`): 01–13, plus `x-1920-*` and `x-1024-*`;
- on the fixtures (`RS2_SET=fixtures`, seeded and removed by `seedRs2.mjs`): 140 nos (`11-top-140`, `12-pinned-140`), two nos (`14-*`), the personal-note panel (`06b`), the empty page (`15`, `16`) and 390 (`17`, `18`).

## Deploy

Dev served `…-pkg4-pkg41-pinfix` (91f70001, `index-XJ-N_guT.js`) by the time this was ready; another session deployed it at 11:14. The integration branch `dev/…-pkg4-pkg41-pinfix-resp2` is cut from it with `responses-v2` merged in. The merge did not conflict.

On the integration branch:
- tsc 0;
- production build 0, no CSS warnings;
- Vitest: the same one failed file as the baseline (`functions/src/email.test.ts`), with 8821 tests passed;
- RS2: 18 passed.

## For Nick
- **Pinfix moved the Query Centre and the Contact list onto a shared `shell/PinnedRow`.** It arrived on dev after this branch was cut. The Responses list still pins with its own page-local copy. Moving it onto the shared row is a small follow-up.

- **Lines dropped for a missing fact** (`answerStand`, `answerIndex` and the card foot drop a clause rather than invent one):
  - On The Smoke Test, the third request card has no send-by date (`expectedSendDate` is unset), so its foot shows no date.
  - Most index cards drop "They saw", because the harness queries record no `materialsWanted`.
  - The trail on a few cards shows Full sent before Full asked for. That comes from the fixture's dates, not from the page.
- **Most real rejections do not carry `feedbackType`.** On the harness account, 0 of 11 do. Prod was not read.
