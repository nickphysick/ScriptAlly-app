# Query panel v2 — the rulings of 12 Oct

On `query-panel-v2`, one commit each. Ruling 3 was held in the first pass, built in the second apart from
"Set a send-by date", and finished in the third. See "Third pass" at the foot.

## False premises

1. **QC137 C4 (ruling 5): nothing in the row wrapped, and v1 changed nothing in it.** The stage line is
   `nowrap` at 1280 and every row is 73 tall on main, on v1 and here. C4 rounded each child's centre and counted
   the distinct values; near a half pixel the dot, the word and the stamp rounded apart and one line read as
   two. It came and went with how many rows sat above on the shared account, and was green again on the same
   builds it had failed on. The fix is in the lock. The row is untouched.
2. **The correction-desk suites (ruling 7) were red before the panel existed.** All five are in the red
   backlog. Three measure desks that no longer open at all.
3. **"Keep tracking", "Remind me later" and "Set send date" were never on the v1 panel.** My first report listed
   them as removed by the stand card. Only "Set a date" was wired there. The other three lived in the old
   three-column pane, which nothing renders.

## What landed

| Ruling | Commit | Result |
| --- | --- | --- |
| 1 · "No word from {first} yet" | `6fa530ee` | Heading "No word from {first} yet", figure "{n} days past your date". Also changed: two lines of the nudge journey's "when you save" list said "overdue"; they say "past its date". **Kept:** "Record a late reply" and the response journey's "LATE REPLY" note, the action you ruled stays in v1. Say if those should change too |
| 2 · the real italic | `9b599182` | Loaded by the app alone (`lib/appItalic`), when the workspace mounts. No public page loads it; `index.html` is unchanged. One variable file covers 400 and 600: the Latin one is 130KB, fetched on first use. Lock V11 |
| 4 · the stepper | `edcc9e20` | In the panel: numbered circles, the current step's name alone, on one line. Every step carries its name as `aria-label` and `title`. Lock V12 |
| 5 · QC137 C4 | `273d4b56` | The lock asks whether the centres agree within 6px. Still red under its own mutation ("4 lines", rows 96 to 172 tall) |
| 6 · P3 | `0e793bc8` | `clickRow` waits for the panel to carry the clicked row's id. **5 runs, 5 greens** |
| 7 · desk suites | `15e2c5e2` | `qcMove` re-pointed: 3 of 3 pass against the panel. See below for the other four |

### New locks

| Lock | Green | Mutation | Red |
| --- | --- | --- | --- |
| V11 italics | the stand card's italic span computes Source Serif 4 italic; 1 or more italic faces of that family are loaded | the italic's stylesheet refused on the network | "0 of 0 italic face(s) loaded · 2 upright loaded" |
| V12 stepper | at 1512 and 1280, across every reachable step of every footer action and the correction: one name drawn, one line, inside the panel; every step named | every name drawn and allowed to wrap | "names drawn: The response \| Check and save"; "Check and save" 2 lines |
| V5 (extended) | no "late" or "overdue" in the panel's text, on every query opened | covered by the unit sweep over every state | |

### Ruling 7 in full

- **`qcMove`** (move an entry to another query, from the fork): its route went through an Edit / Delete menu
  that was retired when the dots began opening the fork directly. Re-pointed at the panel's ledger. 3 of 3 pass.
- **`moveEntry`**: the same claim as `qcMove`'s first case, entered through the old three-column list
  (`.f12-row`). Not re-pointed; `qcMove` covers it. I suggest retiring it.
- **`deskBounds`, `deskPaint`, `drawer3`**: they press "Record response", "Mark sent" and "Nudge" and wait for a
  desk beside the query. Those three desks stopped opening on 27 Sep, when the action drawer went live, so
  there is nothing of theirs to point at the panel. `drawer3` §1 measures the old drawer's stage block.
  Not changed. I suggest retiring all three.
- **No real failure of the panel** came out of the five.

**A side effect to know about.** Running `qcMove` re-seeds the correction fixture, which dates its queries from
today. That moved rows other locks had captured: V10's history month, and feed drawer B6's baseline (one more
reply and one more day in its window). V10 now treats a history row's month as a month; B6's baseline is
re-captured against the v1 build (`833986dc`). B6 will drift again whenever `qcMove` runs on a later day.

## The three added states

