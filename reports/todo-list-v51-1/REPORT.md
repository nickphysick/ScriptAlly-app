# To-do v51.1 — fixes after the first look on dev (6 Nov)

Branch **`todo-list-v51-1`**, cut from `dev/…-qc1522-td51` @ `c9db94d56`. **Deployed to dev on 6 Nov as
`dev/…-qc1522-td51-td511` (a fast-forward of the branch dev served), bundle `index-c89gelcz.js`.** Dev served
`index-D5NkQkKm.js` immediately before the deploy. Hosting only; rules unchanged. Not merged to `main`, not pushed.

## Suites already failing on dev's branch (skipped)

These are from the comparison runs on `…-qc1522-td51` and `…-qc1522` earlier today. Each fails for reasons unrelated
to To-do, and none was run here:

- `headerPanelV2` (P1, P2, P6, P7, floor), `headerV3` (H1–H8, H11), `hr1` (HR1-1…8), `hr1Shots`
- `qcV138` (all of it: Query Centre v152 replaced that page)
- `corkboardV1` D1
- `phoneAppV2Shell` (tab bar, tuck-away, the "+" sheet, snackbar), `phoneAppV2Todo` (To-do, Corkboard)

Only `tests/e2e/todoWs.measure.ts` was run: the To-do checks and the two new cases. Nothing else reads what this
change touches. The badge's label still begins with its number, which is the one thing a suite reads from it.

## 1. The priority line

- **Where "o'r" could come from.** I couldn't sign in to the live dev account to see which task produced it, and the
  emulator's copy of the harness account renders the line correctly. There were two paths that copied a task's own
  text into the header:
  - kind `other`: the board's tell, recheck, dream-agent, start-querying and materials cards. These used the row's
    stored deed or title.
  - your own task, which uses its title (as you asked).
- **The phrase is now built for every kind** (`doingPhrase`, exhaustive over the kinds):
  - Sending {first} at {agency} your partial / full / revision
  - Answering {first}'s offer from {agency}
  - Nudging {first} at {agency}
  - Deciding what to do about {first} at {agency}
  - housekeeping, as the mockup's builder words them: Adding how long {who} takes to reply; Adding {who}'s wishlist;
    Adding what {who} wants sent
  - Filling in what you sent {who}; Telling {who} about your offer; Sending {who} your full; Telling {who} you've
    withdrawn / signed; Checking on {who}; Querying {who}; Starting to query 'Book'
  - your own task: its title
- **"{who}"** is "{first} at {agency}" where both are known and differ, otherwise the first name. For an agency-only
  agent it's the agency's name.
- **Lock** (`todoWs.test.ts`, "v51.1"): fixtures Zoë O'Rourke at Smith-Jones Literary, Mary-Kate Smith-Jones at
  O'Rourke & Partners, and an agency-only "Agence Zoë". Every card carries "o'r" as its stored title and deed, and no
  phrase or title may contain it. **Red on the old model: 4 failed. Green on the new: 18 passed.**

## 2. Counts

- **On the page:** the To do tab, the desk's "n/m" and every group heading now count the tray's rows: every group,
  Housekeeping's one row per agent included, and a collapsed group too. ‹ › still step only through open groups.
  - This reverses v51's "tab = badge", as you asked.
- **Sidebar badges:** both the rail's and the wide sidebar's keep the "needs you" count (`boardFigures(cols).cards`).
  Their tooltip and label read "{n} need you now".
- **Measured on the emulator:**
  - the To do tab reads 168, and the five headings (16 + 14 + 15 + 114 + 9) sum to 168;
  - "n/m" reads 1/168;
  - the badge reads 57, with the title "57 need you now".
- **The dashboard** is unchanged (its Next up count is its own list).
- **Locks:**
  - the smoke's "one count" case: red on the old files, green on the new;
  - `todoWs.measure`'s new count case: red by mutation (the tab showing the board's 56 against headings summing to
    167), green on the code.

## 3. The preview is read-only

- The previewed card is `inert`, so none of its buttons, tabs or links takes a click or focus.
- Its query card's footer (the action, ⋯, the doors, Delete) and the stand card's links ("Set a send-by date") are not
  drawn.
- A click anywhere on the preview opens the real card, where all of them work.
- The agent card's controls stay drawn but inert. You asked about the query card's, so the agent card's are not hidden.
- **Locks:**
  - the smoke's preview case: red on the old files;
  - `todoWs.measure`'s "the preview is read-only" case, which checks:
    - that the footer and links aren't drawn;
    - that no button, link or tab is hit at its own centre;
    - that none can take focus;
    - that a click still opens the real card.
  - That case went red by mutation twice: once with the footer drawn, once without `inert`, when the card's Tracking,
    Agent and Notes tabs took focus.

## 4. Housekeeping titles that didn't name the agent

| Task | On dev (v51) | Now |
|---|---|---|
| A query sent with no record of what went (`materials_unrecorded`) | "Fill in what you sent" | "Fill in what you sent {first}" |
| The bulk version (`materials_unrecorded_bulk`, ≥ the threshold) | one row, "Fill in what you sent", no agent at all | **one row per query**, "Fill in what you sent {first}" |
| Offer: tell the others (`offer_tell`) | the card's sentence, with the agent's full name | "Tell {first} about your offer" |
| Offer: send the full first (`offer_send_full`) | "Send the full to {full name}" | "Send {first} your full" |
| Withdrawn / signed: tell them | "Tell {full name} you've …" | "Tell {first} you've withdrawn / signed" |
| Check on an agent (`agent_recheck`) | "Check on {full name}" | "Check on {first}" |
| Dream agent not queried | "Query Dream Agent: {full name}" | "Query {first}" |
| Start querying a book (`querying_unstarted`) | "Start querying for 'Title'" | "Start querying 'Title'". It names the book; there is no agent. |
| Profile gaps (reply time, wishlist, what they want) | already named the agent | unchanged |

