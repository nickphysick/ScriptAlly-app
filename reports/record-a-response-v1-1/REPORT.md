# Record a response v1.1: prove v1, and move the practice query to the reply box (16 Nov 2026)

Branch `record-a-response-v1-1`, cut from the dev integration tip `dev/msp1-st2-rar1` at 7b98b65f8 (Record a response v1 merged onto Manuscript spine v1 and Shell tabs v2). Dev serves `index-B8GmFPmc.js`, built from that line. The reference `design-refs/record-a-response-v1/record-a-response-v1.html` matches its SHA256 (`6946ca35…932600`).

## False premises (read these first)

1. **"v1's measured locks R2, R3, R4, R8, R9, R10, R11 had mutation hooks in the spec":** only R1, R2, R8, R9 and R11 had one. R3, R4 and R10 had none, so I wrote them.
2. **"R6: the same reply from four doors, like-for-like":** no single status sits behind all four doors.
   - **The agent card** has no reply door for a query whose partial is out. Sophie Dunn's card (Partial Sent) offers only "Close query".
   - **The Responses page's door** sits on its requests strip, which lists only queries that asked for more.

   So R6 compares two like-for-like sets: Partial Sent through the card, the To-do desk and a Responses row; Queried through the agent card and the card. The agent card's missing door is reported below as a finding, not added: adding a door is not a re-point.
3. **"R6: a full request on like-for-like queries":** on a Queried query the composer offers "Asked for the partial", not the full. It is the Partial Sent set that records "Asked for the full".
4. **"R12: v1 could not reach a phone door because the list is long":** at 390, `/queries?q=…` lands on the phone app's own hub (Today), so the probe never met a phone query list. The phone's doors are the dock's **+ sheet → "An agent replied"** and the To-do deck's tasks. R12 now drives both.
5. **"R5 needs a second seeded account or a manuscript with none":** a book with no queries does not help, because "Who replied?" lists every query on every book. The harness already has an empty book (`cv25-ms-empty`). R5 makes a second account in the Auth emulator for each run instead: the harness's user document, one book and one closed query (George's pass), copied under the new uid.
6. **Phase 4's walk cannot be re-anchored using only existing copy.** See Phase 4 below; per the brief, the phase stopped.

## Step 0

### Baseline (before any edit)
- **tsc:** 0. (The first run showed seven TS2307 errors only because the worktree had no `functions/node_modules`; I linked it and re-ran.)
- **Build:** clean.
- **Vitest:** 12,649 passed, 4 failed. Three are the known `emuGuard` and `firestoreTarget` reds. The fourth is `the domain move to queryhawk.net > D2`, a 6.4 s timeout under load. All four predate this work; nothing in `src/` changed afterwards.

### 0.2: what v1 proved, then and now

| Lock | v1 | v1.1 |
|---|---|---|
| R1 one door | Vitest red→green; measured green only | Vitest red→green; **measured red→green** (red: 7 readings under R1's break) |
| R2 the list whole in the panel | measured green only | **measured red→green** (red: list 60px, footer 423px off the foot) |
| R3 a pick: composer in the same panel | measured green only | **measured red→green** (red: no composer title) |
| R4 closed only by searching | Vitest red→green; measured green only | Vitest; **measured red→green** (red: a closed row listed with nothing typed) |
| R5 nothing live | Vitest red→green (server render); not measured | Vitest; **measured red→green** on a second account (red: on the harness, 70 rows and a search field) |
| R6 one writer | Vitest red→green (by source) | Vitest; **measured by documents, red→green** (red: a different deadline at one door) |
| R7 options | Vitest red→green | unchanged |
| F1 "{first} replied" | Vitest red→green | unchanged |
| R8 the dim | measured green only | **measured red→green** (red: scrim alpha 0) |
| R9 leaving | measured green only | **measured red→green** (red: no discard strip, panel closed, focus lost) |
| R10 a save stays open | measured green only | **measured red→green** (red: the pill still Queried) |
| R11 the band's arrows | measured green only | **measured red→green** (red: no arrows on the list's set) |
| R12 phone | Vitest red→green; measured `fixme` | Vitest; **measured red→green** at 390, `fixme` removed |
| P1 Pip in the composer | n/a | not built (Phase 4 stopped) |

### 0.3: who still saves a response, and whether the desktop can reach it

Every caller of `recordQueryResponse` and `saveResponse` left in `src/`:

