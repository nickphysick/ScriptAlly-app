# One-off recompute sweep — tool + run notes (5 Aug 2026)

A **temporary, DEV-only** tool at `#/recompute-sweep`, built to heal historical queries that will never recompute on their own.

> **Closed 6 Aug 2026.** Nick ran the sweep on dev; the tool has been **removed** — the route, its `App.tsx` branch and `RecomputeSweep.tsx` are gone. The "How to run it" section went with them. The pure `computeRecomputedFields` export **stays**: `recomputeQuery` is built on it, and its tests are now titled for that job rather than for the deleted preview. This report is kept as the record of why the sweep was needed and what it changed.

## Why it exists

Tiers 1 and 3 made `responseReceivedAt`, `rejectedDate` and `lastStatusChange` **derived** fields, written only by `recomputeQuery`, on the stated assumption that existing records heal on their next recompute. That assumption holds for live queries — every mutation path ends in a recompute — and **fails precisely where it matters most**: a rejected or withdrawn query is closed, so nothing ever touches it again, so it never gains the `rejectedDate` that the package reply-time maths reads.

The consequence, established in the Tier 3+4 recon: `avgReplyDays` and `medianReplyDaysAll` build their first-move candidate list as `[partialRequestedDate, fullRequestedDate, rejectedDate].filter(Boolean)`. A query **rejected without a prior request** — the most common outcome in querying — produced an empty list and was skipped entirely. Those queries were **silently excluded** from reply-time figures: not defaulted, not degraded, but **wrong by omission**, biasing every average toward the agents who engaged.

## What the tool does

Three states, and nothing happens between them without a button press.

1. **On load** — describes itself and shows an aggregate **count** of the signed-in user's queries. That count is a Firestore aggregate query: no document reads, no writes.
2. **Dry run (reads only)** — walks every query, computes what `recomputeQuery` *would* write, and tables each difference: agent, current status, field, stored value, proposed value. It finishes with a total ("scanned N; M would change") and a per-field tally. **It writes nothing.**
3. **Run sweep (writes)** — a separate, visually distinct button. Recomputes every query sequentially with live progress (`37 / 214`), pausing 120ms between writes. Each query reports success or failure; **a failure is recorded and the run continues**, so one permission denial cannot strand the rest. Failures are listed with their error.

**Idempotent and safe to re-run.** `recomputeQuery`'s input (the activity subcollection) is disjoint from its output (fields on the query doc) — it never writes the log it reads — and the derivation is pure and order-independent. A second pass over an unchanged log writes identical values; the honest way to confirm the sweep worked is to **dry-run again and see zero changes**.

### How the dates compare

Stored `lastStatusChange` may be a Firestore `Timestamp` while the derived value is an ISO string. The dry run compares dates **by instant**, not by shape, so a same-moment `Timestamp` → ISO rewrite is not reported as a change — otherwise every query would look like it needed one and the real differences would drown. Presence/absence always counts. (The live sweep does still rewrite those to ISO; the rules accept both shapes.)

## The owner-scoped limitation — a rules guarantee, not a gap

The tool uses the app's own auth and the **client** SDK, so the security rules confine every read and write to the **signed-in account's own queries** (`isOwner(userId)` on every path). There is no admin SDK and no service-account credential here, and repurposing the Firebase CLI's tokens to reach other users' data is off-limits. So this heals **your** records. If other accounts ever need the same heal, that is a server-side job (a Cloud Function under the Admin SDK), scoped and reviewed separately — not something to engineer around from the client.

## Expected consequence — longer reply times are the fix working

After the sweep, **package reply-time figures will read longer than before**, possibly markedly so. That is correct: straight rejections have re-entered the average, and rejections are typically the slowest outcomes — the ones that previously sat outside the maths altogether. The old figures were flattering because they only counted agents who asked for more.

Also expect: `Fortnight in Focus` and the dashboard event chains dating some historical events by the rung's own time rather than an old recording stamp, and `hasAgentResponded` / `revisionRound` correcting on any record whose stored value had drifted from its log. The dry run tells you exactly which, before anything is written.

## Scope: this heals dev, and that is the intent

The sweep runs against `scriptally-dev`, under the signed-in dev account — the database this project is worked on.

**Prod is untouched, and does not need this tool to become correct.** The fix is forward-correct by construction: once prod receives the Tier 3+4 rules and hosting deploy, every response recorded from that moment derives `rejectedDate`, `responseReceivedAt` and `lastStatusChange` properly. Only queries already *closed* before that deploy would keep stale fields — and with no live users, whether any such record matters is a separate question, parked here rather than answered. (If it ever needs answering: the dry run writes nothing, so it can report the shape of the problem without changing anything. That would be a deliberate decision, not part of this run.)

## After the sweep — done

Nick ran it on dev on 6 Aug 2026 and confirmed it complete; the tool was removed the same day. What survives the removal:

- **`computeRecomputedFields`** — the pure payload builder, now simply the honest unit inside `recomputeQuery`, with its own tests (purity, the `null` ⇄ `deleteField` mirror, the provisional guard, the empty log).
- **This report**, as the record of why closed records needed healing and what changed when they were.

What is gone: `src/components/RecomputeSweep.tsx`, its `App.tsx` route branch, and this report's "How to run it" section.
