# Option 2: restore what a deleted entry replaced

A proposal for a later pack. Not built.

## What option 1 leaves

Deleting an entry clears every journey field its owner no longer holds. It cannot put back a value the entry
wrote over, because nothing recorded that value. Lock D2 shows the case: a query at Partial Requested with a
send-by date, then a Full Requested response with its own send-by date, then that response deleted. The status
goes back to Partial Requested and the send-by date stays the deleted entry's.

The fields this can happen to:

| Field | Written over by |
| --- | --- |
| `expectedSendDate`, `sendReminderDate` | a second request |
| `materialsRequestedType`, `materialsRequestedQuantity`, `requestSynopsis`, `requestFrom`, `requestFromUnit`, `rrNotes` | a second request |
| `writerExpectedDate`, `writerExpectedSetAt`, `nudgeDate`, `lastSentLabel` | a second send; also cleared by a response |
| `lastNudgeSentDate`, `closePlan` | a second nudge |

## The change

Each log entry stores what it replaced, and the delete puts it back.

1. **Write.** When a journey saves, it reads the query's journey fields first and writes the ones it is about to
   change onto the new log entry, in one field: `replaced`, a map of field name to the earlier value, with a
   marker for "was absent". One place does this: the drawer's save, which already reads the query for its undo
   snapshot.
2. **Delete.** `deleteTimelineEntries` reads `replaced` from the entry being deleted. For each field: if the
   query still holds the value this entry wrote, restore the earlier value; if a later entry has written over it
   since, leave it alone. Fields the entry does not list fall back to option 1's clear.
3. **Out of order.** Deleting an entry that is not the newest of its kind needs one more step: the next entry of
   that kind has the deleted entry's value in its own `replaced`, and that must be re-pointed at the deleted
   entry's `replaced`. Otherwise a later delete restores a value that should no longer exist.

## The rules change

`queries/{id}/activity/{entry}` is validated on create. `replaced` is a new field there, so `firestore.rules`
needs:

- `replaced` allowed on create, as a map, with a size limit and a fixed set of keys (the fields in the table).
- `replaced` allowed in the entry's update allowlist, for step 3.

This is a nested map, so it will meet the nested-allowlist behaviour already recorded for materials: the keys
must be named in the rule or the write is refused without a message. Dev rules can go out with the pack; prod
rules are Nick's.

## What it does not fix

Entries written before the pack have no `replaced`. Deleting one of them behaves as option 1 does today.

## Size

About a day: the write (one function), the delete (one function and its unit tests), the rules, and a rendered
lock that turns D2 from "the entry's value or cleared" into "the earlier value".
