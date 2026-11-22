# Query Centre v149.1 — report

Branch `query-centre-v149-1`, cut from what dev served: `dev/hm31-pv4-qc149` at **90184d04** (`index-Cbftfy9e.js`), which
carries v149 (the query card in the panel, the shared header components). Integration and deploy: §10.

## 1 · False premises

1. **The landing card decides nothing about "requested" and "sent".** Its chips are written by hand in a demo; a requested
   step's chip there is plain oat, and only `.mk-ok` is green (`#e6ece3` / `#3f5a39`, not the pack's `#e4ece1` / `#3f5a3b`).
   Rust exists only on its animated task chips. The tones are the mock's (`.ch.ask`, `.ch.ok`), and the rule is derived
   from the record (§3.1).
2. **Steps carry no materials of their own, and nothing links a send to the request it answers.** A step is a status, a
   date and a system note. Requests are query-level and latest-only (`materialsRequestedType/Quantity`, which a full
   request does not overwrite; `requestFrom`, `requestSynopsis`). What was sent is query-level (`sentMaterials`,
   `sentVersions`, `materialsWanted`). So "answers a request" is derived from the story's order (§3.1).
3. **A step's `note` is not the agent's words.** It is system text ("Partial manuscript requested"). The real words are
   query-level: `rrNotes` (R&R) and `rejectionFeedbackText` (a personal pass). Only those are quoted.
