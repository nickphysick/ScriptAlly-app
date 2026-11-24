# Record a response v2.1 — the recorded screen once it's sent, and the card over the journey

Branch `record-a-response-v2-1`, cut from the line dev served (`dev/…-sb1-laq23-acv22-rar2` @ 57ba47c65, bundle
`index-N01SII2_.js`, which carries Record a response v2). Reference: `design-refs/record-a-response-v2-1` (all 8 hashes in
`SHA256SUMS.txt` verified before any work). Desktop only; the phone is untouched. Nothing on `main`, nothing in prod.

## False premises and findings (read first)

1. **"About 15px of its left edge and 20px above and below the card's height stay visible" cannot both hold with
   "40px to the left, scaled to 0.955".** The reference puts the card exactly over the journey's box (both 540 × 868 at
   the window's right edge). The app's own query card is not there: at 1440 × 900 it is 540 × 700 at x 860–1400, top 100
   (its layout box; it also leans, so its bounding box is 850–1410 × 93–807). That is 24px further in from the edge than
   the journey (884–1424) and 168px shorter. A literal `translateX(-40px) scale(.955)` hid the journey's left edge
   entirely (−8.3px) and showed 64.5px above and below.
   **What I built:** the scale (.955 from the middle of the right edge), the dim, the timing and the 40px are as the brief
   says, but the 40px is counted from the card's own right edge. The journey moves 40px plus the measured gap (24px here,
   so 64px), and **15.7px** of its left edge shows, as in the reference. Above and below, **64.5px** shows, not 20, because
   the card is 700px tall; its styling is not mine to change. If you would rather have the literal 40px (no left edge
   showing), it is one line in `qcRespondStages.css`.
2. **"There's no reply date yet." sits over a card that shows a reply date.** When the writer chooses "They didn't say" for
   the reply time, nothing is saved (`writerExpectedDate` is cleared), but the card works out its own "Reply expected by"
   from the agent's typical time (screen 06: "Reply expected by 16 Feb 2027"). I used the brief's words. A ruling is
   needed: keep the sentence, or say "A reply is usually back by {day}." from the same date the card uses.
3. **A bug in v2 that was live on dev:** the pass screen's sentence said "12 querys are still with agents"
   (`plural(n, "query")`). The new unit lock M11 caught it; it now says "queries".
4. **Reproduced on the emulator, not on dev's database.** CLAUDE.md makes the emulator the default for anything that
   writes. v2's own capture of this code (`reports/record-a-response-v2/after/22-recorded-partial-sent.png`) and P1's red
   reading on the base both show "Recorded. A partial request!", "Rosalind wants to read more." and "It went today, so
   the query is now partial sent. We'll remind you to nudge on Tue 19 Jan." over a Partial sent card.
5. **A click on the dimmed journey did not reach the card's scrim.** With the journey marked `inert`, the click was
   dropped rather than passed through. The journey's content is now inert, and a transparent catcher over the dimmed
   panel turns the click into the card's own Escape, so the card's leave checks still run.
6. **The track's long name was not in the harness data.** No agency without a named agent exists there, so P3 seeds one
   ("Penhallow Literary Agency", `tests/e2e/seedRar21.mjs`, ids `rar21-…`, removed after the test).

## Step 0 — recon

- **What "Open {First}'s card" did:** `RespondStagesPanel` ran `setReq(null)` (the journey unmounted), then
  `openQueryPanel(id, from)`. The right-hand owner (`claimRightPanel`) held one owner, and a release left none, so there
  was no way to hand the place back.
- **Every string the recorded screen could show, as built in v2** (`{F}` = first name, or the agency with no named
  agent; **bold** = a date):

| Kind and branch | Head, line one | Slot | Big line | Sentence |
|---|---|---|---|---|
| Partial, gone, reminder | Recorded. A partial request! | celebration · partial request | {F} wants to read more. | It went today, so the query is now partial sent. We'll remind you to nudge on **{day}**. |
| Partial, gone, no reminder | Recorded. A partial request! | celebration · partial request | {F} wants to read more. | It went today, so the query is now partial sent. There's no reminder set. |
| Full, gone (either) | Recorded. A full request! | celebration · full request | {F} wants the whole book. | It went today, so the query is now full sent. … (as above) |
| Partial / full, not yet | Recorded. A partial / full request! | celebration · partial / full request | {F} wants to read more. / … the whole book. | Sending your partial / full is on your to-do list (for **{day}**). |
| Offer | Recorded. An offer! | celebration · offer | {F} has made an offer. | Answering it is on your to-do list (for **{day}**). (So is telling the other {n} agents.) |
| Revise, will revise | Recorded. | the mentor · revise and resubmit | {F} asked for changes. | Resubmitting is on your to-do list (for **{day}**). |
| Revise, not sure | Recorded. | the mentor · revise and resubmit | {F} asked for changes. | The query stays open, with you. |
| Revise, close | Recorded. | the mentor · revise and resubmit | {F} asked for changes. | The query is closed. {n} are still out. |
| Pass | Recorded. | the mentor · a pass | {F} passed. | The query is closed and in your Rejection collection. {n} querys are still with agents. |

