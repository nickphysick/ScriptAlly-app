# Phone query sheet v1: the desktop card and its journeys, made for the phone (plus the gone-quiet ruling)

Branch `phone-query-sheet-v1`, cut from `origin/phone-birds-eye-world-v3-3` (112a35b6a). Main had not moved past it (`origin/main` 7f70f99f7 is contained). Pushed, not merged. Below 768px only.

- **Dev:** `dev/bew33-clr13-qc1722-pqs1` (fdb4531db) is this branch merged onto `dev/bew33-clr13-qc1722`, which is what dev was serving (`index-CzdCn2Qj.js`: Query Centre v172.2 over Birds-eye v3.3 and rows v1.3). It now serves **`index-Dbp7ZcQZ.js`**, whose AppRoot chunk carries the sheet.
- **The one merge conflict** was `design-refs/.refhashes.json`; both sides' entries are kept.
- **On the merged tree:** tsc exits 0, and Vitest's only reds were from the scratch checkout's missing `functions/node_modules`. With it linked, the 37 failing files pass.

## False premises

1. **"The app's date slider" did not exist.** The desktop journeys pick an earlier date on a month calendar (QcCardJourney `parts.dates`, QcRespondStages). The phone's old flows used a native date input. I built "An earlier date" on the app's one slider (`WeekSlider`), counting days, floored at the query's last event (`PhoneDaySlider`).
2. **The desktop journeys never ran on a phone.** `RespondStagesPanel` returns nothing below 768px, so `openCardJourney` and `openResponse` did nothing there; the phone used the older drawer journeys and `ReplyFlowV3`. The phone now mounts the desktop hosts itself (`QueryJourney`).
3. **The desktop card's ⋯ menu holds only Move and Delete.** Log a nudge and Close this query are in its footer. The phone menu carries all four, as the brief and the ref ask, each opening what the desktop opens.
4. **Card-journey saves have no toast on the desktop.** They end on a finish screen with an inline Undo. The phone's toast uses that finish screen's headline words, for example "Logged. Full sent! Over to Jonathan." Record a response uses its own "Recorded {First}’s reply."
5. **The desktop "{First} passed" (Close) and "{First} replied after all" (Reopen) have no hand-over screen.** Desktop hands straight over to Record a response. The ref draws a "That’s a reply" screen; the build follows desktop (same engine): it lands in Record a response at "When did {First} reply?" with Passed chosen, or at "What did {First} say?".
6. **There is no signed query in the harness.** PQS-4 makes one by accepting an offer on the phone, reads it, and undoes it.

## Desktop journey branches in the base

All of them are in by content: Card journeys v1, Record a response v2.1 and v2.1.1, Query card v168 and v168.1. Each branch's only commit outside the base is its own REPORT.md.

## Gates

| Gate | Baseline (before any edit) | Final |
|---|---|---|
| tsc (8 GB heap) | exit 0 | exit 0 |
| `npm run build` | exit 0 (built in 1.78s) | exit 0 |
| `npm run build:dev` | exit 0 | exit 0 |
| Vitest | Test Files 973 passed, 1 skipped (974) · Tests 13817 passed, 4 skipped (13821) | Test Files 973 passed, 1 skipped (974) · Tests 13817 passed, 4 skipped (13821) |

- **The first final run caught one red:** `dates.test.ts`, "there is one month table". It was red from phase 3, because `PhoneDaySlider` and `PhonePreviewCard` each carried their own copy of the month table. Both now read the one in `lib/dates`, with identical output. That fix is in phase 4, and the second run is the one shown.

## Commits

