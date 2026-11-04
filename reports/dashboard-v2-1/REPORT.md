# Dashboard v2.1 — report

Branch `dashboard-v2-1`, cut from the branch dev served on 4 Nov (`dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41`
at `99e2ef45`, which carries Dashboard v2). Ref `design-refs/dashboard-v2-1/` (nine files, every SHA256 matched, enrolled
in `design-refs/.refhashes.json`). NOT merged to main.

## False premises

1. **"weeks querying" as v2 counted it is "whole weeks since the first query was sent".** It is not (Step 0.2, red):
   v2's `weeksQuerying` counted the ISO weeks a campaign spans, this week included, with a floor of 1, so a query sent
   on a Sunday read "2 weeks" on the Monday. The tag uses a new `wholeWeeksQuerying` (whole weeks since the manuscript's
   first send, by calendar day). **Consequence for Nick:** in the first six days after the first send the tag reads
   "0 weeks querying". The brief hides the tag only before the first send, so it shows; say if week one should read
   differently.
2. **"Big events are requests, offers and a full going out."** v2's big cards are also a partial going out, a
   revise-and-resubmit request and a signing (`bigKind`: request · offer · sent). All of them follow the same rule.
3. **"Thanks, noted" is an outcome the record has.** It is not. A note's outcome is `OUTCOME`'s: Read, Planned, Now in
   the app, Fixed, or Sent (no status yet). Nothing was invented: the chip shows the record's word. "Now in the app" and
   "Fixed" are on the brief's green (`#e4ece4`); the others are on a neutral sand, which the brief does not specify.
4. **"{n} more notes and you become a {rank}."** Archivist takes "an" (`article`, as `nextStep` already does), and a
   small count is a word ("Two more notes"), as the app writes it elsewhere and as the brief's own "One more note" does.
5. **"The event's own tint (`--t`)".** v2 has two tints, request `#e2e7ef` and offer `#f6ecd6`; a send has none (the card's
   `#fdfaf5`). The mock's sent tint `#f4ead9` is not in the app, so a collapsed send row is near-white. v2 wins.
6. **The mock's column widths.** The app's sidebar is 248px where the mock's rail is 68, so the middle column is ~390px
   at 1512 and ~300 at 1280. The founding hero's text column cannot hold the road there. Below 520px of card the road takes
   the hero's full width under the badge and text; below 330px the three pills keep their words and drop their icons.
7. **The mock's line is a curve.** It draws a bezier; v2's line is straight segments and v2 wins on the line. The dots sit
   on it (measured within 0.01px).
8. **"Remove v2's vertical road."** v2's road was horizontal (six steps with names and counts under them). It is gone,
   with "Tell us something" and "Your notes", as asked.
9. **The founding card stretches.** v2's rule (the card fills the middle column so the feed ends level with it) is
   unchanged, so where the left column is taller than the middle, the founding card has space between its last note and
   its foot. The mock's left column is shorter, so it shows none.

## Step 0

1. **Base:** dev served `index-CpIAV0Ww.js` from `…-tl1-pk41` at `99e2ef45` (memory and the served hash agree). It carries
   Dashboard v2 (`src/components/dashboard/v2/*`). Worktree `../ScriptAlly-db21`, branch `dashboard-v2-1`.
2. **"Weeks querying":** `lib/dash2.weeksQuerying`, ISO weeks spanned, floor 1. **Red** (see false premise 1); the tag uses
   the first-query rule, `wholeWeeksQuerying`.
3. **"Needs you":** Next up's plan is `dashList` (`assembleBoardColumns` → `todoRows` → `taskCategory`); its "Agents are
   waiting" group (`req`) is the board's `partial_requested`, `full_requested`, `revise_resubmit`, `offer_received`,
   `offer_tell` and `offer_send_full` cards. `needsYouIds(plan)` (new, `lib/dashList`) reads the query of each `req` item
   from the plan itself. **One consequence:** a request the writer has snoozed is not in Next up, so its feed event
   collapses too (offers are never hidden by a snooze).
