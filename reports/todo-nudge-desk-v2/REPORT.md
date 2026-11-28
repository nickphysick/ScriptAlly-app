# To-do nudge desk v2 — report (STOPPED: every state fits, but compact clips timeline labels and cuts the answers short)

Branch `todo-nudge-desk-v2`, cut from `dev/bew33-clr13-qc1722-pqs1-qc1723-bfl1-nav1-qc1724-ta1-pol1-tnd1` @ `e8727d3b1`. That is the dev line carrying nudge desk v1, at the same commit as `todo-nudge-desk-v1`'s tip. Dev served `index-D6G10n1T.js` at Step 0. Ref: `design-refs/todo-nudge-desk-v2/` (sha256 verified; `todo-nudge-desk-v2.html` = `74307e4a…f47b`). Desktop only.

## The stop

**At 1280×800 the nudge desk does not fit one screen.** The questions column there is about 310px wide; the ref draws it at 655. The ref's stacked blocks (headline, timeline card, two-step card with three answers in a row) need **577px against 452** on open, and more once a day is picked. Spacing alone can't recover 125px or more. It needs one of these decisions:

1. **Let the card preview narrow on the nudge desk at 1280.** Today it is a fixed 390px (`.tws-wp`). Narrowing it, or folding it to a strip, would give the questions column most of the width 1512 has. 1512 passes in every state.
2. **Let the questions column scroll at 1280 only**, keeping the ref's layout unchanged.
3. **A compact 1280 layout:** row 1's how-to line folded behind an info mark, the answers as a one-line segmented control, and a slimmer timeline card.

My pick is **1**: it keeps the ref's design intact and only borrows width from a column that is mostly empty on a nudge. Nothing is deployed and the full suite has not run; both wait on this.

## Follow-up 3 (fold the picked-day line in compact) — STOPPED: compact hides more than the how-to

**Built:**
- Compact folds step 2's "You nudged {First} … Next reminder …" line; outside compact it shows. Locked by CSS (`[data-compact] [data-twn="nudged"] { display: none }`, nothing else hides it) and on the page (`nudgedShown` is false in compact, true otherwise, at every size).
- **The calendar stays wholly inside the column.** Folding the line raised the answers, and the calendar (338px, opening above them) then crossed the column's top by 20–24px at 1280 and 1366, onto the desk's navy bar. It now comes down just enough to sit 8px inside (`calendarShift`); where it fits, nothing moves. Measured: top 259 against the column's 250 in compact; 1512 and 1920 unmoved.

**Measured, every state, all four sizes.** Column scroll is 0 everywhere (1280: 451/451; 1366: 419/419); the calendar is inside the column; no label overlaps another label or a point. **1512 and 1920 are pixel-identical to before** in all ten shots, from y = 42 down.

**But two new checks found hidden text, which my earlier measure did not test for:**

