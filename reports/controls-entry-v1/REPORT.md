# Controls: entry v1: the reply that sits between steps

> **⚠️ DEV HOSTING IS STILL HELD (Nick, 24 Nov).** Dev serves `index-DQIDPfLr.js`, which nothing pushed or local builds. Nick is finding which session deployed it. Then: rebase `controls-entry-v1` onto that work, build, deploy, and confirm the hash. Not cleared at the time of writing (checked 18:21 UTC, still `index-DQIDPfLr.js`).
>
> **⚠️ BEFORE THE PROD RULES DEPLOY: THE QUERY UPDATE RULE'S EXPRESSION LIMIT, MEASURED (close-out 4).** In the emulator, an update to a query is **denied once about 17 or 18 of its optional fields are present** (on top of the 7 required), every time, with "maximum of 1000 expressions … @ L1115". The flaky denials in the rules suite are this. Almost all the cost is `isValidQuery` re-checking all 65 optional fields on every update. Real dev Firestore accepted the probe's update, so production may count differently, but this was not proved for a full document. Detail under "Close-outs", item 4. Not touched here: its own prompt.

Branch `controls-entry-v1`, cut from the dev line `…-rar211-laqunk` (f3659638d). Nothing is merged and main is untouched.
- **First pass:** b4f13f669 (pack), a23138a06 and 551b4e4c1 (Phase 1), 2de908052 and 1a69db877 (Phase 2), c1cfe0bec (Phase 3), 172ae304d (Phases 4 and 5), e5c51a031 (report).
- **Follow-ups:** 5f19ecc52 (1), 142b2f31c (2), 450653f04 (3), f782c5b22 (4), 4fb825e8c (measure), 535de8e9d (report). See "Follow-ups".
- **Close-outs:** dbb25f981 (1), f9a2b4086 (2), 6c8c4b1c2 (3), plus the measurement and this report (4). See "Close-outs" at the end.

**Dev Firestore rules are deployed** (latest 24 Nov 16:45:13Z, ruleset `0d1f1704…`, probed). **Dev hosting is NOT deployed.**

Gates at the branch tip, against the session baseline:
- tsc: 0 errors, as before.
- Build: clean, as before.
- Vitest: was 944 files and 13,415 tests passing; now 949 files and 13,478 tests passing (full suite).

tsc needs `NODE_OPTIONS=--max-old-space-size=8192` on this tree; at the default heap it aborts with V8 exit 134.

## False premises (Step 0, ruled on by Nick on 24 Nov)

1. **`recomputeQuery` derives none of last heard, send-by, reply-expected, the nudge or Gone quiet.** It writes ten status fields and nothing else. Ruling: the dates are worked out on read, and `recomputeQuery` is unchanged.
2. **A reply that moves nothing already existed: the "Holding reply".** Ruling: it is folded in. Old rows read as kind `holding`, and their stored weeks become the new date, counted from the entry's own date.
3. **No rule blocked "Something else".** The nested `type` is free text. What the entry needed was two keys in `hasOnly` and one feed `activityType`.
4. **Agent history v1 is not on the dev line.** The note goes into History as History draws steps today.

Full recon: [STEP0.md](STEP0.md).

## Phase 1: the entry type

**Landed (a23138a06).**
- **The type.** One nested type, `type: "Agent reply"`, with one feed type, `activityType: "Agent Reply"`. Its keys:
  - `replyKind`: `chaser`, `holding` or `note`;
  - optional `replyDate` (YYYY-MM-DD);
  - their words in `replyNote` on the nested row and `details` on the feed row;
  - the date on their email as `createdAt` / `date`.

  [src/lib/agentReply.ts](../../src/lib/agentReply.ts) is the one check (`isAgentReplyNested` / `isAgentReplyFeed`), the one reader and the one builder.
- **The holding-reply pack's code.** `lib/holdingReply.ts` is deleted. Its six readers point at the one check, and `recordHoldingReply` became `recordAgentReply`.
- **What the entry moves, on read:**
  - Last heard: both readers.
  - Send by, when the query is with you and the entry came after the request.
  - Reply expected, when the query is with the agent and the entry came after the last send. It is weighed by recency against the writer's own date.
  - A writer's reminder that falls before the new date reads as due on it.
  - Gone quiet ends for one quiet window after any entry.
  - An entry with no date moves only Last heard and Gone quiet.