| Caller | Reachable from a desktop path? |
|---|---|
| `lib/queryActions/respondSave.ts:92` (`saveResponse`) | Only through the callers below |
| `queryActions/journeys/ResponseJourney.tsx:259` (the drawer journey) | **No** for real queries: every desktop door goes through `openResponse` (v1's R1 census). **Yes for Pip**, whose save branches to `practiceRespond` at :251 and writes nothing to Firestore. |
| `Queries.tsx:939, :994` (the F12 response takeover, `openRecord`) | No. `openRecord`'s callers are `handleRowVerb` (no callers), `QcOpenCard`'s `onPrimary` (on desktop, `qcCardNode` always wins), the desk verb's `onOffer` (desktop "respond" goes to `respOpenRef`), the `GRID_IS_THE_PAGE === false` branch (constant `true`), and an `isMobile` bar. |
| `Queries.tsx:1132` (`saveDeskResponse`) | No. Its desk is only shown for `deskVerb === "respond"`, which desktop never sets. |
| `Queries.tsx:10602` (`RecordResponseModal` host) | No. `setIsRecordResponseModalOpen(true)` is never called. |
| `Queries.tsx:5977` (`onRespond`, the v149 card's respond body) | No. On desktop the card's `onMode("respond")` goes to `open1522`, and `setQcCardMode("respond")` is never called. |
| `Dashboard.tsx:1715` (`RecordResponseModal`) | No. Only reached from the nudge modal's "close instead", and `setNudgeTask` is never called with a task. |
| `RecordResponseFocusForm.tsx:363` | No. Its openers are `openRichForm` (no callers) and the correction fork's third branch, after two that always return on desktop. |
| `reading-pane/TimelineComposer.tsx:211` | No. Nothing mounts `<TimelineComposer>`. |
| `todo/ws/wsFlows.tsx:480` (the "They did reply" tiles) | No. Desktop gets `openReply` (v1); the phone keeps the tiles. |
| `phone/v3/JourneysV3.tsx:140` | No. Phone only. |
| `lib/queryActions/stepSaves.ts:116, :127`, `closeSave.ts:30`, `bulkClose.ts` | These save closes and offer decisions, not responses. Out of scope. |

**Phase 1 had nothing to re-point and changed nothing.** The red gate did not fire.

### 0.4: the practice query
- **What the walk reads from the stepped form:**
  - `.qad-root.is-open[data-practice]`
  - its stepper `[data-qad-step]` with `aria-current="step"`, which sets `jStep.cur` and `jStep.of`
  - `[data-qad-review]`
  - the drawer closing (`subscribeDrawer`), which ends the walk: `answered` → done, otherwise an early exit
  - the door it points at: `[data-qp='panel'] [data-door='resp']`

  Its steps:
  - pip-1 "Meet Pip, a practice query"
  - pip-2 "Record a response"
  - pip-3 "What came back?" (the first journey step)
  - "The details" (any middle step)
  - "Check and save" (the last step)
  - "That's the whole journey"
- **Pip today is drawn in `QcOpenCard`** (the pre-v149 panel card): a `StandCard` and a `QueryLedger` over the in-memory log. His Record a response opens the drawer's `ResponseJourney`, whose save branches to `practiceRespond`.
- **Why he isn't in the current card:**
  - `qcCardNode` is built from `activeQuery` (the Firestore query list), its tracking listener and `panelRow`.
  - The composer's save (`save1522`) reads the log from Firestore (`readLog`) and commits through `commitPlan`.
  - Pip is in none of those stores, and his save has no route that skips Firestore.

## Phase 2: v1's measured locks, run red

The spec gained `RR_RED=1`, which runs each desk lock at 1512×900 under its own break, one pass per lock, in one emulator session. A red pass now passes only when that lock's own readings go red (`Ledger.done`); anything else red is printed as noise. Mutations, and what went red (ledgers: `reports/record-a-response-v1/ledger/mut-*.json`):

| Lock | Mutation | Red readings |
|---|---|---|
| R1 | the panel's `data-qp` renamed after each door | 7 of 23 (all five doors: "the card frame"; agent card composer and Back) |
| R2 | the clipped pop-down restored (`.qcrr-body` 60px, overflow hidden) | "list has height" 60px; "footer at the foot" 423px |
| R3 | the composer's title removed after the pick | "the composer, titled for the agent": null |
| R4 | a row marked closed with nothing typed | "no closed query listed": 1 |
| R8 | the scrim's opacity 0 | "scrim at .45": alpha 0 |
| R9 | the composer's `data-dirty` removed | "discard strip shows" 0; "panel stays" 0; "focus back on the opener" BUTTON |
| R10 | the pill set back to "Queried" after the save | "on the new status": Queried |
| R11 | the band's arrows hidden | "arrows on the band": 0 |

Probe fixes on the way, none of them in the app:
- R1's readings had no "R1 " prefix, so the red check could not see them as R1's.
- Serial mode skipped the remaining red passes after the first red. Red mode now runs non-serial.
- R9's discard click had no timeout and hung the whole test once the break closed the panel.

**Green, both sizes** (the same spec): R1 23/23, R2–R4 15/15, R8–R9 11/11, R10–R11 9/9, at 1512×900 and at 1280×800.

## Phase 3: the three locks v1 could not measure

All three run in the same spec. Each was red first (in `RR_RED=1` or `RR_MUTATE=<lock>`), then green.

### R5: nothing live (7/7 green)
For each run, the Auth emulator's own sign-up makes an account. The harness's user document, Murphy's Day Out, George Ashworth's agent and his closed query are copied under the new uid. The dashboard's Record a response then opens "Who replied?" showing:
- "Nothing's out with agents yet."
- "Log a query"
- no search field and no rows

**Red:** the same probe on the harness account read null, null, one search field and 70 rows.

### R12: the phone at 390 (11/11 green)
- **The + sheet:** "An agent replied" opens `ReplyFlowV3`, with no card-frame picker and no composer. The probe then records Priya Raman → Passed → Today → "Log this reply": the query reads Rejected, the snackbar's Undo puts it back to Queried, and every document it wrote is restored.
- **To do:** a gone-quiet task (Rosalind Vale) → "They did reply" → Next. The tiles are the phone's own (partial, full, pass, offer), with no composer. Passed → the date → save: the query reads Rejected; Undo puts it back; restored.
- **Red:** the flow's marker stripped after it opened ("opens the phone's own flow": false). The red pass ends there and writes nothing.

### R6: one writer, by documents (32/32 green)
Each door records "Asked for the full/partial", today, deadline "None given". The card's own Undo follows, then the same door again records a personal pass. Every write on Firestore's channel is captured, the query document is read back, and every document written is restored over the emulator's REST API (pre-image put back; new documents deleted).

**Doors and queries:**

| Set | Door | Query |
|---|---|---|
| Queried | the agent card | Priya Raman (`cv25-q-03`) |
| Queried | the card on Queries | `cv25-q-04` |
| Partial Sent | the card on Queries | David Marsh (`seed-query-8`) |
| Partial Sent | the To-do desk | Rufus Oyelaran (`seed-query-23`) |
| Partial Sent | a Responses row | Hester Quinn (`cv25-q-11`) |

**Compared within each set**, with ids, times, names, the book's title and calendar days taken out:
- the feed row (`activities/*`)
- the query's log entry (`queries/{q}/activity/*`)
- the query write's mask
- the stored query document, on the fields every door in the set wrote

**Result:** no door differs from another in its set, for the request or for the pass. Every door's query write carries the same 26-field recompute mask, which is the writer's signature. Ledger: `reports/record-a-response-v1/ledger/R6-documents.json`; raw writes beside it.

**Differences found, none caused by a door:**
1. **Murphy's Day Out's partials (`cv25-q-11`) end with no `partialRequestedDate` or `partialSentDate`, where the seed queries gain both.** The mask is identical and the recompute clears those fields, because cv25's seeded logs hold no partial-request step. This is the query's history, not the door's. R6 compares the fields every door set, and the mask separately.
2. **The "Respond by …" day in the feed row** follows the agent's usual reply window: 28 Dec 2026 for most, 11 Jan 2027 for David Marsh. This is the query's, not the door's.
3. **The agent card has no reply door on a Partial Sent query** (finding; owner: Nick). Sophie Dunn's card lists "Close query" and nothing to record a reply. For a Queried agent it shows "Record a response". A writer whose partial is out has to go to the card or the To-do desk to log the reply. Not changed here.

**Red:** the Queried set's second door chose "2 weeks". Only that door went red (31/32): its query write set `expectedSendDate`, which the agent card's did not.

**A probe fix found by the red:** the first green comparison looked only at fields every door set, so this break read 32/32 green. A door that ADDS a field was invisible. Each door's set of written field names is now compared too, excusing by name only the two dates cv25's history explains (finding 1). Red and green were both re-taken on that final version.

## Phase 4: STOPPED. Pip's walk needs wording neither the walk nor the composer has

The composer has no steps. Its answer chips reveal the fields in place, and the only button is the save, whose label follows the answer: "Add Pip's reply", "Close as passed" or "Add the offer". Re-anchoring the walk to its three controls (chips, When row, save) using only existing copy fails in two places.

**The walk's lines today:**

| Step | Title | Body | Anchors to |
|---|---|---|---|
| pip-1 | Meet Pip, a practice query | "We've put a practice query at the top of your list … **Click Pip's row** to open it." | the band; unchanged |
| pip-2 | Record a response | "An open query shows its story, and what you can do next sits along the bottom. When an agent replies, press **Record a response**." | the card's footer. The current card's door for a waiting query is labelled "Record a response", so this holds. |
| pip-3 | What came back? | "Pick any answer: each one leads somewhere different. Then press **Next**." | the answer chips. **There is no Next.** The details appear on the pick. |
| pip-4… | The details | "We've filled these in for you. Change anything you like, then press **Next**." | the When row. "Next" can become the save's label, which is a rename. |
| last | Check and save | "This is what you'll see with a real reply. Press **Save**." | the save button. **The brief drops this step**, so the save button has no card. |
| done | That's the whole journey | (unchanged) | the panel |

**Options (Nick to choose):**
- **A.** Two composer cards. "What came back?" on the chips, without its last sentence (the walk moves on when an answer is picked). "The details" on the When row, its "Next" renamed to the save's label for the chosen answer. The save button gets no card of its own. This deletes one existing sentence, which the brief does not allow without a ruling.
- **B.** Three composer cards, keeping "Check and save" on the save button with "Save" renamed to the composer's label. This keeps every line but reverses the brief's "drop Check and save".
- **C.** New copy for the chips and the save, written by Nick.

**Already settled for whichever is chosen:**
- Pip is drawn in `QcQueryCard149` through `buildCardView` over his in-memory log, with every handler except the reply composer a no-op.
- The composer's reply maps to `practiceRespond` the same way `planReply` picks its record kind and response fields (req → partial/full by `queryOnly`; passed → rejected with Form/Personal; rr; offer; more → materials "Other").
- The practice mark sits in the composer head, in the composer's own label type.
- P1 asserts no `.qad-drawer` and zero writes on Firestore's channel.

**Nothing of Phase 4 landed.**

## Phase 5: housekeeping
- **Deleted:** the stale `dev/srm1-…-onf1-co1-rar1`, remote and local. It was not served.
- `RecordResponseModal` is unchanged, and unlinked on desktop.

## Commits and gates
This pass changes tests and reports only. No file under `src/` or `functions/` changed.
- **`tests/e2e/recordResponse1.measure.ts`:**
  - red mode
  - the R3, R4 and R10 mutations
  - R1's reading names
  - R5, R6 and R12 (`fixme` removed)
  - the write capture
- **Ledgers and shots:** `reports/record-a-response-v1/` (the spec's own directory), plus this report.

## Open items
1. **Phase 4, the practice walk on the composer:** choose A, B or C above. Owner: Nick.
2. **The agent card has no reply door on a query whose partial is out** (R6 finding 3). Owner: Nick, to decide whether the card should offer one.
3. **Still open from v1, not done here: lasting decisions to write into `docs/decisions/` when this line merges to main** (this dev line predates those files). Owner: whoever merges the dev line.
   - Query actions: the one opener `openResponse` and its `responseHosted()` guard.
   - The card composer as the only desktop response writer.
   - "Who replied?" in the card frame.
   - Shell: every slide-out dims the desk at .45, the agent card included.

## Branch, deploy, nothing else
- **Branch:** `record-a-response-v1-1`, pushed.
- **Dev: not redeployed, on purpose.** This branch changes no app code (`git diff 7b98b65f8 -- src functions` is empty), so a deploy would ship nothing new.
  - Since this session started, another session has deployed over dev. It now serves `index-BgrkJp8g.js`, built from no `dev/*` branch on origin, not v1's `index-B8GmFPmc.js`.
  - Deploying this branch would only have overwritten their work.
  - Record a response v1's app code is unchanged on `dev/msp1-st2-rar1`.
- Nothing went to main. Nothing touched prod.
