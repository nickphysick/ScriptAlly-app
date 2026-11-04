# Import review: the timeline strip (ref v1)

**The two-dates card is now the query's whole timeline, one strip of steps, and the ready row's Edit opens the same strip.** Each step is edited in a small pop-over under its tile. Built to `design-refs/import-timeline-strip-v1.html` (SHA256 `157deefb…73d8`, matched), screens `#deck` and `#row`. It's on `main` and on dev; prod is untouched.

Dev serves **`index-zpSLt2hT.js`**, built from `dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1`. That branch is the line dev was already serving (`…-cl26-sip11`, `index-cVtavgTw.js`) with `main` merged in.

## 1. False premises, and what I decided

1. **The ref wasn't in `design-refs/`.** It was in `~/Downloads` with the matching hash, and it's now committed at the brief's path.
2. **"15 Sept 2026" breaks a standing ruling.** The 28 Sep clean-up ruled "28 Sep, never Sept", with one month table, locked in `src/lib/dates.test.ts`. That lock went red on my first full run. Tiles now read **"15 Sep 2026"** from `lib/dates`' `MONTHS_SHORT`. The two hints read "Date, e.g. 22/9 or 22 Sep" and "Try 22/9 or 22 Sep." The parser still accepts "Sept", "sept", "September" and "22nd Sept". If you want "Sept" on these tiles, it's a ruling about the whole app, not about this card.
3. **The commit orders rungs by the pipeline, not by date** (`lib/impliedRungs`: LADDER order, final rung = `q.status`). The strip's status is the latest step by date. For any timeline in pipeline order, which is every case the model gives, the two agree; Kirsten's case writes Queried → Full requested → Full sent at Full Sent. They can disagree if a writer dates an earlier stage after a later one (Passed dated before Full sent, say). Then the strip shows "Full sent" and the commit writes the rungs in ladder order with status Full Sent. Nothing breaks, but the order on the strip isn't the order in the record. I left `commitSmartImport` alone, as the brief said.
4. **The response-date questions are answered by the strip too.** The brief named only the sent-date codes. But the strip asks for a date on every event, so a separate "when did they reply" card would ask the same thing twice. `STRIP_CODES` therefore includes `unreadable-response-date` and `ambiguous-response-date`. Those cards still show for a query with no strip.
5. **The ready query row's action said "Add details", not "Edit".** That label dated from when the panel was a details form. Query rows now say **Edit**, as the ref does; agent rows keep "Add details" / "Edit details".
6. **`o9-pop` was already a class: the deck's own entrance.** My first build gave the pop-over that name, so the whole deck became a 292px absolute box (measured, not guessed). The pop-over's classes are `o9-spop*`.
7. **On a phone, the deck asks behind "Answer this"** (the dev line's phone screens, not on `main`). There the strip lives in the answer sheet; the 390 screenshots show it. The dev line's phone ready row (`PhoneRowShell`) isn't on `main`, so on a phone the ready row still says "Add details" and keeps its own end. It opens the strip under the row like the desk.
8. **A query arriving at a status with no event of that type** (Full requested with no Full requested event, say) shows that status as an undated last step. The commit writes that rung anyway, and the strip says what will be written. The first edit makes it a real event.

## 2. Gates: baseline and final

Baseline: a clean worktree at `8c9c32f46`, before any edit. Final: the primary tree after the last commit.

| Gate | Baseline | Final |
|---|---|---|
| `tsc --noEmit` | exit 0, 0 errors | exit 0, 0 errors |
| `tsc -p functions` | exit 0 | exit 0 |
| `vite build` (whole log grepped) | exit 0, no errors or warnings beyond the chunk-size note | exit 0, no errors or warnings beyond the chunk-size note |
| Vitest | `Test Files  6 failed \| 664 passed (670)` · `Tests  6 failed \| 10220 passed \| 3 skipped (10229)` | `Test Files  672 passed (672)` · `Tests  10267 passed \| 3 skipped (10270)` |

The six baseline reds are `marketingTokens`, `actionKind`, `compsInQueryRetired`, `domain`, `testAnchors` and `compsSteps`. They failed in the clean worktree and pass in the primary checkout; none touches the import review. My first full run on the edited tree had one red of my own, `dates.test` (point 2), fixed before Phase A was committed.

The four follow-up commits were each gated with `tsc` plus the onboarding and strip suites, then the full run above.

## 3. Commits

| Commit | What | Files |
|---|---|---|
| `0f389d797` | Phase A: the model and the date parser | `design-refs/import-timeline-strip-v1.html`, `src/lib/importTimeline.ts`, `src/lib/importTimeline.test.ts`, `src/lib/importTypedDate.ts`, `src/lib/smartImportReviewModel.ts` (the `sentWaived` field only) |
| `04c469b2a` | Phase B: the card, strip, pop-over and ready row | `v9/TimelineStrip.tsx`, `v9/timelineStrip.css`, `v9/timelineStrip.test.tsx`, `v9/DeckQuestions.tsx`, `reviewRows.tsx`, `SmartImportReview.tsx`, `SmartImportReviewFixture.ts`, `OnbLabImport.tsx`, `smartImportReviewModel.ts` (`applyNeitherSent` removed), `photoReview.test.tsx`, `twoDatesV11.test.tsx`, `tests/e2e/reviewDrive.ts`, `tests/e2e/importTimelineStrip.measure.ts` |
| `16fe60c11` | The pop-over measures its room in the scroll area, not the window | `TimelineStrip.tsx`, the e2e file |
| `74371b6c9` | It stays in view when the month grows | `TimelineStrip.tsx`, the e2e file |
| `5ee515e68` | …but only when the month turns while it stays open | `TimelineStrip.tsx` |
| `b4bd33fae` | A ready query row's action reads Edit | `reviewRows.tsx`, `timelineStrip.test.tsx` |

On the dev line: `2f0fbc681`, the merge. One conflict, in `reviewRows.tsx`: the dev line's phone row is kept, and the desktop end takes the strip's Done inside the dev line's fragment. Each later commit was merged in as well.

The three placement follow-ups (`16fe60c11`, `74371b6c9`, `5ee515e68`) came from looking at dev. At 1440 the add pop-over flipped above its tile and its first line ran under the set-up sheet's clip. At 390, Save ended 16px under the answer sheet's clip, because typing "30/8" turns the calendar to August, which has six weeks. The first fix for that also scrolled on opening, before the flip had landed, and TS-R2 caught it on dev.

## 4. What was removed

- The two-dates card's **Swap the dates**, **It's just one date** and **Neither is when I sent it**: the `two-dates` branch of `QueryReasonPanel`, `NEITHER_SENT`, the `onSwapDates` / `onNeitherSent` props, `swapQueryDates` and `neitherSent` in `SmartImportReview`, and `applyNeitherSent` in `smartImportReviewModel`. Their unit cases in `twoDatesV11.test.tsx` went with them.
- The ready query row's **Status** select and **Date sent** field. The open row is the strip now.
- The quote line's "Your page N." text on the strip card: hidden so the quote and "See the whole page" share a line. The link stays.

## 5. Locks and their red-before proofs

Unit (`src/lib/importTimeline.test.ts`, `src/components/onboarding/v9/timelineStrip.test.tsx`):

| Lock | Break | Result |
|---|---|---|
| TS-A2 steps in date order | the order ignores dates | red, 2 |
| TS-A3 the latest step drives where it stands | latest = first step | red, 5 |
| TS-A4 an event before the sent date blocks the answer | no order check | red, 1 |
| TS-A4 waiving the sent date answers it | the waiver isn't counted | red, 1 |
| TS-A7 the parser, day first | read month first | red, 7 |
| TS-A7 a year-less date near today | a future year-less date kept | red, 1 |
| TS-A2/A3 the status as a step | the status not shown | red, 4 |
| TS-A3 the status follows the latest step | status not set | red, 2 |
| TS-B1 the card shows for its cases only | strip for any sent-date query | red, 1 |
| TS-B2 the button says what's missing | always "Yes, that's right" | red, 2 |
| TS-B3 the retired controls are gone | "Swap the dates" put back on the Ask line, then on the strip card | red, 1 each (the first version of this lock missed the first break; it now renders every card a strip code reaches, the strip card and the row) |
| TS-B4 the gate counts one question | confirm leaves a response-date reason open | red, 1 |
| TS-B5 open row: Done in place of Edit and "Don't import" | "Don't import" kept while open | red, 1 |
| TS-B5 closed row says Edit | the label removed | red, 1 |
| TS-B6 Kirsten commits three rungs at Full Sent | confirm writes an empty timeline | red, 1 |
| TS-A1, A5, A6, A8, A9 | covered by the same breaks (M1, M4, M7) | red with them |

Rendered (`tests/e2e/importTimelineStrip.measure.ts`, on `#/onb-lab?s=review&fx=timeline`):

| Lock | Break | Result |
|---|---|---|
| TS-R1 the pop-over is absolute and opening it (and typing in it) changes no box in the card: the card, the strip, every tile, the line and the button | `TS_MUTATE=R1` (pop-over `position: static`) | red (R2 too), on the local build and on dev |
| TS-R2 it flips above its tile near the foot, and starts inside the scroll area | `TS_MUTATE=R2` (no flip) | red, local and dev; also red on dev against `74371b6c9`, which is how the scroll-on-open fault was caught |
| TS-R3 Esc, a click outside, the tile again and Cancel save nothing; Enter does nothing until a date reads, then saves | the outside-click listener removed (source, rebuilt) | red |
| TS-R4 focus goes to the date field on open and back to the tile on close; `role="dialog"` labelled by its question; the add note word for word | the focus return removed (source, rebuilt) | red: focus `null`, not `e0` |
| TS-R5 the ready row's Edit opens the strip, Done in place of Edit and "Don't import", and closes again | Done → Edit (source, rebuilt) | red |
| TS-R6 on a phone, a typed date that turns the calendar to a six-week month leaves Save inside the scroll area | the bundle before `74371b6c9` | red on dev: Save at 792.8 against 776.5 |

Final run on dev (`index-zpSLt2hT.js`): **7 passed** (six locks and the screenshots). The lab runs signed out on fixtures, but the harness refuses a live base without `ALLOW_LIVE_FIRESTORE=1`, so I set it for these runs.

## 6. Screenshots (`reports/import-timeline-strip-v1/`, taken on dev)

| 1440 × 900 | |
|---|---|
| `ref-deck-1440.png` / `1440-card-arrival.png` | the ref's `#deck` beside Kirsten's card on arrival |
| `1440-pop-sent-30-8.png` | the Query sent pop-over with "30/8" typed: "Sunday, 30 August 2026", the 30th filled |
| `1440-pop-add-22-9.png` | "+ Add an event" with "22/9": the note, Revise & resubmit pre-chosen (the step after Full sent), Add |
| `1440-strip-finished.png` | the strip answered: 30 Aug, 15 Sep, 22 Sep, "Yes, that's right" |
| `ref-row-1440.png` / `1440-ready-row-open.png` | the ref's `#row` beside Cordelia Vane's row open with its pop-over |
| `390-card.png`, `390-pop-open.png` | 390 × 844: the card in the phone's answer sheet, and the pop-over open |

Two differences from the ref remain, both small. The ready row's strip starts at the row's disc, where the ref indents it to the name. The ref's open row also has a rust left edge and a tinted head, which I didn't add: the brief said not to invent new styles, and the app's open rows have neither.

## 7. Reaching Kirsten Vale's card

- **The lab, any time:** https://scriptally-dev.web.app/#/onb-lab?s=review&fx=timeline, then "Continue to queries". Her card is first. It's a fixture, so nothing is saved.
- **The real path:** import your notebook photos on dev (Import → Smart import → photos), as in the v1.1 run. The model reads her entry as Full sent with events on 15/9 and 22/9 and no sent date, which is exactly the case this card is for.

## 8. Loose ends

- The branches dev carries that `main` doesn't (Dashboard v2, the phone screens) still hold the phone ready row's "Add details". It'll want the same Edit label when it reaches `main`.
- Other sessions' worktrees on this machine: five besides the primary (`wt-emu`, another session's `wt-base`, `ScriptAlly-cl262`, `ScriptAlly-live`, `ScriptAlly-pk41`). I removed my three measurement and deploy worktrees. Say if you'd like the clean ones cleared.
