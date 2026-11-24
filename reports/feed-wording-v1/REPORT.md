# Feed wording v1 — the activity feed's sentences

Branch `feed-wording-v1`, cut from the dev line `dev/…-laqunk-aa215-laqdoor` at **822966fba**
("e2e load guard: print the load, wait while it is above 6"). Prod, `main` and prod rules untouched.

## False premises (read first)

1. **Step 0.4, Holding Reply: it does not print its stored description. It DROPS.** `feedPill` has no pill for
   `activityType: "Holding Reply"` (no event key, no status, not in `TYPE_PILL`), so `feedEntries` skips the row
   before any sentence is built. The pack's sentence is built in `describeEvent` and locked, but the row only shows
   once `feedPill` gets a "Holding reply" pill, and `feedPill` is on this pack's do-not-touch list. Also,
   `controls-entry-v1` (not on this base) replaces `Holding Reply` with `Agent Reply`; that branch will need the
   same sentence when it merges.
2. **Offer Declined is not one of the "prints its description" rows.** It carries `resultingStatus: Withdrawn`, so it
   was being worded as "You withdrew your query for T from X". It now gets the pack's "You declined the offer…"
   sentence by type, or by the drawer's `offer_declined` key.
3. **The phone's Today never shows a rename row.** `TodayV5` filters every housekeeping row out (`.filter((e) => !e.app)`),
   so no Agent Updated row reaches it. The rendered check "the phone's Today shows the new name on the rename row"
   cannot pass without changing Today's filter, which is outside this pack. What Today would read is locked by unit
   instead: on a rename row the first person run (the run Today takes as the name) is the NEW name.
4. **Step 0.3: the agent card's path is `commitCardSave` (lib/agentCardSave), not `saveAgentEdits`.**
   `db.saveAgentEdits` has no caller outside db.tsx. Every card save (Contact list, the wide card, the app-level
   panel, the phone's Agents, Log stages) goes through `useAgentSave` → `commitCardSave` → `commitAgentEdits`. So the
   one row is written in `commitCardSave`, and also in `saveAgentEdits` for completeness.
5. **Part E's two rules cannot both hold in this column.** "The headline wraps to at most two lines" and "a collapsed
   card with a long headline shows its full text": the dashboard's feed column is 278px wide, so the headline gets
   **125px at 1280 and 184px at 1512**, the same with the sidebar open or collapsed. In the typewriter face that is
   about 12–18 characters a line, so "Your full manuscript is with Nadia" needs three lines and a long agency's
   headline needs four to six. What shipped is the brief's literal rule (wrap, two lines, no one-line ellipsis), which
   is better than before. A longer headline still ends in an ellipsis after its second line. **Nick's call:** drop the
   two-line cap (the row grows to the whole headline), or widen the headline's share of the row (the 48px time
   column and the 22px glyph take the rest). FW-E's full-text check is recorded as an expected failure until then.
6. **The dev deploy did not happen: STOP under CLAUDE.md.** Dev serves `index-DQIDPfLr.js`. A clean `build:dev`
   of this pack's base (822966fba) gives `index-C_VVU1di.js`, and no pushed or local branch is known to build
   `DQIDPfLr` (the controls-entry-v1 report says the same). The served bundle's branch cannot be named, so it cannot
   be merged into. The dev **rules** deploy is held too: dev's live ruleset is controls-entry-v1's (it allows
   `Agent Reply`, `replyKind`, `replyDate`, `nudgeSetAt`), and deploying this branch's rules alone would revoke them.
   Neither hold blocks this code on dev: the feed store's create rule has no key allowlist, and these rows never go
   to the nested store (they carry no `queryId`). The rendered checks ran on the emulator instead (FW-J, FW-E below).

## Step 0 findings

**0.1 — confirmed, with one detail.** `lib/dashFeed.ts` set `who = best ? agentPrimary(best) : desc.trim()` for agent
events, where `best` was the agent whose name or agency was the longest token the description contained, and
`who = title || a.description.trim()` for manuscript events. `lib/dashFeedDrawer.ts` `HOUSE_SAY` wrapped that `who`.
So an agent or manuscript no longer in the live lists put its whole stored description in the name's place
("You updated You updated details for … at …'s details"). The phone (`TodayV5`) reads `feedEntries` directly, not
the drawer, so it printed the raw description instead.