| | Compact (1280, 1366) | 1512 (not compact) | 1920 |
|---|---|---|---|
| Timeline labels inside the card | the lower labels' second line cut by **5px** at the card's bottom; "Next reminder" **13px** into the band | "Next reminder" **7px** into the band (since Phase 2's narrow rule, 32px band to line; present in the before shots) | clean |
| Answers' text | every answer cut: at 1366 "Yesterday", "Another day" and all dates except Today's title; at 1280 all six | clean | clean |

- **Why the labels clip:** a label is two lines and sits 14px off the line. It needs about 39px above the line and 45px below; compact gives 26px and 28px (Nick's values), and 1512's narrow rule 32px above.
- **Why the answers are cut:** each answer is about 117px wide at 1366 and 92px at 1280 (three in a row under the disc); "Another day" at 16px semibold needs about 108px with its icon and padding.

Not committed past this point, and not deployed.

## Follow-up 2 (Nick chose compact on short screens, step 1's how-to folded) — STOPPED: 1366×768 is 9px short

**Built:**
- A height hook on the desk (`useCompact`) sets `data-compact` when the questions column's room (its height less its padding) is under the desk's natural height at its current width. The natural height is read with the flag off and the flag set in the same task, before paint, so the desk never shows a frame in the wrong mode. Never the viewport. Rule: `needsCompact` in `lib/todoNudgeDesk.ts`.
- **Compact:**
  - context: hawk 36px, headline 20px, the quiet line hidden;
  - timeline band 32px tall, 26px band to line, 28px under the line (labels unchanged);
  - steps rows 12px 18px;
  - answers 50px tall, icons 18px;
  - 12px between blocks;
  - step 1's how-to behind an "i" mark after the title: keyboard reachable, `aria-describedby` to the how-to line, shown as a tooltip on hover or focus.
- **A fix the first run found:** a hidden but positioned tooltip still widened the column's scroll area at 1280 (462 against 451). It now stays `display: none` until shown.

**Measured** (`todoNudgeDesk.measure.ts`, every state; the fit check is soft, so a shortfall is measured in full). Figures are column scrollHeight / clientHeight:

| State | 1280×800 | 1366×768 | 1512×900 | 1920×1080 |
|---|---|---|---|---|
| On open | 451 / 451 ✓ (compact) | 419 / 419 ✓ (compact) | fits (not compact) | fits (not compact) |
| Step 1 confirmed | ✓ | ✓ | ✓ | ✓ |
| Today picked | ✓ | **428 / 419 — 9px over** | ✓ | ✓ |
| Calendar open (inside the column) | ✓, inside | **9px over**, inside | ✓, inside | ✓, inside |
| Another day picked | ✓ | **9px over** | ✓ | ✓ |
| Label overlaps | none | none | none | none |

- **The 9px at 1366** is the line step 2 gains once a day is picked ("You nudged Tom today. Next reminder 28 Dec."). The desk then needs 429px (desk 409 + padding 20) against 419. As instructed, nothing was shrunk further.
- **The how-to tooltip** shows on hover, wholly inside the column (1366 measured).
- **The smallest text rendered on the desk** (card preview aside) is **12.5px**, the timeline labels, unchanged as instructed. Every other text is 13px or more. The app's secondary size (`--sp-sec-size`) is 14px, so the timeline labels sit below it, as they did in v1.
- **1512 and 1920 are pixel-identical to before** (`before/`, from 197b4d939) in all five states at each size, from y = 42 down. The beta banner's line of text above that (y 14–26) differed between runs at 1512, with nothing of this change in it: every differing pixel sat in that row, and 1920 was identical including the banner.

**Follow-up, noted, not fixed:** the card preview's small text is an older problem. It renders at zoom 0.676 at 1512 (its smallest text 8.1px) and 0.857 at 1920 (10.3px), and 0.716 at 1280 and 1366.

## Follow-up (Nick chose option 1) — STOPPED again, before building: the limit at 1280 and 1366 is height, not width

Measured with the measure spec extended (the questions column's width, the card column's width, the desk's natural
height in each state, and the preview's scale), on the tree as committed:

| Size | Questions column width | Column height available | Desk's natural height |
|---|---|---|---|
| 1920×1080 | 680 | 731 | 540–553 |
| 1512×900 | **544** (the width that passes) | 551 | 474–495 |
| 1366×768 | 444 | **419** | 515 on open |
| 1280×800 | 370 | **451** | 578 on open |

- **1280×800:** at 1512's width (544px), more than the card column can give up at 1280 (390 → 300 makes the column about 460px), the desk already needs 474–495px of height. 1280×800 has 451. Narrowing the card column can't make it fit without shrinking something else.
- **1366×768:** 419px of height against at least 474px at the widest possible column. As instructed, I stopped rather than shrink further.
- **The card preview's legibility is already below the app's smallest size, and was before this work.** At 1512 it renders at zoom 0.676, its smallest text 8.1px; at 1920, 0.857 and 10.3px. A 300px card column would take it to about 0.52 and about 6px.

Nothing was built for option 1, and nothing deployed.

## False premises (named before anything else)

- **0.3a is true, with its cause found.** "Log it" sat beside Dismiss because `todoWs.css` hides the footer's spacer (`.tws-wf .tws-sp { display: none }`) and only the progress line pushes right (`em.tws-prog { margin-left: auto }`). The nudge desk has no progress line. Fixed with `margin-left: auto` on the nudge footer's primary; measured 16px from the footer's right edge (its padding) at every size.
- **0.3c, "reuse the app's month-grid calendar if one exists":** one exists, `components/todo/MonthCal.tsx`, but it doesn't suit this. It looks forward (past days disabled, Previous stopped at the current month), and it serves `DatePick` (through `DateTiles`) and the phone's snooze pop-up, both on the do-not-touch list. A new shared primitive was built (`components/shared/MonthGrid.tsx`, rules in `lib/monthGrid.ts`).
- **0.3d, "plumage tokens for rust, blush, slate":** no named tokens exist beyond the stage colour table. The desk reads `lib/stageColours`: slate is `full.edge` (segment) and `full.rim` (rings); blush and rust are `partial.edge` / `partial.bandRequested` (the hatch) and `partial.rim` (today's ring). Text accents use `--sp-rust`; navy is `--tw-navy`; the band is the query card head's colour (`stageVars`).

## Step 0 — recon

- **Disk and worktrees:**
  - At the first attempt there were 21 GB free. A full worktree took it to 18 GB, so I stopped and removed it.
  - On Nick's word, **removed `/Users/nickphysick/ScriptAlly-rsp6`** (`responses-v6-wip`) and **`/Users/nickphysick/ScriptAlly-tdf`** (`two-door-import-finish`). Both were re-confirmed clean, with no commit missing from origin and no claim, then `git worktree remove` and `git worktree prune`. Free space went to 26 GB.
  - **This worktree is sparse:** `--no-checkout`, then `sparse-checkout --no-cone` with everything except `design-refs/` and `reports/`, plus `design-refs/todo-nudge-desk-v2/`, `reports/todo-nudge-desk-v2/` and `design-refs/.refhashes.json`. **Size 111 MB; 27 GB free after creation.**
- **0.1** Pack present; checksums OK for all six files; enrolled in `.refhashes.json` by hand. The script's `--update` re-hashes every listed ref, and most aren't in a sparse tree.
- **0.2, what v1 built, file by file:**
  - `TodoWorkspace.tsx`: the way-back row, Esc, keys, the footer's Log it, the card preview mode.
  - `WsNudgeDesk.tsx`: the sentence, the clean answers, the hawk fold, the after-pick timeline and its arrival.
  - `wsFlows.tsx`: `nudgeDesk`.
  - `lib/todoNudgeDesk.ts`: words and shapes.
  - `todoNudgeDesk.css`: all of the above.
  - Specs: `todoWayBack.test.tsx`, `todoNudgeDesk.test.tsx`, `tests/e2e/todoNudgeDesk.measure.ts`.
- **0.3b** True: `saveNudgeSent` with `nudgePlan`; `then = offWeekend(addDays(sent, 28))`. Unchanged.
- **0.3c** `DatePick` is `DateTiles` on the desk and `DateStrip` off it; `MonthCal` exists, as above.

## Baseline (the sparse tree)

| Gate | Baseline | Now |
|---|---|---|
| tsc | 0 errors | 0 errors |
| build (development) | exit 0, clean | not yet re-run in full |
| Vitest | 30 files fail, all reading `design-refs/` or `reports/` files this tree doesn't carry; 13,605 passed | not yet run |

The full suite will be run in the deploy's full clean checkout, the like-for-like comparison with v1's 13,933 passed and 0 failed, once the 1280 question is settled.

## What each phase built and removed

- **Phase 1 — `e57c0595b`.**
  - **Context line:** the hawk at 50px beside "{First}'s reply is *overdue*." ("overdue" in rust), with "Send a nudge, then log it below." under it; no bubble.
  - **Steps card:**
    - Step 1: "Send {First} a nudge", the how-to line, and the app's outline button "I've sent it". Pressed, it becomes "✓ Sent" with a ticked disc; pressed again it un-confirms and clears step 2.
    - Step 2: "When did you send it?", locked at 45% until step 1 is confirmed. Three equal clean answers with plain navy outline icons; keys 1, 2, 3 while unlocked. Once picked: "You nudged {First} {day}. Next reminder {date}."
  - **Flow:** step 1 is the questions' own `sent` answer and a pick fills their `date`, so the save is unchanged. Log it sits on the right, disabled until both steps are done. The card preview types until then.
  - **Removed:** v1's sentence and blank, the bubble and its fold, the after-pick timeline placement and arrival, the quiet line, their CSS, and v1's hawk speech line (`nudgeHawkLine`).
- **Phase 2 — `ddaa112e5`.** The banded card, from the moment the task opens: "{First}'s timeline", then "{First}'s updated timeline".
  - **Scale:** from the last send to the next reminder plus 6 days. Before a pick it runs to the reminder a nudge today would set, so nothing jumps on a pick.
  - **Line:** solid slate to the expected date; the overdue hatch to today or the nudge with "No reply for {ago}" in rust; today ringed in rust before a pick; after it, a navy "You nudged", a dashed navy run, and "Next reminder / {date}".
  - **Animation:** only the new parts, keyed by the day; the card itself never replays.
- **Phase 3 — `7bfb5e739`.** `MonthGrid` (shared). "Another day" opens it as a popover above the answers, right-aligned, over the layout.
  - **Limits:** the arrows stop at the send's month and this month; days after today and before the send are disabled and refused.
  - **Today's ring:** rust.
  - **Closing:** a pick closes it and sets the answer; a click outside, or Esc (its own layer, `ESC_LEVEL.page`), closes it and changes nothing.
- **Phase 4 — `782ec0742`.** The v2 measure, and the 1512 fix (a narrow-column rule at ≤600px). 1280 is the stop above.

## Locks and red-before proofs

| Mutation | Red |
|---|---|
| G1 step 2 not locked before step 1 | 1 failed |
| G2 un-confirming keeps step 2's answer | **first green — the lock was too weak** (`toEqual` treats undefined keys as absent); tightened to `toStrictEqual` plus a key check, then 1 failed |
| G3 a day counts without step 1 | 1 failed |
| G4 Log it enabled before both steps | 2 failed |
| C1 future days pickable | 3 failed |
| C2 days before the send pickable | 2 failed |
| C3 the calendar's click guard removed | 1 failed |
| C4 the popover has no Esc layer of its own | 1 failed |
| C5 the arrows run past the limits | 2 failed |

Specs: `todoNudgeDesk.test.tsx` (re-pointed to v2, 18 cases) and `components/shared/monthGrid.test.tsx` (5).

## Measurements so far (`tests/e2e/todoNudgeDesk.measure.ts`, emulator; nothing logged)

| State | 1280 | 1512 | 1920 |
|---|---|---|---|
| On open (column scroll / client) | **577 / 451 ✗** | 551 / 551 | 731 / 731 |
| Step 1 confirmed | not reached | fits | fits |
| Today picked | not reached | fits | fits |
| Calendar open (popover inside the column) | not reached | fits, inside | fits, inside |
| Another day picked | not reached | fits | fits |
| Log it from the footer's right edge | 16px (its padding) | 16px | 16px |
| Label overlaps | none | none | none |

The arrival measures (`todoArrival.measure.ts`) still pass at all three sizes. Screenshots are in `shots/` (`open-*`, `sent-*`, `today-*`, `calendar-*`, `another-day-*`, and frames at 0.1s, 0.5s and 1.0s at 1512).

## Where MonthGrid could replace the slider next (not changed)

These are the past-date questions that use `DateStrip` / `DateTiles` today:
- the send and R&R date on the phone ("When did it go?");
- Record a response's "When did they reply?";
- Close's "When?";
- the offer's "When?";
- Gone quiet's nudge path.

The snooze pop-up's `MonthCal` looks forward and could become `MonthGrid` with `min` = today.

## Copy written here

- "Pick the day" under "Another day" before a day is chosen (as v1).
- The timeline's first point says what started the wait: "Queried", "Partial sent" or "Full sent" (as v1).

## Not done (waiting on the 1280 decision)

- The 1280 fit.
- The full suite (in a full checkout).
- The dev deploy.
- Removing this worktree.
