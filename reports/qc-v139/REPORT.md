# Query Centre v139 — report

Branch `query-centre-v139`, cut from **180cd3cb**: the tip of
`dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386-db60-cl183-an24-cl1831-an241-db601-cl1831b-cl1832-cl1833-cx28-qhnet-td52`,
which dev served when the pack started (`index-5Q6l_Tb7.js`, To-do v5.2). **It contains v138.6** (`qc1386` in the
chain) and Contact list v18.3 F and v18.3.3.

| Part | Commit | |
|---|---|---|
| A · The page guide | ec016d63 | the shared page guide on the Query Centre; the bottom-right guide retired |
| B · The practice query | 6dfb1289 | Pip, the seam (`planResponse`), the overlay, his panel, the walkthrough |
| C · Group-band icons | 53a37143 | "Who it's with", the marks per grouping, closed bands under Status and Next action |
| D · Locks | (this commit) | QC139, the unit half, the mutations, CLAUDE.md, this report |

## False premises

1. **The app's response journey is not the mock's three steps.** The mock draws Answer → Details → Review for every
   answer. The real journey's steps depend on the answer: a **partial is four** (The response · What they asked for ·
   When you'll send it by · Check and save), an **R&R four** (… What they'd like revised · When you'll resubmit by …),
   a **full, a pass and an offer three**. One card per step, as the pack says, so the walkthrough is **7 cards for a
   partial or an R&R and 6 for the others** — "The details" appears once per step between the first and the last
   (twice for a partial and an R&R, once for the rest). The dots and "{k} of {n}" follow the answer chosen.
2. **The app's next-action groups are not the mock's.** There is no "Reply due" group; the mock's "Waiting" is the
   app's "Waiting on the agent"; and the app has a **"Revision owed"** group the mock does not draw. The labels are
   the app's own ("Offer pending", "Full owed", "Partial owed", "Nudge due", "Consider closing"), unchanged. Revision
   owed takes the Queried glyph and the navy dots, as the pack says for any other action.
3. **The mock's Passed and No response bands did not exist in the app — and their absence was a fault, not a
   difference.** Under **Status** the list grouped only the live stages, so every passed or unanswered query simply
   **vanished** from the list; under **Next action** a passed query was filed under "Consider closing" or "Waiting on
   the agent". Both now end with one band per closed status (Signed, Passed, Closed with no reply, Withdrawn), in the
   closed grey, with no badge. "No response" is the app's own "Closed with no reply".
4. **The query panel has no eyebrow.** "PRACTICE tag beside the masthead's eyebrow": the panel's masthead is the
   agent's name and agency with no eyebrow above, so the tag sits above the name.
5. **"No queries yet" cannot be measured on the harness account**, which has 87 queries and is shared. A3 is a unit
   lock instead (`src/lib/qc139Guide.test.tsx`).
6. **A log-a-query save is not exercised by A2.** It would write a real query to the shared account. Item 1 is
   "already true if the account has any query", and A2 asserts exactly that from a cleared guide state.
7. **The default defaults:** the real journey seeds "received today" itself; the pack's "3 chapters" and "send by
   21 days from today" are passed in as the journey's own parked-answer seed, so its fields start filled and the
   journey is otherwise untouched.

## §0 Recon

1. **The shared page guide (v18.3 F)** is `shell/guide/PageChecklist` with its pure half in `lib/pageChecklist.ts`,
   state per account under `todoPrefs.<page>.guide` (`done`, `seen`, `hidden`), written by leaf. A page supplies
   `items`, `done` (from its own state and real events), `targetFor(key)` and `onSeen`/`onHide`. It was
   page-agnostic for the one-press spotlight. **It gained opt-in props** — `disabled`, `allDone`, `flow` (a card the
   page drives), `onStart`, `openNonce`, `keyCap` — none of which the Contact list passes, so `/agents` is unchanged.
