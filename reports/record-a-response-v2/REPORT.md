# Record a response v2: report (23 Nov 2026)

On desktop, recording a response is now one journey, opened in place from every door. It is a sibling of Log a query and uses Log a query's own shell. Who replied? → What did {First} say? → When → the reply's own steps → Record → Recorded. Nothing navigates.

Branch `record-a-response-v2`, cut from the line dev was serving: `dev/…-laq23-acv22` @ `5e61502c6`, bundle `index-UL5zH8Qk.js`. Dev URL and bundle are at the end.

## False premises (read these first)

1. **"Today the Dashboard's button sends the writer to another part of the app": false, as measured on the base.** At 1440 × 900 on the emulator, the Dashboard band button left `location.pathname` at `/dashboard` and opened the v1 "Who replied?" frame (the card frame) in place. A pick there also stayed on `/dashboard`, opening the card's composer (V0, `ledger-base/V0-pick-reading.json`). No door's own press changed the route.
2. **The one base reading that did leave the route was the wrong action.** The search palette took `/dashboard` to `/queries?q=cv25-q-03`. But the ⌘↵ the driver pressed was on the *agent* row, whose second action is "Open the query", a navigation by design. The query row's ⌘↵ (`recordFor`) calls `openResponse({ queryId })` directly. A name search lists the agent row, not the query row, so the rendered lock now uses the palette's own "Record a response" action. `recordFor` is locked at source (D2).
3. **What the base did show, door by door,** was two different surfaces for one job: the card frame's "Who replied?" (six doors), and the card's own reply box, "What did Priya say?" (the card footer and the agent card). The "one door" was the card, not a journey.
4. **"Something else" as a reply has no home** (see "Not built, needs a ruling"). Every reply step the writers know sets a status.
5. **The practice query (Pip) cannot move to the new journey without rebuilding its guided walk.** The walk reads the old drawer journey's own stepper out of the DOM (`.qad-root[data-practice] [data-qad-step]`). Pip stays on that path, which writes nothing. The new panel hands any Pip request to it.

## Step 0

- **Hashes:** every line of `SHA256SUMS.txt` matched (`shasum -a 256 -c`), from `~/Downloads/record-a-response-v2-pack.zip`.
- **Dev line:** `dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2-laq21-mg1-pc3-laq22-qc168-sb1-laq23-acv22` @ `5e61502c6`, served as `index-UL5zH8Qk.js`. It carries Log a query v2.3 (`QcLogStages.tsx`, `LogStagesPanel.tsx`, `LogStagesHost.tsx`, `qcLogStages.css`) and the Plumage colours v3 grid card (`QcCard154`, status label top right, `MatTile` in the Sent box).
- **Disk:** 37 GB free at the start, 33 GB at the end.
- **Baseline before any edit:**
  - tsc: 7 errors, all `functions/` module resolution, because this worktree had no `functions/node_modules`. It also needed `--max-old-space-size=6144`.
  - Build: clean.
  - Vitest: 10 files and 1 test failing, all `functions/` suites plus `aiRefusal` and `queryClock`. They pass once `functions/node_modules` is linked to the primary's.

### The door map (measured, `ledger-base/doors.json` → `ledger-phase7/doors.json`)

| Door | Route before → after (base) | On screen (base) | Route before → after (now) | On screen (now) |
|---|---|---|---|---|
| Dashboard band button (`[data-d2='record']`) | /dashboard → /dashboard | v1 card frame, "Who replied?" | /dashboard → /dashboard | the journey, at Who replied? |
| Top bar Log a query menu, on the Dashboard | /dashboard → /dashboard | v1 frame | same | journey, Who replied? |
| Top bar menu, on Queries | /queries → /queries | v1 frame | same | journey, Who replied? |
| Queries page button | /queries → /queries | v1 frame | same | journey, Who replied? |
| Analytics header | /queries/analytics → same | v1 frame | same | journey, Who replied? |
| Responses header | /queries/responses → same | v1 frame | same | journey, Who replied? |
| Query card footer ("Record a response" / "{first} replied") | /queries?q=… → same | the card's composer, "What did Priya say?" | /queries?q=… → /queries | journey, What did Priya say? (the card gives way, so `?q` clears, as reference screen 39 shows) |
| Agent card (Contact list) | /agents → /agents | the card's composer | same | journey, What did Priya say? |
| Search palette, "Record a response" action | (base read the wrong row, see premise 2) | n/a | /dashboard → /dashboard | journey, Who replied? |
| Search palette, a query row's ⌘↵ (`recordFor`) | locked at source | | | `openResponse({ queryId })` |
| To-do desk "Record what {first} said" (`useWsCore`) | locked at source | | | `openResponse({ queryId, onSaved })` |
| Dashboard Next up (`Dash58` run) | locked at source | | | `openResponse({ queryId, from: "dashboard" })` |
| Responses card act, answer panel (`ResponsesPage`, `RspPanel`) | locked at source | | | `openResponse({ queryId })` |
| Query Centre internals (bulk queue, Birds-eye, list-row buttons, desk verb: `respondOn`) | the card's composer | | | the journey (a closed query keeps Reopen) |