- **Corrections.** They go through `editActivity` (a new `reply` part of the patch, written to both stores) and `deleteActivity`.

**Locks.** [agentReply.test.ts](../../src/lib/agentReply.test.ts) has 17 cases. Every "moves" lock went red with its read removed:

| Mutation | Red |
|---|---|
| M1: expectedFor reads no entry | 7 |
| M2: Last heard ignores the entry | 1 |
| M3: no Gone quiet reset | 1 |
| M4: the reminder is not read through | 1 |

**Rules.** [tests/rules/agentReply.rules.test.ts](../../tests/rules/agentReply.rules.test.ts) writes the real builder's documents:
- Against the rules before this change, all 8 "allowed" cases were red.
- After it, all pass. One run showed a red on the feed UPDATE case. It was the emulator's flaky 1,000-expression limit (the same limit fails 4 to 6 different queryActions cases on every run, before and after this change). The two narrower update cases added to isolate it pass.

**Dev rules deploy.** Released 24 Nov 15:22:31Z, ruleset `63563275-4c06-4ee5-873f-966d729ec610`, to `(default)`. `rulesProbe.mjs` gained the "ce1 P1" vintage (551b4e4c1). The three allowed cases were ACCEPTED and the out-of-set kind was DENIED.

## Phase 2: where it counts (locks, per ruling 6)

**Landed (2de908052, 1a69db877).** The one behaviour change: the Dashboard drawer gives the entry a pill by kind, so "N replies from agents" counts it on the agent's side. Before, holding replies were dropped there.

**Locks.** [agentReplyCounts.test.ts](../../src/lib/agentReplyCounts.test.ts) has 13 cases over a non-empty population, with one entry of every kind on every query:
- **Counts like a holding reply:** "Nth response", the To-do calendar's "exchange N", and the nudge outcome label.
- **Counts as a feed row:** "Last in touch", "Closed {date}" and the recency sorts (`QcRow.lastMs`).
- **On the agent's side:** the drawer's replies rise by 12 and "did" is unchanged.
- **Absent:** response rate, the Dashboard and analytics medians, the Responses tally, the Analytics tally, and the day count.

**Red proofs.**
- Five faults:
  - no drawer pill;
  - the feed check knowing only the old type;
  - the calendar dropping the type;
  - the timeline dropping reply rows;
  - the entry carrying a status (turns the medians and the Analytics tally red).
- One mutation stayed green: removing the nudge label's `kind` check. The reply row's decorative incoming status also answers the nudge, so the lock was proved red instead by dropping the reply rows themselves.
- The Responses tally and the day count read query fields, which only `recomputeQuery` writes. Phase 1's "moves nothing recomputeQuery writes" lock covers that path.

**Slip.** 2de908052 was committed with one tsc error in its own test. 1a69db877 fixes it.

## Phase 3: the query card

**Landed (c1cfe0bec).**
- **Tracking.** Every `reply` step, of all three kinds and including the old holding rows, draws as the ref's small note:
  - `oc oc-note` on the existing bubble;
  - the date line as `.oc-sub` under the title, then their words, then the date;
  - [qcv168oc.css](../../src/components/queries/centre/qcv168oc.css) is the ref's `.oc`, `.oc-note` and `.oc-sub` rules ported wholesale. The ref's quote line `.qw` is mapped to the card's `.qc152-qt`. No `oc-under`.
- **Agent tab.** Last heard's line says what the latest reply was, of any kind.
- **Notes.** The phrase for the kind, in the stage's colour when that stage was the agent's.
- **Editing.** The card's own step editor, and the Notes tab's in-place words, route a reply to `editActivity` / `deleteActivity`, with a snapshot so Undo still restores. Before this, the step plan filed a reply as kind "queried" and would have written it back as a Query sent.

