# One-off recompute sweep — tool + run notes (5 Aug 2026)

A **temporary, DEV-only** tool at `#/recompute-sweep`, built to heal historical queries that will never recompute on their own. **It is Nick's to run, and it gets deleted afterwards** (Phase 3 below).

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

## How to run it

The tool is `import.meta.env.DEV`-gated, so it **cannot appear in a production build** — verified empirically: the production bundle contains neither `Recompute sweep` nor `recompute-sweep`, while the deliberately un-gated `Notes-store scan` string *is* present (the control proving the check works). The DEV gate keys off the dev **server**, not the env file, so the two combinations are:

| Target | Command | Reaches |
|---|---|---|
| Dev data | `npm run dev` → `http://localhost:3000/#/recompute-sweep` | `scriptally-dev` |
| **Prod data** | the existing `scriptally-prod-env` launch config (`npm run dev -- --mode production --port 3002`) → `http://localhost:3002/#/recompute-sweep` | `gen-lang-client-0801391782` |

**The second row is the one that matters** — your real querying history lives in prod, and a dev-server build pointed at `.env.production` keeps `import.meta.env.DEV` true (so the route renders) while loading the prod Firebase config. Both were checked: the route renders and reports the expected project ID in each case. The page prints the live Firebase project at the top — **read it before pressing anything.**

Then: sign in as normal → **Dry run** → read the table → **Run sweep** → dry-run once more to confirm zero changes.

## The owner-scoped limitation — a rules guarantee, not a gap

The tool uses the app's own auth and the **client** SDK, so the security rules confine every read and write to the **signed-in account's own queries** (`isOwner(userId)` on every path). There is no admin SDK and no service-account credential here, and repurposing the Firebase CLI's tokens to reach other users' data is off-limits. So this heals **your** records. If other accounts ever need the same heal, that is a server-side job (a Cloud Function under the Admin SDK), scoped and reviewed separately — not something to engineer around from the client.

## Expected consequence — longer reply times are the fix working

After the sweep, **package reply-time figures will read longer than before**, possibly markedly so. That is correct: straight rejections have re-entered the average, and rejections are typically the slowest outcomes — the ones that previously sat outside the maths altogether. The old figures were flattering because they only counted agents who asked for more.

Also expect: `Fortnight in Focus` and the dashboard event chains dating some historical events by the rung's own time rather than an old recording stamp, and `hasAgentResponded` / `revisionRound` correcting on any record whose stored value had drifted from its log. The dry run tells you exactly which, before anything is written.

## Rules dependency

`rejectedDate` sits in the queries update allowlist as of the Tier 3+4 rules change, **deployed to dev on 5 Aug**. Prod rules have **not** been deployed. Running the sweep against **prod before those rules are deployed will fail every query** with a permission error (the whole recompute update fails `hasOnly`) — the tool will report each failure and continue, harmlessly, but it will heal nothing. **Deploy prod rules first.**

## After the sweep

This tool is temporary. On your confirmation that the sweep is done, a follow-up commit removes the route, the component, and the "How to run it" section of this report (the findings stay): `chore(dev): remove the recompute sweep tool after use`. The pure `computeRecomputedFields` export **stays** — `recomputeQuery` itself is built on it now.
