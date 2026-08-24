# The import's dangling package link (24 Aug)

`ImportCsv.tsx:522` wrote `packageId: "pkg-seed-default"` under the comment *"Fallback standard
submittal"*. That id is defined nowhere in `src/`, `tests/`, `firestore.rules` or `functions/`.

## ⚠️ The ruling's literal form would have broken the import

**`packageId` absent is DENIED.** `firestore.rules:327` requires `data.packageId is string`, so a
query written without the key fails `isValidQuery` and never lands. Measured both ways before
choosing:

```
packageId ABSENT   → DENIED    (7 PERMISSION_DENIED)
packageId: ""      → ACCEPTED
```

`""` is already the model's word for "no package": `tests/e2e/seed.mjs` writes it and
`materialsLinkWrites` returns it when clearing a link. The intent — hold nothing true rather than a
pointer to nothing — is served exactly; only the spelling differs.

## ⚠️ The consequence was silence, not a wrong message — I had it wrong

I first reported that such a query would show the pane's *"Package no longer exists"* state. **It
does not.** Planted the exact row the old code wrote and rendered it:

```
row 0: strip 0 · loose 0 · fork 0   ← the one anomaly in 45 rows
```

**No strip, no loose row, no fork.** The whole "what went with this query" section blank, with
nothing to click and nothing to explain it — and the fork suppressed too, because `packageId` is
truthy, so the writer is never offered the chance to say what they sent.

A visible wrong message gets reported. A blank section gets read as *"nothing to see"*.

## The mechanism, and what it means for the deleted-package copy

The linked strip renders through `{linkedPackage ? <PackageGroup …>}`, where `linkedPackage` is the
resolved package. An unresolvable id makes that null and the branch simply does not draw.

`PackageGroup`'s `state === "deleted"` — *"Package no longer exists"* — belongs to
`packageDrift(group, live, sent)`, and `group` comes from `groupByOrigin(materialsWanted)`, i.e.
**snapshot marks**. There are zero snapshots.

> **Answered, as asked: that copy is currently unreachable.** Not by this fix — by the retirement of
> snapshots. And the real case it was written for is *not* handled by it: `deletePackage` is wired to
> a live control (`SubmissionPackages.tsx:435`), so **deleting a package blanks the materials section
> of every query linked to it**, today, with no message at all. That is F-AD, found by this run and
> not fixed in it.

## Proven on the running app, by importing

Drove the wizard end to end — Query Log Entries → paste → **Parse CSV Table →** → **Begin Processing
Records →**:

```
log      : Linked query logged: Manuscript "The Smoke Test" sent to Agent "Dangling Probe Agent"
stored   : q-imported-l95dzwib4 · packageId="" · materialsWanted=null · ms=seed-ms-1
rendered : 45 rows sampled · 0 rendering nothing
```

`materialsWanted` absent, so no snapshot mark either — the two `materialsWanted` writes in
`ImportCsv` are on **agents** (the agency's requested materials), not on queries.

## Migration: none needed on dev

**0 of 44** dev queries hold `pkg-seed-default`. **Prod is unread** — I have no prod access and did
not seek any. Nick's call.

## ⚠️ Three siblings, flagged not fixed

`pkg-seed-default` had company. None of these are defined anywhere in the repo either:

| line | write | consequence if the fallback fires |
|---|---|---|
| 520 | `manuscriptId: foundMs?.id \|\| "ms-seed-fantasy"` | a query on a manuscript that does not exist — and the query list is **manuscript-scoped**, so it would be invisible in every scope |
| 521 | `agentId: foundAgent?.id \|\| "agent-seed-alex"` | a query with no resolvable agent: no identity block, and every agent-derived figure blank |
| 564 | `queryId: foundQ?.id \|\| "q-seed-fantasy"` | an **activity** attached to a query that does not exist |

These are worse than the one just fixed, because a query is *named* by its manuscript and agent. The
import drive above resolved both to real records, so none fired — the fallback path is reached only
when the CSV names something the account does not have, which is exactly when an import is already
going wrong. **Not touched: out of scope, and each needs a decision about what a failed match should
do — skip the row, or import it unattached and say so.**

The stale comment above the block (*"Generate dummy packages to link the queries fully"*) described
something that never happened and is gone with the write.
