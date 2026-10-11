# Import truth: no invented values, no double imports

Branch `import-truth`, based on `origin/onb-v5-import-page` at `5166eaac`. Seven commits: the baseline, Phases 1–5 and the walk. Nothing is merged to `main`. Prod is untouched. `functions/**` and `firestore.rules` are untouched.

## 0. The follow-up rulings (11 October, later the same day)

Three commits on the same branch: ruling 6 (`68c39da7`), ruling 4 (`fa9e86a3`) and this report. Rulings 1 to 3 needed no change. Ruling 5 changed no code; the reason is below.

### False premises first

1. **Ruling 4, the query row: it was already imported undated.** Phase 2 did that (no date from the clock, the import flag set). Nothing changed there; it is now locked on the rendered app.
2. **Ruling 4, "a matcher file with one undated query row and one undated history row": the matcher takes one kind of sheet per run.** A queries sheet and a history sheet are two runs. The lock does both runs in one test.
3. **Ruling 4, "the build's existing date reason": there was no date reason in the skipped-rows notice.** The notice's existing reasons are about names and statuses. The nearest existing words are the review's labels for a date it cannot use. I used those: **"Date needed"** for a blank or unreadable date, **"Date to confirm"** for a date that could mean two days.
4. **Ruling 4 found a second way rows were dropped silently.** A skipped row leaves the matcher's loop early, and that passed over the update of the counts. A run whose last rows were skipped finished showing the counts as they stood before them: one history row skipped, "Not imported: 0". The counts are now set once more after the last row. This applied to every kind of skipped row at the end of a file, not only undated ones.
5. **Ruling 5: both checks fail, one for each field.** No change was made and `firestore.rules` was not touched.
   - **`sendMethod` (queries): the rule check fails.** `firestore.rules:445–449` requires one of `Email`, `Online Form`, `Query Manager`, `Post`. An empty string is denied.
   - **`submissionMethod` (agents): the rule check passes, the reader check fails.** `firestore.rules:322` is `data.submissionMethod is string && data.submissionMethod.size() <= 128`, which an empty string satisfies (read from the rule; I did not write one to dev). But these readers show an empty value as "Email":

   | Reader | What it does with an empty method |
   |---|---|
   | `QueryLogSheet.tsx:247` (the agent list in the log sheet) | prints `Email` |
   | `RecordResponseModal.tsx:241` | prints "Queried via Email" when the query has none either |
   | `agentList.methodShort` | returns `Email` |
   | `LogJourney.tsx:146`, `NudgeJourney.tsx:52` | choose Email in the "sent via" control |
   | `Queries.tsx:2857`, `:8974`, `Dashboard.tsx:1678` | pass `Email` on to the modal or the edit form |
   | `db.tsx:2434`, `:2623`, `activityUtils.ts:150` | write or print "Sent via Email" when the query has none either |

   Readers that already show it as absent: `QueryAgentTab` ("—"), `QueryLogSheet.tsx:325` ("—"), `agentContext` (no cell), `cardDraft.methodOf` (the editor shows none chosen), `agentCard.methodPhrase` (no line), `TimelineComposer` (empty), `journeys/common.ts:60` (left out), `LogJourney.tsx:247` and `:332` (no guard, no hint), `SentJourney.tsx:60`.

### What changed

- **Ruling 6.** The notice store announces every save and clear (`onImportNoticeChange`); `Dash58` reads again when it hears one. Nothing else in `Dash58` changed. Lock N3: the walk imports from `/import`, returns to the dashboard by the app's own navigation (a mark on `window` proves no reload) and reads five rows after the repeated file, then one after the mixed file. Red when the dashboard reads once per visit (rebuilt: "Expected 5, Received 0"), and red in the unit lock when saving announces nothing.
- **Ruling 4.** An undated history row goes to the dashboard's skipped-rows notice with the reason "Date needed", as well as to the run's log and the "Not imported" count. Lock U3 (`tests/e2e/importMatcherUndated.measure.ts`, with a unit half): the undated query row is written with no sent date and two undated history steps ordered from zero; the history row is not written and is in the notice; the dashboard shows "1 row from your file wasn't imported." Red when the undated query row is dropped (rebuilt: "Expected 1, Received 0"), when the history row is kept out of the notice, and when the final counts are not set.

