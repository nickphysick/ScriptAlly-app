# Log a query v1.3 — report

Materials that fit, a Done for the sample, the Nudge stage, and a clearer "reply expected" on the slip.

- **Branch:** `log-a-query-v1-3`, cut from `log-a-query-v1-2` (4952e5dc). v1.2 is still not merged, so the base did not change.
- **Pushed, not merged.** Four commits (8ce0312a2, 91663b18e, 9cc2fd493, 5811c6b8d), then this report.
- **Pack:** `design-refs/log-a-query-v1-3/`. Every file matched `SHA256SUMS.txt`.
- **Dev:** https://scriptally-dev.web.app now serves `index-Dew3IMgB.js`, from `dev/…-laq12-laq13` (details at the foot of this report).
- **Prod:** untouched.

## Step 0 — answers

**1. Why Materials spilled sideways.**
- The element that set the width was `.laq-pcs`. It was `display: grid` with no column size, so its single column grew to the widest content that could not wrap.
- That content was v1.2's Version seg: three long names on one line, white-space nowrap. The column widened to fit the seg, and every row in it widened with it, off the panel.
- The fix:
  - `grid-template-columns: minmax(0, 1fr)`;
  - the seg replaced by one pill;
  - value pills capped at 58% of the row and ellipsised;
  - `overflow-x: hidden` on the stage body.

**2. What the save path accepts for the reply side.** `lib/queryActions/logSave.ts` is the one log save. The old `LogJourney` and the staged journey both use it.

| Field | What it holds |
|---|---|
| `writerExpectedDate` (+ `writerExpectedSetAt`) | The reply date. Written only when it is not the agent's own weeks. The old journey set `writerExpected = !wks \|\| expectMode !== "usual"`. Otherwise the date is derived when read, from the card's `responseTimeWeeks` (`lib/expectedDate.ts`). |
| `ifNoResponse` | "Remind me to nudge" / "Mark as no response automatically" / "Do nothing" (`IF_NO_STORED`). The old journey fed it from `ifNo` (nudge / close / nothing). |
| `nudgeDate` | The reminder. The old journey took it from `reminderAnchors(expect, [On the day 0, A week later 7, Two weeks later 14])`, weekend-shifted, or a picked date. |
| `responseDeadline` | The close date, written only for "Close it". The auto-close in `db.tsx` closes a Queried query once it has passed. |
| `nrmnOverride` | "No reply means no" answered differently from the card. The new stage does not ask it, so it stays null. |

The "Nudge {First}" to-do is not stored. It is worked out from `nudgeDate` (`taskPrecedence.replyTask`, fed by `db.tsx`).

The old journey's "no reply window" case saved an 8-week house date: `logDefaults` used `wks ?? 8` with `writerExpected` true. The new stage saves none (see "What saves" below).

**3. Saving an agent's response time.**
- The card's one save is `useAgentSave().saveDraft(agent, base, draft, { emit })`, which calls `commitCardSave`.
- It writes only what changed (`cardPatch`, here `responseTimeWeeks`), takes a snapshot first, and returns an Undo.
- The journey calls it with `emit: false`, so the card raises no "saved" notice and makes no consequences offer.

**4. WeekSlider.**
- This base had the old burgundy one: `#7c3a2a` fill and readout, with a green hover and focus.
- I took the dev line's (`add-agent-v1`) `WeekSlider.tsx` and its `forms.css` slider rules unchanged: navy, `hideLabel`, the Unknown pill. Nothing is forked.

**5. The slip's "Next" fact.**
- It is `nextFact` in `src/lib/qc153.ts`, drawn by `QcSlip153`. That is the Query Centre list and the check stage's preview alike.
- The preview passed a `preview.next` override for "no reply window". That override is deleted; the Next fact now says it itself.
- It reads the query's `nudgeDate`, `ifNoResponse` and `responseDeadline` through `row.query`.

## Bugs found, fixed with your go-ahead

1. **Close it never survived a reload.**
   - The one-time expected-date migration in `db.tsx` runs on every load. It reads every `responseDeadline` as a stale expected date and deletes it.
   - Close it always has a reply time, so its date always matched and was always deleted. The auto-close never fired, in the old journey too.
   - Fix: a query whose `ifNoResponse` is "Mark as no response automatically" keeps its date (`expectedDate.ts`, with a test).
2. **A booked nudge never reached the to-do list without a window.**
   - `replyTask` returned "none" for "no window recorded" before it looked at `writerNudgeDate`. So a nudge on a query whose agent states no reply time never raised "Nudge {First}". That covers Unknown, and a time not saved to the card.
   - Fix: the awaiting-status check stays first, the booked date is checked next, and the window check follows unchanged (`taskPrecedence.ts`, with a test).