| State | Heading | Figure | Paragraph | Shot |
| --- | --- | --- | --- | --- |
| With the agent, no reply date recorded | Waiting on {first} | none | No reply date is recorded for this query. | `shots/state-no-reply-date-1512.png` |
| Withdrawn | You withdrew it | the date it closed | This query is closed. It stays here, and in your figures. | `shots/state-withdrawn-1512.png` |
| Signed | You signed with {first} | the date | This query is closed. It stays here, and in your figures. | `shots/state-signed-1512.png` |

"This query is closed" reads oddly on a signed query. Say what you would rather it said.

## Ruling 3: what each control did, and why I stopped

| Control | Where it showed | What it did |
| --- | --- | --- |
| **Set a date** | With the agent, when the agency states no reply window | Opened a weeks slider in place (default 6, up to 16) and wrote your own expected-reply date on the query, with an Undo toast. Wired on the v1 panel |
| **Set send date** | With the agent, a window stated, but **no date recorded for when you sent it** ("No send date recorded, so this window can't be measured") | Opened the editor for the query's **sent** date. Old three-column pane only |
| **Keep tracking** | On the "consider closing" offer (silence means no and the window has passed, or nudges unanswered) | Wrote `closureOfferDismissed` on the query and said "Still tracking this query". Its whole effect was to hide that offer from then on. Old pane only |
| **Remind me later** | On the "what next" offer (past the window, no nudge lately, no reminder set) | Added a to-do "Nudge {agent}" for two weeks' time and said so. The offer then hid while the reminder stood. Old pane only |

- **Set a date** matches the ruling.
- **Set send date does not.** The ruling places it on "a request with no send-by date". It never set a send-by
  date: it set the date the query was **sent**, for a query with the agent. Do you want (a) the old control,
  on a query with the agent and no sent date, or (b) a new control that sets the send-by date on a request?
- **Keep tracking does not fit as it stands.** It dismissed an offer the panel no longer draws. On the
  over-a-year card, what should pressing it change: hide the "Closing it keeps your reply rate honest" sentence
  and these links for good, and stop Close being the primary button?
- **Remind me later** fits. I would hide the link while a reminder stands, so it cannot add two.

## Deploy

Dev had moved a third time: the Comparable titles v26.1 session deployed `dev/…-comps26-1` at `858aa4c0`
(`index-D2MP5Ba8.js`), which was not built on my last integration, so **Query panel v2 was off dev from about
15:34**. I merged onto that as **`dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2`**, now at **`5f9a1292`**, and
deployed it. **Dev serves `index-Qpey2I_I.js`.**

On that build: tsc and both builds clean; Vitest 8,685 passed, 3 skipped, the same one file failing to load.
QP2 V1 to V12 pass; QP1 11 pass; QC137 13 pass (C4 included); feed drawer v2 4 pass; the journeys 3 pass;
delete entry 8 pass; `qcMove` 3 pass. In the first full run V10, B6 and QP1 P7 were red for the shared-account
reasons above (P7 was one 10-minute click wait; it passed alone); all three passed after the fixes.

The next session to deploy to dev should base its integration on that branch.

## Ruling 3, as decided (12 Oct, second pass)

### Stopped: "Set a send-by date"

No journey can set a request's send-by date today without a new write, so I stopped as instructed.

- The "When you'll send it by" chips exist only inside **recording a new response**. That journey always writes
  a response entry and a status with the date; it has no path that writes the date alone.
- The **edit** journey edits an entry's date, its note and what was sent. It does not carry the send-by date.
- The two fields (`expectedSendDate`, `sendReminderDate`) are already in the rules' allowlist, so no rules
  change is needed either way.

Two ways to build it. Say which:

1. **A step on the edit journey**, for a request entry: the same chips, in the panel's act look, saving only the
   two fields. One new write, in the journey that already edits a request.
2. **A mode of the response journey** that opens at that one step and saves only the two fields. Same chips,
   same write, but the journey that records responses would gain a path that records none.

I would take 1. Lock V13 covers four links until this is decided.

### Built

| Item | Commit | Result |
| --- | --- | --- |
| The links | `7f30dfb8` | Quiet links under the stand card's paragraph: Source Serif 15, navy, an underline rule |
| Signed copy | `c7428836` | "{first} is your agent for *{title}*. This query stays here, and in your figures." With no title recorded: "{first} is your agent. This query stays here, and in your figures." |
| Retirements | `05f6ba00` | `deskBounds`, `deskPaint`, `drawer3`, `moveEntry`: skipped in place with the reason, listed in `tests/e2e/RETIRED-query-panel-v2.md` |
| qcMove's date | `de8bd3c5` | See below: the day is 7 Oct, not 11 Oct |
| Lock V13 | `d4bc0c54` | 52 of 52 green; red under two mutations |

