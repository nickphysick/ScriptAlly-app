# To-do nudge desk v1 — report

Branch `todo-nudge-desk-v1`, cut from `dev/bew33-clr13-qc1722-pqs1-qc1723-bfl1-nav1-qc1724-ta1-pol1` @ `886b8ae2f`. That is the newest dev line containing To-do arrival v1 (`89f663175`); it is arrival v1's deploy line (`…-ta1`) with Birds-eye polish v1 on top. Dev served `index-CdU0zGaB.js` at Step 0. Ref: `design-refs/todo-nudge-desk-v1/` (sha256 verified; `todo-nudge-desk-v1.html` = `b8f4959b…df06c8b`). Desktop only.

## False premises (named before anything else)

- **0.2b, "a three-point timeline":** false. The nudge's check step has **two** points (`nudgeFlow.timeline`: the nudge logged on its day, and "If {First} still hasn't replied, I'll suggest closing it" on the close-it day). The check step draws at most three, but the nudge gives it two. The rest of 0.2b is true: `nudgeParts(ctx, false)` gives "Have you sent the nudge?" (one tick tile, "Yes, I nudged {First}") and `dateQ` "When did you send it?"; on the desk that question draws as `DateTiles` (Today / Yesterday / Older + month). The save is `saveNudgeSent` with `nudgePlan`; `then = offWeekend(addDays(sent, NUDGE_THEN_DAYS))`, 28 days.
- **"Another day" / "Pick on the slider":** the app's own `DatePick` is not a slider. On the desk it is `DateTiles` (which would repeat Today and Yesterday); off the desk it is `DateStrip` (six days and a month). The desk uses the strip, so the sub-line says **"Pick the day"**, not "Pick on the slider" (see Copy).
- **"a 36px disc" for the way back:** the tray's own glyph column is 32px since v58.2 (`todoWs58.css`: `.tws .tws-ti .tws-av { width: 32px; height: 32px }`). The row uses the tray's own anatomy, so its disc is 32px.

## Step 0 — recon

- Disk 34 GB free. Worktrees before mine: the primary plus four (`-live`, `-pol11` live, `-rsp6`, `-tdf`).
- 0.1 Pack present (`~/Downloads/todo-nudge-desk-v1-pack.zip`), `shasum -a 256 -c` OK for all six; enrolled in `.refhashes.json`.
- 0.2a True: after arrival v1, once a task is open, only leaving the page (or a book switch) brings back "Where to start".
- 0.2c True: `.tws-mnote` with `mentorLine(t, facts)`, the stage colour via `stageVars` (`data-tws58-stage`).
- 0.2d The agent's reply time is `Agent.responseTimeWeeks`. The expected date is the Query Centre's `expectedFor(q, agent)` (`lib/qcSummary.ts`). A query uses the agent's weeks; a partial or full sent uses the house windows (`STAGE_RESPONSE_WINDOWS`: 12 and 12). With no weeks stored, `resolveExpectedDate` has only a writer's own date or a reply statement to go on; otherwise nothing is stored. The desk treats "no weeks" as no reply time: no "weeks up" point, no hatch, and the hawk's second template.
- 0.2e True: Gone quiet's "Nudge them once more" calls `nudgeParts(ctx, true)` (with the copy draft). Unchanged; it gets no `nudgeDesk`.
- 0.2f `cardMode` was "typing" while `flow.commit && cur < qs.length` and "future" on the check step when `draft.ghost` exists. The nudge desk now reads its own pick: typing until a day is picked, then future.
- 0.3 What arrival v1 left on this line: the run-through on the desk column's ground (piles, waiting line, lighting); the tray with the tucked figure; journey tasks' steps ahead; the visit's in-memory task; and the load outline in the run-through's shape.

## Baseline vs final

| Gate | Baseline | Final |
|---|---|---|
| tsc (8 GB heap) | 0 errors | 0 errors |
| `vite build --mode development` | exit 0, no error/warning lines | exit 0, no error/warning lines |
| Vitest | 983 files, 13,910 passed, 4 skipped, 0 failed | 985 files, 13,933 passed, 4 skipped, 0 failed (+23 new) |

The first full run had **1 failure**, caused by this work: `src/lib/dates.test.ts` allows only one month table, and `lib/todoNudgeDesk.ts` had added a second. It now reads `MONTHS_SHORT` from `lib/dates` (`ec6e9c1f7`), and the full suite was run once more: green.

## What each phase built