Line two of the head: "That's {n} requests so far." for requests; "Your first. Enjoy it." / "Enjoy it." for an offer;
"{F} wants another look." / "The query is closed." for a revision; "{n} queries still out." for a pass. "Yesterday" or a
date replaces "today" when the send was earlier.

## The recorded screen, after (Phase 1)

| Kind and branch | Head, line one | Slot | Big line | Sentence |
|---|---|---|---|---|
| Partial, gone, reminder | **Recorded. Partial sent!** | **celebration · partial sent** | **Your partial is with {F}.** | **We'll remind you to nudge on {day}.** |
| Partial, gone, reply date, no reminder | Recorded. Partial sent! | celebration · partial sent | Your partial is with {F}. | **A reply is expected by {day}.** |
| Partial, gone, reply time unknown | Recorded. Partial sent! | celebration · partial sent | Your partial is with {F}. | **There's no reply date yet.** |
| Full, gone (the three above) | **Recorded. Full sent!** | **celebration · full sent** | **Your full is with {F}.** | as for a partial |
| Partial / full, not yet | unchanged | unchanged | unchanged | unchanged |
| Offer, revise (all three) | unchanged | unchanged | unchanged | unchanged |
| Pass | unchanged | unchanged | unchanged | … {n} **queries** are still with agents. |

Line two of the head is unchanged everywhere. No sentence narrates a status change.

I kept "The query is closed." (revise, close) and "The query is closed and in your Rejection collection." (pass) because
the reference keeps them word for word. Strictly, they also state the status the card shows; removing them is a
one-line change in `recordedCopy` if you want the rule read that way.

## Per phase

| Phase | Commit | What landed |
|---|---|---|
| 1 | e9090fd55 | `recordedCopy` (pure, in `lib/queryActions/respondStages`) holds every kind and branch's words. `headline` takes `sentQ`. The recorded screen reads them. Fixes "querys". |
| 2 | 216f66ae6 | The right-hand owner can lend its place (`lendRightPanel` / `unlendRightPanel` / `isLent`; a release hands it back). The journey lends it, the card opens over it, and the journey steps back: inert content, Escape layers off, a click catcher. The recorded card is the query's live row, so edits on the card show when the journey returns. `body.spanel-open` is counted. |
| 3 | afb22b6b5 | Log a query's specs rerun (all green; the slider is unchanged). `StepValue`: a long track value shows its first word, with the full value in the step's label. |
| 4 | (this report) | The final run, the seven shots and the compare sheet, the dev deploy. |

### Locks, red before green