2. **The old Query Centre guide** was `shell/PageGuide` mounted by `Queries.tsx` with `QC_GUIDE`, its "seen" flag in
   localStorage `sa.guide.queries`, re-offered from the "?" menu. Read by `qcV96` QC13 (retired) and
   `importTruth.measure.ts` (hides `.pg-card`/`[data-guide-card]` while it measures; harmless, left). **Removed:**
   the mount and `QC_GUIDE`. `PageGuide` itself stays: Manuscripts and the dashboard still mount it.
3. **The response journey** in query panel v2 is `queryActions/journeys/ResponseJourney.tsx` inside
   `queryActions/DrawerShell.tsx`, stepped into the panel by `QueryDrawer`. Steps per answer: see false premise 1.
   **Its write** is the view's `commit()`, called by `QueryDrawer.runSave` after a Firestore snapshot; `commit` calls
   `recordQueryResponse`, then the drawer's own extra fields. **The seam:** `recordQueryResponse`'s decisions were
   extracted, unchanged, into a pure `planResponse` (status, detail fields, the timeline entry); the real path writes
   that plan (its 42 tests pass unchanged), and for Pip the commit hands the same `data` to `practiceRespond`. Pip's
   save also skips the snapshot (a Firestore read of a document that does not exist) and the undo bar (its Undo would
   be a write), and his journey is never parked (a parked journey is kept in sessionStorage).
4. **Completion signals:** a query on the account (`queries.length > 0`, imported included); the list narrowed
   (`qcFind` ≥ 2 characters, `qc138FilterCount(qcF138) > 0` — which covers a status glyph — or `qcFilter !== "all"`);
   the panel open on a real query (`qcOpenCardNode && cardQueryId` naming a query in the store); "Clear Pip away";
   the Birds-eye drawer open (`beOpen`).
5. **Grouping:** the band art was chosen in `QcList138` from the band's tone (`TONE_ICON`, `TONE_ART`), and the
   page's `qc138Tone` mapped every key that was not "you" or "closed" to "waiting" — which is why the hourglass
   appeared on every non-urgency band. "Urgency" lived in `GROUP_BY_OPTIONS` (`lib/qcCalView`, label and short); the
   stored value is the key `attention` in `sa.qcList.v1`, unchanged, so a saved grouping carries over.

### How Pip is kept out of every store

He lives in `lib/practiceQuery` (module memory). Nothing there writes Firestore or storage (asserted in the unit
lock, and the response is shown to make no Firestore call at all). Three things see him, each on purpose: the Query
Centre's own Practice band (a prop of the list, never in the rows the page counts), his panel (built over his object
in the page's one `QueryPanelHost`), and the action drawer through `PracticeOverlay` — App wraps only
`<QueryDrawer/>` in it, and every writer in that copy of the context refuses his id. The Dashboard, To-do, Analytics,
the Contact list and the Birds-eye view read the real context and never see him.

## Locks — QC139 (`tests/e2e/qcV139.measure.ts`; unit half `src/lib/qc139Guide.test.tsx`)

Red first on the pre-pack build (180cd3cb, from a separate worktree on port 4502: 13 of 13 rendered locks red), green
on the branch, red under each named break (page-side through `QC139_MUTATE`, source through
`tests/e2e/qcV139Mutate.sh`). Logs in `runs/`.

