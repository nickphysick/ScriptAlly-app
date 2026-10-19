# Query Centre v140.1: Export CSV in the Filters menu, the Pin step's wording, and the duplicate row

Branch `query-centre-v140-1` (worktree `~/ScriptAlly-qc1401`). Built 19 Oct 2026. **Not merged to main.**

## 1. False premises

- **The duplicate Eleanor Whitfield row is two documents, not one drawn twice, and it isn't on the harness account.** The list draws every query once. On two dev accounts, a single import on 25 Jun 2026 wrote the same query twice (§4). No code changed, so there is no C1 lock.
- **"The same number 'Show {v} queries' uses" and "in the list's current sort order" are two sources today, not one.** `Show {v}` counts `qcVisible`, which is sorted by the headings but not grouped. The list draws the groups, each sorted, so its order differs from `qcVisible` whenever a grouping is on (the default is "Who it's with"). The export now takes the list's own order: the same `listGroups` call the list renders from, flattened. It holds the same rows as `qcVisible`, so `{v}` is still one number. A1 asserts both the count and the order.
- **Today's exporter writes an agent no longer on file as an empty cell**, where the list draws "Agent not recorded". The pack keeps the exporter's columns unchanged, so A1 reads the two as the same name. They meet on the harness account (row 13 of the Queried + Waiting set).
- **Today's exporter opens the file with a byte-order mark** (for Excel). It is unchanged; the lock strips it before reading the first heading.

## 2. The base

- **Tip:** `fb31b9a6`, the v140 integration branch `dev/…-cl19-cl191-qc140`. Dev served it as `index-BH-rXrRP.js`, and a build of `fb31b9a6` reproduced that hash.
- **Baseline gates:** tsc 0, `vite build` 0, `build:dev` 0, Vitest 615/615 files (9,142 passed, 3 skipped).

## 3. What changed

| Part | Commit | What and where |
|---|---|---|
| A | `400d3a40` | **The Filters menu's footer** (`QcFilterMenu140.tsx`, `qcv140.css`) reads "Clear all", then "↓ Export {v} queries" (body serif 15.5px, ink, underline offset 4px at 35%, full on hover), then the navy "Show {v} queries". The label comes from `exportLabel` (`lib/qc140.ts`, unit-tested): "↓ Export all {N} queries" while nothing narrows the list (no filter, quick pick or search), otherwise "{v}". It is disabled at 0, at 35% ink. **The export** (`Queries.tsx`) passes `qcListOrder()` to the existing `exportQueriesToCSV`: the list's groups, each in the headings' sort, flattened. The columns and file name (`QueryHawk_Filtered_Queries_<date>.csv`) are unchanged, and there is no second exporter. The phone is unchanged. |
| B | `276b2f48` | **The Pin step's body** (`Queries.tsx`, the guide's `pin` target): "Press the **pin** button, or **F**, and the list becomes the whole page: the sidebar tucks away and the counts move into a band at the top. Press it again, or Esc, to put things back." The spotlight, the F key cap and the button's own label rules are unchanged. |
| C | none | Report only (§4). |
| H | see §6 | `tests/e2e/qcV1401.measure.ts` (A1, A2, B1), `tests/e2e/qcV1401Mutate.sh`, and this report. |

## 4. Part C: the duplicate Eleanor Whitfield row

**It is two query documents.** They were read from the store over Firestore's REST API with the project's own admin access, read-only, with no index or rule created.

- **Two dev accounts carry it, and neither is the harness account:**
  - user `KaBBpJ…`: `q-1hpdkpkrz` and `q-tyc3xgeb3`;
  - user `hWShdM…`: `q-pv1bx2yt0` and `q-rs8essvo9`.
- **Each pair matches field for field:** the same agent (that account's Eleanor Whitfield, Greenfield Literary), the same manuscript, `dateSent: "2024-03-14"`, and `status: "Queried"`.
- **The harness account holds one Eleanor Whitfield query,** `cv25-q-01`: Rejected, sent 14 Mar 2026, written by `tests/e2e/seedCompsV25.mjs`. It is not duplicated.
- **What wrote them: an import on 25 Jun 2026, not a seeder.**
  - Every query on `KaBBpJ…` (20 of 20) was created in one minute (20:42 UTC). `hWShdM…`'s first 20 were created at 20:49 the same evening.
  - Both accounts carry the same three doubled pairs: sent 2024-03-14, sent 2024-06-11, and one with no sent date.
  - The ids are the app's own client-side form (`"q-" + 9 random characters`, `db.tsx` `addQuery`), not any seeder's (the seeders write named ids such as `seed-query-N` and `cv25-q-01`).
  - No file in the repo has ever held "Greenfield Literary" before July 2026, so the rows came from an outside file.
  - Smart Import gained its duplicate-query collapse ("Priya part 2", `2dfb6124` → `3c16c484`) on **26 Jun 2026, the day after**. These rows predate it.
- **The list draws each document once.** The total on each account equals its count of distinct ids (20/20 and 27/27), and the two rows on screen are two ids. Nothing was changed.

## 5. Locks: QC1401

Each lock was red on the base build (`index-BH-rXrRP.js`), red under its named break, then green on the branch and on the integration build.

| Lock | Base (fb31b9a6) | Break | Green |
|---|---|---|---|
| A1 export set | red: no export button, so no download (`waitForEvent("download")` timed out) | `export-all` (export `queries`, not the list): "exactly {v} data rows — 87 vs 14" | 14/14 |
| A2 states | red 0/8: no button ("Export all" label null; nothing to disable) | `enabled-at-0` (`disabled={false}`): "a search matching nothing: disabled — false, ink 100%" | 8/8 |
| B1 wording | red at both sizes: "Press Pin list and the list becomes…"; no "pin button", F not named | `old-text` (restore the old body): "'pin button' — … Press Pin list …" | 6/6 per size |
| C1 once | not written: Part C changed no code | none | none |

**A1 reads the downloaded file, not the button.** With Queried and the Waiting quick pick on (14 queries on the harness account), the label's `{v}` equals Show's. The file has today's name and columns, exactly `{v}` data rows, and its Query ID and Agent columns equal the list's rows in DOM order.

**B1 opens the Pin step from the checklist, one fresh page per size.** On the first load the page can read an all-done guide from Firestore's local cache and write `finished`, which hides the pill for that page's life (v139's shots met the same race). B1 therefore puts the five-of-six state back and reloads until the pill is up, and asserts that it is.

**L1** is in §6.

## 6. Integration and dev

INTEGRATION