**Locks.** [controlsEntry.test.tsx](../../src/components/queries/centre/controlsEntry.test.tsx) has 8 cases.

**Measured** (below). One difference from the ref: the note's glyph is the app's existing holding mark (a circled minus), where the ref draws a speech bubble.

## Phase 4: the agent card

- **History.** It is built from the query card's steps, so the note arrives with nothing built twice. Measured: one note, `oc-note`, and exactly one more step than before.
- **Notes.** Their words are listed, read-only. Measured.
- **Footer.** It never showed a Send by at all: the "with you" line was always "Send it, then log it here". It now reads "Send by Fri 4 Dec" when there is one, as the ref draws it (172ae304d). Measured.

## Phase 5: verify, do not build (measured)

[controlsEntry.measure.ts](../../tests/e2e/controlsEntry.measure.ts) ran on the emulator at 1440 over four seeded queries: a chaser on a full request, a holding reply on a gone-quiet query, an undated note on a gone-quiet query, and a holding reply over a booked reminder. Every surface was read before and after. Result: **88/88**, and [the ledger](ledger/measure.json) plus before/after shots are in `shots/`.

**The Queries page card's Next box follows Phase 1:**

| Query | Before | After |
|---|---|---|
| Chaser on a full request | "No date yet" | "10 days left" |
| Holding reply, gone quiet | Gone quiet | "Reply expected by 15 Jan 2027" |
| Undated note, gone quiet | Gone quiet | "Past expected · Send nudge now" |
| Holding reply over a reminder | "Nudge on 29 Nov" | "Nudge on 3 Jan 2027" |

The last row needed a fix found by measuring: `lib/qc154` read `nudgeDate` raw. It now reads through `reminderOf`.

**The to-do task's date did NOT follow** (fixed in follow-up 1, below):
- "Send Imogen your full · 3 days waiting" is unchanged. The task shows no Send by.
- The gone-quiet query that now expects a reply on 15 Jan changes from "gone quiet" to **"Nudge Jules · 180 days past expected"**. That is wrong: the agent has just given a new date.

The to-do engine keeps its own clock (`taskDue`, `replyTask`, `comingUp` and `todoBuckets` read `nudgeDate`, `expectedSendDate` and `responseReceivedAt` directly), so the entry moves none of it. Not built here, as the brief says. See "Deferred".

## The rules change, for Nick to deploy to prod

Written out in [rules-prod.diff](rules-prod.diff), against the dev line's rules. ⚠️ Prod's `release/live-1` rules are 210 lines behind the dev line, so this goes on top of the rest of the dev line's rules work, not alone. In words:
1. `isValidActivityNested`: add `'replyKind', 'replyDate'` to the `hasOnly` list. Validate `replyKind in ['chaser', 'holding', 'note']` and `replyDate is string && size() <= 32`.
2. `isValidActivity` (the feed): add `data.activityType == 'Agent Reply'`, and the same two validators.
3. The feed's update allowlist (`affectedKeys().hasOnly`): add `'replyKind', 'replyDate'`.
4. Follow-up 2, `isValidQuery`: add an optional `nudgeSetAt` (`is string && size() <= 64`), and add `'nudgeSetAt'` to the query update allowlist. Read the expression-limit warning at the top first.