### Things to know

- **The matcher's notice holds only rows skipped for want of a date.** Its other not-imported rows (no name, already here, no matching query) stay in its own run log, as before. A matcher run that skips no dated row leaves any earlier notice alone.
- **The notice row names the agent of the query the history row matched.** When this was written the matcher matched by manuscript title alone, so the name could be another agent's. Fixed in §0b.
- **New string:** none. "Date needed" and "Date to confirm" are the review's existing labels.

### Gates after the rulings

`tsc` 0 · Vitest 560 files, 8,537 passed, 3 skipped · both builds 0. Harness account after every run: 73 queries, 37 agents, 5 manuscripts, 396 feed rows, 113 history steps.

## 0b. The matcher's history match (11 October, third round)

One commit on the same branch.

### False premises first

1. **A history sheet had no column that could name the agent.** Its fields were Related Query, Related Title, Event Type, Description, Date and Extras. So "the sheet gives no agent" was true of every history sheet. The fix adds the matcher's existing agent field to the history sheet ("Target Agent Name", headings such as `Agent` or `Agent Name` are matched automatically, as on a queries sheet). That is one more row on the "Match columns" step for a history file, and the heading example now includes `Agent Name`.
2. **"Related Query" is mapped and never read.** It was not read before this change either. I left it unread: nothing says what a writer puts in it.
3. **There is no agency column on a history sheet, and I did not add one.** The agent is matched by name; `sameAgent` treats a missing agency as a match.
4. **The existing log line already claimed an agent match.** It read "no query matches this manuscript and agent" while the agent was never consulted. It is true now, and is kept word for word.
5. **No existing agent wording fits two of the cases.** See "The wording used" below; for those the notice's reason is left empty instead of invented.
6. **A case the ruling does not name: two queries to the same agent for the same manuscript** (a re-query). The row names the agent and both match. I write nothing for it, as for "several queries, no agent"; attaching to one would be a guess.
7. **The ruling-4 lock (U3) had been relying on the old match.** Its history row named no agent and "The Smoke Test" has many queries, so the row was attached to another agent's query (its notice row read "Tom Ellery"). U3 now puts its agent on the list and names them; the notice row reads "Undated Probe Agent".

### §0: how it worked

- **The line:** `ImportCsv.tsx:660–663`, `localQueries.find(q => …ms.title.toLowerCase() === msTitleInput.toLowerCase())`. The first query, in the order the store lists them, on a manuscript with that title.
- **With several queries on the manuscript:** every history row for that title was written to that one query, whoever it was for. Measured on the unchanged build: a row for agent B and a row for agent A both landed on A's query; a row naming nobody landed on it too.
- **Columns that could name the agent or agency:** none (see 1 and 3).

### The fix

`lib/importMatcher.ts` `matchHistoryRow`. The agent match is `findExistingAgent` / `sameAgent`, the one all three tiles use.

| The row | The manuscript's queries | Result |
|---|---|---|
| names an agent | exactly one to that agent | attached to it |
| names an agent | none to that agent, or the agent is not on the list | nothing written |
| names an agent | more than one to that agent | nothing written |
| names no agent | exactly one | attached to it, as before |
| names no agent | several | nothing written |
| names no agent | none | nothing written (as before) |

A row that is not written goes to the run's log and the "Not imported" count, and (except the last row of the table, which is unchanged) to the dashboard's skipped-rows notice.

### The wording used

| Case | Notice reason | Where the words come from |
|---|---|---|
| No agent, several queries | `Who's this for?` | the review's label for a row that names nobody |
| Agent not on the contact list | `Row didn't match an agent` | the import's own reason for that (now one constant, read by both) |
| Agent on the list, no query for that manuscript | *(empty)* | nothing existing fits |
| Agent on the list, more than one query for that manuscript | *(empty)* | nothing existing fits |

**For you:** the two empty reasons show a notice row with its agent and event and no reason under it. They need words from you.

