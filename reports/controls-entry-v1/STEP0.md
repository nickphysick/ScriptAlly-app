# Controls: entry v1 — Step 0 recon (24 Nov)

Worktree `/Users/nickphysick/ScriptAlly-ce1`, branch `controls-entry-v1`, cut from
`…-rar211-laqunk` at f3659638d (dev serves `index-CoYsbCK9.js`, that line). Design ref
`controls-v2.html` hash matches `bf56e079…ec001`. Nothing edited, nothing committed.

## False premises

1. **recomputeQuery derives none of last heard, send-by, reply-expected, the nudge or Gone quiet.**
   It writes ten fields only (`status`, the four stage dates, `revisionRound`, `hasAgentResponded`,
   `responseReceivedAt`, `rejectedDate`, `lastStatusChange`; `src/lib/recomputeQuery.ts:47`). The rest:
   - Send by = `q.expectedSendDate`, a stored field the journeys write (`qcSummary.expectedFor:156`, `qcCardView.ts:151`).
   - Reply expected = `expectedFor` from the sends + agent weeks + `q.writerExpectedDate` (`resolveExpectedDate`);
     it passes `null` for a reply's stated window (`qcSummary.ts:160`), so today's holding reply does not move it.
   - Nudge = `q.nudgeDate` (the writer's reminder, stored) and `q.lastNudgeSentDate` (`queryState.ts:85-92`).
   - Gone quiet = read-time, from `expectedMs`, the nudge and the quiet window (`queryState.queryState:94`).
   - Last heard: two readers. The card's Agent tab takes the latest step on the agent's side
     (`qcCardView.ts:185`, holding counts). The Query Centre's "Last heard" column counts agent STATUS
     moves only (`qc151.lastHeardMs:68`).
   So "recomputeQuery sets last heard and moves the dates" needs a ruling (below).
2. **A reply that moves nothing already exists: the "Holding reply".** Nested `type: "Holding reply"`,
   feed `activityType: "Holding Reply"`, no `resultingStatus`, `replyWeeks` and the words in `note`
   (`src/lib/holdingReply.ts`, writer `db.recordHoldingReply:4094`, caller the old ResponsePane in
   `Queries.tsx:932`). The query card already draws it as a step (full bubble, "Sent a holding reply"),
   the Notes tab lists its words ("when replying"), and Agent-tab Last heard counts it. Six readers key on it
   by name (wait-clock re-base, close/nudge suppression, "been in touch", the To-do calendar, the place line,
   nudge outcome). Adding "one type" means folding this one in, not a second.
3. **No database rule blocked "Something else".** v2's report named the activity allowlist. The nested log's
   `type` is any string ≤128 (`firestore.rules:621`); the feed already allows `'Holding Reply'`. What the new
   entry needs is two keys in `isValidActivityNested`'s `hasOnly` list (the kind and the new date) and, if the
   feed twin gets its own name, one value in `isValidActivity`'s `activityType` list.
4. **Agent history v1 is not on the dev line** (no "Correspondence only" anywhere). The brief covers this:
   the note goes into History as drawn today.

## True premises

- Record a response v2.1 (and v2.1.1) is on the dev line (fb4409d8e).
- Parts: query card Tracking = `QcCard152` + `QcBubble152` from `qcCardView.buildCardView` (`qcThread152`);
  Notes tab = `QcNotes158` (`quotesOf`, `quotePhrase`); Agent tab = `QcAgent158` (Last heard tile, `lastHeardMs`
  prop); agent card = `AgentCard262` with History = `QcThreadRead` fed by `useAgentThreads` → `buildCardView`
  (so it inherits the card's steps) and Notes = `NotesTab158`.

## Where replies are counted

Every response rate, reply time, the Responses tally, Analytics `v.tally` and the Dashboard median are gated on
`resultingStatus` or fields derived from it, so an entry with no status is already out — PROVIDED its nested
`type` is not a `QueryStatus` member (`recomputeFields.ts:21` reads `type` as a status). Sites that would pick it up:
- `qcSummary.buildQcRows` `lastMs` (every feed row): "Last in touch", "Closed {date}", recency sorts.
- `queryAmbient.agentRepliesForManuscript:580` (the "Nth response" line) counts Holding Reply by name.
- `todoCalendar` RECORD_TYPES (exchange N, THEY REPLIED) counts Holding Reply as `in`.
- `dashFeed`/`dashFeedDrawer` "N replies from agents": an entry with an eventKey but no RECORD_TYPES entry counts as "did".
- `nudgeState.nudgeOutcomeLabel` by kind.
Phase 2's locks go on these plus the status-gated ones the brief names.
