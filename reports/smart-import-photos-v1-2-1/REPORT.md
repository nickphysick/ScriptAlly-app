# Smart Import v1.2.1 — a merged duplicate keeps the fuller name

5 Nov 2026. On `main` and on dev. No model calls were made: no eval, no API-backed test, no call to the callable.

## False premises

1. **"Jonah" (a first name alone) never ends up in a set with "Jonah Petrakis".** The v1.2 rule refuses that pair (DUP-2: "a first name alone has no surname to shorten"), and this pack does not touch that rule. So the "Jonah" case is locked on the pure function (FN-2), not as a real pair. "J. Petrakis" is a real pair and is locked both ways.
2. **"Choosing which row to keep by removing the others" only happens on the "Remove this one" control.** The reconcile card, which is what the Jonah pair shows, has no per-row agent choice; its radio buttons choose which *query row* to keep. So both of its answers ("Looks right", and "These are actually different submissions") take the fuller name.
3. **The reconcile card shows no name per row**, so the two restored names after "Change this" can't be read off the page. The rendered lock checks that the pair comes back open with both rows and their dates; the names themselves are held at unit level (FN-5).

## The merge paths

Every way a duplicate set ends as one agent, and what each does now:

| Path | Where | Fuller name? |
|---|---|---|
| Reconcile card, "Looks right" | `reconcileCollapse` → `applyDuplicateCollapse` | **Yes** (unless the writer edited a name or agency in the set) |
| Reconcile card, "These are actually different submissions" → Keep both (one agent, two queries) | `reconcileSplit` → `removeDuplicateRecord` | **Yes**, same condition |
| "Remove this one" on an open set (identical rows, three-ways, other shapes) | `removeDuplicate` → `removeDuplicateRecord` | **No**: the writer chose the row, so it keeps its own |
| A three-way: one row removed, then the last pair answered on the reconcile card | both of the above | Yes, from the **live** rows only: the removed row never lends its name |

"Keep them apart" isn't a merge, so it is unchanged. Undo ("Change this", or Undo on a merged set) restores the snapshot taken before the merge, so both rows come back as the file gave them.

## What changed

- **`fullerIdentity(set, kept, edited)`** (in `smartImportReviewModel.ts`) works word by word: a form is fuller when the other abbreviates it, each word equal or a prefix ("P." of "Petrakis"), or missing at the end ("Heron" of "Heron Lit").
  - The fullest form is the one every other form in the set equals or abbreviates.
  - If there are two different full forms, there is no fullest, and the kept row keeps its own.
  - Agencies only count where `agencyKeysMatch` says they're the same agency.
- **`removeDuplicateRecord` and `applyDuplicateCollapse`** take an optional `fill` (the file's own names, from `originalsOf`). Only the reconcile card's two answers pass it.
  - "Edited" means a member's name or agency differs from what the file gave.
  - Every other field is the kept row's, as before.
- **The headline**: the reconcile card's "Two rows for …" and the open set's heading use the fuller name from the start, unless the writer has edited the set.
  - After merging, the sorted card, the merged bar and the ready list read the agent's new name. Nothing extra was needed there, because they read the agent.
- **Found while measuring:** "What you decided" read `Jonah Petrakis · kept · "Jonah Petrakis" merged in`, because the merged-away row's own name is now the kept name. It now names the short form that went: `"Jonah P." merged in`.

## Gates

Baseline is the start of this pack; after is the final tree.

| | Before | After |
|---|---|---|
| tsc | not read: the first run ran out of memory alongside the tests; HEAD is the tree the v1.2 report read clean | 0 errors (run on its own) |
| Vitest | `Test Files 676 passed (676)` / `Tests 10296 passed \| 3 skipped (10299)` | `Test Files 678 passed (678)` / `Tests 10310 passed \| 3 skipped (10313)` |
| vite build | clean | clean (no error or warning lines) |
| functions | untouched | untouched |

Related rendered suites on the lab build (`onbV5Import`, `onbV9`, `importDatePick`): 104 passed. The failures were all outside this pack:
- 8 are the emulator guard refusing to measure a non-emulator build.
- 1 is onbV9 R1, a git diff of other packs' loader files against an old base commit; it reads no code this pack touched.

V4 (the review's hand-off on the duplicates fixture compared with a capture) went red on the first cut and passes on the final one, with no diff and no re-point. That cut let a row the writer had removed lend its agency ("Carter & Vale Literary"). Tightening it is commit `298454c52`.

## Commits

| Commit | What | Files |
|---|---|---|
| `41e02fdb4` | Phase A: fullerIdentity and the merge paths | `smartImportReviewModel.ts`, `SmartImportReview.tsx`, `importFullerName.test.ts` |
| `298454c52` | Phase A: a removed row never lends its name | `smartImportReviewModel.ts`, `importFullerName.test.ts` |
| `3d47179a9` | Phase B: the headline, the decided line, the rendered locks, screenshots | `SmartImportReview.tsx`, `reviewRows.tsx`, `importFullerHeadline.test.tsx`, `tests/e2e/importFullerName.measure.ts`, `tests/e2e/importDatePick.measure.ts` (DP-R3's headline text), two PNGs |

## Locks, each proved red first

| Lock | What it holds | Red by |
|---|---|---|
| FN-1 | The Jonah pair gives Jonah Petrakis / Heron Lit in both row orders, by both reconcile answers; other fields stay the kept row's | M1, the identity not applied (short-row-first goes red; full-row-first is already full) |
| FN-2 | J. Petrakis and Jonah give Jonah Petrakis; Heron gives Heron Lit; Lit gives Literary; abbreviation is word by word | M1, and M3 (any fuller form wins) |
| FN-3 | An edited name or agency on any row keeps the kept row's; "Remove this one" keeps the kept row's own | M2 (edits ignored), M5 (picking a row also fills) |
| FN-3b | A removed row's name never comes back in a three-way | Removed rows counted in the set |
| FN-4 | Two different full forms keep the kept row's, for names and for agencies | M3 |
| FN-5 | Undo: the merge changes no input row; the merged-away row keeps its own name; restoring by id gives both originals | M4, the merged-away row renamed |
| FN-6 | The review, rendered whole, heads the set "Two rows for Jonah Petrakis" in both orders | The old headline (`members[0].name`) |
| FN-R1 | The rendered headline | `FN_MUTATE=headline` |
| FN-R2 | After "Looks right": the decided list and the Agents step read Jonah Petrakis at Heron Lit, and "Jonah P." appears only as `"Jonah P." merged in` | Source: no fill; the old decided line |
| FN-R3 | "Change this" puts the pair back open, both rows and their dates | Source: no fill; "Change this" not restoring the agents |

## Screenshots (1440 × 900, the lab's `fx=v12`)

- [1440-duplicates-jonah.png](1440-duplicates-jonah.png): "Two rows for Jonah Petrakis" on the Duplicates step.
- [1440-duplicates-merged.png](1440-duplicates-merged.png): after "Looks right", "Jonah Petrakis · Heron Lit · kept · "Jonah P." merged in".

## Dev

- Dev was serving `index-DK3Clp8X.js`. I confirmed that is the tip of `dev/…-sip12-pk41w-qc152` by building it.
- Main is merged into a new branch, `dev/…-sip12-pk41w-qc152-fn121` (pushed), and the rendered locks pass on that build.
- `npm run deploy:dev` released hosting: dev now serves **`index-B4t-KZ6J.js`**.
- The same command's function step failed in its pre-deploy build: the clean worktree had no `functions/node_modules`. This pack changed no function code, and dev's `smartImportMap` already runs the v1.2 prompt, so it was not retried.

## Model calls

None.