3. **Close it never saved its date at all.** Found by V13-4.
   - `saveLog` wrote the close date with `updateQuery` straight after `addQuery`.
   - `updateQuery` returns silently when the query is not yet in the loaded list, and a query added a moment ago is not. So nothing was written, in the old journey too.
   - The date now goes in the query's own write; `addQuery` keeps a stated `responseDeadline` on a Queried query.
4. **The close date was a day early.**
   - Noon on the reply date closed the query on the reply date itself, while the copy says "On {reply date + 1}".
   - The close date is now the start of the day after the reply date (`closeDateIso`).

## What saves, for each Nudge choice

| Choice | Saved |
|---|---|
| Remind me to nudge | `ifNoResponse` "Remind me to nudge"; `nudgeDate` = the chip's day (weekend-shifted, as the old journey) or the picked day. The "Nudge {First}" to-do appears on that day (worked out, not stored). No close date. |
| Close it if there's no reply | `ifNoResponse` "Mark as no response automatically"; `responseDeadline` = the start of the day after the reply date, in the query's own write. No nudge. |
| No reminder | `ifNoResponse` "Do nothing". Neither date. |
| Unknown | No expected reply date: no `writerExpectedDate`, no 8-week house date. The chips count from the day it was sent (6 / 8 / 12 weeks). Close it is disabled ("Needs a response time first."). |

The reply date is saved as the writer's (`writerExpectedDate`) whenever the slider is not the card's own weeks. When it is the card's weeks it is derived when read, as before.

**Unknown, checked against the rest of the app:**
- **Gone quiet:** with no reply date, `queryState` already uses its undated rule (with the agent until 84 days in stage). Gone quiet still works.
- **The nudge to-do:** fixed by bug 2 above.
- **A card that has a response time:** pressing Unknown saves nothing of the writer's, but the card's own window still applies. So "no expected date" holds only for an agent with nothing on their card.

**Saving to the agent's card:**
- It happens only when the offer is ticked, and only after the query is logged. Cancel saves nothing.
- Undo takes back the card first, then the query: the card's snapshot holds the new query.
- If the card save fails, the query stays logged and a toast says the card was not updated.
- Other live queries with that agent move with the card, because their dates are worked out from it.

## The overflow measurements (V13-1)

"The Long Names" has four versions: "Bethuses Version", "Prologue cut", "Flashback first", and "The one where the ferry never quite docks" (40 characters). It also has a long letter and synopsis name.

The sample control was open and each version was chosen in turn from the pill's menu. At every width, the stage body's scrollWidth equals its clientWidth. Across all 12 combinations, none of the 14 parts measured is wider than the body or sticks out of it. Those parts are the rows, the sample block, the control, the Version row, the Done line, the ask card and both kinds of pill.

| Panel | Body scrollWidth / clientWidth | Parts over the edge |
|---|---|---|
| 420 | 406 / 406 | 0 |
| 540 | 526 / 526 | 0 |
| 640 | 626 / 626 | 0 |

Other things V13-1 checked:
- The letter's long name stays within 58% of its row.
- "Which version?" lists all four versions.
- The Done line reads "Sending the first 3 chapters of {version}." for each version.
- Opening the control scrolls the Done line into view.
- Done closes the control, and Continue works with it open.

## Tests

**Unit**
- `logNudge.test.ts` (new, 34 cases):
  - the six-node track and the stage's opening answers;
  - every chip's date, weekend shifting, Pick a date, and Unknown;
  - the card offer: blank → ticked, changed → unticked, unchanged or Unknown → none;
  - what each choice saves through `saveLog`;
  - Unknown saves no date;
  - the slip's six Next cases;
  - "reply by" is retired.
- `expectedDate.test.ts`: close queries keep their date.
- `taskPrecedence.test.ts`: a booked nudge fires with no window.
- `qc153.test.ts`: the "reply by" case moved to the new heading.

**Full Vitest suite:** 4 failed / 11,613 passed / 3 skipped. The four failures are the same four as v1.2's run (the fixture generator, the emulator guard, two firestoreTarget checks); none is a v1.3 file.

**Typecheck:** clean. **Build:** no errors or warnings.

**Browser** (emulator, `tests/e2e/seedLaq13.mjs`):

| Spec | Result |
|---|---|
| `laqV13.measure.ts` | 6 / 6 tests, 71 checks |
| `laqV12.measure.ts` | 5 / 5 (updated for the version pill and the Nudge step) |
| `laqV1.measure.ts` | 6 / 6 (six-node track; "Log and start another" lands on How or Nudge) |

The three Phase 4 journeys (V13-2 to V13-4 in `laqV13`):
- **Joanna:** Unknown → 6 weeks → ticked → Log.
  - Saved: `writerExpectedDate` 23 Dec, `nudgeDate` 30 Dec.
  - Joanna's card says 6 weeks.
  - Undo takes back both the query and the card.
- **Marcus:** moved to 10 weeks, left unticked → Log.
  - Marcus's card is still 8.
  - The query has its own 20 Jan date.