**0.2 — the six housekeeping types are written only in `src/lib/db.tsx`.** Every other path calls these functions:

| Type | Writer | Wrote |
|---|---|---|
| Agent Added | `addAgent` (also behind smart import, CSV import, Discover/Scout adds, the add journeys) | id `act-added-agent-{agentId}`, "Added {name} at {agency}" / "Added {agency}" |
| Agent Updated | `updateAgent` | up to FOUR rows per save (open, fit, wishlist, "other"), each "You updated details for {name} at {agency}", details per field |
| Agent Deleted | `deleteAgent` | "You deleted {name}{ (and n queries removed)}"; a nameless agent was "You deleted an agent" |
| Manuscript Added | `addManuscript` | "You added a new title {title} to your manuscripts" |
| Manuscript Updated | `updateManuscript` (not `updateManuscriptQuiet`; not a comps-only write) | "You updated a manuscript's details" |
| Manuscript Deleted | `deleteManuscript` | "You deleted “{title}”{ (and n queries removed)}", `manuscriptId: ""` |

Outside the app: `tests/e2e/migrateRecordCleanup.mts` (a one-off migration script) and the e2e seeders write these
types with their own descriptions; untouched (test account, no backfill, per baked decision 1).

**0.3 — confirmed: `updateAgent` wrote Agent Updated rows; `commitAgentEdits` writes none.**
- `updateAgent` callers: `Queries.tsx` (the old notes save, and the old email/website inline edit), `useTaskCommit`
  (the pane's one-agent fix), `HousekeepingSweep` (the one-agent walk, and via `saveHkRows` the batch), `ToDoPage`
  (passes it on), `hkSave` (the batch, and its Undo).
- `commitAgentEdits` callers: `commitCardSave` (every agent-card save), `useHkFixes` (the "still current" wishlist stamp),
  the notes writers (`HostAgentCard`, `AgentCard262`, `AgentList`, `AgentCardHost`), `db.saveAgentEdits` (no outside caller).
- Fields either path can change: name, agency, agencyUnknown, email, website, country, city, twitter, bluesky,
  instagram, socials, genres, mswlNotes, mswlCheckedAt, notes, agentNotes, notePreview, pinnedNoteId, starRating,
  submissionStatus, responseTimeWeeks, noResponseMeansNo, submissionMethod, submissionMethodOther, materialsWanted,
  reopensOn, fieldSources (hkSave's provenance), plus anything `updateAgent`'s `Partial<Agent>` allows (image,
  importedNeedsReview, requeryPreference, setAside, lastCheckedDate, dateAdded, id, userId).
- Manuscript save paths: `updateManuscript` (narrates, except comps-only), `updateManuscriptQuiet` (never),
  `setActivePackage` (never), `addManuscript`, `deleteManuscript`.

**0.4 — rows whose sentence came from the stored description** (pill present, `describeEvent` null):
- Offer Accepted from the To-do board's `offerDecision` (no status): "Offer accepted — X at Y now represents…". **Built now.**
- Holding Reply: see false premise 1 (it drops at `feedPill`). **Sentence built; row still drops.**
- `offer_told` ("Others told", Status Changed, no status): `toldLine`. **Left as built.**
  Suggested: "You told {n} other agents about the offer from [X]".
- `offer_call` (Status Changed, no status): "Offer call booked with X". **Left as built.**
  Suggested: "You booked a call with [X] about [T]".
- Any query row whose agent has been deleted: `who` is empty, so it drops (as before).
- Materials Sent / Status Changed with no status and no key (old CSV imports): no pill, so they drop (as before).

**0.5 — the validators.** `isValidActivity` (the feed store) checks no key list on create, so new optional keys
pass already; its UPDATE allowlist (`affectedKeys().hasOnly`) would reject an update that changed one (nothing
does). `isValidActivityNested` has a `hasOnly` and WOULD reject them; these rows are never written there.
Both now type the keys.

**0.6 — readers of `FeedEntry.say` / `.who` / `.agency` / `drawerEvents`:** `Dash58Feed.tsx` (the v58 drawer),
`F1Feed.tsx` (the dashboard's feed column), `lib/dashF1Feed.ts` (cards, sends grouped), `phone/v5/TodayV5.tsx`
(takes the first `who` run as the name; shows no housekeeping rows), and `lib/manuscriptShelf.ts`, which calls
`describeEvent` directly, so the manuscript shelf's sentences change with the feed's.

**0.7 — the enums and the app's words.** `SubmissionStatus`: Open → "Open to queries", Closed → "Closed to queries",
Unknown → "Not known" (lib/agentPanel). `ManuscriptStatus` (lib/manuscriptV21 `STATUS_WORDS`): Drafting, Revising,
Ready to query, Querying, Shelved, On submission.

## The commits

| Part | Commit | What |
|---|---|---|
| A | f608ccd71 | the subject carried (7 optional `Activity` fields), every db.tsx write site, the resolution in `feedEntries` (carried → Added row's id → live manuscript → drop), the longest-token match deleted, the drawer's `HOUSE_SAY` deleted (the sentence is built once, in lib/feedHouse), both validators |
| B | f8a132341 | one helper for what a save changed; ONE row per save from `updateAgent`, `commitCardSave` (the card; its Undo deletes the row) and `saveAgentEdits`; `updateManuscript` carries the groups; the sweep's one row; bursts folded in `feedEntries` |
| C | f99696dae | `describeEvent` in the table's words; Offer Accepted / Offer Declined / Holding Reply sentences; the day's sends; the import's full stop |
| D | e6399dbd9 | card headlines, the agency said once, one 12-hour clock (`feedClock`), the collapsed card's time |
| E | (the last commit) | the collapsed headline wraps to two lines; the time level with the first line |

Design notes worth keeping:
- The housekeeping sentence moved from the drawer into `feedEntries`, so the drawer, the cards and the phone read one
  sentence (the phone printed the raw description before).
- `description` is unchanged for every type except the delete of a nameless agent ("You deleted {agency}", was "You
  deleted an agent") and the import (no full stop). The closed stamp (lib/agentList) still finds
  "You updated details for {name} at {agency}" with details "Submission status updated to Closed"; the name in the
  description is now the agent AFTER the save, which is the name the stamp matches.
- The sweep row: `saveHkRows` is the only batch path (the HousekeepingSweep group sheet). The one-agent walk in the
  sweep, and `useTaskCommit`'s one-agent fix, are ordinary updates.
- No-title sentences drop the preposition rather than inventing a title: "X passed", "X asked for a partial",
  "You sent the full manuscript to X"; the offer with no title is "X offered to represent you".
- The day's several sends say the title only when every send that day was for one book; otherwise "You queried A, B and C".
- Open status "Unknown" (the app's "Not known"): **"You marked whether [X] is open to queries as not known"**.
- Manuscript status words are `STATUS_WORDS` lower-cased inside the sentence: "You marked [T] as ready to query".

## Fields treated as silent

The pack's nine (notes, agentNotes, pinnedNoteId, image, lastCheckedDate, mswlCheckedAt, importedNeedsReview,
requeryPreference, setAside), plus the Agent fields a save can carry that the table does not name:
**id, userId, dateAdded, agencyUnknown** (rides an agency change, which is narrated), **notePreview** (the card's
cached note line), **fieldSources** (hkSave's found-value provenance). For manuscripts, `comps` (as built) and
`statusChangedDate` (a stamp the status change carries) are silent; every other manuscript field is "details".

## Rows dropped

Counted on the emulator harness, `tests/emulator-seed/harness.json` (the dev account as copied on 2 Nov, all
dates, not only the 30-day window); live dev was not read (no `ALLOW_LIVE_FIRESTORE` opt-in in the brief):

| Type | Kept, and how | Dropped |
|---|---|---|
| Agent Added | 37, by the live agent its id names | 0 |
| Agent Updated | 0 | **42** (none carries a subject; most are agents since deleted or renamed) |
| Manuscript Added | 4, by the live manuscript | **1** |
| Manuscript Updated | 89, by the live manuscript | 0 |

## The prod rules change, for Nick

`reports/feed-wording-v1/rules-prod.diff`: in both `isValidActivity` and `isValidActivityNested`, seven optional
typed keys (`subjectName`, `subjectAgency`, `previousName`, `changedTo` strings ≤ 200; `removedQueries`, `batchCount`
ints ≥ 0; `changed` a list of at most 12), and the nested store's `hasOnly` names them. **Per the brief it goes out
BEFORE this code reaches prod** (`npm run deploy:rules`, Nick). By my reading the code would also work without it
(the feed store's create checks no key list, and these rows never reach the nested store), but the order stands.
On dev, the rules go out with whichever combined line next deploys rules (controls-entry-v1's are live there now).

## Locks, each red first

Unit (`src/lib/feedWording.test.ts`, 104 cases; `src/lib/feedWordingSave.test.ts`, 6). Red was proved by putting the
pre-part files back (or, for the helpers that landed in Part A's new file, mutating them), running, and restoring:

| Lock | Red before |
|---|---|
| A · deleted agent / manuscript rows name the subject once; no say run contains the description (population 7); drawer meta; drops; live-agent and live-manuscript fallbacks; write-site and rules source locks | 17 of 18 red on the pre-A files (the one green is the population count) |
| B · card save: fit + wishlist + open = ONE row; notes-only none; unchanged none; Undo deletes the row. Sweep of 6 = one row, quiet writes; sweep of 1 = ordinary. updateAgent / saveAgentEdits / updateManuscript source locks. Bursts: 3 in 10 min = 1 row; 11 min = 2 | 7 red on the pre-B save paths; 22 red with the helpers mutated (old wording, any key counts as a change, no fold) |
| B · the sentence table (18 agent rows, 6 manuscript rows), only the NEW name a person run on a rename | in the 22 above |
| C · every query sentence incl. no-title, no-elapsed, holding reply, offer accepted/declined; import; the day's sends with and without one title; no sentence ends in "." or contains a dash (sweep over every status × type × branch, >100 sentences) | 14 red on the pre-C files |
| D · card headlines, agency said once in sub and meta, the 12-hour when-line, the collapsed card's time, one clock formatter | 6 red on the pre-D files |
| E · CSS source: two-line clamp, no nowrap/ellipsis on the headline, sub-line nowrap, time top-aligned | 2 red on the old CSS |

Rendered, on the emulator (`npm run e2e:emu -- tests/e2e/feedWordingV1.measure.ts`; ledgers in `ledger/`):
- **FW-J, green.** Added through the Contact list's add journey, edited (email) and renamed in the agent card's head,
  deleted through ⋯ → Delete, with the page clock moved on 11 minutes between steps. The dashboard feed shows,
  newest first: "You removed {new} from your contact list" · "You renamed {old} to {new}" · "You updated {old}'s
  contact details" · "You added {old} to your contact list". Each names the agent once; the bold run is the name
  alone, and on the rename only the new name. FW-J has no in-page mutation; its sentences are the unit locks above,
  each proved red. (The wishlist edit was swapped for the email: a new agent's card has no wishlist section to open.)
- **FW-E, green at 1280 × 800 and 1512 × 900, sidebar open and collapsed:** the long card's headline is its whole
  text in the DOM, it wraps onto two lines with no one-line ellipsis, every collapsed row is at most two lines, the
  sub-line stays one line, and the time sits level with the first line (0px). **Red first:** `FW1_MUTATE=E` (the old
  one-line ellipsis and centred time put back in the page) turns all four layouts red (12 failed checks).
- **FW-E full text: expected failure** (false premise 5): the seeded headline needs 6 lines at 1280 and 4 at 1512.
- **The phone's Today on the rename row: not run** (false premise 3). Unit lock instead: the rename row's first
  person run is the new name.

Existing specs retargeted to the new words (same law): dashFeed, feedSentence, dashF1Feed, manuscriptShelf,
importEvent, smartImportCommit, manuscriptFeed (the gate's spelling), agentLastChecked (the anchor), addActivityCallers
(census 9 → 10, `saveAgentEdits`), addedRowsAgree and dashV58 (their Added fixtures now carry a subject, as any row
written today does).

## Gates

| | Baseline (822966fba) | Final |
|---|---|---|
| tsc | 0 errors (8 GB heap; the default heap ran out of memory) | 0 errors |
| vite build | exit 0 | exit 0, no errors or warnings |
| Vitest | 3 failed / 13430 passed (three source sweeps that timed out under load) | **0 failed / 13543 passed** |

## Deploy

None. Dev hosting: STOP (false premise 6). Dev rules: held (would revoke controls-entry-v1's). Prod and `main`
untouched. Branch `feed-wording-v1` pushed.

## Owed

- The Holding Reply / Agent Reply row needs a pill, the sentence built here (locked in `src/lib/feedWording.test.ts`) and
  its icon (`holding_reply`, feed wording v1.1 Part 4) once controls-entry-v1 is on the dev line. `feedPill` is left alone
  until then (v1.1 ruling).
