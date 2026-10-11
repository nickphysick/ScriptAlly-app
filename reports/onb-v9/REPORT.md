# Onboarding v9: a warmer set-up, and a review that waits for its answers

Branch `onb-v9`, worktree `/Users/nickphysick/ScriptAlly-onb9`. Seven phase commits on top of the groundwork commit. Nothing is merged to `main`. Prod is untouched.

## 1. False premises and departures (read first)

1. **The base.** The pack names `origin/import-truth`. You named `dev/…-truth-qc137` at `4a8e41b5` instead; that is the base. It carries onboarding v5 parts 1 to 3, import-fixes and import-truth.
2. **The baseline is not all green.** `functions/src/email.test.ts` fails to load on the base. Everything else passes. It still fails to load, unchanged.
3. **A manuscript already holds several genres.** `genre` is the primary and `subGenres` the rest. No type or rules change was needed.
4. **Set-up stores a genre as its label, not its id.** The Add-a-manuscript form stores ids; set-up, the Manuscripts dialogs and the sidebar work in labels, and every reader resolves either. Set-up goes on storing labels (table in §3).
5. **A row with no status was not skipped by the review.** The review already read a missing status as Queried, so the "No readable status" skip could not be reached through it. **No fixture row changes from skipped to imported.** What did change: a status the template could not read (for example "waiting") used to arrive as a ready "Queried" with nothing asked. It is now a question that quotes the cell.
6. **"Skip for now" from the review already asked first and already imported nothing.** G4 holds that behaviour; it did not have to be built. Its red reading on the base is only because the deck it walks through did not exist.
7. **The fixture with nine questions did not exist.** I built it (`fx=gate` on the lab), and one for the nameless row (`fx=nameless`).
8. **The hand-off screen is shared.** It is drawn by the import flow, so `/import` shows the new hand-off too. The Import page's own layout and tiles are untouched.
9. **The fork's drop zone hung from the ringed tile.** With no tile pre-selected it is gone, as the reference draws. A file dropped on the Smart import tile is still taken; no words on the tile promise it.
10. **"Title TBC lights Continue as soon as it is pressed" holds only once the readiness question is answered.** On "Just getting started" the same card also asks whether the book is ready, and that answer sets the manuscript's status, so Continue needs both. Say if you want the readiness question to stop holding Continue.
11. **The dashboard's header could not be reused** (accepted). The title page matches its type and spacing.
12. **"{n} sets merged" is not true of a set kept apart.** The duplicates-done line also says how many sets were kept as separate agents.
13. **The step chips are numbered from the steps shown.** A file with no duplicates reads "Step 1" and "Step 2", where the reference shows 2 and 3.
14. **A Smart Import status question has no cell to quote.** Smart Import does not return the original status text. Its card asks "Where does this one stand?" without the quoted part.
15. **The gate counts records, not reasons.** A query with two things unclear is one query to answer; its card asks the second once the first is settled. The "All {n} answered" line then counts answers, so its parts can sum to more than {n}.
16. **A date typed after "Neither · type the date" is counted as "confirmed".** The record cannot tell a typed date from a picked reading.
17. **Back from the review's first step still leaves the import**, as built. Back between review steps keeps every answer (held by G1).
18. **`importFixes` and `importTruth` were red from my Phase 2 commit until Phase 5.** Both walked the v5 book step. I did not run them until Phase 5. They use the shared walker now and pass.
19. **"A fresh account" is the dedicated empty fixture account**, put back into set-up for each walk and restored afterwards. No new account is created.
20. **M1's red reading on the base is thin.** The base has none of these screens, so it is red there by absence. Against the v9 stylesheet with its reduced-motion block cut back, it is red at the summary's mark (held at opacity 0). Under its mutation it is red at the welcome.
21. **The FAQ answers are unchanged.** Two still use the phrase "needs a look".
22. **Not built from the Words table:** nothing. One row is shipped in a narrower form (item 14).

## 2. Gates

| | Base (`4a8e41b5`) | Now |
|---|---|---|
| `tsc --noEmit` | 0 | 0 |
| production build | 0 | 0 |
| `build:dev` | 0 | 0 |
| Vitest | 563 files passed, 1 failed to load; 8,563 passed, 3 skipped | 565 files passed, the same 1 failed to load; 8,584 passed, 3 skipped |
| `onbV9.measure.ts` | — | 29 passed |
| `onbV9Walk.measure.ts` (dev) | — | 5 passed |
| `onbV5`, `onbV5Import`, `onbV5ImportPage`, `importFixes`, `importTruth` | 126 passed, 2 skipped | see §6 |

