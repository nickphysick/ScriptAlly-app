# Import truth: stopped before Phase 1

Branch `import-truth`, based on `origin/onb-v5-import-page` at `5166eaac`. No source file is changed. Nothing is deployed.

## Why it stopped

The pack says to stop before Phase 1 "if the rules require a rating or status on every agent". They require a status.

`firestore.rules`, `isValidAgent` (lines 311–316), used by both create and update:

- `starRating` is optional: absent, or an integer from 1 to 5.
- `submissionStatus` is required: it must be the string `Open`, `Closed` or `Unknown`.

So an agent written with no status is refused by the rules. The type agrees: `Agent.submissionStatus` is required, `starRating` is optional (`src/types.ts:643–644`).

## The decision needed

Three ways forward for the status. The rating can be made absent today under any of them.

1. **Write `Unknown`.** The rules and the type already allow it, so nothing outside the pack's scope changes. But the app reads `Unknown` as open everywhere (`agentList.ts:71`, "UNKNOWN reads as OPEN"), and the editor only ever writes Open or Closed. To show it as "not known" the reading surfaces would have to change, which is a wider change than this pack describes.
2. **Make the status optional in the rules and the type.** That needs `firestore.rules`, which is out of scope, and every reader of the field.
3. **Phase 1 for the rating only.** Leave the status as it is and record it as still invented.

## Baseline

| | |
|---|---|
| `tsc --noEmit` | 0 |
| `build:dev` | 0 |
| production build | 0 |
| Vitest | 555 files, 8,479 passed, 3 skipped |

The rendered locks were not re-run for this baseline. On the same commit, part 3's run had the Import page's locks 21 passed, parts 1 and 2's 104 passed, and `headerPanelV2` P2 and `headerV3` H11 red.

## §0 Recon so far

1. **Base.** `5166eaac`.
2. **The invented agent values.**

   | Path | Rating | Status |
   |---|---|---|
   | Template and Smart Import (`smartImportCommit.ts:121–122`) | `starRating: 3` | `"Open"` |
   | Email import (`emailImportCommit.ts:117–118`) | `starRating: 3` | `SubmissionStatus.OPEN` |
   | Column matcher, agents file (`ImportCsv.tsx:439–442, 465–466`) | the file's 1–5, else `3` | `SubmissionStatus.OPEN` |
   | Column matcher, "Create from this row" (`ImportCsv.tsx:337`) | omitted | `SubmissionStatus.OPEN` |

   All four also write `responseTimeWeeks: 0` (the matcher's agents file writes 8), `noResponseMeansNo: false` and a submission method of Email. None of those came from the file either. They are outside this pack as written.
3. **The clock on the other paths.**
   - Column matcher, queries file: `dateSent: dateSentInput ? new Date(dateSentInput).toISOString() : new Date().toISOString()` (`ImportCsv.tsx:634`). An undated row is dated now. It calls `addQuery` without the `imported` flag, so the history steps are stamped now as well. Query history rows: `date … : new Date().toISOString()` (`:677`).
   - Email import: passes `dateSent` only when the email gave one (`emailImportCommit.ts:148`), but calls `addQuery` without the flag (`:140`), and orders undated steps from `Date.now()` (`:170–176`).
4. **The undated count.** `OneScreenChart.tsx`, `activeTitle(n, undated)`. All dated: "{n} active queries". None dated: "{n} active queries have no sent date yet." Some of each: "{n} active queries", counting only the dated ones; the rest are not mentioned.
5. **Duplicates.** Nothing identifies an existing query on any path. A second import of `template-iso.csv` writes five more queries with their history and one more activity line. Agents are not written again on the template and Smart Import paths when name and agency both match (`smartImportCommit.ts`), and are skipped on the matcher's agents file when the name matches (`ImportCsv.tsx:402`). The matcher's queries file never creates agents.
6. **The header locks.** Part 3's run had both fail by 41.8px on `/dashboard`, `/account`, `/help` and `/plans`. The beta strip is mounted once, by `AppShell` (`AppShell.tsx:359`), above the shell on every workspace route, whenever `BETA_MODE` is on and the writer has not dismissed it this session. It is there by design.
7. **The probe rows.** Ten queries in `users/{harness}/queries`, each with one history step and one feed row, written by the matcher suites on 20 September (two runs of `importUnmatched`, two of `importDrive`): `q-imported-1nzp7z3h7`, `-3b8hlr7rl`, `-4u80p5qkj`, `-7bqjoai77`, `-9t5ko5nxs`, `-c7o0wqrf1`, `-iacnspgnz`, `-isbu9huiz`, `-wt6ykzcn0`, `-zaxipj83o`. Nothing has been removed.
