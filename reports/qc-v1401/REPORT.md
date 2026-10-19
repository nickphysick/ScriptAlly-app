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

Each lock was red on the base build (`index-BH-rXrRP.js`), red under its named break, then green on the branch and on the integration build (§6).

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

**Dev moved while the locks ran.** The first integration branch, `dev/…-cl191-qc140-qc1401` (a fast-forward to `148c6ed5`, bundle `index-D3feW9qh.js`), passed its gates and locks. Then the deploy's last check found dev serving `index-BS8qdecw.js`: another session had deployed Contact list v19.2 from `dev/…-qc140-cl192` (`f758e550`) in the meantime. The deploy stopped and nothing was published from the first branch, which stays on the remote unused.

- **What dev served at deploy time:** `dev/…-cl191-qc140-cl192` at `f758e550` (Contact list v19.2 on top of v140). A build of `f758e550` reproduced `index-BS8qdecw.js`.
- **Integration branch:** `dev/…-cl191-qc140-cl192-qc1401`, cut from `f758e550`.
  - It merges `query-centre-v140-1` cleanly (merge commit `1e56a0d6`).
  - A second merge brings in QC139 B2's wait: tip `0d94cf1e`, pushed.
- **Gates there:** tsc 0, `vite build` 0 (no errors or warnings), `build:dev` 0, Vitest 617/617 files (9,155 passed, 3 skipped).
- **Locks there (`index-DSAY7Z_7.js`):**

| Suite | Result |
|---|---|
| QC1401 | 5/5 (A1, A2, B1 at both sizes, plus auth) |
| QC140 | 15/15 |
| QC138.6 | 10/10 |
| CL19 | 15/15 |
| CL19.1 | 9/9 |
| QC139 | 13/14 on the run, then 14/14 (see below) |

- **QC139 B2, explained:**
  - **What failed:** B2 read the practice journey's drawer the instant Pip's third card showed. On this build it found nothing at that moment, even when run alone. Every later check in the same case passed, including all five answers clicked inside that drawer.
  - **What was measured:** the drawer mounts **21–38ms** after the card.
  - **The fix (`a27be9c3`):** the read waits up to 5s, and the wait is recorded as its own reading. B2 is now 10/10 on two consecutive runs.
  - **Cause:** a read taken too early, not a fault. Nothing in v140.1 touches the drawer.
- **QC139 B1, explained:** on the first (`…-qc1401`) build, B1 went red because the account's counts moved during the run: four Queried queries were there at the start and gone by the end (56 → 52). The account was back to 87 straight afterwards, and B1 passes alone (6/6). Nothing in v140.1 writes queries; the export only reads.
- **The guide's state was put back after every run.** Once, the final restore hit Firebase's password-verification quota (`auth/quota-exceeded`). The state was then put back through the admin API to exactly what was recorded before the run, `{"seen":true,"done":{"log":true,"find":true,"open":true}}`, and read back to confirm.
- **Deployed to dev only**, from a clean detached checkout of `0d94cf1e`, as hosting only, after re-checking that dev still served `index-BS8qdecw.js`. **Dev now serves `index-DSAY7Z_7.js`.**
- **Not merged to main. Prod untouched.**