| Lock | Red on base | Green | Mutation → red |
|---|---|---|---|
| A1 one guide | the old guide's copy on the page; no pill | no old guide; "Query Centre: Getting started n/5", the shared `pck-pill`, the same on /agents | old guide restored → `{"el":1,"copy":true}` |
| A2 real ticks | no guide to tick | item 1 already ticked (87 queries); 2 characters of search, a status glyph, a row and B each write their item with no checklist open, and it survives a reload | ticks from the step card's button → find, open, birds never written |
| A3 empty (unit) | — | Find, Open and Birds-eye wait for the first query; Log and Record a response do not; the disabled item's line, no arrow, not pressable | item 4 disabled → red |
| B1 nothing written | no practice query | all five answers end to end: no Firestore write names a query, an activity or Pip; local and session storage unchanged; header total, glyph counts, weekly chart, Birds-eye tab, bands and To-do badge all unchanged | the real write → a write naming `queries/practice-pip` (refused server-side: `tests/e2e/pipCheck.mjs` found no document, no activity, no feed row) |
| B2 real screens | no practice query | the real response drawer stepped into the panel; for each answer the practice journey's steps are the real query's, name for name | another journey's screens for Pip → no answer buttons (the case cannot proceed) |
| B3 flow | no practice query | card 1's hole round the band and row; card 2; one card per journey step; card 6 with the reply in the ledger, "Mark partial sent" in the footer and "it's now your move"; cleared → band gone, item 4 ticked; both widths | no tick on clear → item 4 unticked |
| B4 early exit | no practice query | Esc at card 3, and the journey's own Finish later: no band, no panel, item 4 unticked, checklist open; a reload mid-walkthrough shows no Pip | Pip kept on cancel → the band stays |
| B5 never counted | no practice query | during the walkthrough the title, glyph counts, weekly chart, Birds-eye tab, bands' counts, filter counts and To-do badge exclude Pip; not in the Birds-eye drawer nor the Contact list | Pip injected into the page's store → 87 → 88 queries, Queried 39 → 40, chart 42 → 43, Waiting band 18 → 19 |
| C1 rename | "Grouped by Urgency"; the menu says Urgency | "grouped by who it's with", the menu "Who it's with", a saved `attention` opens on it | the stored key changed → opens on Status |
| C2 icons | the hourglass on every non-urgency band | Status: a glyph svg and no img; Next action: a badge on every band but the closed ones; Package: the cube; every art's left edge the default's (12px) | the hourglass left → img on every band, no badges |

### L1 — no regression

Run on the branch with the Query Centre guide marked seen (its first-visit open would otherwise cover what the older
suites measure; restored afterwards).

| Suite | Result |
|---|---|
| QC138 | 15 passed; **D2 retargeted**: the closed band is #ebe7e2 (the pack's value), was #ece8e3 |
| QC138.1 | 6 passed, 1 skipped (as before) |
| QC138.2 | 3 passed; **D1 red, and red before this pack** (recorded as pre-existing since v18.3.3) |
| QC138.3 · .4 · .5 · .6 | 4 · 6 · 12 · 10 passed |
| CL18 | 12 passed, 3 skipped |
| CL18.1 | 7 passed; **B5 red: a capture dated 15 Oct** (date-bound, as before) |
| CL18.2 | 22 passed; **C5 red: the pin's "F" keycap** (the v138.6 conflict, still open for Nick) |
| CL18.3 | 22 passed; **CL1833-E1 red on the pre-pack build too** (same reading, `runs/base-cl1833-E1.log`) |
| Query panel v2 | 9 passed, 1 skipped; **V6–V8 "another row on screen" red on the pre-pack build too** (`runs/base-qp2-V6.log`) |
| Responses (RS2; the pack's "RS1") | 18 passed |

Retired: **QC96 QC13** (the bottom-right guide it measured is gone), with a note in the file.

## Shots

`shots/`, at 1512 and 1280: the checklist; each step's card (Log's two, Find, Open, Birds-eye); Pip at every card for
a partial (7 cards) and for a pass (6), and cleared; all done; the band marks under each grouping. The empty account
is not shot: the harness account has queries (A3 is a unit lock).

## Deploy

See the end of this file.

## For Nick

- **Response-journey steps that did not map to cards 3–5 one-to-one:** a **partial** and an **R&R** have two detail
  steps (What they asked for · When you'll send it by; What they'd like revised · When you'll resubmit by), so each
  gets two "The details" cards and the walkthrough is **7 cards**; a **full**, a **pass** and an **offer** have one,
  so **6**. The mock's 6 is the partial with one detail step.
- **The pin's "F" keycap on the Contact list** (CL18.2 C5) is still open from v138.6.
- **The next-action groups' names are the app's** ("Offer pending", "Full owed", …, "Waiting on the agent"), not the
  mock's ("Decide on offer", "Send full", …, "Waiting"), and there is no "Reply due" group. Rename them if you want the
  mock's words.
