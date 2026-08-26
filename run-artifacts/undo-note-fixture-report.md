# The undo's second store — Phase 1

**All three phases complete.** Phase 1 fixed at the writer; Phase 2 diagnosed and its two reds
resolved; Phase 3's fixture built, proved and run in both shapes. Phase 1 is complete: root cause, fix at the writer, all four primitives, locks
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


---

# Phase 2 — the Note that exists and never renders

## The cause, before any fix

**`boardEligible` (`src/lib/todoColumns.ts`) removes every card whose `nature` is `"note"` from all
four board columns**, deliberately, with its reason written at the rule:

> *NOTES NEVER RENDER ON THE BOARD. A note has no date, so it cannot be snoozed; it has no tick, so
> it cannot be done. Three of the four columns are meaningless for it … it is a note, and the
> Noteboard is where it belongs.*

`dockQueue` says the same thing for the pane's queue: *"Notes never enter it (they are not on the
board)."* The To-do list (`TaskList`, `.tlc .row`) is fed by `railGroups()` → `boardCols`, so a
dateless note can never be a row there. It renders on the **Noteboard**, which has its own surface
and fourteen test files.

## Is it a product bug? No — and this is the important half

**A writer's note cannot be lost.** It has a dedicated page. Nothing about it is silent: it is
counted on the To-do page (`deskState`, `filterCounts`, the search total) and rendered on the
Noteboard. The exclusion is a design decision with a stated argument, not an oversight.

## So it is fixture-shaped, and the field is `dueDate`

Last night's fixture wrote a **dateless** note — `nature: "note"` — which `boardEligible` correctly
excludes. A user task **with a `dueDate`** has `nature: "task"`, renders as a row, and reaches the
note journey, because `journeyIdFor` keys on `userTaskId` rather than on nature.

⚠️ **AND THAT NAMING IS ITSELF A TRAP WORTH RECORDING.** The row's pill reads **"Note"** for a card
whose nature is **"task"** — the pill comes from `cardBucket` (which journey), the exclusion from
`nature` (which kind). Two words, one of them used for both, pointing at different things. It is why
"seed a Note" produced something the board would never draw.

## Measured, not reasoned

Seeded one undone, dated user task and measured both surfaces:

```
TODO LIST: pills [Decide, Send, Chase, Close, Fix, Note] · the task present as a row
CALENDAR : the same task opens the pane — fork ["Tick it off","Give it a date"], .notebody rendered
```

⚠️ **This overturned my own diagnosis mid-phase and the correction is the finding.** I had traced
`boardEligible` and `dockQueue` and concluded the note JOURNEY was unreachable dead code from every
surface. It is not: a dated user task reaches it from both the list and the calendar. Reading two
filters and reasoning forward gave a confident wrong answer; one seeded row and a probe gave the
right one.

## The six now execute — four green, two red

| assertion | result |
|---|---|
| `steer:P2.3` a note requires nothing, so it carries no square | green — `count=0` |
| `steer:P5.2` a note carries no count beside its primary | green — `count=""` |
| `finish:P5.2` a note has no When segment | green — `segs=0` |
| `finish:P5.3` the note's words are the centrepiece, Caveat 26px | green — `26px Caveat, cursive` |
| **`finish:P2.3`** a note's form card is content-driven; Send's is taller | **RED** — `note 359/343 = 1.05 · send 326` |
| **`finish:P5.1`** the finishing sentence appears exactly once | **RED** — `count=2` |

**`finish:P2.3` looks superseded rather than broken.** The note's card is 359 inside a 343 scroller
and the send's is 326 — the note is TALLER. That is the same shape as P2.1 last night: the workspace
rebuild made the worksheet card FILL its column, so "content-driven, and shorter than a send" is a
claim about the pre-rebuild pane. Not fixed here; it is a retarget, and it needs measuring rather
than assuming.

**`finish:P5.1` is a TRANSITION artefact, not a duplication.** Measured three ways: exactly one leaf
element carries the sentence (`.flowinfo`, visible, 634×28), and once the pane has settled
`pane.textContent` contains it once. The count of two is read while the fork is still collapsing,
when the outgoing and incoming states momentarily coexist — `liftMotionSuppression` means animations
really run. The fix is a settle-wait in the assertion, not a change to the app.