Each link, and where it shows:

| Link | Shows when | Does |
| --- | --- | --- |
| Add the date you sent it | With the agent, no sent date | Opens the page's sent-date editor, anchored to the link |
| Set a date | With the agent, sent, no reply date to count towards | Opens the weeks slider in the card; Save writes your expected-reply date, with Undo |
| Remind me later | Over 365 days waiting, closing still suggested, no open "Nudge {agent}" to-do for the query | Adds that to-do for two weeks' time |
| Keep tracking | Over 365 days waiting, closing still suggested | Sets `closureOfferDismissed`. The closing sentence and both links go; Record a response leads the footer |
| Suggest closing again (⋯ menu) | The flag is set, query with the agent | Clears the flag |

Shots: `shots/links-add-sent-date.png`, `links-set-a-date.png`, `links-set-a-date-open.png`,
`links-over-a-year.png`, `links-kept-tracking.png`, `links-suggest-closing-again.png`.

Things to know:

- **The sent-date editor opened underneath the panel.** It is raised above it now. Found on the rendered page;
  V13 holds it.
- **"Keep tracking" with nothing else recorded.** If the agency states no window and no nudge went unanswered,
  the closing sentence was the card's only sentence. The card then says "You chose to keep tracking this
  query." Say if you want different words.
- **The list's tray still offers "Close" first** for such a query after Keep tracking. The list was out of
  scope; the panel's footer is what changed.
- **A reply date you set does not hide a missing sent date.** "Add the date you sent it" shows on any query
  with the agent that has no sent date.

### False premise: qcMove's date is 7 Oct, not 11 Oct

The ruling said to hold qcMove's fixture to 11 Oct 2026, "as B6". 11 Oct is the clock B6 reads the feed at. The
correction fixture both captures saw was seeded on **7 Oct**:

- B6's original baseline heads days at 27 and 17 September, the fixture's closures at 10 and 20 days.
- V10's fixture has `cor-move-a`'s send, 70 days back, in July.

Dated from 11 Oct both stayed red ("8 days vs 7"; "Aug 2026" for "Jul 2026"). Dated from 7 Oct, V10's strict
month check and B6's original baseline both pass after a qcMove run. `seedCorrection.mjs` takes `SEED_NOW`;
run by hand without it, it still dates from today.

One more cause of a red B6, now avoided: any fixture with a send dated in the 30 days to 11 Oct adds a day to
the feed while it stands. V13's "no window" query is dated 45 days back for that reason.

### Lock V13

| Green | Mutation (source, its own build) | Red |
| --- | --- | --- |
| 52 of 52, at 1512 and 1280 | Every link drawn in every state | 19 readings, such as "qp2l-nosent · exactly its links — [all four]" and "you row 0 · no link outside its state" |
| | Keep tracking leaves Close in the lead | "Keep tracking · Record a response leads instead of Close — lead "Close query"", and the same after a reload |

Each state was entered: the tally reads 2 for each link and for "no links" on a request and on a closed query.
Its three queries are its own (`seedQp2Links.mjs`, prefix `qp2l-`) and are removed in the same run.

### A note on the machine

The machine restarted mid-pass and `/tmp` was emptied, so every worktree and preview there was lost. Nothing
committed was lost. The pack's worktree is now `~/ScriptAlly-qp2` and its integration `~/ScriptAlly-qp2int`.

### Deploy (second pass)

Dev had moved again: the Comparable titles v27 session deployed `dev/…-comps26-1-qp2-comps27` at `077d063b`
(`index-Czjpd4O8.js`), which is built on my last integration. I merged onto it as
**`dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2-comps27-qp2b`** and deployed that. No conflicts.
**Dev serves `index-C4CJwYeS.js`.**

On that build: tsc and both builds clean; Vitest 8,691 passed, 3 skipped, the same one file failing to load
(`functions/src/email.test.ts`, as on main). qcMove 3 pass, then QP2 V1 to V13 all green (V10 54 of 54, V13
52 of 52); QP1 11 pass; QC137 13 pass; feed drawer v2 4 pass (B6 on its original baseline); delete entry 8
pass; the journeys 15 pass.