- **Phase 1 — `b6ea123cc` — the way back.** A "Where to start" row pinned above the first group, in the tray's own row (`.tws-ti`): an overview disc (four squares, navy, on the slate tint `#e9edf2`), "Where to start" / "Your day at a glance", and an Esc key mark. It shows only while "Where to start" exists (`wayBackShown`: anything not housekeeping). While "Where to start" shows, it wears the open look (`aria-current`) and no task row does. Click, Enter or Esc from an open task calls `go(null)`, so the task closes and arrival v1's visit memory follows. Esc is checked after the page's existing guard (a text field, the escape stack's pops, menus and journeys), and never in a dialog (`modalOpen`), the new-task form, or mid-stamp (`escGoesBack`). Nothing is added to the desk's navy bar.
- **Phase 2 — `24f8de293` — one sentence, clean answers.** `nudgeFlow` gains `nudgeDesk` (the facts, the day picked, the save's own close-it date, and `pick`). A pick fills the same answers the two questions filled (`sent`, `date`), so `sent`, `then` and the commit are unchanged. The phone reads `questions` as before. `WsNudgeDesk` draws:
  - the hawk with the new line;
  - "I nudged {First} ___." at 24px in the typewriter face; the blank is a 120px rule, replaced once a day is picked by the day word in navy with a 2px underline, then a full stop;
  - three clean answers with their days and keys 1, 2, 3; "Another day" opens `DatePick` (past);
  - once a day is picked, the quiet line under the answers.

  The footer keeps Snooze and Dismiss, and Log it stays disabled until a day is picked. There is no rail, no Next, no step numbers and no check step. The card preview shows typing dots until a day is picked, then the future "You nudged" event, dated to that day.
- **Phase 3 — `8b2b6ee50` — the hawk folds away.** It folds on the first pick: 0.34s, cubic-bezier(.4,0,.2,1). It fades and lifts 6px over the first 45%, then its own measured height (`--twn-h`) and bottom margin close to 0. It stays gone while the task is open; the desk is keyed by the task, so the hawk is back when the task is opened again. With reduced motion it is simply not drawn once a day is picked.
- **Phase 4 — `3411c8bc1` — the updated timeline, on a banded card.**
  - **Placement:** nothing until a day is picked; then the card is centred both ways in the room above the footer.
  - **Card:** 90% wide, white, the desk hairline and a soft shadow, radius 14. Its band is in the query's stage colour (`stageVars`, the card head's own), titled "{First}'s updated timeline", with 48px between the band and the line.
  - **Line:** to scale from the last send to the close-it date plus 6 days. Solid to the expected date, hatched to the nudge day, dashed in navy-slate to the close-it date, with the points and labels as briefed.
  - **Arrival:** the brief's timings exactly. It is held as state for 1.8s, so a re-render can't cut it short, and it plays once per opening. A later change of day moves the marker and the dashed run in 0.45s.
- **Phase 5 — `3d789c1b9` (+ `ec6e9c1f7`) — measured, two fixes, recorded.** See Measurements.

## Locks and red-before proofs

Each logic lock was proved red by mutating the code in this worktree, running the spec, and restoring the file from a scratch backup:

| Mutation | Red |
|---|---|
| R1 the row shows with only housekeeping | 1 failed (absent with only housekeeping) |
| R2 Esc acts on "Where to start" too | 1 failed (Esc rule) |
| R3 the row never wears the open look | 1 failed (open look while Where to start shows) |
| R4 Esc asked before the text-field / pop guard | 1 failed (guard order) |
| R5 going back leaves the task open | 1 failed (goBack is go(null)) |
| N1 Log it enabled before a day is picked | 2 failed (rendered footer; source) |
| N2 a pick fills the day but not the save's `sent` answer | 1 failed |
| N3 "Another day" counts as picked before its day | 1 failed |

New specs:
- `todoWayBack.test.tsx` (7)
- `todoNudgeDesk.test.tsx` (16): the rendered desk, the flow's pick and Log it, the words, the fold, the timeline's geometry and timings

Re-pointed, each marked:
- `todoArrival.test.tsx` and `todoWorkspaceSmoke.test.tsx`: "Where to start" is now also the row's words, so they assert the desk and task rows
- `todoArrivalSteps.test.tsx` and `tests/e2e/todoArrival.measure.ts`: a nudge's footer has Log it where Next was

## Measurements (rendered page, emulator, `tests/e2e/todoNudgeDesk.measure.ts`)

The harness's first nudge is Tom (Curtis Vane). Queried 1 Sep, eight weeks were up on 27 Oct, nudged today, close-it date 28 Dec. Only answers were clicked and Log it was never pressed, so nothing was logged. Final run: **5 passed**. The arrival measures were also re-run with the re-pointed footer: 6 passed.

| | 1280×800 | 1512×900 | 1920×1080 |
|---|---|---|---|
| Questions column with the card (scrollHeight / clientHeight) | 451 / 451 | 551 / 551 | 731 / 731 |
| Card centred in its room (dy, dx) | 0, 0 | 0, 0 | 0, 0 |
| Room above / below the card | 30 / 22 | 99 / 91 | 189 / 181 |
| Label × label and label × point overlaps | none | none | none |
| Hawk height after the fold | 0 | 0 | 0 |
| Before a pick: Log it disabled, hawk drawn, sentence | yes, yes, "I nudged Tom ___" | same | same |
| "Another day": picker open, sentence still blank, Log it disabled | yes | yes | yes |
| After "1": the sentence, the quiet line | "I nudged Tom today." / "It goes on Tom's card and this task leaves your list." | same | same |
| Where to start: row open, no task row open; Esc from a task back to it | yes; yes | yes; yes | yes; yes |