4. **There is no submission-form URL on an agent**, only `submissionMethod`. The Contact row states the method ("Through
   their submission form") with no OPEN button, or "+ Add how {name} takes queries", which opens the agent card at the
   method field.
5. **No open/closed "since" date is recorded.** The Queries cell's sub-line is "till {date}" when a reopening date is set,
   else "checked {month}" from `lastCheckedDate` (when the writer last verified the details).
6. **A manuscript must have a word count** (the rules require an int ≥ 0), so "word count removed" is stored as 0, which the
   chip treats as absent.
7. **The duplicate Jonathan Marsh and Eleanor Whitfield rows are not on the harness account**: it holds one query to each
   (`cv25-q-09`, `cv25-q-01`; seed `seedCompsV25.mjs`). The pairs in the screenshots are another account's. B4 is built as a
   rule over the record (§4) and seeded to prove it; I could not see which kind those pairs are.
8. **The shared timeline builder reads a step with no date as now** (`QueryTimeline.getTime`). Left alone (other surfaces
   read it); the card and the hover timeline correct their own reading (`undatedIds`).
9. **R&R's glyph is not drawn "dashed with an arrow".** House law: a status is drawn only by `StatusDot`, whose R&R is
   dashed with no centre. The nudge's bell and the next step's dashed ring are not statuses and are drawn.

## 2 · Base

`dev/hm31-pv4-qc149` 90184d04. Baseline gates there: tsc 0 · build clean (no warnings) · Vitest 10,355 passed, 1 failed in
3 files, all `functions/` (no `functions/node_modules` in a worktree). The same three reds stand at every gate since.

## 3 · Step 0

### 3.1 Step data

| Per step | Where it lives | Shown by the landing card |
|---|---|---|
| type | the step's `type` / `resultingStatus` (`eventKey` on 76 of 113) | glyph + title |
| date | `createdAt` | yes |
| method | query-level `sendMethod` only | "by email" on Query sent |
| items sent | query-level `sentMaterials` / `sentVersions` / `materialsWanted` (latest send) | chips (hard-coded) |
| items requested | query-level `materialsRequested*`, `requestFrom`, `requestSynopsis` (latest request) | chips, plain (hard-coded) |
| free-text note | `note` is system text; words are `rrNotes`, `rejectionFeedbackText` | none |
| answers a request | not stored | `.mk-ok` by hand |

**Rule used:** Query sent shows what the query records as sent, oat. A request shows what was asked, rust ("First 50
pages", "Partial", "Synopsis", "Full manuscript"; an R&R's words are its note). A send answers a request when the same
kind was asked for earlier in the story; its chips repeat what was asked, green with a ✓. A send with no earlier request
shows the same chip, oat.

### 3.2 Manuscript

`ageCategory`, `genre`, `wordCount` on the manuscript document; all six on the account have all three.

### 3.3 Agent

| Field | Exists | On the account (52) |
|---|---|---|
| wishlist (`mswlNotes`) | yes | 52 have the key; many empty |
| genres | yes | 52 |
| reply time (`responseTimeWeeks`) | yes | 33 |
| open/closed (`submissionStatus`) | yes | 52; since-date: **no** (`reopensOn` on 1) |
| email, website | yes | keys on 52, mostly empty |
| submission form URL | **no** — `submissionMethod` only | 52 |
| last in touch | **not stored** — derived: the latest send, request, reply or nudge date across this writer's queries to the agent | — |
| every query to this agent | derived: queries by `agentId`, across manuscripts | — |

### 3.4 The next-step rule

`nextDoor` (`lib/queryActions/entry.ts`), the row's one next move (the tray's button, the panel's primary): Mark
partial/full/revision sent · Record your answer · Nudge · Close query (past the nudge window) · Record a response. Its date
line is `nextLine` (`lib/qcRowLines.ts`).

### 3.5 The duplicate rows

See §1.7.

## 4 · Per section

All card derivations are in **`src/lib/qcCardStory.ts`** (pure, `qcCardStory.test.ts`); the card is
`centre/QcQueryCard149.tsx` + `qcv149card.css`; the page wiring is `Queries.tsx`.

- **A1 book block** — the 46px white tile with the open-book icon; QUERYING; the title in Special Elite 26; chips from
  `bookChips` (age category · genre · "88,000 words", each only when present), then the lilac package chip ("No package").
- **A2 steps** — `storySteps`: StatusDot glyph on the `#e4ddd3` rail (a bell for a nudge); title + italic qualifier ("by
  email", "by online form", "through QueryManager", "the revision"); the date in mono caps, or **Add date** (opens edit
  mode focused on that step's date field); a quoted italic note (`rrNotes`, a personal pass); chips rust / green ✓ / oat
  (§3.1). The version label comes from the manuscript's `bookVersions` ("Revised manuscript · Second draft"). Then the
  faint next step (`nextStepOf`), none on a closed query.
- **A3 strip** — `stripOf`, sticky at the foot of Tracking (`margin-top: auto`, then `position: sticky; bottom: 0` so a
  long story never carries the only primary below the fold — measured 102px under at 1280×800 without it). Tint by
  court; sparkle; bold + italic sentences; the navy button runs the row's own next move (`onPrimary` → the tray's
  journey, L4). Closed: the outcome, no button. The "where it stands" block is deleted.
- **A4 footer** — row 1 the due line (rust when hot); row 2 Record a response · Edit query · Close query (Close query not
  on a closed query) and ‹ N / M ›. No separate primary.
- **A5 Agent tab** — wishlist (or **+ Add their wishlist**) with genre chips, the book's genre outlined in navy; four fact
  cells (`agentView`) that never hide; "You and {name}", every query to the agent newest first, the current pill white
  and outlined; Contact (email COPY / website OPEN / how they take queries), each missing one an invitation that opens the
  agent card at that field; Open in Contact list · Edit agent. The pane scrolls. Edit mode keeps v149's fields.
- **B1** — `.qc138-heads` white over its existing hairline (`qcv149.css`).
- **B2** — `QcList138` draws only sent items' icons; with nothing sent, "+ Add" is `visibility: hidden` until the row is
  hovered or focused.
- **B3** — "{step}, add date" (the link opens the card in edit mode at its undated step), First queried "Add date", the
  hover summary "No dates yet" with the steps evenly spaced and no axis. "Not dated", "No date set" and "NO DATE SET" are
  gone from the page: the Next move line reads "NO DATE YET", the summary "No reply date yet" / "No send-by date yet".
  The card and the peek read undated steps from the raw log (`undatedIds`, §1.8). Out of scope and left: the Birds-eye
  drawer's "No date set — click to add" tooltip, and other pages' own wordings.
- **B4** — `lib/qc149.twinTags`: a later query to the same agent for the same book is tagged "RESUBMISSION" (`requery`) or
  "V{n}" (a different `bookVersionId`); neither is a true duplicate and gets no tag. 0 such pairs on the harness account;
  the seed proves it (L13).
- **B5** — `lib/nameCase.ts` in `commitSmartImport` (Smart Import and the template share it); the migration
  `tests/e2e/migrateNameCase.mjs` (§7).
- **B6** — `.ws-window` > 1440 and the panel open: the list card's `margin-right` becomes the measured push (resting
  right − (panel left − 16)), transitioned 0.28s. ≤1440 overlays as before.

## 5 · The action strip's sentences (`STRIP_WORDS`, `lib/qcCardStory.ts`)

`{first}` the agent's first name · `{thing}` your query / the partial / the full / the revision · `{for}` how long ·
`{since}` the stage's date · `{date}` the expected date · `{owed}` the partial / the full manuscript / the revision.

| Next move | Bold | Italic | Button | Next step (title · reason) |
|---|---|---|---|---|
| Nudge | {first} has had {thing} {for}. | Nudge {first}, or close the query. | Nudge | Nudge due · No reply since {since}. The reply was expected by {date}. |
| Close query | No reply from {first} in {for}. | Close the query, or keep tracking. | Close query | Consider closing · Past the reply date and the nudge window, with nothing back. |
| Record a response | {first} has had {thing} {for}. | The reply is expected by {date}. / There's no reply date on record yet. | Record a response | Reply due by {date} / Reply expected · From {first}'s usual reply time. / From the reply date you set. / Add {first}'s reply time to get a date. |
| Mark … sent | {first} asked for {owed} {for} ago. | Send it by {date}, then mark it sent. / Send it, then mark it sent. | Mark sent | Send {owed} by {date} / Send {owed} · {first} asked for it on {since}. |
| Record your answer | {first} offered representation. | Answer by {date}. / Answer when you're ready. | Record your answer | Answer the offer by {date} · {first} made the offer on {since}. |
| Closed: Passed | Passed on {since}. | Added to your Wall of no. | — | — |
| Closed: no reply | Closed with no reply on {since}. | Counted as a no. | — | — |
| Closed: withdrawn | You withdrew on {since}. | Nothing more to do. | — | — |
| Closed: signed | Signed with {first} on {since}. | Congratulations. | — | — |

No gendered pronoun for an agent: the sentences name them.

## 6 · Agent-tab fields with no data on the harness account, and what shows

| Field | Missing on | Shows |
|---|---|---|
| wishlist | most agents (e.g. Priya Nair) | "+ Add their wishlist" → agent card, Wishlist |
| reply time | 19 of 52 | Replies in "—", "not known" |
| open/closed since | all (no field) | "checked {month}" (or "till {date}" when `reopensOn`) |
| email | most | "+ Add email" → agent card, Email |
| website | most | "+ Add website" → agent card, Website |
| submission form URL | all (no field) | the method's words, or "+ Add how {name} takes queries" → agent card, Method |
| last in touch | none (derived) | — |

## 7 · B5 migration

`node tests/e2e/migrateNameCase.mjs` on the harness account: **52 agents, 0 in capitals, 0 changed.** L10 seeds
"MARGOT ELLIS" and "Imke de Vries", applies it (1 changed, mixed case untouched), and reverts from the backup in the same
run. Real accounts need an admin run: your call.

## 8 · Locks (QC1491), red and green

Green on the final build (75bc979f…), every lock, both sizes. Red first: against dev's v149 build (90184d04), and against
each lock's named mutation. Readings green/total:

| Lock | Green 1280 · 1512 | Base (v149) 1280 · 1512 | Mutation → 1280 · 1512 |
|---|---|---|---|
| L1 book block | 7/7 · 7/7 | 3/7 · 3/7 | every chip unconditional ("0 words"): 6/7 · 6/7 |
| L2 steps | 6/6 · 6/6 | 1/6 · 1/6 | every chip oat (page CSS): 4/6 · 4/6 |
| L3 next step | 6/6 · 6/6 | 3/6 · 3/6 | a next step on closed queries: 5/6 · 5/6 |
| L4 strip | 7/7 · 7/7 | 0/7 · 0/7 | the "where it stands" block restored: 6/7 · 6/7 |
| L5 footer | 5/5 · 5/5 | 2/5 · 2/5 | the primary link restored: 4/5 · 4/5 |
| L6 agent | 10/10 · 10/10 | 0/10 · 0/10 | fact cells with missing data hidden: 9/10 · 9/10 |
| L7 header row | 3/3 · 3/3 | 2/3 · 2/3 | the blue-grey restored (page CSS): 2/3 · 2/3 |
| L8 what you sent | 6/6 · 6/6 | 3/6 · 3/6 | the faded placeholders restored: 4/6 · 4/6 |
| L9 undated | 7/7 · 7/7 | 1/7 · 1/7 | "Not dated" restored in First queried: 4/7 · 4/7 |
| L10 casing (once) | 4/4 | writes; not run on base | the migration skipped: 2/4 |
| L11 push (1920, 1440) | 5/5 | 4/5 | always overlay (page CSS): 4/5 |
| L13 twin tag (added) | 3/3 · 3/3 | 2/3 · 2/3 | twinTags empty: 2/3 · 2/3 |

⚠️ **L9's first mutation didn't fail.** It changed `stageDetail`'s text, which the row never renders for an undated step
(it draws `verb` + the link). Re-aimed at what renders (First queried), it went red; both runs are in the ledger.

**L12** — QC149 L1–L12 all green at both sizes; QC141.1 5 passed; CSS1 6 passed (2 skipped, retired in v149); QC142 L8
(the landing card untouched) 2 passed; the Versions L0 lock 0 styles / 0 px differing at both sizes against a base captured
in the same run. **Re-pointed: QC149-L9** reads the primary from the strip's button ("Mark sent"), since the footer's
primary link is gone.

## 9 · Screenshots

`reports/qc-v149-1/screens/`: `{you,agent,quiet,closed}-{tracking,agent}-1512.png` (the With you one is the seeded query,
which carries every part of the story) and `list-1920-panel-open.png`.

## 10 · Integration and deploy

- Dev served `dev/hm31-pv4-qc149` (90184d04, `index-Cbftfy9e.js`), checked again before cutting.
- **Integration branch `dev/hm31-pv4-qc1491`**: cut from it, with `query-centre-v149-1` merged in: **f4403a8c**, a tree
  identical to the branch tip.
- **Re-run there:** tsc clean · production build clean (no warnings) · Vitest 10,367 passed, the same three `functions/`
  reds · QC1491 all locks green at both sizes · the Versions L0 lock 0 styles / 0 px at both sizes.
- **Deployed to dev only** (hosting, `--config firebase.dev.json --project scriptally-dev`) from that worktree at the pushed
  tip, with the served hash checked in the same command. **Dev now serves `index-pQgTRP-n.js`.**
- **Not merged to `main`.** Prod untouched; no rules or functions deployed.