4. **Founding data:** `useFoundingStats` (`foundingStats/{uid}`; tier, contributions, founding number), the server's
   `TIERS` for each rank's notes, `useLatestNote` (`betaFeedback where uid == me`) for the last note and its outcome, and
   v105's art and How it works dialog. All reused.

## Commits

| Part | Commit | What |
|---|---|---|
| A | `d526a4cc` | the weeks-querying tag; refs enrolled |
| B | `d33eb90c` | Active queries is the chart only: dots, today's circle, 1.35 headroom |
| C | `2a7d9ff2` | the founding writer card in the card frame |
| D | `b3bcf5bb` | the feed opens only what needs you |
| E | (this commit) | the DB21 locks, the re-pointed v2 assertions, CLAUDE.md, this report |

## Locks (DB21)

Every lock was measured on the rendered page, on the emulator (`npm run e2e:emu`), at 1512 × 982 and 1280 × 800, each
asserting its population before its claim. `tests/e2e/dashV21.measure.ts`; readings in `ledger/`.

**Red first, on the base build** (`99e2ef45`, before Part A): 7 failed, 2 did not run, 1 passed — A, B and C red at both
sizes (no tag; tiles drawn and a 250px plot; no badge, ring or road), D red at 1512 (no collapsed row anywhere in the
feed), D's second size and "logged" not reached.

**Green on this branch:** all 10 tests, 0 failed readings.

| Lock | Green reading (1512 · 1280) | Named mutation | Red reading under it |
|---|---|---|---|
| A1 | "132 weeks querying" = the derivation; 12.0px above the title; rgb(217,150,122), mono 12px uppercase; none on the manuscript with no sends | show it under the title | tag bottom 260.8, title top 155.8 (gap −105.1), both sizes |
| B1 | no "waiting on you", "have replied" or "weeks querying" in the card | keep the tiles | all three phrases found, both sizes |
| B2 | 12 · 9 weeks, each the derivation's total; dots 9px, today 36 × 36 navy holding 39; centres on the line within 0.03px; highest point 86px (30.7%) below the plot's top | scale to max (`HEADROOM` 1) | highest point 30px (10.7%), both sizes |
| B3 | every dot and today’s circle shows its own week on hover (12 · 9 weeks) | the brief names none | **not red on the base build**: v2 already showed the breakdown on hover; B3 holds that the new dots keep it |
| C1 | at Egg / Fledgling / Archivist / QueryHawk: arc 0 / 66.7 / 75 / 100% of the ring = notes ÷ needed; rank, article and next rank from the data; "hatch into" at Egg only; Like opens FeedbackDock with "Something I liked"; no note → "Your first note counts towards {next}." and no chip | hard-code "Fledgling" | Fledgling and Archivist read "…become an Fledgling" / "…a Fledgling", both sizes |
| D1 | the full request and the unanswered offer render as full cards; the full already sent is a collapsed `<button aria-expanded="false">` reading "Ingrid Marsh · Marsh & Weir"; clicking opens it with a "Collapse" fold (`aria-expanded="true"`), the feed's scroll unchanged (478 → 478; 368 → 368) and the card exactly where the row was; focus moves to the fold, then back to the row; logging the full as sent collapses the request | open every big event | the full already sent renders as a full card, no collapsed row |

D's fixture is three queries (`db21-q-req`, `db21-q-offer`, `db21-q-sent`) with their activities, written to the
emulator at the start of the describe and removed at its end; the emulator imports its snapshot fresh each run, so
nothing reaches any real project.

**One harness fix on the way:** under the D1 mutation the case first CRASHED (`null.getBoundingClientRect`) instead of
failing, because it went on to scroll to a row that did not exist. It now stops with its readings when there is no
collapsed row, so the mutation reports what was wrong.

**B2's mutation is a source edit**, so its readings were written over B's own; they are kept as `B-*.mut-B2.json` and B
was run again clean.

## L1 · earlier suites

_pending_

## Shots

_pending_

## Integration and dev

_pending_
