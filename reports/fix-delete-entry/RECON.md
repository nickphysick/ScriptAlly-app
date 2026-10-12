# fix-delete-entry — §0 recon, and why I stopped

Branch `fix-delete-entry`, cut from `origin/main` at `13313c9d`. **No code is changed.** The fix as specified
needs a `firestore.rules` change or a wider `recomputeQuery` contract, so I stopped here, as the brief says.

## What "It never happened" does today

`confirmEntryDelete` in `src/components/Queries.tsx`:
1. takes a snapshot (for the Undo bar);
2. deletes `users/{uid}/queries/{q}/activity/{entryId}` and `users/{uid}/activities/{entryId}`, the SAME id in
   both stores;
3. calls `recomputeQuery`.

`recomputeQuery` (`src/lib/recomputeQuery.ts`) derives exactly ten fields from the remaining log and writes them:
`status`, the four stage dates, `revisionRound`, `hasAgentResponded`, `responseReceivedAt`, `rejectedDate`,
`lastStatusChange`. That is its whole contract.

## 1. Which fields the delete leaves behind

P13 named three. One of them was wrong.

| Field | Left behind? | Who wrote it |
| --- | --- | --- |
| `responseDeadline` | **No. My fixture's fault.** | It is a retired stored field. `db.tsx`'s expected-date migration drops an agency-derived one on load. The seeder wrote one, the page loading removed it, and P13 read that as the delete failing. The seeder no longer writes it |
| `expectedSendDate` | Yes | `recordQueryResponse` (`src/lib/recordResponse.ts`), for a partial, full or R&R request |
| `sendReminderDate` | Yes | the same |

Those two are the visible ones for a request. The same thing is true of every field a journey writes straight
onto the query, which is most of what a journey saves:

| Entry type | Written by | Fields on the query, outside the log |
| --- | --- | --- |
| Response / request | `recordQueryResponse` | `materialsRequestedType`, `materialsRequestedQuantity`, `fullVersionSent`, `expectedSendDate`, `sendReminderDate`, `rrNotes`; then the journey: `requestSynopsis`, `requestFrom`, `requestFromUnit`, and it CLEARS `nudgeDate` and `closePlan` |
| Send | `recordMaterialsSent`, then `SentJourney` | the sent package and materials fields, and it CLEARS `expectedSendDate`, `sendReminderDate` and `nudgeDate` |
| Nudge | `NudgeJourney` | `lastNudgeSentDate`, `closePlan`, and it CLEARS `nudgeDate` |
| Offer | `recordQueryResponse`, then `OfferJourney` | `offerDate`, `offerResponseDeadline`, `offerNotes`, `offerCallOn`; and on every OTHER live query `offerRefQueryId` and `offerTold` |
| Close / pass | `recordQueryResponse`, then `CloseJourney` | `closingReason`, `closingNotes`, the `rejection*` fields, `rejectedFromStatus`, and it CLEARS `nudgeDate` and `closePlan` |

`recordQueryResponse` writes its whole set on every call: each field is either set or deleted. So these fields
always describe the LATEST response, and nothing else.

## 2. Why `recomputeQuery` does not re-derive or clear them

Because they are not derived from the log. They are answers the writer gave in the journey (a send-by date, a
reminder date, an offer deadline, a close reason), written once onto the query document. The log entry for the
same act carries only its status, its time, a note and a few display fields (`materialsType`, `eventKey`). The
log cannot reproduce them, so recompute has nothing to derive them from.

And where a journey CLEARS or OVERWRITES a field (`nudgeDate`, `closePlan`, the previous request's
`expectedSendDate`), the value that was there is gone. Nothing records it.

## 3. Why the feed row survives

`recordQueryResponse` creates the log entry and the feed row with two separate auto-generated ids, and neither
document names the other. The delete removes `activities/{logEntryId}`, which is not the feed row's id, so it
deletes nothing. It works for entries whose two documents share an id (the nudge journey, the offer call, seeds
and imports). It fails for everything written through `recordQueryResponse`: requests, passes, offers, closes.

P13 saw the row gone in one early run. I cannot explain that run; in every run since, it is left.

## Why this is a stop

"Exactly as it would be if the entry had never been written" has two parts.

**Part one, clearing what the deleted entry set, can be done without touching the rules or the contract.** After
recompute, the delete path can clear every journey field that the query's resulting status cannot own (a Queried
query owns no send-by date, no offer deadline, no close reason). The feed row can be found and deleted in the
same batch by `queryId` + `resultingStatus` + `eventKey`.

**Part two, putting back what the deleted entry replaced, cannot.** Two examples:

- A query is Partial Requested with a send-by date of 1 Nov. The agent then asks for the full and the writer
  records it with a send-by date of 20 Nov. Delete that entry: the query is Partial Requested again, and its
  send-by date should be 1 Nov. That value was overwritten. It is not in the log.
- A query has a planned nudge (`nudgeDate`). A response is recorded, which clears it. Delete the response: the
  planned nudge should come back. It was deleted.

To restore those, each entry has to carry what it replaced, or the fields have to be derived from values the
log entries carry. Either way:

- the per-query log entry and the feed row are both guarded by a `hasOnly([...])` allowlist in
  `firestore.rules` (`isValidActivityNested`, `isValidActivity`). A new field on either is denied. So storing
  "what this entry replaced" needs a **rules change**;
- deriving the fields in `recomputeQuery` widens **its contract** from ten fields to all of the above, and the
  log entries would still need the new fields to derive them from.

## Options

1. **Clear only, no rules change.** Build part one: the status-ownership clear and the feed row in the same
   write. Lock D1 would hold "equals the starting snapshot" for an entry written onto a query that had none of
   those fields, which is every case in the brief's list as written (write one entry on a test query, delete
   it). It would NOT hold where the entry overwrote or cleared an earlier value. I would state that limit in the
   lock.
2. **Store what each entry replaced.** A small `prior` map on the log entry, written by `recordQueryResponse`
   and the journeys, read by the delete. Exact in every case. Needs the rules change (dev is mine to deploy,
   prod is yours) and does nothing for entries already written.
3. **Make the Undo snapshot the delete.** The delete already takes a snapshot for its Undo bar. That only helps
   for undoing the delete, not for deleting an old entry, so it is not an answer on its own.

I recommend 1 now and 2 as its own pack, because 1 fixes what a writer actually sees today (a send-by date and
a reminder left on a query that is back to Queried, and a stale row in the feed) and 2 changes stored data and
rules.

## P13

P13 lives on `query-panel-v1`, which is not on `main`, so it cannot be switched from this branch. Once a fix
exists, the switch is a two-line change there (assert `expectedSendDate` and `sendReminderDate` are absent and
no feed row is left), and it will be red until the fix and the panel are on one branch.
