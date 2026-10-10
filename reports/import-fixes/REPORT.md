# Import correctness: dates, counts and labels

Branch `import-fixes`, six commits (groundwork, Phases 1–4, the walk). Nothing is merged to `main`. Prod is untouched. No change to `functions/**`, `firestore.rules` or any plan limit was needed.

## 1. False premises and things the pack did not expect

1. **The date loss was wider than CSV.** A real Excel date cell was lost the same way: both paths took the cell's display text (`8/2/26`), which the template parser cannot read.
2. **"Asked today" was not only an undated-record fault.** Every imported stage, dated or not, was dated to the moment of import, and every imported query's last status change was "now". The file's own response date was overridden. The fix covers both.
3. **§0.4 asks which field the commit or `recomputeQuery` writes.** Neither was the cause. A third writer was: `addQuery`, which the commit calls for each query (see §3.4).
4. **None of the review's existing date questions fits an unreadable or ambiguous date.** "No date" says "We don't have a date for this one", which is untrue when the writer gave one. I added four reason codes, using the template parser's own sentences.
5. **U2 as written cannot show the undated card sentence with `template-mixed.csv`.** That file has one dated query (Owen Hale), so the chart can draw something. The walk runs a third import with that row removed to reach the sentence.
6. **D1's named mutation does not turn D1's ISO cases red.** With the default CSV read restored, ISO text becomes a date cell and is converted back to ISO by the new date-cell rule. Day-first text is what breaks (`03/05/2026` becomes 5 March), so D1 gained that case and is red under the mutation.
7. **The build has two manuscript limit messages**, not one: `manuscriptLimitError` (the host's pre-check) and `addManuscript`'s own. The host's is the one shown.
8. **The active card may not derive a count.** An existing lock forbids it, so the undated count is handed in as a prop from `Dash58`, beside the active count.
9. **N1's "count alone" fallback is gone.** The count is now the list's length, so there is no case where the two differ.

## 2. Base and gates

Base: `origin/onb-v5-import` (`importNotice.ts` is not in `origin/main`).

| | Baseline | Now |
|---|---|---|
| `tsc --noEmit` | 0 | 0 |
| `build:dev` | 0 | 0 |
| production build | 0 | 0 |
| Vitest | 547 files, 8,435 passed, 3 skipped | 553 files, 8,467 passed, 3 skipped |
| Part 2's rendered locks (OB2) and part 1's (OB1) | — | 104 passed |

## 3. §0 Recon

### 3.1 Base
`origin/onb-v5-import`.

### 3.2 The date's journey (baseline)

Template path, `2026-08-02` typed in a `.csv`:

| Step | Value |
|---|---|
| The file | `2026-08-02` (text) |
| `XLSX.read(buffer, { raw: false })` | a date cell, serial 46236, format `m/d/yy` |
| `sheet_to_json({ raw: false })` | **`8/2/26`** — this is the step |
| `parseTemplateDate("8/2/26")` | `null` (two-digit year) → flag `unreadable-date` |
| `parseTemplateRows` | `sentDate: null`, `sentDateRaw: "8/2/26"` |
| Review | row shown as "Ready"; the flag is not rendered |
| `commitSmartImport` | no sent date |

The same cell in an `.xlsx` (a real date cell) takes the same path from row 2 down. `03/05/2026` in a `.csv` was read by SheetJS as 5 March and displayed `3/5/26`.

Smart Import path: `fileToCsv` used the same default read, so the function was sent `8/2/26` for both a text ISO date and a real date cell. What the function does with it is out of scope here.

Now: text reaches the parser as typed; a date cell is converted to `2026-08-02` from its serial number.

### 3.3 Where the template's flags went
`readTemplateFile` returned them, `BranchB` stored them in `templateFlags` state, and nothing read that state. The review builds its row questions only from `query.reasons`, which the template parser never set. So a row with a dropped date had no reason and counted as ready.

### 3.4 Where "today" came from
For each query the commit calls `addQuery`. `addQuery` treats it as a query sent now:

- it set `dateSent` to now when none was given (the commit then deleted it with a second write);
- it wrote its own first history steps, stamped now: "Queried" and, for a later status, that status one millisecond after.

The commit then wrote the import's history beside them. It may only delete steps whose id starts `imp-`, so `addQuery`'s steps stayed. They carry no "date not known" flag, so the derivation treats them as real: `partialRequestedDate` (and the other stage dates) and `lastStatusChange` became the import moment. `dashList` reads the stage date for "Asked …", hence "Asked today".

The chart's "No active queries": `dashBreakdown.isLive` requires a sent date, so a live query with none is not counted. Two live undated queries gave a live count of 0, and `activeTitle(0)` is "No active queries".

### 3.5 The nameless row (baseline, `template-mixed.csv`)

| Surface | Counted it as |
|---|---|
| Summary | an agent and a query (4 and 4) |
| Review's head chips | not counted (set aside: 3 and 3) |
| `validateSmartImport` on the first read | skipped, "Row has no agent name or agency to identify it" |
| `validateSmartImport` on the review's result | absent (the review had removed it) |
| `CommitOutcome.queriesSkipped` | 0 |
| Skipped-rows notice | no notice |

### 3.6 The manuscript error
`onEnsureManuscript` returns null when the host's `saveBranchManuscript` fails. Three causes: the plan limit (`manuscriptLimitError`), `addManuscript` returning an error, or a thrown error. The host sets its own message for each, but the review showed one fixed sentence. The Free plan's limit is one manuscript (`FREE_MANUSCRIPT_LIMIT`), enforced in `addManuscript` (`db.tsx`) and pre-checked in the host.

### 3.7 The activity line
`smartImportCommit.ts` wrote `Smart import · …` as a literal. It had no way to know which path called it.

## 4. Each fault: cause, fix, why it cannot come back

| Fault | The line that caused it | Fix | Why it stays fixed |
|---|---|---|---|
| Dates dropped or swapped | `XLSX.read(..., { raw: false })` then display text, in `templateImport.ts` and `smartImport.ts` | `lib/sheetCells.ts`: one reader for both paths; text unparsed, date cells converted from their serial | Both paths call the one reader. D1, D2 and D4 read real files. |
| "All clear" over dropped dates | `setTemplateFlags(parsed.flags)` with no reader | The parser writes each date flag as a reason on its query | D3 counts one open reason per flag. |
| Stages dated today | `addQuery`'s `dateSent: q.dateSent \|\| new Date()` and its seeded steps | `addQuery({ imported: true })` defaults no date and seeds no history; the commit passes it | U1 freezes the clock and finds that moment nowhere in a query's writes. |
| A later, past-dated step stored as the import day | `assignTimes(rungs, importBaseMs)` for an all-undated query | Ordering keys start from zero | Same lock. |
| "No active queries" over live queries | `isLive` requires a sent date; the card had no other figure | The card is handed the undated live count and states it | U2. |
| Summary and review disagree | `parseModel(result)` in `ImportOverview` | `summaryModel`: the same parse with the review's set-aside applied | C1 compares the rendered summary with the review's live rows. |
| The nameless row never mentioned | The notice was built from validation and the commit only | The review hands over its automatic set-asides; the notice lists them | C1: summary + notice = rows in the file. |
| "Agency only" for a named agent | `return a.agency \|\| "Agency only"` | `queryOriginLine` uses `agentAgencyLine` | L1. |
| "Smart import" for a template | a literal in the commit | The commit takes the source | L1. |
| One fixed manuscript error | `setCommitError("Couldn't set up…")` | The limit shows the build's limit message; anything else the plain sentence | L1. |

## 5. Locks

| Lock | On the baseline | Now | Under its mutation |
|---|---|---|---|
| D1 | red: all five dates `null` | green | red (day-first case) |
| D2 | red: `null`; Smart path sent `8/2/26` | green | red, 5 cases |
| D3 | red: flags read `2/10/26`, `3/5/26`; no reasons | green | red: 0 open reasons |
| D4 | red: `8/2/26` | green | red, 3 cases |
| U1 | red: `addQuery` not told it is an import | green | red under both mutations |
| U2 (unit) | — | green | red |
| U2 (walk, deployed pre-fix build) | red: 5 dates null, "No active queries", 1 "Asked today", "Smart import" | green, 3 walks | red: "no row says Asked today" |
| C1 | red: summary 4 and 4, notice 0 rows | green: 3 and 3, 1 row | red: 4 |
| L1 | the three baseline lines are in `red-phase4.txt` | green | red |

Files: `red-phase1.txt` to `red-phase4.txt`, `red-u2-deployed-baseline.jsonl`, `mutation-proofs.txt`, `readings.jsonl`.

## 6. The walk on dev

Account: the empty fixture account. Document counts before and after: all zero in every collection, both times (`readings.jsonl`). Shots are in `shots/`, at 1440.

`template-iso.csv`:
- Summary: 5 agents, 5 queries, "It all read cleanly."
- Review: 5 query rows, all "Ready".
- Stored sent dates: 2025-11-05, 2026-01-23, 2026-03-14, 2026-05-03, 2026-08-02. Jamal Carter's partial request is dated 2026-04-02, the file's response date.
- Dashboard: "4 active queries"; "Asked 6 months ago"; no "Asked today"; no skipped-rows line.
- Activity line: "Template import · 5 agents added, 5 queries logged".

`template-mixed.csv`:
- Summary: 3 agents, 3 queries.
- Review: Clara Voss "Date needed", with the question quoting "sometime in May"; Owen Hale reads "No agency".
- Stored: the two undated requests have no sent date, no stage date and no status-change date.
- Dashboard: "Waiting on you"; "1 active query"; "1 row from your file wasn't imported. It had no agent or agency name."
- With Owen Hale removed in the review: "2 active queries have no sent date yet."

## 7. For Nick

### 7.1 Every string that changed

| Where | Was | Now |
|---|---|---|
| Review, named agent with no agency | Agency only | No agency |
| Activity line, template path | Smart import · {n} agents added, {m} queries logged | Template import · {n} agents added, {m} queries logged |
| Active card, live but undated | No active queries | {n} active queries have no sent date yet. / 1 active query has no sent date yet. |
| Manuscript error, not the limit | Couldn't set up your manuscript — nothing's lost. Try again, or use the Import desk. | Couldn't set up your manuscript. Nothing's lost. Try again, or use the Import page. |
| Manuscript error, the plan's limit | the sentence above | Free Tier limit reached: You can only configure 1 active manuscript profile. Upgrade to Pro for unlimited additions! (the build's existing message) |
| New: unreadable sent date | — | We couldn't read "{cell}" as a date. When did you send the query? · Save date · Leave undated |
| New: ambiguous sent date | — | "{cell}" could be two different dates. Which did you mean? · {3 May 2026} · {5 Mar 2026} · Leave undated |
| New: the same two for the last-response date | — | …When was the last response? |
| Row chips for those | — | Date needed · Date to confirm (both existing labels) |
| Review row's date, template path | a raw timestamp | 14 Mar 2026 |

