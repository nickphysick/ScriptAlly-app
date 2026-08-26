# The undo's second store — Phase 1

**Stopped at the Phase 1 boundary.** Phases 2 (the invisible Note) and 3 (the fixture in two shapes)
are not started. Phase 1 is complete: root cause, fix at the writer, all four primitives, locks
proved red, and a consistency audit that can be run against the account.

SHA: see `git log` for `todo: an undo removes both stores`.

---

## The answer the correction UI needs, first

**Yes — both `editActivity` and `deleteActivity` had the same hole, and `deleteActivity`'s was the
dangerous one.** Neither is safe to build a correction UI on as they stood. Both are fixed here.

| primitive | what it did | direction of the damage |
|---|---|---|
| `undoQueryStatus` | deleted the authoritative doc, then made a **best-effort** projection delete, matched **heuristically against React state**, logged on failure | orphan **projection** — the timeline shows a close the derived status does not have |
| `deleteActivity` | deleted the **feed** row, then tried the subcollection twin *by the same id* inside a swallowing `catch` | orphan **authoritative doc** — the writer deletes a rejection from the timeline and `recomputeQuery` **goes on deriving Rejected** from the copy nobody can see |
| `editActivity` | patched the authoritative doc, then a **best-effort** same-id feed patch, swallowed | the dashboard keeps the **old wording, date or status** of an event the writer has corrected |
| `moveActivity` | batched both **by the same id** | a divergent feed row is **left naming the old query** — in the one operation whose whole purpose is to change which query an event belongs to |

Each carried a comment saying the divergence was acceptable. `editActivity`'s read: *"Projection row
has an independent id — cosmetic only, recompute doesn't read it."* It is not cosmetic in either
direction, and the authoritative direction is a silent data fault rather than a display one.

## The root cause, and it is one writer

`recordMaterialsSent` minted an **auto-generated Firestore id** for the subcollection and a separate
`act-<random>` for the feed. The same event lived under two ids, so **no delete-by-id could ever
pair them** — which is exactly why each caller had grown a heuristic instead. Every other writer in
`db.tsx` already used one id for both.

Fixed at the writer: one `actId`, both stores. A lock now forbids `doc(collection(…, "activity"))`
**anywhere in the file**, because the next offender will be a new function rather than this one.

## The fix

One primitive, `removeActivityEverywhere(queryId, id)`:

- **accepts either store's id** — `deleteActivity`'s caller holds a feed id, `undoQueryStatus`'s
  holds a subcollection one. My first version took only the latter; that would have been a
  *regression*, deleting nothing for the former on exactly the divergent rows it exists to clean up.
- **pairs historical divergence** narrowly: same query, same resulting status, nearest timestamp.
  Anything looser would delete a different event that happens to share a status, which on a query
  with two rejections is a real possibility. A row with no status is left alone rather than guessed.
- **commits one `writeBatch`** — all deletes or none, so a failure cannot leave the pair half-removed.

`editActivity` and `moveActivity` batch both stores the same way. `deleteActivities` (the bulk
remove the correction UI uses) delegates to `deleteActivity` and inherits the fix; its restore
already wrote both back.

Two regressions of my own, caught before commit: the primitive taking only one id, and
`deleteActivity` losing the ability to delete a **feed-only** activity (one with no `queryId`, such
as "Added new title") because I had moved the delete inside the query branch.

## Is there a third store?

**No.** There is no user-level singular `activity` collection anywhere in `src/` — the only
`"activity"` path is `users/{uid}/queries/{id}/activity`, and the two other matches are an icon name
(`OneScreenMark name="activity"`). Nothing to consolidate, so nothing was.

## Every path that touches an activity, classified

| path | both stores? |
|---|---|
| `addQuery` seed · `updateQueryStatus` · `logNudge` · the §3299 writer | ✓ one id, both stores (the last also deletes both on failure) |
| **`recordMaterialsSent`** | ✗ **divergent ids — root cause, fixed** |
| **`undoQueryStatus`** · **`deleteActivity`** · **`editActivity`** · **`moveActivity`** | ✗ **fixed** |
| `deleteActivities` (bulk) | ✓ delegates; inherits the fix |
| `deleteQuery` cascade | ✓ **immune** — enumerates subcollection docs by `ref` and feed rows by `queryId`, so ids never enter it |

## The locks, and each was proved red

`src/lib/activityStores.test.ts`, 10 assertions. Proved by reverting the fix each one guards:

| mutation | result |
|---|---|
| batch → two loose deletes | 1 failed |
| undo stops using the primitive | 2 failed |
| `recordMaterialsSent` back to an auto-id | 2 failed |
| `editActivity` loses its batch | 1 failed |

Restored: 10/10 green.

⚠️ **It is a SOURCE lock, which is the weaker kind**, and it says so at the top. It proves no
primitive still writes one store alone — a claim about code, which is where this fault lives. It
cannot prove the account's documents agree.

## The data-level check: `tests/e2e/auditActivityStores.mjs`

Read-only, compares both stores per query. Current state of the harness account:

```
46 queries · 43 paired events
orphan projections: 25   orphan logs: 20   divergent ids: 17
```

⚠️ **Most of that is the SEEDS, not the app** — a separate and smaller finding. The `seed-pkg*`
family writes its feed row and its log doc under different ids (`seed-pkgact-N-out` against
`act-status-…-seed-pkgq-N`) and omits the `Queried` log doc entirely. The audit cannot tell a seed's
inconsistency from a delete's, so the counts are a **floor on agreement, not a proof of it**.

⚠️ **And the first run of the audit was wrong in a way worth recording.** Its identity key was
(query, status, **day**), so a seed that wrote the two stores on two different dates appeared as an
orphan projection *and* an orphan log — one event counted twice as two faults, at 38 and 28. The key
is (query, status) now, and the cost of loosening it is stated in the file: two rejections on one
query collapse to one key.

⚠️ **One orphan log is mine.** `seed-query-1 | No Response` — last night's residue repair deleted a
feed projection whose log doc I could not prove was created by my run, so the pair is now asymmetric
in the other direction. Stated rather than quietly re-balanced.

## False premises found

- **"the vestigial global singular `activity`"** — there is no third store. The brief allowed for one
  and the survey found none.
- **The fault is not confined to undo** — that half of the brief was right, and understated: three
  primitives carried it, and the worst of them (`deleteActivity`) leaves the *authoritative* store
  dirty rather than the projection.

## Concurrency

This session owned the activity writers and `db.tsx`. Other sessions committed to the calendar and
waitlist areas throughout; no overlap. Gates run against my own baseline: tsc clean, 7,093 unit
tests, production build clean.