- **Rosalind:** Close it is preselected and says why.
  - `responseDeadline` saved as 4 Feb (reply 3 Feb + 1).
  - Still there after a reload.
  - The Query Centre's slip says "Reply expected by · Closes 4 Feb if no reply".

V13-5 checked that "Log and start another" asks the Nudge stage again.

`qc149.measure.ts` and `laqV1.measure.ts` walk the journey and now step through Nudge.

## Fidelity (screens 01–09, 1440×900)

The app's clock is held at the reference's day, Monday 9 November 2026. The panel was compared as `.card` against `.spanel`, with the reference "Over the Dashboard, dimmed". The slips were compared from their inner frames. 255 readings; 193 named parts are equal on every axis. Side-by-sides are in `side-by-side/`, ledgers in `fidelity.json` and `diffs.json`.

| Screen | Pixels differ | What differs |
|---|---|---|
| 01 sample control, Done | 1.35% | nothing measured |
| 02 after Done | 1.28% | nothing measured |
| 03 Joanna, Unknown | 8.15% | everything below the sub-line sits 21.8px higher |
| 04 Joanna, 6 weeks | 13.33% | the same 21.8px |
| 05 Marcus, from his card | 1.95% | nothing measured |
| 06 Marcus, update to 10 | 2.54% | nothing measured; type rendering only |
| 07 Rosalind, Close it | 2.02% | nothing measured; type rendering only |
| 08 slip, nudge | 13.77% | the shared slip's own look (below); the Next fact's words are identical |
| 09 slip, close | 13.63% | the same |

**03 and 04 (the 21.8px):**
- "Nothing on Joanna's card about how long they take. Your best guess is fine." wraps "fine." onto a second line in the reference and fits on one line in the app.
- The computed CSS is identical: 15px Source Serif 4 italic, 486px wide, no letter or word spacing.
- The reference embeds its own copy of Source Serif 4, which sets the line a hair wider. Everything below shifts up by one line.
- Every part on those screens matches in x, size, font, colour and radius.

**08 and 09:** the Next fact matches exactly: "Reply expected by" · "4 Jan" · "Nudge scheduled for 11 Jan" / "Closes 5 Jan if no reply". The rest is the Query Centre slip as built (v153.x), which this brief leaves alone:
- the reference's drawer-fitted slip has more padding (name at y 27 against 19);
- the Queried line reads "today" in the app and "today · by email" in the reference;
- the progress bar draws nothing on day one, where the reference draws a 3% minimum;
- the bar is 5px against 3px;
- the name is 19px against 18.5px.

## Departures and things the prompt had wrong

1. **"then nudge" / "or it's a no" do not exist** in the app or on the dev line, so there was nothing to retire. The line they would have been was v153.2's "reply by {date}", which is now retired.
2. **"You can add one later from the query card." is not true today.**
   - The card's composer logs a nudge sent, and its quick menu snoozes one that is due. Nothing on the card sets a new reminder on a query that has none.
   - "No reminder" says "Nothing goes on your to-do list." instead.
   - This also answers the not-in-scope question: the card's step editor does not cover a logged query's planned nudge, except for snoozing one that is due.
3. **Close it's date:** see bugs 1, 3 and 4. The old close path never worked.
4. **Unknown with a card value:** the card's own window still applies (see "What saves").
5. **Reminder dates are weekend-shifted**, as the old journey's were (`reminderAnchors`), so a chip may land on the Monday. The mock adds days plainly.
6. **Dates:**
   - The stage shows the year off this year ("Mon 4 Jan 2027"), as the mock does.
   - The slip shows "4 Jan" for anything within the coming ~11 months (`nextDay`), as the mock does. The app's older `shortDate` would add the year.
7. **The preview's "Their policy"** reads the weeks the Nudge stage settled on, as the mock's slip does. An unstated "no reply means no" still reads "—".
8. **The celebration** is untouched. Its one line is now fed the stage's weeks rather than the card's, so a guessed reply time is not called "no reply window".

## Dev

- **Branch:** `dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53-cl27-td54-cl27b-yn1-laq1-qc1534-aa1-laq11-td55-laq12-laq13`, at 52e6b0c83 (pushed). It is the served `…-laq12` line with `log-a-query-v1-3` merged in; the merge had no conflicts.
- **Before the deploy:** dev served `index-BVzRmv5j.js` (the `…-laq12` build). That was checked in the deploy command itself, which would have stopped if dev had moved.
- **Now:** https://scriptally-dev.web.app serves `index-Dew3IMgB.js`.
- **Checks on the merged line:**
  - typecheck clean;
  - 262 related unit tests pass;
  - `laqV13` and `laqV12` pass, 11 / 11 tests.
- **No rules or functions changed.** The code fixes are client-side, in `expectedDate.ts`, `taskPrecedence.ts` and `logSave.ts`.
