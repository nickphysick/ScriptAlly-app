# Package editions — the contract between query actions and submission packages

Committed word for word from the brief "Packages through the journey: one run" (28 Sep), Part C. Refs: `design-refs/packages-journey/log-query-packages-v2.html` and `design-refs/packages-journey/package-tracking-v1.html`.

## Part C: the contract (read first)

### C1. The meaning

- **A query remembers, for life, how its materials were recorded, and with which package edition.**
- **Results are credited to a package edition** only when a package was attached. They're always worked out from the query, never stored on a Tracking entry.
- **What was sent is a frozen snapshot.** It is never read back from a live package or material.

### C2. Packages (owned by submission packages)

- **`edition: number`**, starting at 1.
  - Any change to a package's **contents** makes a new edition, with its own start date. Contents means which materials, their versions, the sample, and the book version.
  - A rename, or a change to which package is "used for new queries", **doesn't** make a new edition.
- **`editions`**: a list of `{ n, startedAt, summary, versions[] }`, oldest first, kept for ever, so any past edition can be shown and offered in corrections.
- **Retire, don't delete.**
  - A package that any query has been sent with can only be **retired** (`retiredAt`). A package never sent can be deleted.
  - Retired packages drop out of the choices when logging, but keep their editions and results.
- **Sent versions are locked.** Once a material version appears in any query's snapshot, its content can't change; editing it creates a new version. *Submission packages owns this.*

### C3. What a query records (owned by query actions)

All fields are flat on the query, with no maps. Proposed names:

| Field | Meaning |
|---|---|
| `sentHow` | `'package'`, `'individual'` or `'unrecorded'` (imported, or not known) |
| `sentPackageId`, `sentPackageEdition` | Set only when `sentHow === 'package'` |
| `basedOnPackageId`, `basedOnPackageEdition` | Set only when `sentHow === 'individual'` and the writer started from a package, then changed something |
| `sentMaterials` | A readable summary, e.g. "Query letter v3 · synopsis v2 · first 3 chapters · Fast-paced opening" |
| `sentVersions` | `string[]`: the material version ids sent |
| `sentChanges` | `string[]`: for "based on" only, e.g. `"Sample: first 3 chapters → first 10 pages"` |
| `sentCorrectedAt`, `sentCorrectedFrom` | Set when the writer corrected what was sent; `sentCorrectedFrom` is the old summary |

The existing `packageId` field stays in step with `sentPackageId` (empty when not a package) for older readers. **Imported queries** get `sentHow: 'unrecorded'`.

### C4. How results are counted (Packages page; the Birds-eye view reads the same)

For one package edition, over the queries with `sentHow === 'package'` and that `sentPackageId` and `sentPackageEdition`:

- **Sent:** the number of those queries.
- **The first answer** decides each query's column. It's the earliest of:
  - a request (partial, full, or revise and resubmit): counts as **Requests**;
  - a pass: counts as **Passes**;
  - closed as no reply: counts as **No reply**.
- **Offers:** queries that ever reached an offer. This is a subset shown alongside, not a separate column of first answers.
- **Still out:** no answer yet and still live.
- **Withdrawn before any answer:** left out of both answered and still out, and listed in a small note.
- **Request rate:** "N in M answered", where M is Requests + Passes + No reply.
- **"All editions":** the same counts over every edition, labelled as the big picture, not a comparison.
- **"Sent with changes":** a count and list of queries with `basedOnPackageId` pointing at this package or edition. They're **not** included in its results.

Results update from the queries automatically: undo, corrections, moving an entry, late replies and deletes all flow through.

### C5. What each side reads from the other

- **Query actions reads packages through its adapter** (`lib/queryActions/packages.ts`): the live packages for a manuscript, each with its `edition`, `editions`, summary, versions, `retiredAt`, and the manuscript's "used for new queries" package.
  - **If `edition` isn't there yet**, the adapter treats every package as edition 1. **Nothing waits on the other session.**
- **Submission packages reads the query fields in section 3**, and opens the drawer with `openQueryDrawer({ mode: 'log', manuscriptId, packageId })`.