| Commit | Phase |
|---|---|
| a1d1461d6 | Phase 1: refs (25 files checked against SHA256SUMS and the brief's table, enrolled), gone quiet for agents only |
| 5b36c4ef0 | Phase 2: the sheet |
| c36b88cf6 | Phase 3: the journeys |
| cc0a53ac3 | Phase 4: locks, screenshots |

## A. Gone quiet (Nick's ruling)

- **One shared test:** `isGoneQuiet` is now "waiting on the agent and more than the setting past the reply date". `rowSegs` draws the faded tail by it, and `bwGroups` sorts by it.
- **With-you queries never go quiet.** One past its send-by date stays hatched to today with its "!", and sorts among the rest of Needs action by share of window used.
- **Locks:** unit-locked (red under v3.3's rule) and measured (PQS-1). Birds-eye's BW-34 and BW-38 now read gone quiet for agents only.

## B. The sheet: doors rerouted, sheets retired

- **Doors:** every phone door goes through `openV3Query` into the one host (V3Layer), which now draws `QuerySheet`:
  - a Queries row;
  - a Today card (Your move rows, the feed);
  - a search result;
  - a Birds-eye bar tap (rerouted from v3's timeline sheet);
  - Birds-eye's long-press "Open query".
- **Retired:**
  - Phone app v4's `QueryPageV4` (its `trackStage` moved to `qsheet/track.ts`);
  - Birds-eye v3's `TimelineSheet`;
  - Birds-eye v3.1's `SendBySheet` (§D).
- **Heights:** half is 430/784 of the screen (dvh); full is 52px from the top (plus the safe area). The handle drags between them, a tap toggles, and dragging past 70% of half closes it, as does the dim.
- **Data:** every value is the desktop's derivation: `buildCardView` (desk), `buildThread`, `footer1522`, `materialGroups`, `askChips`, and the desktop's `NotesTab158` with the journal's own writes.
- **The footer:**
  - the status line;
  - the button, solid navy with an arrow or outlined, or none;
  - the desktop footer's other actions (`link`, "{First} replied") as links under it.
- **Agent and Materials tabs:** these follow the ref's layout:
  - Agent: 2×2 tiles (Reply time, Their policy, Last heard, Your queries), "What {First} asks for", then "Open {First}’s agent card".
  - Materials: grouped rows, with ghost bars where nothing has gone yet.

  The values are the desktop's.

### Edits that open as their own sheet on the phone

- **A step** (a bubble's pencil, or a Materials group's pencil) opens the desktop's step editor, `QcStepEdit1522`, as a sheet over this one. At 390px its calendar and material chips need the full width. It saves exactly as the Query Centre card does: `planStepEdit` (+ `planDetails1522` on the query step), `planFix`, `editActivity`, `deleteActivity`, one snapshot, Undo.
- **Agent details** (the tile and ask pencils) open the phone agent card over the sheet. The agent overlay carries `back`, so closing it returns to the sheet.
- **⋯:**
  - Log a nudge: the existing nudge flow.
  - Close this query: the Close journey.
  - Move to another agent: `planDetails1522`, Undo.
  - Delete this query: the desktop's confirm, no Undo.

## C. The journeys

- **Same engine, same saves.** The five journeys are the desktop's own hosts and specs (`CardJourneyHost` / `RespondStagesHost`, one `commitMany` under one snapshot).
- **The desktop shells gained a `phone` mode,** off by default, so the desktop is unchanged; PQS-5 compares the two. It draws:
  - the thin progress bar with "Step n of m · name";
  - the day slider in place of the calendar;
  - the review card (`PhonePreviewCard`, over the same preview row; the desktop grid card's CSS is desktop-only);
  - the verb on the review button (Mark sent / Log it / Close it / Reopen);
  - Record a response with no "Record and start another".
- **Placement:**
  - The sheet rises to full height, then steps back (scaled to 94% from its top, at 72% brightness), its strip above the journey. The journey rises to 62px from the top, radius 24.
  - Cancel brings the sheet forward at the height it was.
  - A save drops the journey; the sheet returns to Tracking, the new bubble animates in, and a 4s navy toast with the Archivist's head and Undo appears.
- **Haptics:** 8ms on a choice, 12ms on save.
- **Reduced motion:** no step-back scale and no bubble animation.

## D. Birds-eye's long press

| Menu item | Opens |
|---|---|
| They replied | the sheet with Record a response |
| I've sent it | the sheet with Mark sent |
| Open query | the sheet |
| Edit dates | the sheet's dates edit (the latest step's editor) |
| Add send-by date | the sheet, then the desktop's Edit journey (`sendByFields`). The desktop's step editor has no send-by date: desktop edits it in that journey |
| Send a nudge | the existing nudge flow |

## Locks (tests/e2e/phoneQuerySheet.measure.ts), measured at 390 × 784

The green pass reads 40 readings, 0 red.

| Lock | What it holds | Deliberate breakage | Own reds |
|---|---|---|---|
| PQS-1 | A with-you query past its send-by by more than the setting has no fade and isn't in the gone-quiet part; a waiting one has both | a fade bar injected on a with-you row | 1 |
| PQS-2 | Each of the five doors opens the one sheet at half height (430px) over its own screen | the sheet opened at full height | 5 |
| PQS-3 | The handle drags to full and back to half; far down closes; a tap on the dim closes | the handle takes no finger | 2 |
| PQS-4 | The footer's label and tone match the desktop card's for partial requested, waiting, offer, closed, and signed (none) | the footer button hidden | 4 |
| PQS-5 | Mark sent, Close, Reopen, Answer an offer and Record a response, each saved on the phone, write the same query, log and feed as the same walk on the desktop (only generated ids and write times set aside); both saves undone | the phone answers Yesterday, the desktop Today | 2 |
| PQS-6 | Close → passed lands in Record a response at "when" with Passed chosen; Reopen → replied lands at "reply"; no Carry on on the way | a Carry on added to the hand-over | 2 |
| PQS-7 | "An earlier date" is a slider whose first day is the query's last event; no calendar or date pills anywhere | a calendar injected | 1 |
| PQS-8 | With a journey open, the sheet is scaled 0.94, at brightness 0.72, its strip above the journey; Cancel restores it at the height it was | no step-back | 1 |
| PQS-9 | After a save, the new bubble is last in Tracking, the strip shows the new stage, and Undo restores the query exactly | the toast's Undo hidden | 1 |
| PQS-10 | No text under 12px across the sheet's four tabs and a journey's steps; never "overdue" or "late"; no page error from the sheet or journeys | a 10px line | 1 |

- **How the breakages ran:** in four runs. One long run hit the harness's sign-in throttle after about 25 sign-ins.
- **Fixes the locks found:**
  - the app's slider drew its end labels and "Unknown" at 9px inside the journeys (now 12px on the phone);
  - the sheet's footer lacked the desktop's "{First} replied" link.
- **Birds-eye's locks, updated for the rulings:**
  - BW-31: "Add send-by date" opens the sheet with the desktop's Edit journey.
  - BW-34 and BW-38: gone quiet is for agents only.

## Shots (reports/phone-query-sheet-v1/shots, index.html)

21 of the 23 ref states, each beside its ref. Differences other than data:

- **15 (send-by) and 16 (the review) of Record a response were not reached** by the capture script: it stops at "What did they ask for?". The journey itself saves end to end (PQS-5, the pass branch).
- **18 "Close hand-over":** there is no hand-over screen (false premise 5). The shot is Record a response's "When did {First} reply?" with Passed chosen, its headline "A pass this time."
- **Journey copy is the desktop's, not the ref's:**
  - headlines such as "Your partial’s gone. Great work!";
  - questions such as "What did you send Marcus?" and "How long will you give Tom?";
  - the review's "What went" rows.
- **The slider's readout and end labels use the app slider's monospaced face,** as the desktop's journeys do.
- **Census mapping:** the phone style census holds sizes, radii, colours and shadows. Off-palette greys are tokens mixed; inset-shadow hairlines are borders; the seal's double ring is an outline. The agent's initials in the thread are 12px (the ref drew 9px, which PQS-10 forbids).

## For Nick's ruling

1. **The ref's "That’s a reply" hand-over screen in Close.** The desktop has none, and the build follows the desktop. Add it to both?
2. **Journey copy follows the desktop's** where the ref words it differently (headlines, questions). Say which should win.
3. **Search → result:** the phone's overlay host holds one overlay at a time, so the sheet replaces the search page and closing it returns to the Queries page, not the search.
4. **Add send-by date opens the desktop's Edit journey over the sheet,** a full-screen flow, because there is no in-sheet send-by editor.