- Only the two materials titles failed to name the agent. The others named the full name through the card's own
  sentence, which is the same stored text that could leak into the header. They now use the first name, as every
  other row does.
- **Lock:** `todoWs.test.ts`: every Housekeeping row's title contains its agent's first name (the book, for "Start
  querying"), and the bulk card becomes one row per query. Red on the old model.
- ~~Housekeeping goes from 52 rows to 114~~: **superseded by §5**, where the materials gaps are one row again.

## 5. "Fill in what you sent" is one row again (after your first read)

- **Tray.** With two or more queries missing what was sent, Housekeeping shows ONE row: "Fill in what you sent · {n}
  queries". It counts as 1 in the tab, the group heading and "n/m". With exactly one, the row reads "Fill in what you
  sent {first name}", as before. Every other Housekeeping row is unchanged (one per agent).
  - The row gathers both kinds of card: the bulk card (three or more gaps) and the single-query cards below that
    threshold. The queries are taken oldest first, from the same list the bulk card counts.
- **Desk.** The task header reads "{first name} · 1 of {n}". The question is "What went to {first}?", with three tiles
  (Query letter, Synopsis, Opening sample), and Log it saves that query's `materialsWanted`. The next query then opens
  straight away, with a toast "Saved what you sent {first}." and Undo. There's no celebration until the last one.
  - "Skip this one" moves to the next query and writes nothing. A skipped query comes round again after the others.
- **Snooze and Dismiss** act on every card behind the row. The pop-ups read "Snooze all {n} until…" (and its button
  "Snooze all {n} until {date}") and "Dismiss all {n}?", and the toasts "Snoozed all {n} until …" / "Dismissed all {n}".
  Undo restores every flag it changed.
- **Measured on the emulator's harness account:** the row reads "Fill in what you sent · 63 queries", the header
  "Ottoline · 1 of 63"; Skip made 0 writes, a save made 1 and the header then read "of 62", Undo brought back "of 63",
  and Snooze took the row off the tray and Undo put it back.
- **Locks:**
  - `todoWs.test.ts`, "the materials batch": a fixture with 60 gaps gives exactly 1 Housekeeping row, titled "· 60
    queries", carrying all 60; the tab (the rows) equals the sum of the group headings; two single cards become one
    row; one gap stays its own named row. **Red on the old model (5 failed), green on the new.**
  - `todoWs.measure.ts`, "the materials batch": one row; "1 of n"; Skip writes nothing (counted on Firestore's write
    channel, with a real save counted in the same case, so the instrument can see a write); a save opens "of n−1" with
    a toast and no celebration; Snooze says "Snooze all n" and empties the row; Undo restores it.
  - **Red by mutation**, one at a time, each at its own check:
    - batch threshold raised so no batch forms → "the row names its count" failed ("Fill in what you sent the agent");
    - Skip made to write → "Skip saves nothing" failed (it saw the `materialsWanted` write);
    - the batch toast's "all" removed → failed on "Snoozed all 63 until" (got "Snoozed until Sat 7 Nov").
  - Two of the mutation runs first lost a port race with another session's emulator run and measured nothing; they
    were rerun.

## Commits

| Commit | What |
|---|---|
| `ca6682dff` | Part 1: the phrase is built; `OTHER_WORDS` names the agent; `wsTasks` can expand the materials card; the v51.1 unit locks |
| `410bc146d` | Part 2: one count; the badge's words; the read-only preview; the materials rows in the tray; the smoke's locks |
| `d6a72f6e4` | `todoWs.measure.ts` (the two new cases, screenshots to `reports/todo-list-v51-1/`) and this report |
| _part 4_ | §5: the materials batch row, its desk flow, the batch pop-ups, their unit and browser locks |

## Gates

| Gate | Baseline (`c9db94d56`) | After |
|---|---|---|
| tsc | 0 errors | 0 errors |
| production build | clean | clean |
| `build:dev` | `index-D5NkQkKm.js` (dev) | `index-DDmfijWv.js` |
| Vitest | 1 file / 2 tests red (`firestoreTarget`) | the same 2, 11,449 passed |
| `todoWs.measure.ts` (emulator) | — | **13/13** |

## Screens at 1512

- `dev-page-1512.png` (v51, the code dev serves) beside `page-1512.png` (v51.1). The tab reads 56 → 167, "n/m"
  1/105 → 1/167, and the preview has no "Mark full sent" footer and no "Set a send-by date" link.
  - The v51.1 shot was taken before that query's history had loaded, so its timeline shows one entry. The same task in
    `send-summary.png` shows all three.
- `dev-kind-fix.png` (v51: "Fill in what you sent", initials FS) beside `kind-other.png` (v51.1: "Fill in what you sent
  Ottoline", "… Rachel", "… Peter", each with its agency).
- These are the emulator's copy of the harness account. The live dev site needs a live sign-in, which I didn't use.

## Left for you

- Nothing pending from this round. Prod is yours.
