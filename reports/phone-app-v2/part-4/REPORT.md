# Phone app v2, Part 4 — logging, responding, the other flows, and celebrations

Branch `phone-app-v2` (worktree `/Users/nickphysick/ScriptAlly-pa2`). Ref: `design-refs/phone-app-v2/` — screens 13–23, `flowv.js` (`ovFlow` at FL E · FQ B · FP C · FA B · FE C, `liveCard`, the agent search), `flows.js` (`FLOWS`), `restv.js` (`ovCele` at CEV C). The hashes were re-verified (69 OK). Not merged, not on prod.

## False premises

1. **"Every journey… add an agent".** Adding an agent is not a drawer journey here. It is the agent card's editor, and Nick's standing ruling (Agent card v1) is that the agent card is the only agent editor. A flow that adds an agent would be a second one, so it is not built. On a phone, "Add an agent" still opens the agent card. Ruling needed: Not done, item 1.
2. **"The trigger is QueriesPhone's existing one, widened to any phone page."** It already watched every query: `QueriesPhone` stays mounted on every route (StagePage). Only a `routeActive` gate kept it to /queries, and that gate is removed.
3. **The ref shows the live card OR the answers-so-far chips** (`card||trail` at FL E). The brief asks for both: the card in the band, the chips under it on the sheet. The brief's baked decision is followed.
4. **"F3 red: lose the answer."** The phone shell does not hold the answers (the journey does), so no mutation of the presentation can lose one without breaking something else first. F3 was proved red by `check-cancels` instead: a check row that closes the journey, which loses every answer. Named for what it does.
5. **The query sheet's "{first} replied" never reached the response journey.** It used the card's own inline response form. On a phone it now opens the response journey's flow. The desktop keeps the inline form. This retired QM1's celebration case, which drove that form.

## Step 0 — the questions, journey by journey

The app's journeys keep their questions, order, guards and saves. On a phone each step is asked as a question in a sentence (`lib/phoneFlow.phoneQuestion`, agent by first name, never a pronoun). A step with no ref counterpart keeps the journey's own title.

| Journey | The app, in order (phone wording) | The ref (`FLOWS`) | Differences for Nick |
|---|---|---|---|
| Log a query | Agent and book ("Who did you query?") · Sending ("When and how did it go to {first}?") · What you sent ("What did you send {first}?") · Response expectations ("When should we expect a reply?") · If they don't reply ("If {first} doesn't reply?") · check | Who did you query? · [new agent's name] · What did you send {first}? · [Which pieces went out?] · When did it go? · How did you send it? · When should we expect a reply? · Look right? | The app asks when and how in **one** step where the ref asks two. The app asks the manuscript with the agent. The app asks **what happens if they don't reply** (nudge or close); the ref does not. A new agent opens the agent card rather than a "What's the agent's name?" step. Choosing pieces lives inside "What you sent". |
| Record a response | [the query picker, "Who replied?", when no query] · The response ("What did {first} say?", with its received date) · then by type: What they asked for · What they'd like revised · When you'll send it by / resubmit by · Feedback · The offer · check | Who replied? · What did {first} say? · When did it arrive? · Anything to remember? | The app asks the date on the same step as the response. It asks a type's follow-ups (the partial's sample, the revision, the send-by date, the offer). The ref's free note "Anything to remember?" maps to the app's Feedback (a pass only). |
| Mark sent | The request ("What did {first} ask for?") · What you're sending ("What did you send {first}?") · [the version] · Sending it ("When and how did it go?") · Reading window ("When should we expect a reply?") · check | What did you send {first}? · When did it go? | The app first restates the request and asks the version and the reading window. The ref asks two questions. |
| Nudge | Where it stands ("Have you nudged {first}?" — sent / remind me / close instead) · The nudge ("When did you nudge {first}?") or When to nudge · If it's still quiet · check | When did you nudge {first}? · Remind you again in… | The app first asks whether you have nudged or want reminding. |
| Close | Where it stands ("Why are you closing {first}'s query?") · Calling it / Withdrawing / Their status (the date) · check | Why are you closing {first}'s query? | The app asks the date. |
| Offer | The offer · The others · The call · Your decision · check | — (no ref journey) | App only; walks in the same layout. |
| Correct the record | Set a send-by date / the entry · check | — | App only. |
| Add a task | The task ("What do you need to do?", with optional detail) · When ("When?": Today, Tomorrow, Next week, Pick a date) · check | What do you need to do? · When? (Today · Tomorrow · This weekend · Next week · No date) | The app's composer has no "No date" for a task (a dateless item is a note) and no "This weekend". Its optional detail is asked on the first step. |
| Add a note | The note ("What do you want to remember?") · check | What do you want to remember? | The same. |
| Add an agent | — (the agent card) | Who's the agent? · Where does {first} work? · How do they take submissions? · What are they looking for? | Not routed; see false premise 1. |

