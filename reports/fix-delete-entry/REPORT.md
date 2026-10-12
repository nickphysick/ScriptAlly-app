# fix-delete-entry — option 1 (clear only)

Branch `fix-delete-entry`, off `main` at `13313c9d`. Not merged, not deployed. No change to `firestore.rules`,
to `recomputeQuery` or to `correctionGuards.ts`.

## False premises and things that differ from the brief

1. **"Timestamps excepted" turned out to be none.** Every field `recomputeQuery` writes comes from the log, and
   the log is back to its starting entries, so `lastStatusChange` and `responseReceivedAt` come back exactly.
   D1 compares every field with no exceptions.
2. **Journeys also clear earlier values, not only write over them.** A send removes the send-by date and its
   reminder. A response or a close removes the planned nudge and the planned close. Deleting that entry does not
   put them back. This is the same known limit as D2 and is in OPTION-2.md.
3. **A response's "send" and "nudge" rows already shared an id with their log entry.** Only rows written by
   `recordQueryResponse` (responses, requests, offers, closes) had two ids. Those now carry `logEntryId`.
4. **P13 is not switched here.** It lives on `query-panel-v1`, which does not have this fix. Switching it to
   assert there would make it red until the two branches meet. D1's "request" case asserts the same thing on
   this branch. I will switch P13 on whichever branch first holds both.

## What changed

- `src/lib/entryDelete.ts` (new, no Firebase): which journey fields to clear, and which feed row belongs to a
  deleted entry.
- `src/lib/entryDeleteWrite.ts` (new): one batch that deletes the entries and their feed rows and clears the
  fields, then `recomputeQuery`.
- `src/components/Queries.tsx`: "It never happened" calls it. The Undo snapshot is taken first, as before, and
  now also covers other queries carrying this query's offer mark.
- `src/lib/recordResponse.ts`: the feed row is written with `logEntryId`. `src/types.ts`: the field.

### The rule for clearing

A field is cleared when the entry that owns it is no longer in the log.

| Fields | Cleared unless |
| --- | --- |
| `expectedSendDate`, `sendReminderDate` | the status is still a request |
| what was asked for (`materialsRequested*`, `requestSynopsis`, `requestFrom`, `requestFromUnit`, `rrNotes`) | a request is still in the log |
| `offerDate`, `offerResponseDeadline`, `offerNotes`, `offerCallOn` | an offer or the signing is still in the log |
| `closingReason`, `closingNotes`, the `rejection*` fields, `rejectedFromStatus`, `withdrawTold`, `agentRecheckOn` | the status is still closed |
| `lastNudgeSentDate`, `closePlan` | a nudge is still in the log |
| `writerExpectedDate`, `writerExpectedSetAt`, `nudgeDate`, `lastSentLabel` | the deleted entry was not the latest send |

Deleting the last offer also removes its marks (`offerRefQueryId`, `offerTold`, `offerToldOn`) from the other
queries.

### Finding the feed row

1. `logEntryId` on the row (every row from now on).
2. The row has the entry's own id (nudges, sends, seeded rows).
3. Older rows: same query, same type, same place in time order. Used only when the query has the same number of
   log entries and unclaimed feed rows of that type. Otherwise the row is left.

Dev's rules accepted `logEntryId` on create with no change: the feed row's create rule has no key allowlist.
**Prod rules are the same file, but I have not tested prod.**

## Locks: `tests/e2e/deleteEntry.measure.ts`

Each case seeds a clean query on a manuscript of its own (`tests/e2e/seedDeleteEntry.mjs`, prefix `fde-`), writes
the entry through its journey, deletes it with "It never happened", and compares. The fixture is removed at the
end of the run.

| Lock | Green | Red under "skip the clear" (`FDE_MUTATE=D1`) | Red under "look for the row by the entry's id" (`FDE_MUTATE=FEED`) |
| --- | --- | --- | --- |
| D1 response (a pass) | every field as it started (13; 15 for the send case); no feed row | `rejectionFeedbackType` left | the row left |
| D1 request | same | `expectedSendDate`, `sendReminderDate` left | the row left |
| D1 send | same | `lastSentLabel`, `nudgeDate`, `writerExpectedDate`, `writerExpectedSetAt` left | green (shared id) |
| D1 nudge | same | `closePlan`, `lastNudgeSentDate` left | green (shared id) |
| D1 offer | same | `offerDate`, `offerResponseDeadline` left | the row left |
| D1 close (withdrawn) | same | `closingNotes`, `closingReason`, `withdrawTold` left | the row left |
| D2 known limit | status back to Partial requested; both send-by fields hold the deleted entry's value; every other field as it started; no feed row | green (not about the clear) | the row left |

Runs: `green-run.txt` (8 passed), `mutation-D1.txt` (6 failed), `mutation-FEED.txt` (5 failed). Ledgers in
`ledger/`.

Unit locks: `src/lib/entryDelete.test.ts`, 19 cases. One of them reads `recomputeQuery.ts` and fails if this
module ever names a field recompute writes.

## Existing feed rows that cannot be matched

Read-only census of the dev harness account (`tests/e2e/censusFeedRows.mjs`, output in `census.json`). I cannot
read prod.

| | Count |
| --- | --- |
| Queries | 73 |
| Log entries | 113 |
| Row found by a shared id | 27 |
| Row found by type and place in time | 16 |
| Row found by `logEntryId` | 0 (no row had it before this fix) |
| No feed row of that type exists for the query, so nothing to remove | 69 |
| **A row exists but cannot be matched** | **1** (`seed-query-10`, Full sent: one log entry, two feed rows of that type) |

Separately, 161 status or nudge feed rows on those queries are claimed by no log entry at all. They are seeded
rows and leftovers from older test runs, not from deletes; no delete can reach them because there is no entry
to delete. The fix does not touch them.

## Gates

| | main `13313c9d` | this branch |
| --- | --- | --- |
| tsc | clean | clean |
| Production build | clean | clean; neither mutation switch is in the bundle |
| Dev build | clean | clean |
| Vitest | 8,563 passed, 3 skipped, 1 file fails to load (`functions/src/email.test.ts`) | 8,582 passed, 3 skipped, the same 1 file |

Not re-run: the other rendered suites. The change is confined to the delete path.

## Not done

- No merge, no deploy.
- Option 2 (restore what an entry replaced) is written up in `OPTION-2.md`.
- The Undo bar after a delete was not exercised by the new locks; it uses the same snapshot as before.