Command: `npm run deploy:rules` (Nick's).

## Deploy

- **Dev rules:** deployed and probed (above).
- **Dev hosting: STOPPED.** Dev serves `index-DQIDPfLr.js`, which nothing I can find builds:
  - the dev line's pushed and local tips build `index-C_VVU1di.js` (`…-laqdoor`) and `index-DV11HxiY.js` (`…-aa215` and `add-agent-v2-15`);
  - builds here reproduce exactly (`f3659638d` rebuilt to the `index-CoYsbCK9.js` dev served at the start).

  So dev holds another session's unpushed or dirty build, and the rule is: no deploy over an unknown bundle. Once the source is known: merge `controls-entry-v1` into it as a new `…-ce1` branch, build, deploy, and confirm the hash.

## Deferred, with owners

Done in the follow-ups: the to-do engine (1), the reminder's set-at stamp (2), correcting the kind and new date in the card (3), and the note's glyph (4).

- **The query update rule's expression limit** (top; measured in close-out 4). Owner: its own prompt, before the prod deploy.
- **The old reading-pane timeline** (`QueryTimeline`'s own rows) still draws every non-status row (nudges and reply entries alike) as its one 9px ring. Left as it is (Nick, 24 Nov).
- **`qc1521.measure` L3's colour table** (v152.1's paper and tints) is red for every step, because v164 replaced it (the writer white, the agent their stage band; `qc164` L8 holds the current rule). **`qc164` L8's partial band** is red on 3 steps: it expects `#e4ebf2`, and Plumage colours v3 made it `#f1d9cf`. Both predate this branch. Owner: the next Query Centre measurement pass.
- **`holdingReply.measure`** drives the retired f12 page (red since 18 Aug, RED-BACKLOG "re-point"), asserts no bubble, and writes without restoring. Owner: Controls: journeys v1, which rebuilds recording a reply.
- **Prod rules** (above). Owner: Nick.

## Follow-ups (24 Nov, Nick's four)

Fresh worktree on `controls-entry-v1`, one commit each, same gates. Dev hosting held throughout.

### 1. The To-do list reads through the entry (5f19ecc52)
- **The one read-through.** `lib/agentReply` `entryDatesFor` gives a query's reply date, Send by and reminder as its latest entry moves them, built from the cards' own primitives. The task generator (db.tsx), `replyTaskFor` (the living header) and `taskDue` (via `taskCardFacts` `dueFor`) all read it.
- **`replyTask`.** A dated entry's date is the deadline, with no window needed. The nudge is due on that date, with no grace and not before. A dated entry ends the case for closing.
- **`taskDue`.** The send task's day is its Send by (source "send-by"). A nudge or close task's day is the entry's reply date (source "reply").
- **The row.** A send row with a Send by says "N days left".
- **Red first** on the measured case, against the to-do files as they were: 6 red (the measured case, its day, the adapter, the send day, the generator). [todoEntry.test.ts](../../src/lib/todoEntry.test.ts) has 9 cases.
- **Measured.** The fr send task reads "10 days left". The q query's close task is gone, with no nudge task before 52 days out. Only the undated note's query is "past expected". Next up shows no ce1 row as past expected; it showed "Send your full to Imogen Faraday".

### 2. The reminder records when it was set (142b2f31c)
- **The field.** `Query.nudgeSetAt`, an ISO instant, set by `lib/reminderStamp` `withReminderStamp`:
  - set or changed: now;
  - cleared: cleared the same way;
  - rewritten on the same day: untouched;
  - a patch that already names it (an Undo): untouched.
- **Stamped at the write funnels, not at each of the roughly twenty controls:**
  - db: `updateQuery`, `addQuery`, `recordMaterialsSent`;
  - `commitPlan` and `commitMany` (each uses its own snapshot as the prior);
  - `commitNudge`, the agent card save, `recordResponse`, `saveQueryEdits`.

  Every Undo restores the prior stamp. A source lock fails on any file that writes a query and names the reminder without stamping it, except the two that hand the stamp over themselves (`nudgeUndo` and `stepSaves`), each named with its reason.
- **Reading.** Only a reminder set before the entry moves. One set after it stays. No stamp counts as before. `qc153`'s Next-box reminder now reads through the same `reminderOf`, which takes a date-only reminder as local noon, never UTC midnight.
- **Rules.** `isValidQuery` gains an optional `nudgeSetAt`, and the query update allowlist gains it.
  - Against the rules before this change, the three allowed cases were red and the denial was green.
  - Deployed to dev and probed: the update was ACCEPTED and a non-string was DENIED.
- **Locks.** [reminderStamp.test.ts](../../src/lib/reminderStamp.test.ts) has 18 cases. With the set-at check removed, the two "set after stays" cases went red.
- **Measured.** "ra" (set after its entry) keeps "Nudge on 29 Nov". "rm" (no stamp) moves to "Nudge on 3 Jan 2027".

### 3. The step editor changes the kind and the new date (450653f04)
- **What it was:** Chaser, Holding reply or Note.
- **The new date** is on the app's WeekSlider, counted from the entry's own day, as Record a response draws it:
  - with you: "Send it by", in days 0 to 30;
  - with the agent: "Reply time", in weeks 1 to 26;
  - "No date" clears it, and the day it names shows underneath.
- **Saving** goes through `editActivity`, with the snapshot Undo.
- **A corrected old holding-reply row** becomes the new type on both stores, so clearing its date cannot bring its stored weeks back.
- **Locks.** [controlsEntryEditor.test.tsx](../../src/components/queries/centre/controlsEntryEditor.test.tsx) has 5 cases. They're red against HEAD by construction (neither the controls nor their helpers existed). Not driven on the rendered page (it would write); the measure covers what an edited entry moves.

### 4. The note's glyph is the ref's speech bubble (f782c5b22)
- **The mark.** [ReplyMark.tsx](../../src/components/queries/centre/ReplyMark.tsx) is the ref's `HOLDG`, path for path, drawn as its own mark. It is never StatusDot.
- **Where it's drawn:** every reply step (all kinds, old holding replies included) on every card thread, the agent card's History and the To-do preview (through `StepGlyph`), the older card's step list, and the Notes headers.
- **Locks.** +4 cases in [controlsEntry.test.tsx](../../src/components/queries/centre/controlsEntry.test.tsx), red against the bubble at HEAD.
- **Measured** on all five notes and in History.

### The measure (4fb825e8c)
[controlsEntry.measure.ts](../../tests/e2e/controlsEntry.measure.ts) ran over five queries, before and after their entries: **119/119**, including every first-pass reading. The ledger and shots are in this folder.

## Close-outs (24 Nov, Nick's three plus the count)

Fresh worktree (`ScriptAlly-ce1c`) on `controls-entry-v1`, one commit each, same gates. Dev hosting held throughout. The old reading-pane timeline is left as it is.

### 1. `nudgeSetAt` is stamped only when a write changes the reminder (dbb25f981)

**Confirmed, with one gap fixed.** `withReminderStamp` leaves a patch alone when it does not name `nudgeDate`, and when it names the same day as the query before the write. So an edit that does not touch the reminder never stamps. The gap: `commitNudge` never handed the stamp the query before the nudge. Logging a nudge whose check-in fell on the day the reminder already had stamped it "now". After an entry, a reminder set before the entry then read as set after it, and stopped moving.
- `prior` is now a required argument. `logNudge` passes the query it read. The agent card's "move the reminders" passes the query it moves.
- Two writers pass `null` and say why: `addQuery` creates the query, and `saveQueryEdits`' patch never names the reminder.
- [reminderStampUnrelated.test.ts](../../src/lib/reminderStampUnrelated.test.ts) makes unrelated edits after an entry through each writer's real shape, then reads the reminder through `entryDatesFor`: it still moves. The shapes are a whole-query save, a card save re-sending the same day in another spelling, a patch with no reminder, and a nudge re-booked for the same day through the real `commitNudge`. Each runs with a stamp from before the entry and with none.
- **Red first:**
  - against `nudgeWrite.ts` as it was, case 3 (the nudge writer) is red at both stamps;
  - against a stamp that fires on every write that carries the reminder, cases 1–3 are red (5 of 11).
- Related tests: 5,084 green.

### 2. The To-do list's "coming up" dates read through the one check (f9a2b4086)

**A correction to my earlier report:** `lib/todoTray` `comingUp` has no rendered surface. Only its unit test calls it, so the "coming up" dates I named are not on the page today. It now reads each query through `entryDatesFor`: the planned nudge or check-in via the entry's reminder, and the reply date via `expectedFor(q, a, reply)`.
- [todoComingUpEntry.test.ts](../../src/lib/todoComingUpEntry.test.ts) asserts its dates are the one check's.
- Red first against the old `todoTray.ts`: the nudge stayed on 29 Nov instead of 3 Jan, and the reply date stayed on 30 Dec instead of 3 Jan.

**Measured on the rendered page,** [ce1TodoOneDate.measure.ts](../../tests/e2e/ce1TodoOneDate.measure.ts), **9/9.** The To-do page draws a query's date in three places: the tray row's figure, the desk's header and the query card in the desk. Each is read and turned into a day.
- **fr:** row "10 days left", desk "10 days left", card "Send by Fri 4 Dec" and "by 4 Dec". All 4 Dec.
- **n** (the undated note): row and desk "180 days past expected", card "Reply was due 28 May · 180 days ago". All 28 May.
- **Population:** both tasks found; no task for q, rm or ra, whose entries give later dates.

### 3. The older holding-bubble measures, re-run (6c8c4b1c2)

- **`qc1521.measure`.** L3 had been looking for `kind === "holding"`, which this branch renamed `reply`. It had also stopped finding any card at all: the list renders QcCard154 now, not the retired `[data-qc151='row']`. `open` and `openCard` are re-pointed. The holding reply has its own lock, **L3H: 7/7 at 1280 and 7/7 at 1512.**
  - Population: the card's thread holds Query sent and one reply step.
  - The reply step is `oc-note`, `#f6f3ee`, 12px, no shadow, "Hal sent a holding reply", “Thanks — reading now.”, and the speech-bubble mark.
  - `qc1521Mutate.sh` L3H now breaks the note's `#f6f3ee`, since `HOLDING_TINT` no longer paints it. That mutation was not run.
- **`qc164.measure` L8.** It never opened the holding fixture (not in its CARDS), so its "a holding reply stays white" branch found nothing. Now any reply step must be the small note, and a `q152-holding` block opens the card and must find exactly one reply step. **All 5 holding checks pass.** That run's other 3 reds are the partial band (Deferred).
- **`holdingReply.measure`** is unchanged (Deferred): it asserts no bubble.

### 4. The query update rule's expression count (measurement only)

[tests/rules/queryExprCount.test.ts](../../tests/rules/queryExprCount.test.ts), skipped unless `SA_EXPR_COUNT=1`. Readings are in [ledger/expr-count.json](ledger/expr-count.json).
- **The threshold (the real measure).** The update was the same each time: `nudgeDate` plus `nudgeSetAt`. It ran on a query with the 7 required fields plus the first *k* optional fields, for every *k* from 0 to 65.
  - In the rule's order, it was allowed up to 16 and **denied from 17** (`rrNotes`) on.
  - In reverse order, **denied from 18** on.
  - Never allowed again after the first denial.
  - So the limit is set by how many fields are present, not by any one field. A query with every optional field present is denied every time ("maximum of 1000 expressions … @ L1115").
- **Where the cost is** (the emulator's rule-coverage report, one update, the smallest document):
  - 1,603 coverage evaluations: `isValidQuery` 1,531 (95%), the `affectedKeys().hasOnly([...])` allowlist 23, the rest `isOwner` and `isValidId`.
  - Coverage counts every node, so it is not the limit's own unit. That document was allowed at 1,603. Read these as shares, not as a count against 1,000.
- **The clauses that cost the most:**
  1. **Every optional clause costs about the same even when its field is absent** (about 24 coverage units each). There are 65 of them, so re-validating every field on every update is nearly the whole bill.
  2. Among single clauses: `materialsRequestedQuantity` (38: four type checks), `materialsWanted` (32: list or map, then size), and the 12-way `status` enum (26). The `&&` chain's own joins (line 465, 141) are counted once per clause.
  3. The update allowlist itself is cheap (23).

  The shape of a fix, for that prompt: validate only the keys the update changes, rather than the whole merged document. Not done here.

### Gates

- tsc: 0 errors.
- Related Vitest suites green at each commit (5,084 after 1; 187 after 2).
- e2e builds clean.
- Measures: one-date 9/9; qc1521 L3H 7/7 at both widths; qc164 lock 1, holding checks 5/5 (3 pre-existing partial-band reds).
- Full suite once at the tip: 951 files and 13,492 tests passing (4 skipped). It was 949 files and 13,478 at the follow-ups' tip.