## What was built

- **`PhoneFlowShell`** (`queryActions/`) takes exactly `DrawerShell`'s props and walks the same `JourneyView`. `QueryDrawer` chooses it with `useIsMobile`, so no journey forks and the desktop drawer is untouched (F9).
  - The band: × top right, a back chevron past the first question, and the live card (court band, an empty disc until the agent is known, the book, one slot per step, an answered slot jumping back).
  - The sheet: the answers so far as chips, the question in Special Elite 22px, one help line (a "check" guard's message), the step's own controls dressed by `phoneFlow.css` as the ref's white list and two-up grid.
  - The foot: a Continue pill, hidden on a single-choice step until something is chosen. A single choice moves on at once, decided by measuring the step's rendered controls (one set of options, nothing typed, no date).
  - The check card ("Look right?"): every answer as a row that returns to it, then the journey's own primary.
- **Log's agent question (FA B):** on a phone the picker shows every agent under its search field, filtered as you type, with "Someone not on my list" last. The desktop keeps its five suggestions.
- **The task and note flows** (`phone/PhoneComposeFlow.tsx`, `lib/phoneCompose.ts`) ask the To-do composer's own fields. They save through its `addUserTask` with the fields it writes; Undo deletes the created task. The + sheet's task door uses them on a phone. Part 5's "Add a note" tile is meant to open `openPhoneCompose("note")`.
- **The celebration** (CEV C), described in the 4C commit.

## Gates

| Gate | Before Part 4 (`4fcdb178`) | After |
|---|---|---|
| tsc root / functions | 0 / 0 | 0 / 0 |
| build:dev (grepped) | clean | clean |
| Vitest | 691 files · 10741 passed · 3 skipped | `Test Files 692 passed (692)` · `Tests 10745 passed \| 3 skipped (10748)` |

## Commits

| Commit | What |
|---|---|
| `5d3f7688` | 4A — the flow layout and the live card (`PhoneFlowShell`, `phoneFlow.css`, `lib/phoneFlow` + test, `QueryDrawer`, `journey.ts` `live`, Log's picker on a phone) |
| `3280fa0c` | 4B — respond, mark sent, nudge, close; task and note; the sheet's "replied" to the response journey; the flow's face at 0-2-0 |
| `feba0f9c` | 4C — the celebration (CEV C), widened to every phone page |
| (this commit) | 4D — locks, shots, pairs, this report |

## Locks — PA2-4 (`tests/e2e/phoneAppV2Flows.measure.ts`)

These write and undo on the harness account. Each writing case snapshots `queries`, `activities`, `taskFlags`, `tasks` (and the query's own log) and compares them document by document after Undo, with keys sorted at every depth: a rewritten document returns in another key order.

| Lock | Claim | Mutation | Red reading |
|---|---|---|---|
| F1 | the questions walked are the journey's own steps, in order, then the check | `drop-step` | `["Agent and book","Sending","Response expectations","If they don't reply","CHECK"]` |
| F2 | the live card fills a slot for each answer; a filled slot returns to its question | `drop-step`; `no-jump` | `[1,3,4]`; `a filled slot returns to its question — CHECK` |
| F3 | the check card lists every answer; a row returns to it, the answer kept | `check-cancels` (false premise 4) | `a check row returns to its question, the answer kept — null on=0` |
| F4 | a full log, then Undo, leaves the account as it was, document by document (and each response case too) | `no-undo` (Undo does nothing; the run stops after F4) | `queries/SSnLkpGWsoDfL4YgGyU0 added, activities/act-z91bdsy4r added` |
| F5 | the celebration on a partial and a full request, never on a pass, with Undo on top | `cheer-on-pass` | `pass: no celebration — true` |
| F6 | the stamp's words match the response; the heading, the stamp and the agent are Special Elite | `offer-on-full`; `no-pa-layer` | `full: the stamp reads "Full requested" — Offer`; `["-apple-system, system-ui, …", …]` |
| F7 | reduced motion: no animation on the card or the stamp, the stamp in place, no confetti | CSS `stamp-moves` | `{"running":1,"opacity":"0",…}` |
| F8 | the flow's and the celebration's colours; the only burgundy is the stamp; no image twice | CSS `burgundy-btn` | `the only burgundy is the stamp — ["cele-stamp","cele-next"]` |
| F9 | the desktop untouched | PA2-1 S9 on this build (red by `desk-bar` since Part 1) | identical within the base's own variation; DOM identical (`ledger/desktop.json`) |

**Final green:** 390 × 844 and 360 × 780, plus the reduced-motion case (`4 passed` with setup). The 360 run walks the log and a partial; the full, the pass and the F4 log run at 390.

**The `no-undo` mutant's writes were removed by hand, by id:**
- query `SSnLkpGWsoDfL4YgGyU0`, its log entry and its feed row `act-z91bdsy4r` (a "Queried" log to Tomas Keller);
- first listed and checked against the run, then deleted one by one;
- a broader "delete everything added" script was refused by the session's safety check, rightly.

**⚠️ AND THE PAIRS RUN WROTE ONCE, WHICH IT MUST NEVER DO.** The pairs spec only reads, but its "17 — the check card" step pressed Continue a fixed number of times. That count ran one past the check card and pressed "Log query". Its shot shows the button reading "Logging".
- Found by comparing the account with the list taken before the mutant runs.
- The one query it logged (`yYl3O9DUyX3LtEvAjacF`, its log entry and feed row `act-pxy6wjri0`, Tomas Keller again) was listed, checked and deleted by id.
- The pairs' Continue now stops at the check card whatever the count.

**The celebration's heading and stamp first rendered in the sans.** Its portal sat under `<body>`, outside the phone's token scope, so `--pa-type` resolved to nothing. The layer now carries `pa-layer`, and F6 asserts the faces. The check was proved red by `no-pa-layer`.

Every other run undid its own writes (checked after each run).

**Regressions on this build, all green:**
- PA2-1 `10 passed, 2 skipped`. S5 now expects the + sheet's task door to open the task flow; S7 records its pass through the response flow.
- PA2-2 `3 passed` · PA2-3 `3 passed` · DM1 `3 passed, 5 skipped`.
- QM1 `1 passed, 10 skipped`; its celebration case is retired (false premise 5).
- Ledgers are in `ledger/regress/`.

## After saving — the snackbar

Every journey keeps its own message and Undo. Only the task and note flows had none (the composer says nothing on a save); they use the ref's "Added to your list." and "Pinned to your corkboard."

## Pairs

`pairs/` holds the ref beside the app at 390 × 844 and 360 × 780 for 13–23. Screens 18 (the snackbar) and 20 (the celebration) need a write, so they pair the shots PA2-4 took mid-run (18 at 390 only).

## Dev

- **Before:** dev served `index-CArPS85T.js`, the Part 3 integration `8b2f06f5`.
- **Integration branch:** `dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2-td12-ppp1-pa2-4`, at `633aa338` = `8b2f06f5` + `phone-app-v2` at `da0e8134`. No conflicts; CLAUDE.md auto-merged.
- **Gates there:** tsc 0 / 0 · build clean · Vitest `Test Files 694 passed (694)` · `Tests 10756 passed | 3 skipped (10759)`.
- **Locks there:**
  - PA2-4 `4 passed` (it wrote and undid; the account was checked after);
  - PA2-3 `3 passed` · PA2-2 `3 passed`;
  - PA2-1 `8 passed, 2 skipped`, with S1 red at both sizes: 37 against To-do v12's 30. This is the Part 3 question, unchanged.
- **After:** dev serves `index-BkPjilRy.js`.

## Not done, and why — for Nick

1. **Add an agent is not a flow.** The agent card is the only agent editor (your ruling); a flow would be a second. If you want the ref's four questions on a phone, it means either a phone presentation of the agent card's editor or lifting the ruling.
2. **The query card's own edit mode on a phone still wears the desktop's uppercase mono labels.** That is the ••• sheet's "Edit", not a journey. It is listed for Part 8's whole-app sweep.
3. **The task flow has no "No date" and no "This weekend"** (the composer's model: a dateless item is a note). Adding them changes the composer's model.
4. **The ref asks "When did it go?" and "How did you send it?" as two questions; Log asks them on one step** (and records the manuscript with the agent). Splitting them changes the journey, which this part does not do.
5. **A single choice moves on by measuring the step's controls.** A journey step that mixes one set of options with anything else keeps its Continue pill. If you want every pick to advance, the journeys would have to say what kind of question each step is.

## Worktree

Kept for Parts 5–8.