- **Layout shifts after the pick:** 7–8 entries per size, each at most 0.0023. All fall inside the input window (`hadRecentInput`), and their sources are only the sentence, the answers, the quiet line and the card's room. That is the fold and the card's arrival; nothing outside them moves.
- **Frames at 1512:** taken 285, 693, 1081 and 1680ms after the click, roughly 80ms behind the 0.2s / 0.6s / 1.0s / 1.6s targets (Playwright's screenshot time).
- **First run's findings, fixed in `3d789c1b9`:**
  - At 1280 the questions column is about 314px wide, so the answers take two rows, and the column scrolled 52px with the card shown. In a column of 480px or less, the desk's own spacing now tightens; the card keeps its 28/20px room, and wider columns keep the ref's spacing.
  - At 1280 and 1512, labels in one row collided when dates sat close together. A layout pass now slides them apart along their row; the points never move.
- **Screenshots** (`shots/`): `desk-before-*`, `desk-after-*` (settled), `another-day-*` (the picker open), `tray-start-*` (Where to start open), `tray-task-*` (a task open), `frame-{0200,0600,1000,1600}ms-1512`.

## Copy written here for Nick's ruling

- **Hawk, a partial or full sent** (these read the house window, not the agency's): "The {12} weeks for your {partial/full} were up on {date}, and {First} hasn't replied. Once you've nudged {First}, tell me when and I'll log it."
- **Hawk, a partial or full sent with no expected date:** "{First} hasn't replied since you sent your {partial/full} on {date}. …"
- **"Another day" sub-line:** "Pick the day" until a day is picked, then that day ("Wed 25 Nov"). The ref's "Pick on the slider" names a control the app doesn't have.
- **The timeline's first point** says what started the wait: "Queried", or "Partial sent" / "Full sent".
- **No agency stored:** the hawk uses the agent's full name (`agencyOr`).

## Other desk questions that could take the clean answers next (not changed)

- Send / R&R on the phone (desktop uses the journey): "When did it go?" (`dateQ`).
- Gone quiet: "What would you like to do?" (four tiles), then its date questions.
- Record a response on the phone: "When did they reply?" (`dateQ`) and "What did they say?" (tiles).
- Close: "Why?" (tiles) and "When?" (`dateQ`).
- Offer on the phone: the decision tiles and "When?".
- Housekeeping, reply time: the weeks tiles.
- The new-task form's "When's it due?" (Today / Tomorrow / Next week / A date…).

## Left undone, named

- **Older e2e measures:** they drive the nudge's old two questions (`todoV53`, `todoWs`, `todoV55` and the v52–v58 family, where they open a nudge and answer "Have you sent the nudge?"). They were not re-pointed or run. They would need to press an answer, and then Log it, rather than tick a tile and press Next.
- **"Another day" shows its default:** the strip opens with two days ago highlighted while the sentence stays blank until a day is pressed. The ref's slider does the same (a default shown, not yet picked).
- **Hawk with a writer-set date but no weeks:** when the agent has no reply time stored but the writer set their own expected date, the desk still treats it as "no reply time" (the second template, no hatch). The brief keys on the stored reply time.
- **The desktop's old check step** (its timeline and placeholder art) is no longer drawn for a nudge. The flow keeps `timeline` because the phone builds the same flow.

## Dev deploy

- **Dev's source proven:** dev served `index-CdU0zGaB.js` at Step 0. A clean detached checkout of `886b8ae2f` (`…-ta1-pol1`), built with `npm run build:dev`, gives `index-CdU0zGaB.js`, the same bundle.
- **Branch:** `dev/bew33-clr13-qc1722-pqs1-qc1723-bfl1-nav1-qc1724-ta1-pol1-tnd1` = `todo-nudge-desk-v1` @ `0a139e30c` (the dev line plus this work, so no merge was needed).
- **Build:** `npm run build:dev` from a clean detached checkout of that pushed tip gives `index-D6G10n1T.js`, with no error or warning lines.
- **Guard:** the deploy ran only because dev still served `index-CdU0zGaB.js` at that moment. The first attempt stopped before building: zsh read `$TIP:r…` as a modifier and mangled the refspec, so the push check failed. Nothing deployed on that attempt.
- **Dev now serves `index-D6G10n1T.js`** (https://scriptally-dev.web.app), checked after the deploy.

Nothing went to main or prod.

## Worktree

`/Users/nickphysick/ScriptAlly-tnd1` (branch `todo-nudge-desk-v1`) was removed after the push and its claim released, along with the scratchpad checkouts used for the proof and the deploy. Its `node_modules`, `functions/node_modules` and `.env.local` were symlinks to the primary checkout's: never copied, never committed.