## What is left of Phase 2

Two assertion fixes (retarget `finish:P2.3`, settle-wait `finish:P5.1`) and formalising the dated
task into the fixture. Neither is applied; both are one measured run each.

## Concurrency

Unchanged. The account was left as found: the probe task was removed and verified absent (4 user
tasks, 0 undone, probe gone).


---

# Phase 3 — the fixture, in two board shapes

`tests/e2e/seedBoardShapes.ts` — TypeScript, run through `tsx`, for one reason.

## It calls the app's own predicate

Last night's fixture reimplemented "is this a gap" and missed that `sendMaterialsRecorded` also
passes when a SEND ACTIVITY carries materials — so it kept two queries that were not gaps and
produced no card, which read exactly like the fixture not working. This one **imports
`queriesMissingMaterials` and runs it**, and suppresses through the app's own switch
(`hasRecordedMaterials(q.materialsWanted)`) rather than a second rule that could drift.

Measured: the natural gap set is **30**, computed by the app's function, not by mine.

## The two shapes, measured on the page

| | shape A · sparse | shape B · cohort |
|---|---|---|
| gaps | **1** (threshold 3) | **30** |
| Fix rows | `agentgap` + **`fillin`** — fork `["I can fill it in", "I can't remember"]` | `agentgap` + **`bulk`** |
| cohort table | **absent** (`bulkTable: 0`) | present |
| journey round | 52/52 | **53**/53 |
| steer round | 21/21 | 21/21 |
| finishing round | 29/29 | 29/29 |

## What each shape unblocks

**Shape A** makes the single-query fill-in journey measurable for the first time: the census reads
`agentgap · fillin` instead of `agentgap · bulk`, and the contract's fork renders. Phase 6's fill-in
claims had been **unit-locked only** — the card had never existed on this account.

**Shape B** is the account's natural state and is what the eleven cohort assertions need:
`steer:P5.3` and `finish:P1.1, P3.1, P4.1, P4.2, P4.4, P6.1–P6.6`.

**Both** carry the dated user task, which unblocks the six note assertions (Phase 2).

⚠️ **AND THE TWO SHAPES BREAK EACH OTHER, WHICH IS WHY BOTH SUITES NEEDED WORK.** In shape A the
eleven cohort assertions went RED — not because anything was wrong but because the card they measure
cannot exist in that shape. They now report `NOT RUN for the cohort` the way the note cases report
their absence. Without that, neither shape could ever be green and the fixture would be unusable.

## Proved, not asserted

`tests/e2e/proveShapes.ts` snapshots every field of every document in `queries`, `tasks` and
`taskFlags`, runs a shape twice, cleans, and diffs:

```
shape A · 63 documents · idempotent: YES · no residue: YES
shape B · 63 documents · idempotent: YES · no residue: YES
```

⚠️ **Its own first run reported a false residue** — it snapshotted whatever was on the account and
called the fixture's own task, left by an earlier shape, a leak that `--clean` had correctly removed.
A proof that starts from someone else's leftovers measures the leftovers. It cleans first now.

## Two faults found while building it

**`setDoc` over an existing document is an UPDATE in rules terms.** The task rewrote `createdAt`
every run, so the second run's diff carried a key the update allowlist does not name and the whole
write was **DENIED** — the affectedKeys gotcha this repo records, arriving as a hard permission error
rather than a silent one. **Delete-then-create** fixes it, which is what the brief asked for anyway
and is also what makes running a shape twice idempotent.

**A sleeping task flag would hide the one card shape A exists to show.** The engine filters a snoozed
derived task out before the board is assembled, so the fixture would have looked broken for a reason
unrelated to the gap count. Cleared and recorded for restore.

## What was checked rather than assumed

`todoPrefs` defaults every task type to ON, and `taskSurvivesMute` returns `true` for
`materials_unrecorded` whatever is muted — so neither can hide the fill-in card, and the fixture
touches neither. An earlier draft carried a `prefsBefore` field and a restore branch that wrote to a
placeholder document: dead code pretending to put something back. Removed.
