# Controls: entry v1: the reply that sits between steps

Branch `controls-entry-v1`, cut from the dev line `…-rar211-laqunk` (f3659638d). Commits: b4f13f669 (pack), a23138a06 and 551b4e4c1 (Phase 1), 2de908052 and 1a69db877 (Phase 2), c1cfe0bec (Phase 3), 172ae304d (Phases 4 and 5), plus this report. Nothing is merged and main is untouched. **Dev Firestore rules are deployed. Dev hosting is NOT deployed** (see "Deploy").

Gates, against the baseline: tsc was 0 errors and is 0. The build was clean and is clean. Vitest was 944 files and 13,415 tests passing; it is now 946 files and 13,441 tests passing (full suite). tsc needs `NODE_OPTIONS=--max-old-space-size=8192` on this tree; at the default heap it aborts with V8 exit 134.

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

**The to-do task's date does NOT follow:**
- "Send Imogen your full · 3 days waiting" is unchanged. The task shows no Send by.
- The gone-quiet query that now expects a reply on 15 Jan changes from "gone quiet" to **"Nudge Jules · 180 days past expected"**. That is wrong: the agent has just given a new date.

The to-do engine keeps its own clock (`taskDue`, `replyTask`, `comingUp` and `todoBuckets` read `nudgeDate`, `expectedSendDate` and `responseReceivedAt` directly), so the entry moves none of it. Not built here, as the brief says. See "Deferred".

## The rules change, for Nick to deploy to prod

Written out in [rules-prod.diff](rules-prod.diff), against the dev line's rules. ⚠️ Prod's `release/live-1` rules are 210 lines behind the dev line, so this goes on top of the rest of the dev line's rules work, not alone. In words:
1. `isValidActivityNested`: add `'replyKind', 'replyDate'` to the `hasOnly` list. Validate `replyKind in ['chaser', 'holding', 'note']` and `replyDate is string && size() <= 32`.
2. `isValidActivity` (the feed): add `data.activityType == 'Agent Reply'`, and the same two validators.
3. The feed's update allowlist (`affectedKeys().hasOnly`): add `'replyKind', 'replyDate'`.

Command: `npm run deploy:rules` (Nick's).

## Deploy

- **Dev rules:** deployed and probed (above).
- **Dev hosting: STOPPED.** Dev serves `index-DQIDPfLr.js`, which nothing I can find builds:
  - the dev line's pushed and local tips build `index-C_VVU1di.js` (`…-laqdoor`) and `index-DV11HxiY.js` (`…-aa215` and `add-agent-v2-15`);
  - builds here reproduce exactly (`f3659638d` rebuilt to the `index-CoYsbCK9.js` dev served at the start).

  So dev holds another session's unpushed or dirty build, and the rule is: no deploy over an unknown bundle. Once the source is known: merge `controls-entry-v1` into it as a new `…-ce1` branch, build, deploy, and confirm the hash.

## Deferred, with owners

- **The to-do engine reading the entry** (Send by on the "send the full" task; no "nudge past expected" task after an entry with a new date). Owner: a to-do pass after Controls: journeys v1. It touches `taskDue`, `replyTask`, `comingUp` and `todoBuckets`.
- **The reminder's set-at stamp.** `nudgeDate` has none, so "a reminder set before the entry" is read as "a reminder falling before the new date". A reminder the writer sets earlier, after the entry, is also moved. Owner: Controls: journeys v1, which asks the writer.
- **Correcting an entry's kind and new date in the card.** `editActivity` supports both. The card's existing step editor offers When, Their words and Delete. Owner: Controls: journeys v1.
- **The note's glyph** (speech bubble in the ref, the holding mark here). Owner: Nick, to rule.
- **Existing e2e measures that drew the old full holding bubble** (`qc1521`'s "holding" fixture) will see the note now. Not re-run. Owner: the next Query Centre measurement pass.
- **The emulator's 1,000-expression flake** on the feed and query update rules. It predates this change. Owner: rules.
- **Prod rules** (above). Owner: Nick.