In full Vitest runs alongside other work, up to six unrelated tests timed out under load. Each passes when run alone.

## 3. §0 Recon

Base SHA `4a8e41b5`. Reference hashes are in `design-refs/onboarding-v9/SHA256SUMS.txt` (16 files, verified); the mock is `3e50da9c…`.

**Genre pills (nine, by ruling 2):**

| Pill | Taxonomy id | Stored as |
|---|---|---|
| Crime | `crime` | Crime |
| Thriller | `thriller` | Thriller |
| Literary fiction | `literary-fiction` | Literary Fiction |
| Fantasy | `fantasy` | Fantasy |
| Romance | `romance` | Romance |
| Historical fiction | `historical-fiction` | Historical Fiction |
| Science fiction | `science-fiction` | Science Fiction |
| Women's fiction | `womens-fiction` | Women's fiction |
| Horror | `horror` | Horror |

The search offers all 26 genres of the taxonomy and nothing else.

**Age categories (ruling 1):**

| Shown | Stored | Note |
|---|---|---|
| Picture Book | Picture Book | Words table's |
| Early Reader | Early Reader | the ruling's line ("Children starting to read on their own…") |
| Middle Grade | Middle Grade | Words table's |
| Young Adult | Young Adult | Words table's |
| New Adult | New Adult | Words table's. **Added to the shared list** |
| Adult | Adult | Words table's |

"New Adult" was added to `AGE_CATEGORIES` in `src/lib/manuscripts.ts`, between Young Adult and Adult. The rules accept it (`ageCategory` is any string up to 128 characters, `firestore.rules:117`). Screens that now offer it: the Add-a-manuscript form, the Manuscripts plate's inline editor, the Manuscripts edit dialog, the Import page's book step, and set-up's "Your book". No Manuscripts page file was edited. One side effect: "new" joins the stop-words Discover uses to highlight matches (display only).