### 7.2 Other things the import says that are not true, not fixed here

1. **Mixed dated and undated live queries.** With three dated and two undated live queries the card reads "3 active queries". The two undated ones are not mentioned anywhere on the dashboard's counts. The pack covers only the case where nothing can be drawn.
2. **Three other template flags never reach the review**: an unknown status, a response window that is not a whole number, and a missing agent name. An unknown status means the row is skipped at import; it now appears in the skipped-rows line as "No readable status", but the review never asks.
3. **A "Queried" row with a "Date of last response"**: the response date replaces the sent date on the first history step. The stored `dateSent` is still the sent date.
4. **Every imported agent is written with a 3-star rating, "Open" to submissions and a response window of 0 weeks.** The file gave none of these.
5. **The limit message** shown for the plan limit is the build's own and reads like a sales line. A second, different limit message exists in `addManuscript`.
6. **"Something went wrong bringing your pipeline in — nothing is lost. Try again, or use the Import desk."** still has the dash and "Import desk". It was not in the Words table.
7. **"1 agents added"**: the activity line does not handle one.
8. **The summary's file chip says "4 rows" above cards that count 3.** Both are true; the reason is only stated after the import, on the dashboard.
9. **Under "2 active queries have no sent date yet." the plot reads "The line begins once there are two days on the record."** True, but it does not help with undated queries.
10. **The column matcher (`ImportCsv.tsx`) and the email import still stamp the import time.** Both call `addQuery` without `imported`, and the email import orders undated steps from its own time. Both are outside this pack.
11. **Smart Import was checked only as far as the text it is sent.** The function now receives `2026-08-02` where it used to receive `8/2/26`. I did not run the function.

## 8. Deploy

Recorded in `DEPLOY.md` beside this file.