Run-log lines: the existing "Activity row N: no query matches this manuscript and agent…" for a row with no matching query, and two new ones (the log needed something to say):
- `Row N names no agent, and "{title}" has more than one query, so the event can't be placed. Row not imported.`
- `Row N: there is more than one query to {agent} for "{title}", so the event can't be placed. Row not imported.`

### Locks

`tests/e2e/importMatcherHistory.measure.ts` (rendered, harness account; it builds two manuscripts, two agents and three queries through the matcher and removes them in a `finally`) and `src/lib/importHistoryMatch.test.ts` (13 unit cases).

| Lock | Red first, on the unchanged build | Red under its mutation |
|---|---|---|
| M1: a row naming B lands on B's query, A's holds only A's | "B's event is on B's query, and only that: expected 1 row, received none" (both rows were on A's) | match by title alone: unit 4 red; rendered, rebuilt, red at the same assertion |
| M2: no agent, two queries: nothing written, row in the notice as "Who's this for?" | "nothing was written to any query: received +1" | attach to the first query: unit 1 red; rendered, rebuilt, red |
| M3: no agent, one query: attaches | green before and after (it is today's behaviour) | never attach without an agent: unit 1 red |

M1 uses two rows, one for each agent. With one row it passed on the unchanged build by the order the store happened to list the queries in.

### Gates

`tsc` 0 · Vitest 561 files, 8,550 passed, 3 skipped · both builds 0 · the five matcher suites and the Import page locks green. Harness account after every run: 73 queries, 37 agents, 5 manuscripts, 396 feed rows, 113 history steps.

## 1. False premises and things you should know first

1. **The rules require a status, so "status only if the file gave one" could not be done as written.** `firestore.rules`, `isValidAgent`, lines 311–316: `submissionStatus` must be a string, one of Open, Closed, Unknown. I stopped and asked; you ruled Option 1 (write `Unknown`, make it read as not known). This report follows that ruling.
2. **No import path reads a status from a file.** The template has no status column for the agent, Smart Import's result has no such field, and the matcher has no such field. So "one with a status keeps it" is only reachable one way: the import's review has an Open/Closed control. That control was never saved (see 4). It is now, and a status set there is kept.
3. **Only the column matcher reads a rating from a file.** The template and Smart Import have no rating column.
4. **A fifth source of invented values, not in the pack: the import's review.** It filled in "6 weeks" for every agent whose file gave no window, and the commit wrote it. Its Open/Closed control and its "Agent fit" stars were shown and then thrown away (the commit wrote Open and 3 stars regardless). The review now holds nothing until the file or the writer gives it; what the writer sets is written.
5. **The matcher also invented a genre and three materials**: `["General Fiction"]` when the genres cell was empty, and `["Query Letter", "Synopsis", "Sample Pages"]` for every agent. Both are gone.
6. **An earlier ruling is reversed.** "Ruling 1" kept the matcher's 8-week reply window on purpose, and `importEmptyFields.measure.ts` asserted it. Your instruction for this pack supersedes it; the assertion now requires no window.
7. **"Unknown reads as open" was a written rule of the app** ("decision 3", `agentList.ts`). It is reversed. Two unit tests pinned it and are re-pointed.
8. **(Fixed by ruling 6, §0.) The dashboard showed a stale skipped-rows notice after an import made from the Import page.** `Dash58` reads the notice once per visit to the app. Arriving from the Import page without a reload, it still shows what it read earlier (or nothing). The notice the import saved is correct; it appears after a reload. `components/dashboard/v58/**` is fenced off by this pack, so I did not fix it. The walk records it. This is the most important open item: until it is fixed, a writer who imports the same sheet twice from the Import page is not shown "Already in your queries" on the dashboard until they reload.
9. **A file whose every row is already here used a card that said "That didn't work."** That is the build's existing nothing-imported state, as the pack asked. The title was false for this case, so this case now reads "Nothing new to import." A new string; see §8.
10. **The second import has no review to photograph.** With every row already here there is nothing to review; the shot is the nothing-imported card and the dashboard notice.
11. **The footnote's second sentence was restored in Phase 4, not Phase 5.** The lock that held it back reads the commit's agent match, which Phase 4 replaces, so the gates would have been red between the two commits.
12. **The harness account holds no agent made by an import.** Count of agents still carrying invented values there: **0** (37 agents; none has `importedNeedsReview` or an import-made id). Nothing was migrated anywhere.
13. **`template-mixed.csv` has four rows, not three.** Owen Hale (dated, no agency) is the fourth. The walk's third import therefore writes three queries and one new agent.

## 2. Gates

| | Baseline (`5166eaac`) | Now |
|---|---|---|
| `tsc --noEmit` | 0 | 0 |
| `build:dev` | 0 | 0 |
| production build | 0 | 0 |
| Vitest | 555 files, 8,479 passed, 3 skipped | 560 files, 8,534 passed, 3 skipped |
| headerPanelV2 P2, headerV3 H11 | red on four pages by 41.8px | green on four pages |
| IP1 (`onbV5ImportPage`, 20 tests) | part 3 recorded 21 passed, with its shots on and the sign-in step counted | 19 passed, 1 skipped (the skipped one only writes shots) |
| Parts 1 and 2's rendered locks | 104 passed | 104 passed (two snapshots re-pointed, §6) |
| The three matcher suites | 3 passed | 3 passed |
| The import-fixes walk | 3 passed | 3 passed |
| The import-truth walk | — | 1 passed |

Baseline files are in `baseline/`. The rendered locks were not re-run on the base: their baseline readings are part 3's run on the same commit (`5166eaac`).

## 3. §0 Recon

- **Agent writers (four, plus the review):** `smartImportCommit.ts` (template and Smart Import), `emailImportCommit.ts`, `ImportCsv.tsx` agents sheet, `ImportCsv.tsx` "Create from this row", and `smartImportReviewModel.ts` (the review's defaults).
- **Clock in history:** the matcher's `dateSent` fallback, its history-row date fallback, its `addQuery` call without the import flag; the email import's `Date.now()` ordering base and its `addQuery` call without the flag.
- **The card:** `activeTitle(n, undated)` in `OneScreenChart.tsx`; silent when some were dated.
- **Duplicates:** no path looked for an existing query. Three different agent matches were in use: name and agency exactly (the commit), name with a tolerant agency (the review's note), name alone (the matcher).
- **The beta strip:** mounted once by `AppShell` above the shell on every workspace route while the beta runs. By design.
- **Probe rows:** ten `q-imported-*` queries on the harness account, each with one history step and one feed row dated 20 September.

## 4. What each fault was, and the fix

### Phase 1: imported agents

**Cause.** Each writer built its own agent object and filled the gaps: `smartImportCommit.ts:108–127`, `emailImportCommit.ts:109–127`, `ImportCsv.tsx:332–348` and `:436–486`, and the review at `smartImportReviewModel.ts:334–335`.

**Fix.** One builder, `lib/importedAgent.ts` `importedAgentDoc`, used by all four. A field holds what the file gave (or what the writer set in review), or it is left out.

Every field the four writers set, before and after:

| Field | Template / Smart Import | Email import | Matcher: agents sheet | Matcher: Create from this row | After (all four) |
|---|---|---|---|---|---|
| `starRating` | 3 | 3 | the cell if 1–5, else 3 | left out | the cell or the review's stars if 1–5, else left out |
| `submissionStatus` | Open | Open | Open | Open | Open or Closed if set in review, else `Unknown` |
| `responseTimeWeeks` | the file's, else 0 (in practice the review's 6) | 0 | 8 | left out | the file's or the review's if above 0, else left out |
| `noResponseMeansNo` | the file's, else false | false | true | left out | the file's if it gave one, else left out |
| `submissionMethod` | the file's, else Email | Email | Email | Email | the file's, else Email (required: see §8) |
| `materialsWanted` | `[]` | `[]` | three invented materials | `[]` | `[]` |
| `genres` | the file's | `[]` | the cell, else `["General Fiction"]` | `[]` | the file's, else `[]` |
| `name`, `agency`, `email`, `website`, `mswlNotes`, `notes` | the file's, else `""` | the email's, else `""` | the cells | name only | unchanged |
| `importedNeedsReview` | true | true | not set | not set | unchanged |

**Why this is right.** The rules and the type make rating, window and reply rule optional, and the app already treats their absence as a state of its own. The status cannot be left out, so it takes the one value that means nobody has said.

**Readers changed so `Unknown` reads as not known.** The door is now three-way (`doorOf` in `agentList.ts`: open, closed, unknown).

| Reader | Before | After |
|---|---|---|
| `agentList.isDoorOpen` | true for anything not Closed | true only for Open (`isDoorClosed` added) |
| `contactList` facts `door` | open or closed (Unknown was open) | open, closed or unknown |
| `contactList` census "never queried" fact | "N open now · rest closed" (Unknown open; rest counted closed) | open counts Open, closed counts Closed |
| `contactList` open filter and its counts | Open now / Closed for now; Unknown under Open | adds "Not known" with its own count |
| `contactList.actionOf` (group by action) | unqueried Unknown agent that takes the book: "Ready to query" | "Nothing to do" (ready needs a stated Open) |
| `ContactRows` row | "Open to queries" | "Not known" |
| `AgentCarouselCard` foot | "Open to queries" | "Not known" |
| `contactNextStep.isReady` | anything not Closed | Open only |
| `contactNextStep` all-queried accounting | queried + mismatches + closed | adds a not-known count, and a sentence for it |
| `contactHousekeeping` reopen gap | asked only of Closed (same in effect) | stated as Closed only |
| `contactEdit` "Open to queries becomes N" | counted Unknown | counts Open only |
| `db.tsx` dream-agent suggestion ("is open to subs") | anything not Closed | Open only |
| `QueryAgentTab` | "Closed for submissions" for Unknown | "Not known" |
| `QueryLogSheet` | "Closed for submissions" for Unknown | "Not known" |
| `cardDraft` / the editor's Door control | opened an Unknown agent with Open chosen | neither chosen; still writes only Open or Closed |

Existing empty-state wording I found and kept: the reply-window cell's "Not stated" (unchanged), and the card's "Not rated". The open filter's new choice uses "Not known".

No live caller, left two-way: `agentList.agentDoor` and its counts (the retired v2 toolbar), `agentsPage.filterAgents`, `agentBoard`.

**Agents the app creates outside the import (unchanged).**

| Creator | Writes |
|---|---|
| Add an agent form (`AddAgentFocusForm`) | the form's values: status Open by default, 8 weeks by default, 4 stars by default, a reply rule, materials |
| The agent card's add (`AgentCardHost`) | Open or Closed from the Door control (Open by default), method chosen or Email, window and reply rule only if set, no rating |
| Log a query's quick add (`LogJourney`) | Open, the method chosen, window and "no response means no" only if set, no rating |
| `Queries.tsx:1122` | 3 stars unless given, Open, 0 weeks unless given, reply rule false, Email, `["Query Letter"]` |
| `Queries.tsx:6933` | Open, window if given, the method given, no rating |

### Phase 2: history dated from the clock

**Cause.** `ImportCsv.tsx:634` (`dateSent` fell back to now), `:677` (a history row's date fell back to now), `:665` (`addQuery` without the import flag, so it stamped its own history now). `emailImportCommit.ts:170–176` ordered undated steps from `Date.now()`, and `:140` called `addQuery` without the flag. The matcher also parsed dates with the browser's own parser: month first, and a throw on text it could not read ("Row N couldn't be read: Invalid time value").

**Fix.** The matcher reads a date cell with the template's reader (`matcherDate`: ISO or day/month/year). A blank, unreadable or two-way date is kept as no sent date, and the run's log says so. It passes `{ imported: true }` and writes the history with `writeImportedHistory`, extracted from `commitSmartImport` so both use one function. A history row with no readable date is not imported and the log says why. The email import passes the flag and orders undated steps from zero (a new query) or from just after the latest step (an existing one).

**Why.** Same rule as import-fixes, same reader, same writer.

### Phase 3: the card

**Cause.** `OneScreenChart.tsx` `activeTitle` spoke of undated queries only when none was dated.

**Fix.** `undatedMoreLine(n, undated)` renders one line under the chart's axis when some are drawn and some are not. The two sentences are built so that exactly one can speak.

### Phase 4: double imports

**Cause.** No path compared a file's query with the account's.

**Fix.** `lib/importDuplicates.ts`. A query is already here when the account holds one for the same agent and manuscript, sent the same day, or both with no sent date. `splitDuplicates` takes such rows out when the file is read, so the summary and the review count only what will be written. `commitSmartImport` checks again with the account's queries (set-up learns its manuscript only at the commit). The rows go to the notice with the reason "Already in your queries". The matcher applies the same check and lists the row in its run log.

One agent match for every path, `sameAgent`: the same name, and the same agency or one side giving none. An agent known only by agency matches only that agency.

**State used for a file that is all duplicates:** the existing nothing-imported card (`NothingImported`, `data-dead="nothing"`), reached from the read, before anything is written.

**Also changed:** the import's activity line is written only when something was written. The matcher counted a row that was already here as "Imported" while its line said "Row not imported"; it now counts as "Not imported".

### Phase 5: housekeeping

- **P2 and H11** take the strip's bottom edge off the header's y when the strip is on screen (`tests/e2e/betaStrip.ts`) and assert that it is.
- **Probe rows:** removed by `tests/e2e/removeProbeRows.mjs`. Before: 83 queries, 406 feed rows, 123 history steps. After: 73, 396, 113. Every other collection unchanged (`probe-rows-removed.json`).
- **Footnote:** two sentences again.

## 5. Locks: red and green

Red readings on the base are in `red/`; mutation readings in `mutation-proofs.txt`.

| Lock | Green | Red on the base | Red by mutation |
|---|---|---|---|
| A1 (`importedAgent.test.ts`, 9) | all four writers and the review | 5 of 7 failed: rating 3, Open, window, reply rule | default the rating to 3: 5 red · write Open: 4 red |
| A2 (`unknownDoor.test.tsx`, 18) | row, card, tab, counts, sorts, editor | 11 failed | map Unknown to Open in `doorOf`: 6 red · a missing rating as 3: 1 red · ready takes not-Closed: 1 red |
| T1 (`importNoClock.test.ts`, 7) | matcher and email import | 5 failed | four mutations, each red |
| M1 (`importMixedCard.test.tsx`, 6) | mixed, none dated, all dated | 3 failed | hide the line when any is dated: 4 red · show both sentences: 2 red |
| R1, R2, N1 (`importDuplicates.test.ts`, 15) | twice leaves one import's worth | 11 failed | drop the check: 6 red · agent only: 1 red · commit stops checking: 4 red · wrong reason: 4 red |
| R1 rendered (the walk) | 1 passed | — | check dropped in source and rebuilt: red (the second import reached the summary) |
| H1 (P2 and H11) | green on four pages, strip shown | red by 41.8 | from the page's top: both red by 41.8 · shell moved 4px: both red by 4 |

Populations are asserted: A1 at least four agents per commit; T1 three undated rows and two dated; M1 mixed and none-dated branches counted; R1 at least two queries per file and at least one undated.

## 6. Locks re-pointed

- `agentList.test.ts` and `contactList.test.ts`: each pinned "Unknown reads as open".
- `importPage.test.ts` W1 and IP1 D1: the footnote is two sentences.
- `importEmptyFields.measure.ts`: no window, rating, reply rule, materials or genre; status Unknown.
- OB2 V4's two snapshots (`v4-review.json`, `v4-dupes.json`): they held `responseTimeWeeks: 6` for all sixteen agents. Now null for window, rating and status. Every other field was compared and found equal before they were replaced.

## 7. The walk on dev

`tests/e2e/importTruth.measure.ts`, on the empty fixture account, at 1440. Shots in `shots/`.

| Step | Shown | Account (agents / queries / history steps / feed rows) |
|---|---|---|
| Before | — | 0 / 0 / 0 / 0 |
| 1. `template-iso.csv` (through set-up) | summary 5 and 5; dashboard "4 active queries", no line | 5 / 5 / 9 / 2 |
| Contact list | five rows, each "Not known", none "Open to queries" | — |
| 2. The same file, from the Import page | "Nothing new to import. 0 queries imported · 0 agents added. 5 rows were skipped: already in your queries." Dashboard notice lists all five as "Already in your queries" | 5 / 5 / 9 / 2 |
| 3. `template-mixed.csv`, from the Import page | summary 3 and 3; dashboard "5 active queries" and "2 more have no sent date yet."; after a reload the notice reads "1 row from your file wasn't imported. It had no agent or agency name." | 6 / 8 / 14 / 3 |
| After (restored in a `finally`) | — | 0 / 0 / 0 / 0 |

Clara Voss and Jamal Carter were not added again in step 3; Owen Hale was new.

## 8. For Nick

### 8.1 Required by a rule, so left as it is

- **`submissionMethod: Email`** on an imported agent whose file named no method. `firestore.rules:322` (`data.submissionMethod is string`) and the type both require it. It is still a value the file did not give.
- **`sendMethod: Email`** on every imported query (all three paths). Not asked about in this pack; the same kind of value.

### 8.2 Every string added or changed

| Where | String |
|---|---|
| Contact list row, card foot, Query Centre agent tab, log sheet, open filter | `Not known` |
| Row's tooltip | `Whether they are open to queries is not known` |
| Next step, all queried | `{n} has / have no open or closed status recorded.` |
| Dashboard card, under the chart | `1 more has no sent date yet.` / `{n} more have no sent date yet.` |
| Skipped-rows notice reason | `Already in your queries` |
| Nothing-imported card, every row already here | title `Nothing new to import.`; button `Back` |
| Import page footnote | `An import adds to what you already have. An agent already on your contact list isn't added again.` |
| Matcher log | `Row N: the date "…" couldn't be read. Imported with no sent date.` |
| Matcher log | `Row N: the date "…" could mean two days. Imported with no sent date.` |
| Matcher log | `Row N has no date that could be read, so the event can't be placed in a query's history. Row not imported.` |
| Matcher log | `"{title}" to {agent} is already in your queries. Row not imported.` |

### 8.3 Decisions I made that you may want to reverse

- **A freshly imported, unqueried agent is no longer "ready to query".** Ready needs a stated Open. A writer who imports a list of agents they have not queried will see none of them offered until they set each to Open. This follows your ruling, and it is a visible change.
- **The row reads "Not stated" (reply window) over "Not known" (door).** Two different words for two empty facts, one above the other.
- **The matcher now reads only ISO and day/month/year dates.** It used to accept anything the browser could parse ("March 14 2026"), month first. Such a cell is now kept as no sent date and logged.
- **A matcher history row with no readable date is not imported.** Ruled on: it now also goes to the skipped-rows notice (§0).
- **The matcher's "Imported" count no longer includes rows that were already here.**
- **Same name, different stated agencies, is two agents** on every path. The matcher used to treat them as one.
- **The matcher leaves no line in Recent activity for the queries it adds.** It used to leave one per query, dated now.

### 8.4 Still untrue, not fixed here

- **The review's reply slider rests at 6** for an agent with no window. Nothing is written unless it is moved, but the control shows a number nobody gave. Changing it is a change to the look.
- **`Queries.tsx:1122`** writes 3 stars, 0 weeks, reply rule false and `["Query Letter"]` for an agent created there. Not an import path.
- **The Add an agent form** defaults to 4 stars and 8 weeks. The writer sees and can change them.
- **The matcher's manuscripts sheet** writes status "Ready to query" for every manuscript. Manuscripts were out of scope.
- **"You've queried all your agents"** can be the next step's title while unqueried agents with a closed or not-known door remain. The sentence under it accounts for them.
- **Within one file, two identical rows are still two queries.** The review's own duplicate grouping handles that case; this pack compares a file with the account only.
- **The email import's own agent match** (made in the function) is not `sameAgent`. `functions/**` was out of scope.

## 9. Deploy

Recorded in `DEPLOY.md` beside this file.