The rest of §0 is as reported when the pack stopped (welcome options and where the answer is stored, the book fields, agent genre matching exists, readiness sets `status`, the review's flag kinds, the status labels, the row count, the dashboard header).

## 4. The phases

| Phase | Commit | What changed |
|---|---|---|
| groundwork | `e6463059` | References enrolled, baseline recorded. |
| 1 | `9072f0c8` | The welcome: a navy panel (eyebrow, two-line heading with the first name, one line, a 4:3 slot) over a card of four options, two-up. |
| 2 | `a87eb40b` | The acknowledgement types in letter by letter with no cursor, then the title card pops and takes focus. `Title TBC` on "Just getting started". |
| 3 | `d538aad5` | "Your book": the title page, nine genre pills with a primary, a search over the fixed list, the six-way age row with its notes, the word count with bounds. All four journeys use it. `BranchA.tsx` deleted. |
| 4 | `314a85e3` | The fork's tiles (16:9 slot, three lines, no ring) and the hand-off ("What happens next", three steps, no one-shot note). |
| 5 | `76bf2779` | The sage tokens and the mark; the summary; "Need an answer"; duplicates done; the "all answered" band. |
| 6 | `33b9a0f9` | The answer deck, the gate, the blank date, the unread status, the nameless row. The rail is gone. |
| 7 | this commit | Reduced motion as one block with a net; the motion and regression locks; the dev walk; this report. |

**Departures from the mock, beyond §1:** the fork's template tile stacks its two buttons at 1440 (they do not fit side by side in a third of the sheet with our type); the date fields are the browser's date input, as built, where the mock draws a text field; the deck's dots are always pressable, not only below 820px; the ready rows keep their "Add details" editor and their remove control.

## 5. Locks: red, green, mutation

Red readings are in `red/`, mutation readings in `mutation-proofs.txt`, numbers in `readings.jsonl`.

| Lock | Red on the build before it | Green | Under its mutation |
|---|---|---|---|
| W1 welcome | no panel, no heading | 2 cases | restore the open heading: red |
| T1 typewriter | screen absent | 3 cases | show the card from the start: red |
| T2 title TBC | screen absent | 2 cases | leave the title empty: red |
| B1 book head | screen absent | 1 | drop the byline: red ("the byline") |
| B2 genres | screen absent | 1 | allow free text: red ("typing something outside the list adds nothing") |
| B3 age note | screen absent | 1 | the Adult note for every pick: red ("Picture Book") |
| B4 word count | screen absent | 1 (+ 400px case) | remove the bounds: red (the over-500,000 error) |
| F1 fork | no slot; old heading | 3 cases | restore the one-shot note: red |
| S1 marks | no mark; Continue lit with sets open; no band | 3 cases | colour a chip sage: red ("nothing but the mark is sage") |
| G1 agents gate | no deck, no gate | 1 | enable Continue from the start: red |
| G2 queries gate | blank date not asked | 2 cases | skip the blank-date question: red |
| G3 nameless row | set aside by itself | 2 cases (removed; named) | set aside as before: red, both cases |
| G4 skip | (see §1.6) | 1 | leave without asking: red |
| M1 motion | (see §1.20) | 3 cases | ignore the media query: red |
| R1 regressions | — | 1: the loaders' and tiles' files are byte-identical to the base, and they render | none asked |

B4 first went red under its mutation by timing out; it was tightened to fail on its own assertion.

## 6. Other locks touched

Each re-point states its reason at the lock.

- **Re-pointed:** `setupScreens`, `onboardingCard`, `onboardingTail`, `authPageSmoke`, `landingRoute` (two Contact-list exits, was three), `captureFork`, `deadEnds`, `onboardingStage`, `importSummary`, `importWords`, `smartImportConfirm`, `reviewCopyClaims`, `importDateFlags`, `importOneCount` (C1), `smartImportReviewModel`; e2e `onbV5` S1, S2, K1, K3, A4; `onbV5Import` S2, V1, V4, V5; `onbV5ImportPage` P1, F3; `importFixes`; `importTruth`.
- **Retired:** `onbV5` S3 and S4 (the v5 book step and the note's old home); `onbV5Import` V3 (a row no longer asks).
- **C1** now reads: the summary and the review both count the nameless row (4 and 4 for `template-mixed.csv`); removed, written plus listed equals the rows in the file; named, all four import and nothing is listed.
- **V4** gives the baseline's answers through the deck and gets the baseline's result, byte for byte.

Final run on the Phase 7 build: recorded in `DEPLOY.md`.

## 7. The walk on dev

`tests/e2e/onbV9Walk.measure.ts`, against a local build of this tree on the dev project, with the dedicated empty fixture account.

| Journey | Result |
|---|---|
| A few queries out | welcome ("Welcome to QueryHawk, Rowan."), its passage, title, book, **the fork**: three tiles, none ringed. No document written. |
| Deep in it | the same, with its own passage. |
| Had some interest | the same, with its own passage. |
| Just getting started | `Title TBC` fills "Untitled manuscript"; "Still being written"; the book; **the Contact list** (`/agents`). One manuscript written: "Untitled manuscript", Drafting, Fantasy. |

**The import** (`template-mixed.csv`, template path, four rows):

- Summary: "We've read your file." with the mark; "4 rows, read and sorted. Nothing is saved yet."; 4 agents, 4 queries; "2 agents need an answer and 2 queries need an answer".
- Agents: 2 to answer. Owen Hale carried on without an agency; the row with no agent and no agency was removed.
- Queries: 3 left, 2 to answer, both "Date needed" (the unreadable "sometime in May" and the blank cell). One answered "I don't have this date", one given 1 March 2026. "All 2 answered. 1 date added, 1 left blank on purpose."
- Written: 3 agents, 3 queries, 1 manuscript. Full Requested dated 2026-03-01; Partial Requested undated; Queried dated 2026-03-14.
- Dashboard: "2 active queries"; "1 row from your file wasn't imported. It had no agent or agency name."

**Counts.** Before: every collection 0. After the import: 3 agents, 3 queries (5 history steps), 1 manuscript, 2 activity lines. After the run: every collection 0 again. Each walk removes what it wrote in a `finally`; the file's `afterAll` asserts the counts equal the snapshot.

## 8. Shots

`pairs.html` sets each reference beside the built screen at 1440, and shows welcome, book, fork and queries at 400. The walk's own shots are `shots/walk-*.png`.

## 9. Deploy

Recorded in `DEPLOY.md` beside this file: the hash dev served before, the branch it was built from, the integration branch, and the hash after.

## 10. For Nick

### 10.1 Decisions I need

1. **Title TBC and the readiness question** (§1.10). Should Continue light on Title TBC alone?
2. **The drop zone** (§1.9). Gone from the fork, as drawn. Bring it back under the Smart import tile if you want the words.
3. **Smart Import status questions** (§1.14) have no quoted cell. Passing the original text through needs a change in `functions/`, which this pack could not touch.
4. **Two FAQ answers still say "needs a look"** (§1.21). They need new words now that everything flagged must be answered.

### 10.2 Every string that changed

Shipped exactly as the Words table: every row, except the status question for Smart Import (§1.14).

Strings I wrote that are not in the Words table:

| Where | String | Why |
|---|---|---|
| Duplicates, a set still open | `Decide each set above first.` | The primary is disabled; the bar says why. |
| Duplicates done | `{n} sets kept as separate agents.` | "Merged" is untrue of them. |
| Duplicates done, row chip | `Kept both` / `Kept all` | The build's own labels. |
| Summary, agents tier | `{n} row has no agent or agency. Name it, or remove it.` · `{n} have a detail to check.` | The other two agent questions. |
| Summary, queries tier | `{n} details to check` | Reasons outside the three named families. |
| Summary and paragraph, singular | `1 agent needs an answer`, `1 has no agency…`, `1 date missing` | The table gives plurals only. |
| Deck, nameless card | name `Unnamed row`; chip `No agent or agency`; line `Your note: "…"` or `No name or agency in your sheet` | The card needs a name, a chip and a second line. |
| Deck, agent card line | `No agency in your sheet` | From the mock. |
| Deck, answered card | `Agency saved: {agency}.` · `Row removed. It will be listed as not imported.` · `Saved as {name}.` · `Marked as checked.` · `{status}, sent {date}.` / `{status}, kept undated.` · chip `Answered` · `Change this` | Going back to an answered card. |
| Deck, mapping card | `Mark as checked` | The build's own. |
| Status chip | `Status to clarify` (was `Status to check`) | From the mock. |
| Queries subline, all answered | `Every question answered. Nothing is saved yet.` | From the mock. |
| Queries heading | `queries for {title}` (was `queries for your Query Centre` with `for {title}` beneath) | From the mock; the subline is now the gate's. |
| All answered | `{n} details checked` | Answers outside the four named kinds. |
| Ready list, empty | `No agents are ready yet.` / `No queries are ready yet.` | Every row is in the deck. |
| Coming up | `{n} more details to check` | As above. |
| Row editor note | `Add what you remember and your timeline stays accurate.` (was `Dates are optional — add what you remember…`) | "Optional" may not appear in the review. |
| Ready rows | status names are the Query Centre's (`Passed`, `Closed with no reply`) | Were the stored values (`Rejected`, `No Response`). |

Removed: the guide card and its three headings and sentences; "How this step works"; "Reset all changes made here"; the row questions' own sentences for agency, two-way date, unreadable date, missing date and status wording (the deck's replace them); "Agents from your file" and "Queries from your file"; "{n} to sharpen"; "Optional"; "Chances to sharpen"; the hand-off's two one-shot notes; the fork's drop-zone words; the tiles' three paragraphs.

### 10.3 Illustration slots

All are empty, hatched placeholders of the drawn size, with `data-slot` naming them.

| Slot (`data-slot`) | Where | Size |
|---|---|---|
| `welcome` | the welcome panel | 4:3, the panel's right column (about 420 wide at 1440) |
| `fork-smart`, `fork-template`, `fork-byhand` | top of each tile | 16:9, the tile's full width (about 348 × 196 at 1440) |
| `handoff-sheet`, `handoff-reads`, `handoff-check` | the three "What happens next" steps | 96 × 96 |

The acknowledgement's stamp and the success mark are drawn in code, not slots.

### 10.4 Uncovered or thin

- The answered-card state of the deck (going back with an arrow and pressing "Change this") is exercised by hand, not by a lock.
- The deck's fallback cards (two dates found, a month with no day, a stray spreadsheet number, a response date) keep the build's own question and controls inside the card. V4 answers one of each; no lock holds their look.
- `queryReasonText` still holds the old sentences for the five reasons the deck redrew. Nothing shows them now.
