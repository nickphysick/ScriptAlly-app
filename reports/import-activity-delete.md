# The import's activity delete — a data-loss path, and the duplicate rung beside it

**Status: RAISED, NOT BUILT.** Written 15 Aug at Nick's request, before the card specification's
phases, so it survives the session. Two related pieces, both write-path, both deliberately kept out
of the card work — the card specification is a presentation piece and mixing the two is how the last
three weeks went.

---

## A · The delete

`smartImportCommit.ts` clears a query's entire activity subcollection before writing its rungs:

```ts
const actCol = collection(db, "users", userId, "queries", queryId, "activity");
const existing = await getDocs(actCol);
await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));
```

**What it destroys.** Everything the writer recorded against that query: every response logged
through `recordResponse`, every nudge from `logNudge`, every status change — the authoritative
subcollection the Query Centre reads and `recomputeQuery` derives all ten fields from. Re-importing
a spreadsheet to correct one typo silently destroys a year of recorded responses, and because
`recomputeQuery` re-derives from what remains, the query's dates and status quietly become the
import's version of events. Nothing warns, and the deletion is unrecoverable from the app.

**The law Nick set:** *an import may only delete activities the import wrote.* Provisional rungs are
the import's own and it may replace them freely; anything the writer recorded is theirs.

### The recon gate — answered, and the law IS enforceable today

Nick's gate was whether import-written rungs are distinguishable from recorded ones at the document
level. **They are, two ways, and one is already load-bearing:**

| marker | set on | durable? | already read by |
|---|---|---|---|
| document id prefix `imp-` | **every** import-written rung | yes, it is the doc id | nothing |
| `dateProvisional: true` | import rungs whose date is unknown | yes, a stored field | `recomputeQuery`'s `stageProvisional` |

So the delete can be scoped **today** to `id.startsWith("imp-")` without any schema change. ⚠️ But an
id prefix is a weaker contract than a field — it is not validated by the rules, nothing stops a
future writer from minting an `imp-` id, and it carries no reason. **The honest shape is a stored
`source: "import"` on every rung the import writes**, with the id prefix as the interim
discriminator so the law can land before the schema does. Note that `dateProvisional` alone is NOT
sufficient: it is set only on the *undated* subset, so scoping the delete to it would leave
import-written rungs that happen to have real dates undeletable and duplicating on every re-import.

---

## B · The duplicate rung — three mechanisms, with costs

The observed shape: an import writes an `OFFER` rung (provisional, ordering-key date, labelled
`(imported — date needed)`), the writer later records the real offer, and `recordResponse` appends a
second `OFFER` entry beside it rather than superseding it. Both render. Nick's reading was right;
the blame sits with the recorder, not the import.

**1 · `recordResponse` supersedes on write.** Before appending, read the subcollection for a rung of
the same `resultingStatus` carrying `dateProvisional`, and delete it — or overwrite it in place,
keeping its id. *Cost:* one extra read and a delete in the response path. ⚠️ **The undo is the hard
part**: the existing undo deletes what the write created, and it has no way to restore a provisional
rung it also removed — so undo would need to carry the deleted document, not just its id. This is
the true fix and the only one that leaves the data clean.

**2 · `recomputeQuery` ignores the superseded rung.** Leave both documents; have `deriveQueryFields`
skip a provisional rung when a non-provisional rung of the same status exists. *Cost:* no write-path
change, no undo problem, and it sits exactly where the single-writer law already lives. ⚠️ **It does
not fix the display** — the timeline reads the documents directly, so the writer still sees two
`Offer received` rows. It fixes the derived fields only.

**3 · The display collapses the pair.** `buildTimelineRows` and `dockTimeline` drop a provisional
rung when a real one of the same status is present. *Cost:* presentation-only, no write path, no
undo risk, trivially reversible. ⚠️ **The duplicate stays in the data**, so every future consumer
meets it again, and it is the option most likely to be forgotten once the symptom is invisible.

**2 and 3 together** cover derivation and display without touching a write path, and leave 1 as a
later clean-up. **1 alone** is the only one that makes the record true.

---

## Why this is urgent despite hurting nobody

Pre-launch with no users, both cost nothing today. Both cost everything the week after launch, when
the first writer re-imports a corrected spreadsheet over a year of recorded responses. This is
exactly the class of fault that gets forgotten because it has never hurt anyone yet.

---

## What landed, 16 Aug — and what is still owed

**Status: A BUILT; B built as 2 + 3 only.** Commits `dede681` (A) and the one following (B).

### A · the delete — done
Scoped to `d.id.startsWith("imp-")` in `smartImportCommit.ts`, with both caveats written at the
site: an id prefix is a weaker contract than a stored field (unvalidated by the rules, mintable by
any future writer, carrying no reason), and `dateProvisional` is not a sufficient discriminator
because it is set only on the undated subset. **Still owed: the stored `source: "import"` field**,
after which the prefix check retires.

### B · the duplicate — mechanisms 2 and 3, NOT 1
One pure predicate, `dropSupersededProvisional` in `queryDerivation.ts`, with three callers: the
derivation (`computeRecomputedFields`, ahead of BOTH `deriveQueryFields` and the `stageProvisional`
scan), the Query Centre timeline (`buildTimelineRows`), and the dock's (`dockTimeline`). One
function rather than three filters that agree today.

⚠️ **This is a remedy, not the fix, and the note must not be allowed to read as though it were.**
**Supersede-on-write (mechanism 1) remains the true fix.** After this change both documents are
still in Firestore: the record still contains the duplicate, and every future consumer meets it
again. What is fixed is what is derived from the record and what is drawn from it — not the record.
The reason 1 was not done is unchanged and is written in mechanism 1 above: the existing undo
deletes what the write created and has no way to restore a provisional rung the write also removed,
so undo must carry the deleted document rather than its id. That is a write-path change with a
data-loss failure mode of its own, and it wants a session of its own.

**One thing the recon above did not know.** `buildTimelineRows` dedupes by status keeping the
EARLIEST rung — so the Query Centre never drew a duplicate at all. It drew ONE row and drew the
WRONG one: the import's provisional rung, labelled "(imported — date needed)", over a date the
record actually held. Two surfaces, two different symptoms, one cause. The collapse runs before that
dedupe, which is what puts the real rung back.

**And a second, quieter one in the derivation.** `stageProvisional` takes the last rung at the
highest time, and `assignTimes` stamps import rungs at the moment of the import — so a RE-import
over an already-recorded response writes its provisional rung LATER than the real one, and the stage
date was then nulled against a date the writer had recorded. Nothing on screen showed it; the field
was simply absent. That case is the one the derivation-level lock pins, and the first fixture written
for it passed without the fix because the rungs were in the convenient order rather than the real one.