| Lock | Red on | Green |
|---|---|---|
| e2e P1 (recorded screen against the card, 5 cases × 6 readings) | the base: 25 of 30 red (`ledger/P1-red-base.json`). The four sent cases' head, slot, big line, sentence and "narrates" readings (20) were real reds. Five card-status readings were red from a harness bug (a `\b` across run-together words), fixed before the green run. | 30/30 (`P1-green-phase1.json`, and the final run) |
| unit M11 (14 kinds/branches + "gone never talks about the request") | the base (`recordedCopy` does not exist); it then caught the "querys" bug | 15/15 |
| e2e P2 (card over journey: DOM, dim, transform, boxes, Tab, Escape / ✕ / click, focus, scroll, path, Undo) | Phase 1: the journey closed (`P2-red-phase1.json`); first Phase 2 run: the left edge was hidden and the click was dropped (`P2-run2-phase2.json`) | 32/32 (`P2-green-phase2.json`, `P2-final.json`) |
| unit L1–L4 (lending the place) | Phase 1 store: `unlendRightPanel is not a function` | 4/4 |
| e2e P3 (the track's long name) | Phase 2: "Penhallow Literary Agency", 150px in 96 (`P3-red-phase2.json`) | 4/4 (`P3-green-phase3.json`) |
| unit W1–W3 (Log a query's slider) | W1/W2: a changed default ("Not known", "1 wk"); W3: `--sm` added to Log a query's stylesheet | 3/3 |

### The stack, measured (1440 × 900, opened from the Dashboard; `ledger/P2-boxes.json`)

| | left | top | right | bottom | width × height |
|---|---|---|---|---|---|
| Journey, recorded screen | 884 | 16 | 1424 | 884 | 540 × 868 |
| Journey, behind the card (transformed) | 844.3 | 35.5 | 1360 | 864.5 | 515.7 × 828.9 |
| Card (layout box) | 860 | 100 | 1400 | 800 | 540 × 700 |
| Card (bounding box, with its lean) | 850.3 | 92.6 | 1409.7 | 807.4 | 559.3 × 714.8 |

Transform `matrix(0.955, 0, 0, 0.955, -64, 0)`, from 100% 50%. Dim `rgba(28, 19, 15, .45)` at opacity 1 over the whole
panel. 15.7px of the journey shows left of the card, and 64.5px above and below it. Tab: 0 of 12 presses reached the
journey. Escape, the card's ✕ and a click on the dimmed journey each brought back the same recorded screen, unstepped, at
the same scroll, with focus on "Open Rosalind's card". The path stayed `/dashboard` throughout (the Dashboard door adds no
`?q`). Undo afterwards restored the query to Queried.

## Log a query's specs against this branch (Phase 3)

All 19 tests are green: `laqV2` V2-1…V2-10, `laqV21` V21-1…V21-4, `laqV22` V22-0…V22-5. Per screen, the rerun's shots
beside the committed ones (`laq-compare/index.html`; the committed shots are Log a query v2's from 23 Nov, before v2.1–v2.3):

- **The slider screens:** 08 nudge, no reply time 0.3% · 09 past the date 0.1% · 14 from the card 0.6% ·
  100-step5 0.6% · 150-step5 0.2%. All of each difference is the dates, because the rerun was a day later. The slider,
  its words and its fill are identical.
- **Screens without the slider:** 0–0.4% on most. The review and logged screens (10, 11, 15, 18, 20, 21,
  100/150-step6) differ by 2.4–11.6%; that comes from Log a query v2.1–v2.3's own later changes and the dates, not from
  this branch.
- Six committed names have no rerun shot (02, 16, seam-100…150): later Log a query versions renamed or dropped them.

The slider needed no fix.

## The seven reference screens (Phase 4; `compare/index.html`)

| Screen | Pixels that differ |
|---|---|
| 01 recorded, partial sent | 11.3% |
| 04 recorded, full sent | 11.1% |
| 05 partial sent, no reminder | 11.1% |
| 06 partial sent, no reply date | 11.2% |
| 07 partial not sent (unchanged) | 11.5% |
| 02 whole page, card over the journey | 39.8% |
| 03 whole page, journey back | 29.6% |

The panel screens differ mainly in the harness data: Rosalind Vale rather than Rosalind Ashby, a query sent 16 Aug 2025,
"2 requests" rather than 3. The words, slot, card and footer match. The whole pages differ in the page behind (the
harness Dashboard, the beta strip) and the card's own position and height (finding 1).

## Gates

| Gate | Baseline | Final |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vite build` | clean (no error or warning lines) | clean (no error or warning lines) |
| Vitest | 939 files, 13,374 passed, 4 skipped, 0 failed | 941 files, 13,396 passed, 4 skipped, 0 failed (+2 files, +22 tests: M11, L1–L4, W1–W3) |
| e2e, final tree | — | P1 30/30, P2 32/32, P3 4/4; v2 doors V1 46/46, V2 close 16/16, V0 2/2; behaviour B1–B3/B8 22/22, B4–B6/B9 12/12 (`ledger/v2-specs/`) |

## Deploy

Dev had moved on during the work: it served `index-DV1b7uNl.js` from `dev/…-rar2-acv221` (agent card v2.2.1, which
already carried Record a response v2). As CLAUDE.md requires, this branch was merged into that line as a new branch,
`dev/…-rar2-acv221-rar21` @ 11c168069 (a clean merge; tsc 0 and the 67 related unit tests green on the merged tree), and that
was deployed. **https://scriptally-dev.web.app serves `index-aKhG_Q-p.js`**, checked against the build after the deploy.
The deploy also checked that dev still served `index-DV1b7uNl.js` immediately before it. Hosting only; no rules or
functions.

## Left as the brief says

"Something else" is still out and does not appear under "Another kind of reply". The practice query (Pip) keeps its own
flow. `QcWhoReplied` and its old tests are unchanged. No rules, functions, AI calls or status derivation were touched.