**The cause of "the Dashboard door leaving the page"** was never a route change. Every desktop door already went through `openResponse` (`App.handleNavigate` → `openResponse()`), and its one listener was the Query Centre component, mounted on every page. That listener drew the v1 card frame (`QcWhoReplied`), and after a pick the query card with its composer (`respondOn` → `openQueryPanel`). So the writer was taken out of a journey and into a query card. The route itself stayed put (V0).

### What each answer maps to (the gap table)

| Answer | Saved through | Field | Gap |
|---|---|---|---|
| Who | the query picked | — | none |
| Reply kind | `planRecord` (lib/qc152Write) `partial_req` / `full_req` / `rr_req` / `offer` / `pass` | the step; status by `withRecompute` | none |
| Reply date | `planRecord` `dayMs` | the step's time, after every logged step | none |
| Asked for: sample unit and amount | the step's `materials` (`kind: "sample"`, `unit`, `n`) and `materialsType` / `materialsQuantity` | | none |
| From the opening or a section | query `requestFrom`, `requestFromUnit` (`saveResponse`'s own fields) | | none |
| Synopsis asked | `materials` `{ kind: "synopsis" }`, query `requestSynopsis` (partial) | | none |
| Extras asked ("Something else" chips and text) | `materials` `{ kind: "other", text }` (StepMaterial's existing kind) | | none |
| Sent or not | "Not yet": nothing more; "Yes": a second step, `partial_sent` / `full_sent` | | none |
| Send-by date | `expectedBy` on the reply (`planReply`'s own) | the query's send-by, which the To-do reads | none |
| When it went | the send step's `dayMs` (Today / Yesterday) | | none |
| Exactly what went: sample, version, named synopsis, extras | the send step's `materials`: `versionId` on the sample or full, `name` on the synopsis, `kind: "other"` | | none |
| Reply time in weeks | query `writerExpectedDate` + `writerExpectedSetAt` (the send form's own fields); cleared when Unknown | | none |
| Nudge reminder | query `nudgeDate` (the field the model already has); cleared when off | | none |
| Their words | the step's `replyNote` (500 characters) | | none |
| Revise or not, resubmit-by | "Yes": `expectedBy` on the R&R step; "Not sure": nothing; "No, close": a `withdrawn` step after it (closed by you) | | none |
| Offer answer-by | `offerDeadline` on the offer step | the query's `offerResponseDeadline` | none |
| Tell-the-others task | the offer step's `tellLater: true` (set as it is made) and each other open query `offerRefQueryId` / `offerTold: false`, `planTell`'s own marks. The To-do's "tell the others" card reads them. | | none |
| Notes | `addJournalEntry`, each as the Notes tab saves one | | none |
| "Something else" as a reply | **no record** | | **gap** |

### Not built, needs a ruling

1. **"Something else" as a reply kind** ("A holding reply or a question. Nothing changes."). Every reply step the writers know sets a status, and nothing records "they replied, nothing changes". The row is not shown, and screens 37–38 are not built. The smallest change: a new `RecordKind` `"reply"` with no `resultingStatus` (recompute ignores it, as it already ignores "told" steps), the existing `replyNote` for the words, and an event key. That event key is a new value in `firestore.rules`' activity allowlist, so it needs a prod rules deploy, which is Nick's.
2. Nothing else from the brief's three: extras and the later send's named synopsis and version both had homes (above).

## Per phase

| Phase | Commit | What landed | Measured |
|---|---|---|---|
| 1 | `d2a7dfc26` | The reference enrolled; `tests/e2e/recordResponse2.measure.ts` (V0–V2); `tests/e2e/rar2compare.mjs` (side by side, pixel diff per screen, in a headless canvas, no new package) | Red on the base: V1 19/46, V2 red (`ledger-base`) |
| 2 | `58e2c6a68` | `RespondStagesPanel`, mounted once in App as the one `openResponse` listener, using the Log a query shell (SidePanel `.qsp`, `.laq` classes, shared and not copied) and claiming the right-hand panel. The Query Centre stops listening and keeps Pip (`setPipResponder`). `WeekSlider` gains optional `readout`, `unknownLabel`, `ends`, and its fill reads `var(--sm, #2a3a52)`. The journey component, host, model and CSS land whole here; later phases measure and fix them. | V1 40/46 (every `openResponse` door in place), V2 16/16 |
| 3 | `8de6dd4cc` | `recordResponse2.behaviour.measure.ts`: B1 (Who replied?), B2 (reply kinds, the track), B3 (the calendar), B7 (Escape), B8 (the track goes back) | 22/22 green |
| 4 | `6363caa70` | The offer's "tell the others" save fixed: the flag is set as the step is made, because a step created in a batch cannot be updated by the update rule in that same batch. Model locks M1–M10. | M1–M10 each red under its own mutation, 12/12 after |
| 7 | `03e835d58` | The card's reply box (`open1522` "reply") and `respondOn` open the journey. Door census at source (D1–D5). | V1 46/46, V2 16/16; D1–D5 each red under a mutation, 15/15 after |
| 5 | `edbc07c47` | The composer's refusal ruling applied to the offer save (a sibling at the rules' field ceiling: probe with `refusedMarks`, save the rest in one batch, name the refused ones in a toast); 40 shots, the fidelity sheet | B5, B6, B9 green; 40/42 screens captured |
| 6 | `bf3e5dd3b` | H1: the head reading | Archivist's head 48 × 48, radius 50%, no ring, the track inside the navy block |
| 8 | (this commit) | Two of my own reds from the full suite fixed: a second month table in the model (now `lib/dates` `MONTHS_SHORT`), and R&R stripes drawn in my stylesheet (the stripes are the two cards' bands only, so the R&R disc is flat). This report. | Full suite green |

Phase 7 was committed before 5 and 6: the shots for screens 39–42 need the card's door. Phases 3–6 measure and refine a journey that landed whole in Phase 2, because the panel cannot compile without its component.

### Locks, red before green

| Lock | Where | Red against | Green |
|---|---|---|---|
| V1 every door in place, with the track | e2e | the base (19/46) | 46/46 |
| V2 four ways out keep route and scroll | e2e | the base (no journey) | 16/16 |
| B4 a slider does not redraw | e2e | `RAR_MUTATE=B4` (input replaced on input) | ✓ |
| B5 the review fits at 1440 × 900 with no note | e2e | `RAR_MUTATE=B5` (+160px: 719 in 607) | ✓ (fits with ~48px to spare) |
| B1–B3, B6–B9 | e2e | the base (no journey); not mutated one by one | 34/34 with B4–B5 |
| M1–M10 the model | Vitest | a mutation each; M10 first stayed green (offer's mark and rim are one colour), so it was strengthened | 12/12 |
| D1–D5 the doors at source | Vitest | a mutation each | 15/15 |
| H1 the head | e2e | not mutated | ✓ |

**Caveat on B4:** the body was not scrollable at that point (scroll 0 → 0). The node-identity reading is the one that carries the lock.

## Fidelity: the reference beside the build

`reports/record-a-response-v2/compare/index.html` holds the reference, the build and the diff for each screen. A pixel counts as different when a channel differs by more than 40 of 255. Names, dates and counts are the harness account's, and the card is the app's own grid card, so a few percent is the floor.

| Screen | % differ | Screen | % differ | Screen | % differ |
|---|---|---|---|---|---|
| 01 whole page, Dashboard | 28.9 | 15 sent, reply-time slider | 7.9 | 29 review, pass | 6.4 |
| 02 who replied | 9.7 | 16 sent, Unknown | 6.9 | 30 recorded, pass | 6.1 |
| 03 search, closed | 4.9 | 17 what went | 7.8 | 31 asked, full | 5.2 |
| 04 reply, from Queried | 5.3 | 18 what went, scrolled | 13.4 | 32 their words, R&R | 5.7 |
| 05 another kind | 7.6 | 19 review, partial sent | 7.7 | 33 will you revise | 7.6 |
| 06 when | 5.2 | 20 review, materials pop-up | 8.6 | 34 offer, answer slider | 5.8 |
| 07 when, calendar | 6.2 | 21 review with a note | 8.2 | 35 offer, tell others | 4.6 |
| 08 asked, partial | 5.9 | 22 recorded, partial sent | 11.7 | 36 their words, pass | 5.3 |
| 09 asked, extras | 9.8 | 23 review, full | 7.6 | 37 review, something else | not built |
| 10 sent question | 4.3 | 24 recorded, full | 9.3 | 38 recorded, something else | not built |
| 11 not yet, slider | 6.8 | 25 review, R&R | 7.9 | 39 whole page, from a card | 27.6 |
| 12 not yet, no date | 6.0 | 26 recorded, R&R | 9.3 | 40 discard bar | 5.7 |
| 13 review, not sent | 8.3 | 27 review, offer | 7.1 | 41 closed, same page | 46.0 |
| 14 recorded, not sent | 11.2 | 28 recorded, offer | 11.6 | 42 whole page, top bar on Queries | 29.3 |

Known departures, all by the brief's own rules:

- The closed card's right box reads "Next —". That is the app's own closed grid card; the reference's "Closed {date}" box is its stand-in.
- The R&R glyph is the app's StatusDot.
- Full manuscript and free-text tiles have no icon. That is the app's rule (`lib/materialIcon`); the reference drew one.
- The tone's "mark" is the stage's `rim`, which is lighter than the reference's offer mark.
- The R&R row disc is flat: the stripes are the two cards' bands only.

## Save paths and Undo

- **One batch:** `commitMany` over the plans, one snapshot of the query, plus every sibling an offer marks.
- **Notes:** each note is then a journal entry.
- **Undo** (the recorded screen's, and the toast's after "Record and start another") restores the snapshot and deletes the notes this save added. B6 measured the query back at Queried after Undo.
- **No user tasks are written.** Every to-do this reply makes is derived from the query's own fields: send-by, the nudge date, resubmit-by, answer-by, the tell-later marks.
- **`responseSaved(id)`** fires once, after the batch (D4), so a door's `onSaved` (the To-do desk's) still hears.
- **When an offer's "tell the others" is refused** by a sibling at the rules' field ceiling (found on the harness account), the composer's ruling applies: probe each mark, save the rest, and name the refused ones in a toast, "Recorded. Couldn't mark {names} to tell."

## Retired, left, and who owns it

- **Retired on desktop:** the Query Centre as `openResponse`'s listener, and the card's reply box as a door. The card's composer journey "reply" no longer opens on desktop.
- **Left, unreachable on desktop, owner: this stream's follow-up.**
  - `QcWhoReplied` and `qcFlow: "who"` in Queries.tsx. The only setters are `respOpenRef` without a query (nothing calls it so now) and the composer's "← Someone else" (`whoPickedRef`, set only by a pick in `QcWhoReplied`).
  - Not deleted because `recordResponse1.test.tsx` R4/R5 render it directly. Deleting it means retiring those locks in the same commit.
- **Left for the phone (owner: phone app stream):**
  - the drawer's `ResponseJourney`, `QueryPicker`, `saveResponse`
  - the card's composer at phone width
  - `openResponse`'s phone fallback
- **Left for Pip (owner: Query Centre guide):** the practice journey (`openPipResp`, `practiceRespond`).
- **Left unlinked on desktop:** "Paste the email instead" (`RecordResponseModal`, `PASTE_RESPONSE_EVENT`), as the brief says.
- **Not changed:** Log a query's files (`QcLogStages.tsx`, `qcLogStages.css`, its host and panel). The only shared change is `WeekSlider`'s optional props and its fill, whose computed value is unchanged where `--sm` is unset; no Log a query rule sets `--sm`. Log a query's own shot specs were **not** rerun.

## Went in as proposed, not individually ruled

- The headline follows the reply: "A partial request. Great work!" and the rest.
- On the recorded screen, "Recorded. …" with a second line from the app's counts ("That's {n} requests so far.", "{n} queries still out.").
- Likely replies first. With the writer already (partial requested, full requested, R&R), only "Passed" is likely, because "Something else" is not built.
- Slider ranges:
  - Reply time: 1–26 weeks, starting from the agent's stated weeks, else 8.
  - Send it by: today to 30 days, starting at 3.
  - Resubmit in: 1–26 weeks, starting at 4.
  - Answer needed in: 1–30 days, starting at 14.
- The four suggested extras: Author bio, Series outline, Comp titles, Chapter outline.
- The tighter review screen. It fits at 1440 × 900 with about 48px to spare.
- An illustration slot on every recorded screen, a pass included.
- "No, close the query" on an R&R records a close as withdrawn ("closed by you").

## Baseline against final

| Gate | Baseline | Final |
|---|---|---|
| tsc | 7 errors, all `functions/` modules missing in a fresh worktree | 0 (with `functions/node_modules` linked) |
| build | clean | clean (the chunk-size note only) |
| Vitest | 10 files and 1 test failing (functions modules, `aiRefusal`, `queryClock`) | 939 files passed, 13,374 tests, 0 failing |

## Branch and dev

- **Branch:** `record-a-response-v2` (pushed), on top of `5e61502c6`.
- **Dev:** see the deploy section the commit after this one adds.