The next session to deploy to dev should base its integration on that branch.

## Third pass (12 Oct): the send-by step, the tray, deskPaint2

| Item | Commit | Result |
| --- | --- | --- |
| 1 · Set a send-by date | `0c1cd656` | A step on the edit journey, for a request. The stand card's fifth link opens it in the panel |
| 2 · 7 Oct | none | Kept. Nothing changed |
| 3 · the tray follows the panel | `3b928b2e` | One predicate in `lib/queryActions/entry.ts`, read by the panel's footer and the list's tray |
| 4 · deskPaint2 | `c6771c20` | Skipped in place, listed in `tests/e2e/RETIRED-query-panel-v2.md` |

### 1 · Set a send-by date

- **Shows** on the stand card of a request (partial, full or revision) with no send-by date.
- **Opens** the edit journey in the panel at one step, "When you'll send it by" ("When you'll resubmit by"
  for a revision): the response journey's date chips (in a week, two weeks, four weeks, a date of your own, no
  date given) and reminder choices (two days before, the day before, on the day, no reminder).
- **Saves** `expectedSendDate` and `sendReminderDate` and nothing else. No entry is edited, so nothing is
  recomputed. Undo is the journey's own.
- **Defaults** are the response journey's: two weeks, reminded the day before.
- **"No date given"** behaves as it does there: no send-by date is saved, and a "Send the pages" reminder is
  set for three working days on. The link then still shows, because there is still no send-by date.
- **Not changed:** editing a request entry from the ··· menu. That still opens the date-and-note step only.
  Say if the send-by step should follow it there too.

### 3 · The tray follows the panel

False premise, found on the rendered page: **after "Keep tracking" the tray had no first action at all.** The
tray's button came from the board's card for the query. Keep tracking removes the close card, so the button
went with it and "Edit" became the tray's first button.

What is built:

- `leadDoors(row)` is the panel's doors. `silenceLead(row)` is the door that leads a query with the agent for
  over 365 days: Close, or Record a response once the flag is set.
- The panel's footer, the tray's label, the journey the tray opens and the Birds-eye drawer's pill all read
  them. `QcOpenCard` no longer takes the flag as a prop.
- A year-silent row always has a tray button, card or no card, and it is the panel's primary.

Things to know:

- **This also changes the tray before Keep tracking.** A year-silent query whose board card is a nudge used to
  offer "Nudge" in the tray while the panel led with "Close query". The tray now says "Close query" there, as
  the ruling asks. Rows under a year are untouched: their tray is still their board card's act.
- **The "Next move" column's words are not changed.** A year-silent row can still read "Consider closing" or
  "Nudge" there beside a tray button that says something else. Say if the column should follow too.

### V13, extended

70 of 70 green. Added readings:

- the fifth link shows only on a request with no send-by date, and not once it has one;
- the step holds all eight choices, in the panel, with the page dimmed;
- before and after the save, on the query document: the changed fields are exactly `expectedSendDate` and
  `sendReminderDate`; its log, the feed and the lock's other queries are unchanged;
- the tray's first button equals the panel's primary before Keep tracking, after it, and after "Suggest
  closing again".

| Mutation | Red |
| --- | --- |
| The send-by step writes a third field | "changed: expectedSendDate, lastStatusChange, sendReminderDate" |
| The tray draws no button for a year-silent row with no card (the build before the fix) | "tray "Edit" · panel "Record a response"", twice |

### Deploy (third pass)

Dev still served my second-pass integration, so I merged onto the same branch,
`dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2-comps27-qp2b`, and deployed it. No conflicts.
**Dev serves `index-CdbYLzG9.js`.**

On that build: tsc and both builds clean; Vitest 8,694 passed, 3 skipped, the same one file failing to load
(`functions/src/email.test.ts`, as on main). qcMove 3 pass; QP2 V1 to V13 green (V13 70 of 70); QP1 green;
QC137 13 pass; feed drawer v2 4 pass; delete entry 8 pass; the journeys 15 pass; QC132 10 pass, 6 skipped as
before.

**Two locks failed inside the full run and passed alone:** QP2 V12 (134 of 134 alone) and QP1 P7 to P8 (93 of
93 alone). Both walk every step of every action, and each lost a click on the shared account, as P7 did in the
first pass. Neither reads anything this pass changed. They are worth making steadier; I have not done that
here.
